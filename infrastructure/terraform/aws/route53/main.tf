# AWS Route 53 DNS Configuration for Sales & Intelligence Platform
# Version: ~> 5.0

# Primary hosted zone configuration
resource "aws_route53_zone" "main" {
  name              = var.domain_name
  comment          = "Managed by Terraform - Sales & Intelligence Platform ${var.environment}"
  force_destroy    = false
  enable_dnssec    = var.enable_dnssec

  tags = merge(var.tags, {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Project     = "Sales & Intelligence Platform"
  })
}

# Enhanced health check configuration for primary endpoint
resource "aws_route53_health_check" "primary" {
  count = var.enable_health_checks ? 1 : 0

  fqdn              = var.domain_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = var.health_check_config.failure_threshold
  request_interval  = var.health_check_config.request_interval
  regions           = var.health_check_regions
  enable_sni        = true
  search_string     = "healthy"
  measure_latency   = true
  invert_healthcheck = false
  disabled          = false

  tags = merge(var.tags, {
    Environment = var.environment
    Purpose     = "Primary Endpoint Health"
  })
}

# Data source for CloudFront distribution
data "aws_cloudfront_distribution" "cdn" {
  id = var.cloudfront_distribution_id
}

# Primary A record with failover routing
resource "aws_route53_record" "primary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = data.aws_cloudfront_distribution.cdn.domain_name
    zone_id               = data.aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = var.enable_health_checks ? aws_route53_health_check.primary[0].id : null
  set_identifier  = "primary"
}

# Secondary A record for failover routing
resource "aws_route53_record" "secondary" {
  count = var.failover_routing ? 1 : 0

  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.secondary_endpoint
    zone_id               = var.secondary_endpoint_zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "secondary"
}

# WWW CNAME record
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = var.dns_ttl
  records = [var.domain_name]
}

# Query logging configuration
resource "aws_route53_query_log" "main" {
  count = var.enable_query_logging ? 1 : 0

  depends_on = [aws_route53_zone.main]

  cloudwatch_log_group_arn = var.cloudwatch_log_group_arn
  zone_id                  = aws_route53_zone.main.zone_id
}

# DNSSEC configuration
resource "aws_route53_key_signing_key" "main" {
  count = var.enable_dnssec ? 1 : 0

  hosted_zone_id             = aws_route53_zone.main.id
  key_management_service_arn = var.kms_key_arn
  name                       = "key-signing-key"
}

resource "aws_route53_hosted_zone_dnssec" "main" {
  count = var.enable_dnssec ? 1 : 0

  depends_on = [aws_route53_key_signing_key.main]
  
  hosted_zone_id = aws_route53_zone.main.id
}

# Outputs for reference in other modules
output "zone_id" {
  description = "The hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "name_servers" {
  description = "The name servers for the hosted zone"
  value       = aws_route53_zone.main.name_servers
}

output "health_check_id" {
  description = "The health check ID"
  value       = var.enable_health_checks ? aws_route53_health_check.primary[0].id : null
}