# AWS ElastiCache Redis Cluster Configuration
# Provider version: ~> 5.0

# KMS key for encryption
resource "aws_kms_key" "redis" {
  description             = "KMS key for Redis encryption"
  deletion_window_in_days = 30
  enable_key_rotation    = true

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_id}-kms-key"
    }
  )
}

# Redis parameter group
resource "aws_elasticache_parameter_group" "redis" {
  family = var.parameter_group_family
  name   = "${var.cluster_id}-params"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "activedefrag"
    value = "yes"
  }

  tags = var.tags
}

# Redis subnet group
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.cluster_id}-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = var.tags
}

# Redis replication group
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = var.cluster_id
  replication_group_description = "Redis cluster for Sales Intelligence Platform"
  node_type                    = var.node_type
  port                         = var.port
  parameter_group_name         = aws_elasticache_parameter_group.redis.name
  subnet_group_name            = aws_elasticache_subnet_group.redis.name
  automatic_failover_enabled   = true
  multi_az_enabled            = true
  num_cache_clusters          = var.num_cache_nodes
  engine                      = "redis"
  engine_version              = var.engine_version
  maintenance_window          = var.maintenance_window
  snapshot_retention_limit    = var.snapshot_retention_limit
  snapshot_window            = "00:00-01:00"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                = aws_kms_key.redis.arn
  auth_token                = random_password.auth_token.result

  tags = var.tags
}

# Generate random auth token
resource "random_password" "auth_token" {
  length  = 32
  special = false
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "${var.cluster_id}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = 300
  statistic          = "Average"
  threshold          = 75
  alarm_actions      = []  # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "memory_usage" {
  alarm_name          = "${var.cluster_id}-memory-usage"
  alarm_description   = "Redis cluster memory usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = 300
  statistic          = "Average"
  threshold          = 80
  alarm_actions      = []  # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "cache_hits" {
  alarm_name          = "${var.cluster_id}-cache-hits"
  alarm_description   = "Redis cluster cache hit ratio"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name        = "CacheHitRate"
  namespace          = "AWS/ElastiCache"
  period             = 300
  statistic          = "Average"
  threshold          = 80
  alarm_actions      = []  # Add SNS topic ARN for notifications

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = var.tags
}

# Outputs
output "primary_endpoint" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Redis reader endpoint address"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = var.port
}

output "auth_token" {
  description = "Redis AUTH token"
  value       = random_password.auth_token.result
  sensitive   = true
}

output "cloudwatch_alarm_arns" {
  description = "ARNs of CloudWatch alarms"
  value = [
    aws_cloudwatch_metric_alarm.cpu_utilization.arn,
    aws_cloudwatch_metric_alarm.memory_usage.arn,
    aws_cloudwatch_metric_alarm.cache_hits.arn
  ]
}