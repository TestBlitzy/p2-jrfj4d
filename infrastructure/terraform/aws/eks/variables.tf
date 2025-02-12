# Terraform variables for AWS EKS cluster configuration
# Version: hashicorp/terraform ~> 1.0

variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster for the Sales & Intelligence Platform"
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version to use for the EKS cluster"
  default     = "1.27"
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where the EKS cluster will be deployed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for EKS node groups deployment across multiple AZs"
}

variable "instance_types" {
  type        = list(string)
  description = "List of EC2 instance types for EKS worker nodes"
  default     = ["m5.2xlarge", "m5.4xlarge"]
}

variable "disk_size" {
  type        = number
  description = "Size in GB for worker node EBS volumes"
  default     = 100
}

variable "node_groups" {
  type = map(object({
    name           = string
    instance_type  = string
    min_size      = number
    max_size      = number
    desired_size  = number
    max_unavailable = number
    labels        = map(string)
    taints        = list(object({
      key    = string
      value  = string
      effect = string
    }))
    capacity_type = string
  }))
  description = "Configuration map for EKS node groups including compute, scaling, and scheduling parameters"
}

variable "scaling_config" {
  type = object({
    desired_size = number
    max_size     = number
    min_size     = number
  })
  description = "Default auto-scaling configuration for EKS node groups"
  default = {
    desired_size = 3
    max_size     = 10
    min_size     = 2
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all EKS cluster resources"
  default = {
    Environment = "production"
    ManagedBy   = "terraform"
    Project     = "sales-intelligence-platform"
  }
}

# Node group configurations for different workload types
variable "workload_node_groups" {
  type = map(object({
    name          = string
    min_size      = number
    max_size      = number
    desired_size  = number
    instance_type = string
    labels        = map(string)
    taints        = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  description = "Configuration for specialized node groups based on workload requirements"
  default = {
    web = {
      name          = "web-tier"
      min_size      = 2
      max_size      = 8
      desired_size  = 3
      instance_type = "m5.2xlarge"
      labels = {
        "workload/type" = "web"
      }
      taints = []
    },
    api = {
      name          = "api-tier"
      min_size      = 3
      max_size      = 12
      desired_size  = 5
      instance_type = "m5.2xlarge"
      labels = {
        "workload/type" = "api"
      }
      taints = []
    },
    ai = {
      name          = "ai-tier"
      min_size      = 2
      max_size      = 8
      desired_size  = 4
      instance_type = "g4dn.2xlarge"
      labels = {
        "workload/type" = "ai"
      }
      taints = []
    }
  }
}

variable "cluster_encryption_config" {
  type = object({
    provider_key_arn = string
    resources        = list(string)
  })
  description = "KMS encryption configuration for EKS cluster"
  default = {
    provider_key_arn = null
    resources        = ["secrets"]
  }
}

variable "cluster_endpoint_private_access" {
  type        = bool
  description = "Enable private API server endpoint access"
  default     = true
}

variable "cluster_endpoint_public_access" {
  type        = bool
  description = "Enable public API server endpoint access"
  default     = false
}

variable "cluster_log_types" {
  type        = list(string)
  description = "List of control plane logging types to enable"
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}