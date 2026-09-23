package scunts

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// How long the URLs handed to a browser stay valid. The upload window is
// short because the client PUTs immediately; the read window is an hour so
// a gallery left open keeps working without a refetch.
const (
	uploadURLTTL = 5 * time.Minute
	readURLTTL   = time.Hour
)

// Storage is the R2 bucket holding submission media. R2 speaks the S3 API,
// so this is the standard AWS SDK pointed at a Cloudflare endpoint.
type Storage struct {
	client  *s3.Client
	presign *s3.PresignClient
	bucket  string
}

// NewStorage builds the R2 client. It returns an error when any setting is
// missing so main can mount the module in a disabled state rather than
// starting up as if uploads worked.
//
// Nothing here dials R2 — the credentials are static and the endpoint is
// derived, so a wrong value surfaces on the first real request rather than
// at boot.
func NewStorage(accountID, accessKeyID, secretKey, bucket string) (*Storage, error) {
	if accountID == "" || accessKeyID == "" || secretKey == "" || bucket == "" {
		return nil, errors.New("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET must all be set")
	}

	client := s3.New(s3.Options{
		// R2 ignores the region but the SDK requires one.
		Region:       "auto",
		BaseEndpoint: aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)),
		Credentials:  credentials.NewStaticCredentialsProvider(accessKeyID, secretKey, ""),
		// Without this the SDK adds a CRC32 checksum header to PutObject and
		// signs it into the presigned URL. A browser doing a plain PUT never
		// sends that header, so every upload would fail the signature check.
		RequestChecksumCalculation: aws.RequestChecksumCalculationWhenRequired,
	})

	return &Storage{client: client, presign: s3.NewPresignClient(client), bucket: bucket}, nil
}

// PresignPut returns a URL the browser can PUT the file to directly. The
// content type is signed in, so the browser must send exactly the same one
// it asked for.
func (s *Storage) PresignPut(ctx context.Context, key, contentType string) (string, error) {
	req, err := s.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(uploadURLTTL))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

// PresignGet returns a URL the browser can load the media from. The bucket
// is private, so this is the only way media is read.
func (s *Storage) PresignGet(ctx context.Context, key string) (string, error) {
	req, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(readURLTTL))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

// Head reports what was actually stored at key. The client tells us it
// uploaded something; this is how the server confirms the object exists and
// checks its real type and size rather than trusting the claim.
func (s *Storage) Head(ctx context.Context, key string) (contentType string, size int64, err error) {
	out, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return "", 0, err
	}
	if out.ContentType != nil {
		contentType = *out.ContentType
	}
	if out.ContentLength != nil {
		size = *out.ContentLength
	}
	return contentType, size, nil
}

// Delete removes an object. Deleting something already gone is not an
// error in S3, so a retried takedown is safe.
func (s *Storage) Delete(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	return err
}
