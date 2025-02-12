# AWS Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Data source for AWS account ID
data "aws_caller_identity" "current" {}

# EKS OIDC provider data source
data "aws_iam_openid_connect_provider" "eks" {
  url = "https://oidc.eks.${data.aws_region.current.name}.amazonaws.com/id/${var.eks_cluster_name}"
}

# EKS Cluster Role
resource "aws_iam_role" "eks_cluster_role" {
  name = "${var.project_name}-${var.environment}-eks-cluster-role"
  description = "IAM role for EKS cluster management with OIDC integration"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  ]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-eks-cluster-role"
    ManagedBy = "terraform"
  })
}

# EKS Node Role
resource "aws_iam_role" "eks_node_role" {
  name = "${var.project_name}-${var.environment}-eks-node-role"
  description = "IAM role for EKS worker nodes with enhanced security"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-eks-node-role"
    ManagedBy = "terraform"
  })
}

# EKS Node KMS Policy
resource "aws_iam_role_policy" "eks_node_kms" {
  name = "${var.project_name}-${var.environment}-eks-node-kms-policy"
  role = aws_iam_role.eks_node_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [var.kms_key_arn]
      }
    ]
  })
}

# RDS Monitoring Role
resource "aws_iam_role" "rds_monitoring_role" {
  count = var.enable_rds_monitoring ? 1 : 0
  name = "${var.project_name}-${var.environment}-rds-monitoring-role"
  description = "IAM role for RDS enhanced monitoring with CloudWatch integration"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "monitoring.rds.amazonaws.com"
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  ]

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-monitoring-role"
    ManagedBy = "terraform"
  })
}

# S3 Access Policy for EKS
resource "aws_iam_role_policy" "eks_s3_access" {
  name = "${var.project_name}-${var.environment}-eks-s3-policy"
  role = aws_iam_role.eks_node_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject"
        ]
        Resource = concat(
          var.s3_bucket_arns,
          [for arn in var.s3_bucket_arns : "${arn}/*"]
        )
      }
    ]
  })
}

# CloudWatch Logs Policy for EKS
resource "aws_iam_role_policy" "eks_cloudwatch" {
  name = "${var.project_name}-${var.environment}-eks-cloudwatch-policy"
  role = aws_iam_role.eks_node_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup"
        ]
        Resource = "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:log-group:/aws/eks/${var.eks_cluster_name}/*"
      }
    ]
  })
}

# Outputs
output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster_role.arn
}

output "eks_node_role_arn" {
  description = "ARN of the EKS node IAM role"
  value       = aws_iam_role.eks_node_role.arn
}

output "rds_monitoring_role_arn" {
  description = "ARN of the RDS monitoring IAM role"
  value       = var.enable_rds_monitoring ? aws_iam_role.rds_monitoring_role[0].arn : null
}