# Backend configuration for Sales & Intelligence Platform Terraform state management
# Version: ~> 1.5

terraform {
  # Configure S3 backend with enhanced security features and state locking
  backend "s3" {
    # S3 bucket configuration with environment-specific naming
    bucket = "sales-intelligence-platform-tfstate-${var.environment}"
    key    = "sales-intelligence/${var.environment}/terraform.tfstate"
    region = var.aws_region

    # Enable encryption and versioning for state file protection
    encrypt        = true
    kms_key_id    = "arn:aws:kms:${var.aws_region}:${data.aws_caller_identity.current.account_id}:alias/terraform-state-key"
    acl           = "private"
    force_destroy = false

    # Enable versioning for state file history and recovery
    versioning = true

    # Configure server-side encryption using AWS KMS
    server_side_encryption_configuration {
      rule {
        apply_server_side_encryption_by_default {
          sse_algorithm = "aws:kms"
        }
      }
    }

    # DynamoDB table for state locking
    dynamodb_table = "terraform-state-lock-${var.environment}"

    # Workspace configuration for environment isolation
    workspace_key_prefix = "environments"

    # Additional security configurations
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true

    # Enable replication for disaster recovery
    replication_configuration {
      role = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/terraform-state-replication"
      rules {
        id     = "tfstate-replication"
        status = "Enabled"
        destination {
          bucket = "arn:aws:s3:::sales-intelligence-platform-tfstate-dr-${var.environment}"
          encryption_configuration {
            replica_kms_key_id = "arn:aws:kms:${var.secondary_region}:${data.aws_caller_identity.current.account_id}:alias/terraform-state-key-dr"
          }
        }
      }
    }

    # Lifecycle rules for state file management
    lifecycle_rule {
      enabled = true
      noncurrent_version_expiration {
        days = 90
      }
      noncurrent_version_transition {
        days          = 30
        storage_class = "STANDARD_IA"
      }
    }
  }

  # Required provider configuration
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Minimum required Terraform version
  required_version = "~> 1.5"
}

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}