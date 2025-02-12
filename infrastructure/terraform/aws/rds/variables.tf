# Terraform variables configuration for AWS RDS PostgreSQL deployment
# Version: ~> 1.0

variable "identifier" {
  description = "Unique identifier for the RDS instance"
  type        = string
  default     = "sales-intelligence-db"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]*$", var.identifier))
    error_message = "Identifier must contain only alphanumeric characters and hyphens"
  }
}

variable "engine" {
  description = "Database engine type"
  type        = string
  default     = "postgres"

  validation {
    condition     = var.engine == "postgres"
    error_message = "Only PostgreSQL engine is supported"
  }
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.3"

  validation {
    condition     = can(regex("^15\\.[0-9]+$", var.engine_version))
    error_message = "Must use PostgreSQL version 15.x"
  }
}

variable "instance_class" {
  description = "RDS instance class for compute and memory capacity"
  type        = string
  default     = "db.r6g.2xlarge"

  validation {
    condition     = can(regex("^db\\.(r6g|r6i)\\.[2-8]xlarge$", var.instance_class))
    error_message = "Must use r6g or r6i instance class for production workloads"
  }
}

variable "allocated_storage" {
  description = "Allocated storage size in GB"
  type        = number
  default     = 100

  validation {
    condition     = var.allocated_storage >= 100 && var.allocated_storage <= 16384
    error_message = "Storage must be between 100GB and 16TB"
  }
}

variable "max_allocated_storage" {
  description = "Maximum storage size in GB for autoscaling"
  type        = number
  default     = 1000

  validation {
    condition     = var.max_allocated_storage >= var.allocated_storage
    error_message = "Max storage must be greater than or equal to allocated storage"
  }
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_period >= 30
    error_message = "Backup retention period must be at least 30 days"
  }
}

variable "backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "Mon:04:00-Mon:05:00"
}

variable "read_replica_count" {
  description = "Number of read replicas to deploy"
  type        = number
  default     = 2

  validation {
    condition     = var.read_replica_count >= 2 && var.read_replica_count <= 5
    error_message = "Must have between 2 and 5 read replicas for high availability"
  }
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when destroying database"
  type        = bool
  default     = false
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 30

  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be 0, 1, 5, 10, 15, 30, or 60 seconds"
  }
}

variable "performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to RDS resources"
  type        = map(string)
  default = {
    Environment = "production"
    Project     = "sales-intelligence-platform"
  }
}