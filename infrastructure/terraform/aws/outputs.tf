# AWS Infrastructure Outputs for Sales & Intelligence Platform
# Provider version: hashicorp/aws ~> 5.0

# EKS Cluster Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint for the EKS cluster API server"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_cluster_certificate_authority" {
  description = "Certificate authority data for the EKS cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

# RDS Database Outputs
output "rds_primary_endpoint" {
  description = "The connection endpoint for the primary RDS PostgreSQL instance"
  value       = module.rds.primary_db_endpoint
  sensitive   = true
}

output "rds_read_replica_endpoints" {
  description = "List of connection endpoints for the RDS read replicas"
  value       = module.rds.read_replica_endpoints
  sensitive   = true
}

output "rds_monitoring_info" {
  description = "RDS monitoring configuration details"
  value       = module.rds.monitoring_info
}

# ElastiCache Redis Outputs
output "redis_primary_endpoint" {
  description = "The primary endpoint address for the Redis cluster"
  value       = module.elasticache.primary_endpoint
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "The reader endpoint address for the Redis cluster"
  value       = module.elasticache.reader_endpoint
  sensitive   = true
}

output "redis_port" {
  description = "The port number for Redis connections"
  value       = module.elasticache.port
}

# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

# Security Outputs
output "kms_key_arns" {
  description = "ARNs of KMS keys used for encryption"
  value = {
    rds         = module.rds.kms_key_arn
    elasticache = module.elasticache.kms_key_arn
    eks         = module.eks.kms_key_arn
  }
  sensitive = true
}

# Monitoring Outputs
output "cloudwatch_log_groups" {
  description = "CloudWatch Log Group names for various services"
  value = {
    eks = "/aws/eks/${var.cluster_name}/cluster"
    rds = "/aws/rds/instance/${var.rds_identifier}/postgresql"
    vpc = module.vpc.vpc_flow_log_group
  }
}

output "alarm_arns" {
  description = "ARNs of CloudWatch alarms for monitoring"
  value = {
    redis = module.elasticache.cloudwatch_alarm_arns
    rds   = module.rds.cloudwatch_alarm_arns
  }
}

# DNS and Routing Outputs
output "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS management"
  value       = aws_route53_zone.main.zone_id
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  value       = aws_acm_certificate.main.arn
}

# Cost Management Outputs
output "resource_tags" {
  description = "Common resource tags for cost allocation"
  value = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
    CostCenter  = "sales-ops"
  }
}

# Backup and Recovery Outputs
output "backup_info" {
  description = "Backup configuration details for all services"
  value = {
    rds_backup_window         = module.rds.backup_window
    redis_snapshot_window     = module.elasticache.snapshot_window
    backup_retention_days     = var.backup_retention_days
    cross_region_replication = var.enable_dr
  }
}