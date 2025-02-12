# Terraform variables configuration file for AWS CloudFront CDN setup
# Version: hashicorp/terraform ~> 1.0

# Environment name variable with validation
variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod"
  }
}

# Domain name for CloudFront distribution
variable "domain_name" {
  description = "Domain name for the CloudFront distribution"
  type        = string
}

# Price class selection with validation
variable "price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = can(regex("^PriceClass_(100|200|All)$", var.price_class))
    error_message = "Price class must be PriceClass_100, PriceClass_200, or PriceClass_All"
  }
}

# Cache TTL configurations
variable "min_ttl" {
  description = "Minimum TTL for cached objects in seconds"
  type        = number
  default     = 0
}

variable "default_ttl" {
  description = "Default TTL for cached objects in seconds"
  type        = number
  default     = 3600  # 1 hour
}

variable "max_ttl" {
  description = "Maximum TTL for cached objects in seconds"
  type        = number
  default     = 86400  # 24 hours
}

# Compression settings
variable "enable_compression" {
  description = "Enable CloudFront compression"
  type        = bool
  default     = true
}

# Resource tagging
variable "tags" {
  description = "Tags to be applied to the CloudFront distribution"
  type        = map(string)
  default     = {}
}