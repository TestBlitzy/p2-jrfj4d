# Core Terraform functionality for variable definitions
# Required version: ~> 1.5

variable "project" {
  type        = string
  description = "Project name for resource naming and tagging"
  default     = "sales-intelligence-platform"
}

variable "environment" {
  type        = string
  description = "Environment name (e.g., dev, staging, prod)"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "deletion_window_in_days" {
  type        = number
  description = "Duration in days before the key is deleted"
  default     = 30

  validation {
    condition     = var.deletion_window_in_days >= 7 && var.deletion_window_in_days <= 30
    error_message = "Deletion window must be between 7 and 30 days"
  }
}

variable "enable_key_rotation" {
  type        = bool
  description = "Enable automatic key rotation"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Additional tags for KMS resources"
  default     = {}
}