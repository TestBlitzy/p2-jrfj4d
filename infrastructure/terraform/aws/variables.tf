# Core Project Configuration
variable "project" {
  type        = string
  description = "Project name for resource naming and tagging"
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.project))
    error_message = "Project name must start with a letter and contain only alphanumeric characters and hyphens"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (development, staging, production)"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

# Regional Configuration
variable "aws_region" {
  type        = string
  description = "Primary AWS region for infrastructure deployment"
  
  validation {
    condition     = can(regex("^(us|eu|ap|sa|ca|me|af)-(north|south|east|west|central)-[1-3]$", var.aws_region))
    error_message = "Must be a valid AWS region identifier"
  }
}

variable "secondary_region" {
  type        = string
  description = "Secondary AWS region for disaster recovery"
  
  validation {
    condition     = can(regex("^(us|eu|ap|sa|ca|me|af)-(north|south|east|west|central)-[1-3]$", var.secondary_region))
    error_message = "Must be a valid AWS region identifier"
  }
}

# Feature Flags
variable "enable_dr" {
  type        = bool
  description = "Enable disaster recovery infrastructure in secondary region"
  default     = false
}

variable "enable_monitoring" {
  type        = bool
  description = "Enable comprehensive monitoring and observability stack"
  default     = true
}

# Domain Configuration
variable "domain_name" {
  type        = string
  description = "Primary domain name for Route53 and ACM certificate configuration"
  
  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-\\.]{1,61}[a-z0-9]\\.[a-z]{2,}$", var.domain_name))
    error_message = "Must be a valid domain name"
  }
}

# Resource Sizing
variable "eks_node_instance_types" {
  type        = list(string)
  description = "EC2 instance types for EKS node groups"
  default     = ["m5.2xlarge", "m5.4xlarge"]
  
  validation {
    condition     = length(var.eks_node_instance_types) > 0
    error_message = "At least one instance type must be specified"
  }
}

variable "eks_min_nodes" {
  type        = number
  description = "Minimum number of nodes per EKS node group"
  default     = 3
  
  validation {
    condition     = var.eks_min_nodes >= 3
    error_message = "Minimum node count must be at least 3 for high availability"
  }
}

variable "eks_max_nodes" {
  type        = number
  description = "Maximum number of nodes per EKS node group"
  default     = 10
  
  validation {
    condition     = var.eks_max_nodes >= var.eks_min_nodes
    error_message = "Maximum node count must be greater than or equal to minimum node count"
  }
}

# Security Configuration
variable "enable_waf" {
  type        = bool
  description = "Enable AWS WAF for web application protection"
  default     = true
}

variable "enable_shield" {
  type        = bool
  description = "Enable AWS Shield Advanced for DDoS protection"
  default     = true
}

variable "enable_guardduty" {
  type        = bool
  description = "Enable AWS GuardDuty for threat detection"
  default     = true
}

# Backup Configuration
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain backups"
  default     = 30
  
  validation {
    condition     = var.backup_retention_days >= 30
    error_message = "Backup retention must be at least 30 days"
  }
}

# Common Resource Tags
variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
  default = {
    Project     = "sales-intelligence-platform"
    ManagedBy   = "terraform"
    Environment = "production"
    Owner       = "platform-team"
  }
}

# Compliance and Security
variable "enable_encryption" {
  type        = bool
  description = "Enable encryption at rest for all applicable services"
  default     = true
}

variable "kms_deletion_window" {
  type        = number
  description = "KMS key deletion window in days"
  default     = 30
  
  validation {
    condition     = var.kms_deletion_window >= 7 && var.kms_deletion_window <= 30
    error_message = "KMS key deletion window must be between 7 and 30 days"
  }
}

# Monitoring Configuration
variable "enable_detailed_monitoring" {
  type        = bool
  description = "Enable detailed CloudWatch monitoring for EC2 instances"
  default     = true
}

variable "log_retention_days" {
  type        = number
  description = "Number of days to retain CloudWatch logs"
  default     = 90
  
  validation {
    condition     = var.log_retention_days >= 90
    error_message = "Log retention must be at least 90 days"
  }
}

# Network Configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/16$", var.vpc_cidr))
    error_message = "VPC CIDR must be a valid /16 network"
  }
}

# Cost Management
variable "enable_cost_allocation_tags" {
  type        = bool
  description = "Enable cost allocation tags for resource cost tracking"
  default     = true
}

variable "budget_alert_threshold" {
  type        = number
  description = "Budget alert threshold percentage"
  default     = 80
  
  validation {
    condition     = var.budget_alert_threshold > 0 && var.budget_alert_threshold <= 100
    error_message = "Budget alert threshold must be between 1 and 100"
  }
}