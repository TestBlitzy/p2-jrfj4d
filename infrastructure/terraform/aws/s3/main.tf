# AWS S3 Configuration for Sales & Intelligence Platform
# Provider: hashicorp/aws ~> 5.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Get current AWS account identity
data "aws_caller_identity" "current" {}

# AI Models Storage Bucket
resource "aws_s3_bucket" "ai_models" {
  bucket = "${var.ai_models_bucket_name}-${var.environment}"
  force_destroy = false

  tags = {
    Name = "${var.ai_models_bucket_name}-${var.environment}"
    Environment = var.environment
    Purpose = "AI Models Storage"
    ManagedBy = "terraform"
    SecurityLevel = "high"
    DataClassification = "confidential"
  }
}

# Data Backup Storage Bucket
resource "aws_s3_bucket" "data_backup" {
  bucket = "${var.data_backup_bucket_name}-${var.environment}"
  force_destroy = false

  tags = {
    Name = "${var.data_backup_bucket_name}-${var.environment}"
    Environment = var.environment
    Purpose = "Data Backups"
    ManagedBy = "terraform"
    SecurityLevel = "high"
    DataClassification = "sensitive"
  }
}

# Static Assets Storage Bucket
resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.static_assets_bucket_name}-${var.environment}"
  force_destroy = false

  tags = {
    Name = "${var.static_assets_bucket_name}-${var.environment}"
    Environment = var.environment
    Purpose = "Static Assets"
    ManagedBy = "terraform"
    SecurityLevel = "medium"
    DataClassification = "public"
  }
}

# Versioning Configuration
resource "aws_s3_bucket_versioning" "ai_models" {
  bucket = aws_s3_bucket.ai_models.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "data_backup" {
  bucket = aws_s3_bucket.data_backup.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-Side Encryption Configuration
resource "aws_s3_bucket_server_side_encryption_configuration" "ai_models" {
  bucket = aws_s3_bucket.ai_models.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = data.aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data_backup" {
  bucket = aws_s3_bucket.data_backup.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = data.aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle Rules Configuration
resource "aws_s3_bucket_lifecycle_configuration" "ai_models" {
  bucket = aws_s3_bucket.ai_models.id

  rule {
    id     = "ai_models_lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "INTELLIGENT_TIERING"
    }

    noncurrent_version_transition {
      noncurrent_days = 60
      storage_class   = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data_backup" {
  bucket = aws_s3_bucket.data_backup.id

  rule {
    id     = "data_backup_lifecycle"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# Public Access Block Configuration
resource "aws_s3_bucket_public_access_block" "ai_models" {
  bucket = aws_s3_bucket.ai_models.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "data_backup" {
  bucket = aws_s3_bucket.data_backup.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Output Definitions
output "ai_models_bucket" {
  value = {
    id  = aws_s3_bucket.ai_models.id
    arn = aws_s3_bucket.ai_models.arn
  }
  description = "AI models bucket information"
}

output "data_backup_bucket" {
  value = {
    id  = aws_s3_bucket.data_backup.id
    arn = aws_s3_bucket.data_backup.arn
  }
  description = "Data backup bucket information"
}

output "static_assets_bucket" {
  value = {
    id  = aws_s3_bucket.static_assets.id
    arn = aws_s3_bucket.static_assets.arn
  }
  description = "Static assets bucket information"
}