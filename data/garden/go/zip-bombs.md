---
title: ZIP bomb countermeasures
description: How to defend against ZIP bombs in Go.
created: 2024-11-08
status: sapling
---

A ZIP bomb is a malicious [ZIP archive](https://support.pkware.com/pkzip/appnote) designed to crash the program or system reading it. When such a ZIP archive is extracted, it expands to terabytes or even petabytes of data[^1], which would quickly overwhelm most systems.

[^1]: The notorious [42.zip](https://unforgettable.dk/) expands from 42 kilobytes to 4.5 petabytes.

This is why ZIP bombs are often used in attacks to disable antivirus scanners, crash file processing services, or conduct denial-of-service attacks against systems that (automatically) extract archived files.

## How it works

ZIP is a container format (and not a compression algorithm). A ZIP archive contains a **central directory**, which is basically a list of headers that reference the actual files in the archive. The files in the ZIP archive are often compressed using [DEFLATE](https://en.wikipedia.org/wiki/Deflate).

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
func ValidateZip(r *ZIP.Reader) error {
	if len(r.File) > MaxZipFiles {
		return fmt.Errorf("too many files")
	}

	for _, file := range r.File {
		// NOTE: it should not be possible to tamper with the header.
		// See: https://cs.opensource.google/go/go/+/refs/tags/go1.23.3:src/archive/zip/reader.go;l=357-375
		// But even if possible, the most important safeguard is using [SafeZipFileReader]
		// (because that limits reading the actual bytes).
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

// SafeZipFileReader prevents reading a too large file in a ZIP.
func SafeZipFileReader(r io.Reader) io.Reader {
	return io.LimitReader(r, MaxZipFileUncompressedBytes)
}
```
