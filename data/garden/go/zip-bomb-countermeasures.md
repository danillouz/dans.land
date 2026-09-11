---
title: ZIP bomb countermeasures
description: How to defend against ZIP bombs in Go.
created: 2024-11-08
updated: 2026-09-11
status: sapling
---

A ZIP bomb is a malicious [ZIP archive](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT) designed to crash the program or system reading it.
When such a ZIP archive is extracted, it expands to terabytes or even petabytes of data[^1], which would quickly overwhelm most systems.

[^1]: The notorious [42.zip](https://unforgettable.dk/) expands from 42 kilobytes to 4.5 petabytes.

This is why ZIP bombs are often used in attacks to disable antivirus scanners,
crash file processing services,
or conduct denial-of-service attacks against systems that (automatically) extract archived files.

## How it works

ZIP is a container format (and not a compression algorithm).
A ZIP archive contains a **central directory**, which is basically a list of headers that reference the actual files in the archive.
The files in the ZIP archive are often compressed using [DEFLATE](https://en.wikipedia.org/wiki/Deflate).

ZIP bombs achieve extreme compression ratios by exploiting the container format:

1. **Recursive ZIP bombs** contain nested ZIP files within ZIP files, that create a chain reaction when extracted. But this only works if the program can read ZIP archives recursively.

2. **Non-recursive ZIP bombs** [overlap compressed files in the ZIP archive](https://www.bamsoftware.com/hacks/zipbomb/). This works by first creating a highly compressed file (e.g. a long string of repeated bytes), and then making (all) the headers in the ZIP's central directory reference that compressed file. This technique can achieve compression ratios over 28 million, far beyond [DEFLATE's compression ratio of 1032](https://www.zlib.net/zlib_tech.html).

So how can we defend against this in Go?

## Countermeasures

When reading ZIP archives in Go, the following works in our favor:

- Go's [zip.Reader](https://pkg.go.dev/archive/zip#Reader) does [not read recursively](https://cs.opensource.google/go/go/+/refs/tags/go1.23.3:src/archive/zip/reader.go;l=145-156).
- Non-recursive ZIP bombs can be detected by their characteristics:
  - Many headers will point to the same compressed data (i.e. "many files" in the ZIP archive).
  - Files in the ZIP archive will typically have an unusually high compression ratio.

While Go currently lacks a [resource limits API](https://github.com/golang/go/issues/33036), we can easily implement the following countermeasures:

- For the ZIP archive:
  - Limit the amount of allowed files.
- For the files in the ZIP archive:
  - Apply a maximum uncompressed size.
  - Apply a maximum compression ratio.
  - Limit the amount of bytes that can actually be read.

```go
const (
	MaxZipFiles                 = 1_000
	MaxZipFileUncompressedBytes = 50 * 1024 * 1024 // 50 MiB
	MaxZipFileCompressionRatio  = 1_032            // Based on DEFLATE max compression ratio
)

// ValidateZip validates a ZIP archive.
func ValidateZip(r *zip.Reader) error {
	if len(r.File) > MaxZipFiles {
		return fmt.Errorf("too many files")
	}

	for _, file := range r.File {
		// ZIP metadata is attacker-controlled: use it for early rejection only.
		// A valid checksum does not authenticate the metadata.
		// [ReadSafeZipFile] also limits the actual bytes read and propagates errors.
		compSize := file.CompressedSize64
		uncompSize := file.UncompressedSize64
		if uncompSize > uint64(MaxZipFileUncompressedBytes) {
			return fmt.Errorf("file %s too large", file.Name)
		}
		if compSize > 0 && uncompSize > 0 {
			ratio := uncompSize / compSize
			if ratio > MaxZipFileCompressionRatio {
				return fmt.Errorf("suspiciously high compression ratio")
			}
		}
	}

	return nil
}

// ReadSafeZipFile reads a ZIP member while rejecting output over the limit.
func ReadSafeZipFile(r io.Reader) ([]byte, error) {
	limited := io.LimitReader(r, MaxZipFileUncompressedBytes+1)
	b, err := io.ReadAll(limited)
	if err != nil {
		return nil, err
	}

	if len(b) > MaxZipFileUncompressedBytes {
		return nil, fmt.Errorf("file exceeds uncompressed size limit")
	}

	return b, nil
}
```

Open each member and pass the returned reader to `ReadSafeZipFile`.
Keep and handle the error so checksum failures and oversized output are rejected:

```go
fileReader, err := file.Open()
if err != nil {
	return err
}
defer fileReader.Close()

contents, err := ReadSafeZipFile(fileReader)
if err != nil {
	return err
}

_ = contents
```
