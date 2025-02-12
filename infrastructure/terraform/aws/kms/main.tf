# AWS Provider configuration for KMS resources
# Provider version: ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Get current AWS account identity for KMS policy
data "aws_caller_identity" "current" {}

# KMS key resource for data encryption
resource "aws_kms_key" "main" {
  description             = "KMS key for Sales & Intelligence Platform data encryption"
  deletion_window_in_days = var.deletion_window_in_days
  enable_key_rotation     = var.enable_key_rotation
  is_enabled             = true
  key_usage              = "ENCRYPT_DECRYPT"
  customer_master_key_spec = "SYMMETRIC_DEFAULT"
  multi_region           = false

  # KMS key policy allowing root account access
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "Enable IAM User Permissions"
        Effect    = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action    = "kms:*"
        Resource  = "*"
      }
    ]
  })

  # Resource tagging
  tags = merge(
    var.tags,
    {
      Name            = format("%s-%s-kms-key", var.project, var.environment)
      Environment     = var.environment
      Project         = var.project
      ManagedBy       = "terraform"
      SecurityLevel   = "high"
      EncryptionType  = "AES-256"
    }
  )
}

# KMS alias for easier key reference
resource "aws_kms_alias" "main" {
  name          = "alias/${var.project}-${var.environment}-key"
  target_key_id = aws_kms_key.main.key_id
}

# Output definitions for key references
output "key_id" {
  description = "The ID of the KMS key"
  value       = aws_kms_key.main.key_id
  sensitive   = true
}

output "key_arn" {
  description = "The ARN of the KMS key"
  value       = aws_kms_key.main.arn
  sensitive   = true
}

output "alias_arn" {
  description = "The ARN of the KMS alias"
  value       = aws_kms_alias.main.arn
  sensitive   = true
}