# AWS WAF Configuration for Sales & Intelligence Platform
# Provider version: ~> 5.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# WAF Web ACL for Regional Resources (ALB/API Gateway)
resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project}-${var.environment}-waf"
  description = "WAF rules for Sales & Intelligence Platform"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule #1: AWS Managed Core Rule Set
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = var.enable_logging
      metric_name               = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled  = true
    }
  }

  # Rule #2: Rate Limiting
  rule {
    name     = "RateLimit"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = var.enable_logging
      metric_name               = "RateLimitMetric"
      sampled_requests_enabled  = true
    }
  }

  # Rule #3: SQL Injection Prevention
  rule {
    name     = "SQLInjectionPrevention"
    priority = 3

    action {
      block {}
    }

    statement {
      sql_injection_match_statement {
        field_to_match {
          body {}
          query_string {}
          uri_path {}
        }
        text_transformation {
          priority = 1
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 2
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = var.enable_logging
      metric_name               = "SQLInjectionPreventionMetric"
      sampled_requests_enabled  = true
    }
  }

  # Rule #4: Cross-Site Scripting Protection
  rule {
    name     = "XSSProtection"
    priority = 4

    action {
      block {}
    }

    statement {
      xss_match_statement {
        field_to_match {
          body {}
          query_string {}
          uri_path {}
          header {
            name = "cookie"
          }
        }
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
        text_transformation {
          priority = 2
          type     = "URL_DECODE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = var.enable_logging
      metric_name               = "XSSProtectionMetric"
      sampled_requests_enabled  = true
    }
  }

  # Rule #5: Bad Bot Protection
  dynamic "rule" {
    for_each = var.block_bad_bots ? [1] : []
    content {
      name     = "BadBotProtection"
      priority = 5

      action {
        block {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesBotControlRuleSet"
          vendor_name = "AWS"
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = var.enable_logging
        metric_name               = "BadBotProtectionMetric"
        sampled_requests_enabled  = true
      }
    }
  }

  # Rule #6: IP Reputation List
  rule {
    name     = "IPReputationList"
    priority = 6

    action {
      block {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = var.enable_logging
      metric_name               = "IPReputationListMetric"
      sampled_requests_enabled  = true
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-waf"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }

  visibility_config {
    cloudwatch_metrics_enabled = var.enable_logging
    metric_name               = "WAFMainMetrics"
    sampled_requests_enabled  = true
  }
}

# WAF IP Rate Limiting Rule Group
resource "aws_wafv2_rule_group" "ip_rate_limit" {
  name     = "${var.project}-${var.environment}-ip-rate-limit"
  scope    = "REGIONAL"
  capacity = 2

  rule {
    name     = "IPRateLimit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.ip_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = var.enable_logging
      metric_name               = "IPRateLimitMetric"
      sampled_requests_enabled  = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = var.enable_logging
    metric_name               = "IPRateLimitGroupMetric"
    sampled_requests_enabled  = true
  }
}

# WAF Logging Configuration
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  count = var.enable_logging ? 1 : 0

  log_destination_configs = [aws_cloudwatch_log_group.waf[0].arn]
  resource_arn           = aws_wafv2_web_acl.main.arn

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior = "KEEP"
      condition {
        action_condition {
          action = "BLOCK"
        }
      }
      requirement = "MEETS_ANY"
    }
  }
}

# CloudWatch Log Group for WAF Logs
resource "aws_cloudwatch_log_group" "waf" {
  count = var.enable_logging ? 1 : 0

  name              = "/aws/waf/${var.project}-${var.environment}"
  retention_in_days = 90

  tags = {
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}

# Outputs
output "web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}

output "web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.id
}