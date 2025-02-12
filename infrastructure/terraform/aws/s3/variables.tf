# Terraform variables definition file for AWS S3 storage configuration
# Version: 1.0
# Provider: hashicorp/terraform ~> 1.0

# Environment name for resource naming and tagging
variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# AWS region for S3 bucket deployment
variable "region" {
  type        = string
  description = "AWS region where S3 buckets will be created"
}

# Base name for AI models storage bucket
variable "ai_models_bucket_name" {
  type        = string
  description = "Base name for the S3 bucket storing AI/ML models and artifacts"
}

# Base name for data backup storage bucket
variable "data_backup_bucket_name" {
  type        = string
  description = "Base name for the S3 bucket storing data backups and archives"
}

# Base name for static assets storage bucket
variable "static_assets_bucket_name" {
  type        = string
  description = "Base name for the S3 bucket storing static assets and content"
}

# Days before transitioning objects to different storage classes
variable "lifecycle_transition_days" {
  type        = map(number)
  description = "Number of days before transitioning objects to different storage classes (standard_ia, glacier)"
  default = {
    standard_ia = 90  # Transition to Standard-IA after 90 days
    glacier     = 365 # Transition to Glacier after 365 days
  }
}

# Flag to enable/disable bucket versioning
variable "enable_versioning" {
  type        = bool
  description = "Enable versioning for S3 buckets"
  default     = true
}

# Common tags to be applied to all S3 buckets
variable "tags" {
  type        = map(string)
  description = "Common tags to be applied to all S3 buckets"
  default = {
    Project     = "Sales & Intelligence Platform"
    Managed_By  = "Terraform"
    Owner       = "DevOps"
  }
}