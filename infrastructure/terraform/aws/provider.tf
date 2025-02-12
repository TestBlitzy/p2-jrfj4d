# Configure Terraform and required providers
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Enforce minimum Terraform version
  required_version = "~> 1.5"
}

# Primary region provider configuration
provider "aws" {
  alias  = "primary"
  region = var.aws_region

  # Apply common resource tags
  default_tags {
    tags = var.common_tags
  }

  # Enhanced security configuration
  assume_role {
    role_arn     = var.primary_role_arn
    session_name = "primary_deployment"
  }

  # Default encryption configuration
  default_encryption {
    kms_key_id = var.primary_kms_key_id
  }

  # Retry configuration for API calls
  retry_mode  = "standard"
  max_retries = 5

  # Enhanced logging configuration
  logging {
    log_level  = "INFO"
    log_format = "JSON"
  }
}

# Secondary region provider configuration for disaster recovery
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region

  # Apply common resource tags
  default_tags {
    tags = var.common_tags
  }

  # Enhanced security configuration
  assume_role {
    role_arn     = var.secondary_role_arn
    session_name = "dr_deployment"
  }

  # Default encryption configuration
  default_encryption {
    kms_key_id = var.secondary_kms_key_id
  }

  # Retry configuration for API calls
  retry_mode  = "standard"
  max_retries = 5

  # Enhanced logging configuration
  logging {
    log_level  = "INFO"
    log_format = "JSON"
  }
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

# Data source to get AWS partition (aws, aws-cn, aws-us-gov)
data "aws_partition" "current" {}

# Data source to get available AZs in primary region
data "aws_availability_zones" "primary" {
  provider = aws.primary
  state    = "available"
}

# Data source to get available AZs in secondary region
data "aws_availability_zones" "secondary" {
  provider = aws.secondary
  state    = "available"
}

# Provider feature flags
provider "aws" {
  alias = "primary_features"
  
  # Enable S3 and DynamoDB encryption by default
  s3_force_path_style           = false
  s3_use_path_style            = false
  dynamodb_endpoint            = null
  skip_credentials_validation  = false
  skip_metadata_api_check     = false
  skip_requesting_account_id  = false

  # Enable EC2 metadata tags
  ec2_metadata_tags_enabled = true
}

# Provider feature flags for secondary region
provider "aws" {
  alias = "secondary_features"
  
  # Enable S3 and DynamoDB encryption by default
  s3_force_path_style           = false
  s3_use_path_style            = false
  dynamodb_endpoint            = null
  skip_credentials_validation  = false
  skip_metadata_api_check     = false
  skip_requesting_account_id  = false

  # Enable EC2 metadata tags
  ec2_metadata_tags_enabled = true
}