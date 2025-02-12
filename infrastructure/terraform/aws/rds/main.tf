# AWS RDS PostgreSQL Configuration for Sales & Intelligence Platform
# Provider version: ~> 5.0

# KMS key for RDS encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 30
  enable_key_rotation    = true
  
  tags = {
    Name        = "rds-encryption-key"
    Environment = "production"
    Project     = "sales-intelligence-platform"
  }
}

# KMS key alias
resource "aws_kms_alias" "rds" {
  name          = "alias/rds-encryption-key"
  target_key_id = aws_kms_key.rds.key_id
}

# Enhanced monitoring IAM role
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "rds-enhanced-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

# Attach enhanced monitoring policy
resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# DB subnet group
resource "aws_db_subnet_group" "main" {
  name        = "sales-intelligence-db-subnet"
  description = "DB subnet group for Sales Intelligence Platform"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "sales-intelligence-db-subnet"
    Environment = "production"
    Project     = "sales-intelligence-platform"
  }
}

# DB parameter group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "sales-intelligence-params"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_checkpoints"
    value = "1"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Name        = "sales-intelligence-params"
    Environment = "production"
    Project     = "sales-intelligence-platform"
  }
}

# Primary RDS instance
resource "aws_db_instance" "primary" {
  identifier     = "sales-intelligence-db"
  engine         = "postgres"
  engine_version = "15.3"
  
  instance_class    = var.instance_class
  allocated_storage = 100
  storage_type      = "gp3"
  
  db_name  = var.db_name
  username = "dbadmin"
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  
  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "Mon:04:00-Mon:05:00"
  
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  monitoring_interval            = 30
  monitoring_role_arn           = aws_iam_role.rds_enhanced_monitoring.arn
  
  auto_minor_version_upgrade  = true
  copy_tags_to_snapshot      = true
  deletion_protection        = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "sales-intelligence-db-final-snapshot"
  
  storage_encrypted = true
  kms_key_id       = aws_kms_key.rds.arn
  
  enabled_cloudwatch_logs_exports = [
    "postgresql",
    "upgrade"
  ]
  
  tags = {
    Name        = "sales-intelligence-primary-db"
    Environment = "production"
    Project     = "sales-intelligence-platform"
  }
}

# Read replicas
resource "aws_db_instance" "replica" {
  count = 2

  identifier     = "sales-intelligence-replica-${count.index + 1}"
  instance_class = var.instance_class
  
  replicate_source_db = aws_db_instance.primary.id
  
  multi_az = false
  
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  monitoring_interval            = 30
  monitoring_role_arn           = aws_iam_role.rds_enhanced_monitoring.arn
  
  auto_minor_version_upgrade = true
  copy_tags_to_snapshot     = true
  
  enabled_cloudwatch_logs_exports = [
    "postgresql",
    "upgrade"
  ]
  
  tags = {
    Name        = "sales-intelligence-replica-${count.index + 1}"
    Environment = "production"
    Project     = "sales-intelligence-platform"
  }
}

# Security group for RDS
resource "aws_security_group" "rds" {
  name        = "sales-intelligence-rds-sg"
  description = "Security group for RDS instances"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.eks_security_group_id]
    description     = "Allow PostgreSQL access from EKS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "sales-intelligence-rds-sg"
    Environment = "production"
    Project     = "sales-intelligence-platform"
  }
}

# CloudWatch alarms for RDS monitoring
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [var.sns_topic_arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.id
  }
}

# Outputs
output "primary_db_endpoint" {
  description = "The endpoint of the primary database"
  value       = aws_db_instance.primary.endpoint
}

output "read_replica_endpoints" {
  description = "The endpoints of the read replicas"
  value       = aws_db_instance.replica[*].endpoint
}

output "monitoring_info" {
  description = "RDS monitoring configuration"
  value = {
    enhanced_monitoring_arn          = aws_iam_role.rds_enhanced_monitoring.arn
    performance_insights_kms_key_id  = aws_kms_key.rds.arn
  }
}