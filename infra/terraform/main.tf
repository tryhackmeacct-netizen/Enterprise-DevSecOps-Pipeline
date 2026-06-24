provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "unsafe_bucket" {
  bucket = "example-insecure-bucket-for-demo"
  acl    = "private"
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm     = "aws:kms"
        kms_master_key_id = aws_kms_key.s3_key.arn
      }
    }
  }
  lifecycle_rule {
    id      = "keep"
    enabled = true
    expiration {
      days = 3650
    }
  }
  tags = {
    Name = "demo-insecure-bucket"
  }
}

resource "aws_s3_bucket_public_access_block" "unsafe_bucket_block" {
  bucket                  = aws_s3_bucket.unsafe_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_kms_key" "s3_key" {
  description             = "KMS key for demo S3 bucket encryption"
  deletion_window_in_days = 30
}

resource "aws_s3_bucket" "logging_bucket" {
  bucket = "example-insecure-bucket-logs"
  acl    = "private"
}

resource "aws_s3_bucket_logging" "unsafe_bucket_logging" {
  bucket        = aws_s3_bucket.unsafe_bucket.id
  target_bucket = aws_s3_bucket.logging_bucket.id
  target_prefix = "logs/"
}

resource "aws_s3_bucket_versioning" "unsafe_bucket_versioning" {
  bucket = aws_s3_bucket.unsafe_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}
