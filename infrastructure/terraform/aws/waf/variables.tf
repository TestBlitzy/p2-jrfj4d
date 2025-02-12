# WAF Configuration Variables for Sales & Intelligence Platform
# Version: ~> 1.0

# Core WAF Rate Limiting Configuration
variable "waf_rate_limit" {
  type        = number
  description = "Global rate limit for requests per 5-minute period per IP"
  default     = 2000

  validation {
    condition     = var.waf_rate_limit >= 1000 && var.waf_rate_limit <= 10000
    error_message = "WAF rate limit must be between 1000 and 10000 requests per 5 minutes"
  }
}

variable "ip_rate_limit" {
  type        = number
  description = "IP-based rate limit for requests per 5-minute period"
  default     = 1000

  validation {
    condition     = var.ip_rate_limit >= 500 && var.ip_rate_limit <= 5000
    error_message = "IP rate limit must be between 500 and 5000 requests per 5 minutes"
  }
}

# WAF Protection Features
variable "block_bad_bots" {
  type        = bool
  description = "Enable blocking of known bad bot signatures and user agents"
  default     = true
}

variable "enable_logging" {
  type        = bool
  description = "Enable detailed WAF logging to CloudWatch Logs"
  default     = true
}

# WAF Scope Configuration
variable "waf_scope" {
  type        = string
  description = "Scope of WAF deployment (REGIONAL for ALB/API Gateway or CLOUDFRONT for CDN)"
  
  validation {
    condition     = contains(["REGIONAL", "CLOUDFRONT"], var.waf_scope)
    error_message = "WAF scope must be either REGIONAL or CLOUDFRONT"
  }
}

# WAF Rule Configurations
variable "waf_rules" {
  type = list(object({
    name        = string
    priority    = number
    action      = string
    rule_type   = string
    description = string
  }))
  description = "List of WAF rules including XSS protection, SQL injection prevention, and sensitive data protection"
  default = [
    {
      name        = "XSSProtection"
      priority    = 1
      action      = "block"
      rule_type   = "XSS"
      description = "Blocks cross-site scripting attacks"
    },
    {
      name        = "SQLInjectionProtection"
      priority    = 2
      action      = "block"
      rule_type   = "SQLI"
      description = "Blocks SQL injection attempts"
    },
    {
      name        = "PIIProtection"
      priority    = 3
      action      = "block"
      rule_type   = "SENSITIVE_DATA"
      description = "Blocks exposure of sensitive PII data"
    },
    {
      name        = "IPReputationList"
      priority    = 4
      action      = "block"
      rule_type   = "IP_REPUTATION"
      description = "Blocks requests from known malicious IP addresses"
    }
  ]

  validation {
    condition     = length(var.waf_rules) > 0
    error_message = "At least one WAF rule must be defined"
  }
}

# Import core project variables
variable "project" {
  type        = string
  description = "Project name for WAF resource naming"
}

variable "environment" {
  type        = string
  description = "Deployment environment for WAF configuration"
}

# Geographic Blocking Configuration
variable "geo_match_statement" {
  type = object({
    enabled           = bool
    blocked_countries = list(string)
  })
  description = "Configuration for geographic-based request blocking"
  default = {
    enabled           = false
    blocked_countries = []
  }
}

# Custom Response Configuration
variable "custom_response" {
  type = object({
    response_code = number
    response_body = string
  })
  description = "Custom response configuration for blocked requests"
  default = {
    response_code = 403
    response_body = "Request blocked by WAF"
  }

  validation {
    condition     = var.custom_response.response_code >= 400 && var.custom_response.response_code <= 500
    error_message = "Response code must be between 400 and 500"
  }
}

# Rule Group Association
variable "managed_rule_groups" {
  type = list(object({
    name            = string
    priority        = number
    override_action = string
    excluded_rules  = list(string)
  }))
  description = "AWS Managed Rule Groups to be associated with the WAF ACL"
  default = [
    {
      name            = "AWSManagedRulesCommonRuleSet"
      priority        = 10
      override_action = "none"
      excluded_rules  = []
    },
    {
      name            = "AWSManagedRulesKnownBadInputsRuleSet"
      priority        = 20
      override_action = "none"
      excluded_rules  = []
    }
  ]
}