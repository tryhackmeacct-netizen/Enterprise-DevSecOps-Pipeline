terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "unsafe_bucket" {
  bucket = "example-insecure-bucket-for-demo"

  tags = {
    Name = "demo-insecure-bucket"
  }
}

resource "aws_s3_bucket_versioning" "unsafe_bucket_versioning" {
  bucket = aws_s3_bucket.unsafe_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "unsafe_bucket_encryption" {
  bucket = aws_s3_bucket.unsafe_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "unsafe_bucket_lifecycle" {
  bucket = aws_s3_bucket.unsafe_bucket.id

  rule {
    id     = "keep"
    status = "Enabled"

    expiration {
      days = 3650
    }
  }
}

resource "aws_s3_bucket_public_access_block" "unsafe_bucket_block" {
  bucket                  = aws_s3_bucket.unsafe_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_replication_configuration" "unsafe_bucket_replication" {
  depends_on = [aws_s3_bucket_versioning.unsafe_bucket_versioning]

  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.unsafe_bucket.id

  rule {
    id     = "replicate-to-replica"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.replica.arn
      storage_class = "STANDARD"
    }
  }
}

resource "aws_s3_bucket_notification" "unsafe_bucket_notification" {
  bucket = aws_s3_bucket.unsafe_bucket.id

  topic {
    topic_arn = aws_sns_topic.bucket_events.arn
    events    = ["s3:ObjectCreated:*"]
  }
}

resource "aws_s3_bucket" "logging_bucket" {
  bucket = "example-insecure-bucket-logs"

  tags = {
    Name = "demo-logging-bucket"
  }
}

resource "aws_s3_bucket_versioning" "logging_bucket_versioning" {
  bucket = aws_s3_bucket.logging_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logging_bucket_encryption" {
  bucket = aws_s3_bucket.logging_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logging_bucket_lifecycle" {
  bucket = aws_s3_bucket.logging_bucket.id

  rule {
    id     = "log-retention"
    status = "Enabled"

    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logging_bucket_block" {
  bucket                  = aws_s3_bucket.logging_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_replication_configuration" "logging_bucket_replication" {
  depends_on = [aws_s3_bucket_versioning.logging_bucket_versioning]

  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.logging_bucket.id

  rule {
    id     = "replicate-logs"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.replica.arn
      storage_class = "STANDARD"
    }
  }
}

resource "aws_s3_bucket_notification" "logging_bucket_notification" {
  bucket = aws_s3_bucket.logging_bucket.id

  topic {
    topic_arn = aws_sns_topic.bucket_events.arn
    events    = ["s3:ObjectCreated:*"]
  }
}

resource "aws_s3_bucket" "replica" {
  bucket = "example-insecure-bucket-replica"

  tags = {
    Name = "demo-replica-bucket"
  }
}

resource "aws_s3_bucket_versioning" "replica_versioning" {
  bucket = aws_s3_bucket.replica.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "replica_encryption" {
  bucket = aws_s3_bucket.replica.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "replica_block" {
  bucket                  = aws_s3_bucket.replica.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_kms_key" "s3_key" {
  description             = "KMS key for demo S3 bucket encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableIAMUserPermissions"
        Effect = "Allow"
        Principal = {
          AWS = data.aws_caller_identity.current.arn
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
}

resource "aws_sns_topic" "bucket_events" {
  name = "s3-bucket-events"
}

resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "replication" {
  name = "s3-replication-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.unsafe_bucket.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging",
          "s3:ReplicateObject",
          "s3:ReplicateDelete"
        ]
        Resource = "${aws_s3_bucket.unsafe_bucket.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.logging_bucket.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging",
          "s3:ReplicateObject",
          "s3:ReplicateDelete"
        ]
        Resource = "${aws_s3_bucket.logging_bucket.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.replica.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging",
          "s3:ReplicateObject",
          "s3:ReplicateDelete"
        ]
        Resource = "${aws_s3_bucket.replica.arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "replication" {
  role       = aws_iam_role.replication.name
  policy_arn = aws_iam_policy.replication.arn
}
