# Core VPC Configuration
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC - must be /16 to accommodate multiple subnets"
  default     = "10.0.0.0/16"

  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/16$", var.vpc_cidr))
    error_message = "VPC CIDR must be a valid /16 network"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment name for resource tagging and configuration"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production"
  }
}

# Availability Zone Configuration
variable "availability_zones" {
  type        = list(string)
  description = "List of AWS availability zones for multi-AZ deployment"
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones required for high availability"
  }
}

# Subnet Configuration
variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets hosting EKS clusters, RDS instances, and ElastiCache clusters"
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least 2 private subnets required for high availability"
  }
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets hosting load balancers and NAT gateways"
  default     = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnets required for high availability"
  }
}

# NAT Gateway Configuration
variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT Gateway for private subnet internet access - required for EKS and other services"
  default     = true
}

variable "single_nat_gateway" {
  type        = bool
  description = "Use single NAT Gateway instead of one per AZ - reduces cost but impacts availability"
  default     = false
}

# Resource Tagging
variable "tags" {
  type        = map(string)
  description = "Additional resource tags for cost allocation and resource management"
  default = {
    Project    = "Sales-Intelligence-Platform"
    ManagedBy  = "Terraform"
  }
}