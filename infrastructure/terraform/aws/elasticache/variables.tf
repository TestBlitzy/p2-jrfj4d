# Variables definition for AWS ElastiCache Redis cluster configuration
# Version: ~> 1.0

variable "cluster_id" {
  description = "Identifier for the ElastiCache Redis cluster"
  type        = string
  default     = "sales-intelligence-redis"

  validation {
    condition     = can(regex("^[a-z0-9-]*$", var.cluster_id)) && length(var.cluster_id) <= 40
    error_message = "Cluster ID must contain only lowercase alphanumeric characters and hyphens, and be 40 characters or less"
  }
}

variable "node_type" {
  description = "Instance type for Redis cluster nodes"
  type        = string
  default     = "cache.r6g.xlarge"

  validation {
    condition     = can(regex("^cache\\.(r6g|r6gd|r5|r5d)\\.(xlarge|2xlarge|4xlarge)$", var.node_type))
    error_message = "Node type must be a memory-optimized instance type suitable for production workloads"
  }
}

variable "num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 2

  validation {
    condition     = var.num_cache_nodes >= 2 && var.num_cache_nodes <= 6
    error_message = "Number of cache nodes must be between 2 and 6 for high availability and performance"
  }
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0.7"

  validation {
    condition     = can(regex("^7\\.0\\.[0-9]+$", var.engine_version))
    error_message = "Redis version must be 7.0.x for required features and security compliance"
  }
}

variable "port" {
  description = "Port number for Redis cluster"
  type        = number
  default     = 6379

  validation {
    condition     = var.port >= 1024 && var.port <= 65535
    error_message = "Port must be between 1024 and 65535"
  }
}

variable "parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7.0"

  validation {
    condition     = can(regex("^redis7", var.parameter_group_family))
    error_message = "Parameter group family must be compatible with Redis 7.0"
  }
}

variable "maintenance_window" {
  description = "Weekly maintenance window"
  type        = string
  default     = "sun:05:00-sun:06:00"

  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]$", var.maintenance_window))
    error_message = "Maintenance window must be in the format day:HH:MM-day:HH:MM with valid times"
  }
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain automatic snapshots"
  type        = number
  default     = 7

  validation {
    condition     = var.snapshot_retention_limit >= 7 && var.snapshot_retention_limit <= 35
    error_message = "Snapshot retention must be between 7 and 35 days for production workloads"
  }
}

variable "tags" {
  description = "Tags to apply to ElastiCache resources"
  type        = map(string)
  default = {
    Environment         = "production"
    Service            = "sales-intelligence"
    ManagedBy          = "terraform"
    CostCenter         = "sales-ops"
    BackupPolicy       = "daily"
    SecurityCompliance = "required"
  }
}