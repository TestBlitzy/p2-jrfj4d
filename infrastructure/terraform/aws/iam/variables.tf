# Core environment variable for deployment environment
variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod) for IAM resource naming"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Project name variable for resource naming
variable "project_name" {
  type        = string
  description = "Project name for IAM resource naming and tagging"
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

# EKS cluster name for IAM role associations
variable "eks_cluster_name" {
  type        = string
  description = "EKS cluster name for IAM role associations"
  
  validation {
    condition     = length(var.eks_cluster_name) >= 3 && length(var.eks_cluster_name) <= 100
    error_message = "EKS cluster name must be between 3 and 100 characters."
  }
}

# RDS monitoring flag
variable "enable_rds_monitoring" {
  type        = bool
  description = "Flag to enable/disable RDS enhanced monitoring role creation"
  default     = true
}

# KMS key ARN for encryption policies
variable "kms_key_arn" {
  type        = string
  description = "KMS key ARN for encryption policy configuration"
  
  validation {
    condition     = can(regex("^arn:aws:kms:[a-z0-9-]+:[0-9]+:key/[a-zA-Z0-9-]+$", var.kms_key_arn))
    error_message = "KMS key ARN must be a valid AWS KMS key ARN format."
  }
}

# S3 bucket ARNs for IAM policies
variable "s3_bucket_arns" {
  type        = list(string)
  description = "List of S3 bucket ARNs for IAM policy permissions"
  default     = []
  
  validation {
    condition = alltrue([
      for arn in var.s3_bucket_arns : can(regex("^arn:aws:s3:::", arn))
    ])
    error_message = "All S3 bucket ARNs must start with 'arn:aws:s3:::'."
  }
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Resource tags for IAM roles and policies"
  default     = {}
  
  validation {
    condition = alltrue([
      for key, value in var.tags : 
      can(regex("^[a-zA-Z0-9_-]+$", key)) && length(value) <= 256
    ])
    error_message = "Tag keys must contain only alphanumeric characters, underscores, and hyphens. Tag values must not exceed 256 characters."
  }
}