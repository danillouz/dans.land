---
title: S3 upload memory
description: How to prevent high memory usage when uploading many files via the Go S3 manager uploader.
created: 2024-10-27
updated: 2026-09-11
status: evergreen
---

> [!note]
>
> [`manager.Uploader`](https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/feature/s3/manager#Uploader) is now deprecated in favor of `feature/s3/transfermanager`.
> This post describes the SDK version used for the original investigation.

There are 2 options to upload files to S3 using the [Go V2 AWS SDK](https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/welcome.html) (besides using [presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)):

1. [S3 client put object](https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/service/s3#Client.PutObject).
2. [S3 manager uploader upload](https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/feature/s3/manager#Uploader.Upload).

Both accept [PutObjectInput](https://pkg.go.dev/github.com/aws/aws-sdk-go-v2/service/s3#PutObjectInput), where the `Body` must be an `io.Reader`.

From what I understand, option 2 is recommended when uploading many (large) files, because it:

- Safely uploads files concurrently across goroutines.
- Buffers large files into smaller chunks and uploads them in parallel.

## The problem

While working on a project that needed to upload zip archives containing lots of files, I chose the S3 manager uploader for its concurrent upload capabilities.

But I quickly ran into memory issues: when uploading zip archives that contain hundreds of files, my Go service would often run out of memory (OOM).

For example, uploading a zip archive with ~100 files caused the service memory usage to consistently spike to ~500 MiB.

### The code

```go showLineNumbers {42,52}
package s3

import (
	"archive/zip"
	"context"
	"fmt"
	"mime"
	"path/filepath"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"golang.org/x/sync/errgroup"
)

type Uploader struct {
	uploader *manager.Uploader
	bucket   string
}

func NewUploader(client manager.UploadAPIClient, bucket string) *Uploader {
	return &Uploader{
		uploader: manager.NewUploader(client),
		bucket:   bucket,
	}
}

func (u *Uploader) UploadZip(ctx context.Context, zipr *zip.Reader) error {
	group, ctx := errgroup.WithContext(ctx)
	for _, file := range zipr.File {
		group.Go(func() error {
			return u.uploadZipFile(ctx, file)
		})
	}
	if err := group.Wait(); err != nil {
		return fmt.Errorf("uploading zip file: %v", err)
	}
	return nil
}

func (u *Uploader) uploadZipFile(ctx context.Context, file *zip.File) error {
	zf, err := file.Open()
	if err != nil {
		return err
	}
	defer zf.Close()

	mimeType := detectMimeType(file.Name)
	_, err = u.uploader.Upload(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(u.bucket),
		Key:         aws.String(file.Name),
		Body:        zf,
		ContentType: aws.String(mimeType),
	})
	return err
}

func detectMimeType(fileName string) string {
	ext := filepath.Ext(fileName)
	mimeType := mime.TypeByExtension(ext)
	if AllowedMimeType(mimeType) {
		// Use an allow list for improved security.
		return mimeType
	}

	return "application/octet-stream"
}
```

Opening a file in the zip archive returns an `io.ReadCloser`, and passing that to the `Body` when uploading should stream the contents of the file efficiently to S3. So why the memory issues?

[[Benchmarking#Profiling benchmarks|Profiling using a benchmark]] didn't show any issues. So I started digging into the S3 manager code.

### Root cause: default part size

The S3 manager uploader memory behavior is controlled by the [PartSize](https://github.com/aws/aws-sdk-go-v2/blob/feature/s3/manager/v1.17.25/feature/s3/manager/upload.go#L275) parameter. By default, it's set to [5 MiB](https://github.com/aws/aws-sdk-go-v2/blob/feature/s3/manager/v1.17.25/feature/s3/manager/upload.go#L27-L33) and is also used in the [memory pool](https://github.com/aws/aws-sdk-go-v2/blob/feature/s3/manager/v1.17.25/feature/s3/manager/upload.go#L286) (so the allocated buffer memory can be reused between uploads).

This is the interesting part: [by default](https://github.com/aws/aws-sdk-go-v2/blob/feature/s3/manager/v1.17.25/feature/s3/manager/upload.go#L461-L474) the uploader allocates the 5 MiB buffer for _every_ file being uploaded, _regardless_ of the file's actual size.

With a plain `io.Reader`, the uploader buffers parts before uploading them:
it does not need to hold the entire file in memory.
If the body implements both `io.ReadSeeker` and `io.ReaderAt`[^1],
the uploader can determine its size and read parts directly,
[avoiding those buffers](https://github.com/aws/aws-sdk-go-v2/blob/feature/s3/manager/v1.17.25/feature/s3/manager/upload.go#L432-L459).

[^1]: The AWS SDK calls this combined interface [`readSeekerAt`](https://github.com/aws/aws-sdk-go-v2/blob/feature/s3/manager/v1.17.25/feature/s3/manager/upload.go#L814-L817).

## The fix

[Opening a zip file](https://pkg.go.dev/archive/zip#File.Open) returns an `io.ReadCloser`. Writing it to a temporary file gives the uploader a body that implements both `io.ReadSeeker` and `io.ReaderAt`, which can prevent the extra buffering while still using the S3 manager to upload files concurrently.

I think the simplest options to do this are (before uploading):

1. Write each file in the zip archive to a temporary file.
2. Read each file in the zip archive into memory using `io.ReadAll()` and `bytes.NewReader()`.

After testing both, I found using option 1 to be the (slightly) better choice.
While both methods had similar memory overhead, writing to a temporary file used (slightly) less CPU and had (slightly) less GC (Garbage Collector) overhead.

> [!note]
>
> Each active upload has its own part concurrency.
> For streaming bodies, buffers can use roughly `PartSize * Concurrency` per upload, so also limit the outer loop.
> For example, with `group.SetLimit(8)` before starting the goroutines.

### The revised code

> [!note]
>
> Add the `io` and `os` imports for the temporary-file approach below.

```go {9-27, 33}
func (u *Uploader) uploadZipFile(ctx context.Context, file *zip.File) error {
	zf, err := file.Open()
	if err != nil {
		return err
	}
	defer zf.Close()

	// NOTE: this is safe to call from multiple goroutines (see godoc).
	temp, err := os.CreateTemp("", "s3-upload-*")
	if err != nil {
		return fmt.Errorf("creating temp file: %v", err)
	}
	defer func() {
		_ = temp.Close()
		if err := os.Remove(temp.Name()); err != nil {
			// Log the error.
		}
	}()

	if _, err := io.Copy(temp, zf); err != nil {
		return fmt.Errorf("writing to temp file: %v", err)
	}

	// Rewind the file pointer to read again from the temp file on upload.
	if _, err := temp.Seek(0, io.SeekStart); err != nil {
		return fmt.Errorf("rewinding temp file pointer: %v", err)
	}

	mimeType := detectMimeType(file.Name)
	_, err = u.uploader.Upload(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(u.bucket),
		Key:         aws.String(file.Name),
		Body:        temp,
		ContentType: aws.String(mimeType),
	})
	return err
}
```

## Resources

- [GitHub issue #2694](https://github.com/aws/aws-sdk-go-v2/issues/2694)
- [PutObjectInput Body Field](https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/sdk-utilities-s3.html#putobjectinput-body-field-ioreadseeker-vs-ioreader)
