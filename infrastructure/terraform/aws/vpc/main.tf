# AWS VPC Configuration for Sales & Intelligence Platform
# Terraform AWS Provider Version: ~> 5.0

# Main VPC Resource
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(
    {
      Name        = "${var.environment}-vpc"
      Environment = var.environment
    },
    var.tags
  )
}

# Private Subnets for EKS, RDS, and ElastiCache
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    {
      Name                              = "${var.environment}-private-subnet-${count.index + 1}"
      Environment                       = var.environment
      Tier                             = "private"
      "kubernetes.io/role/internal-elb" = "1"
    },
    var.tags
  )
}

# Public Subnets for ALB and NAT Gateway
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    {
      Name                     = "${var.environment}-public-subnet-${count.index + 1}"
      Environment             = var.environment
      Tier                    = "public"
      "kubernetes.io/role/elb" = "1"
    },
    var.tags
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    {
      Name        = "${var.environment}-igw"
      Environment = var.environment
    },
    var.tags
  )
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0
  domain = "vpc"

  tags = merge(
    {
      Name        = "${var.environment}-nat-eip-${count.index + 1}"
      Environment = var.environment
    },
    var.tags
  )
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : length(var.availability_zones)) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    {
      Name        = "${var.environment}-nat-gateway-${count.index + 1}"
      Environment = var.environment
    },
    var.tags
  )

  depends_on = [aws_internet_gateway.main]
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(
    {
      Name        = "${var.environment}-public-rt"
      Environment = var.environment
      Tier        = "public"
    },
    var.tags
  )
}

# Route Table for Private Subnets
resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.main[0].id : aws_nat_gateway.main[count.index].id
    }
  }

  tags = merge(
    {
      Name        = "${var.environment}-private-rt-${count.index + 1}"
      Environment = var.environment
      Tier        = "private"
    },
    var.tags
  )
}

# Route Table Associations for Public Subnets
resource "aws_route_table_association" "public" {
  count          = length(var.public_subnet_cidrs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Table Associations for Private Subnets
resource "aws_route_table_association" "private" {
  count          = length(var.private_subnet_cidrs)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  vpc_id                = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination_type = "cloudwatch-logs"
  log_destination      = aws_cloudwatch_log_group.vpc_flow_logs.arn
  iam_role_arn         = aws_iam_role.vpc_flow_logs.arn

  tags = merge(
    {
      Name        = "${var.environment}-vpc-flow-logs"
      Environment = var.environment
    },
    var.tags
  )
}

# CloudWatch Log Group for VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/${var.environment}-flow-logs"
  retention_in_days = 90

  tags = merge(
    {
      Name        = "${var.environment}-vpc-flow-logs"
      Environment = var.environment
    },
    var.tags
  )
}

# IAM Role for VPC Flow Logs
resource "aws_iam_role" "vpc_flow_logs" {
  name = "${var.environment}-vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    {
      Name        = "${var.environment}-vpc-flow-logs-role"
      Environment = var.environment
    },
    var.tags
  )
}

# IAM Policy for VPC Flow Logs
resource "aws_iam_role_policy" "vpc_flow_logs" {
  name = "${var.environment}-vpc-flow-logs-policy"
  role = aws_iam_role.vpc_flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}

# VPC Endpoints
resource "aws_vpc_endpoint" "s3" {
  count             = var.enable_vpce ? 1 : 0
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = aws_route_table.private[*].id

  tags = merge(
    {
      Name        = "${var.environment}-s3-endpoint"
      Environment = var.environment
    },
    var.tags
  )
}

# Data source for current region
data "aws_region" "current" {}

# Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.main[*].id
}

output "vpc_flow_log_group" {
  description = "The name of the CloudWatch log group for VPC flow logs"
  value       = aws_cloudwatch_log_group.vpc_flow_logs.name
}