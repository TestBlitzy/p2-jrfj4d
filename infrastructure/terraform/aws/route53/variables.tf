# Route53 DNS Configuration Variables
# Version: ~> 1.5

variable "domain_name" {
  type        = string
  description = "Primary domain name for the Sales & Intelligence Platform"
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid DNS name following RFC 1035 standards"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (development, staging, production) with specific DNS configurations"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production. This affects DNS routing policies and health check configurations."
  }
}

variable "enable_health_checks" {
  type        = bool
  description = "Flag to enable Route53 health checks for failover routing and high availability"
  default     = true
}

variable "health_check_regions" {
  type        = list(string)
  description = "AWS regions for Route53 health checks to ensure global availability"
  default     = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "ap-northeast-1"]

  validation {
    condition     = length(var.health_check_regions) >= 3
    error_message = "At least 3 health check regions are required for reliable global monitoring"
  }
}

variable "dns_ttl" {
  type        = number
  description = "Default TTL in seconds for DNS records"
  default     = 300

  validation {
    condition     = var.dns_ttl >= 60 && var.dns_ttl <= 86400
    error_message = "TTL must be between 60 seconds and 86400 seconds (24 hours)"
  }
}

variable "enable_dnssec" {
  type        = bool
  description = "Enable DNSSEC signing for the hosted zone"
  default     = true
}

variable "failover_routing" {
  type        = bool
  description = "Enable failover routing policy for multi-region high availability"
  default     = true
}

variable "geolocation_routing" {
  type        = bool
  description = "Enable geolocation-based routing for optimal latency"
  default     = true
}

variable "enable_query_logging" {
  type        = bool
  description = "Enable Route53 query logging for security and analytics"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for Route53 resources including environment, cost center, and compliance tags"
  default     = {
    Project          = "Sales-Intelligence-Platform"
    Environment      = "var.environment"
    ManagedBy        = "Terraform"
    CostCenter       = "Infrastructure"
    ComplianceLevel  = "High"
    SecurityZone     = "Public"
    DataClassification = "Internal"
  }
}

variable "health_check_config" {
  type = object({
    failure_threshold = number
    request_interval  = number
    protocol         = string
    port             = number
    path             = string
  })
  description = "Configuration for Route53 health checks"
  default = {
    failure_threshold = 3
    request_interval  = 30
    protocol         = "HTTPS"
    port             = 443
    path             = "/health"
  }

  validation {
    condition     = contains([10, 30], var.health_check_config.request_interval)
    error_message = "Health check request interval must be either 10 or 30 seconds"
  }
}

variable "enable_private_dns" {
  type        = bool
  description = "Enable private hosted zones for VPC internal DNS resolution"
  default     = true
}

variable "vpc_associations" {
  type        = list(string)
  description = "List of VPC IDs to associate with private hosted zones"
  default     = []

  validation {
    condition     = length(var.vpc_associations) <= 10
    error_message = "Maximum of 10 VPC associations per private hosted zone"
  }
}

variable "record_templates" {
  type = map(object({
    type     = string
    ttl      = number
    records  = list(string)
  }))
  description = "Predefined DNS record templates for common services"
  default = {
    www = {
      type    = "CNAME"
      ttl     = 300
      records = ["var.domain_name"]
    }
    mail = {
      type    = "MX"
      ttl     = 3600
      records = ["10 mail.var.domain_name"]
    }
  }
}