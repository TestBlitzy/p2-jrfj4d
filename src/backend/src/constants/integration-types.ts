/**
 * @fileoverview Integration type constants and enums for external service integrations
 * Defines the core integration types, authentication methods, statuses and permission scopes
 * used throughout the Sales & Intelligence Platform
 * @version 1.0.0
 */

/**
 * Supported external service integration types
 * Maps to specific authentication requirements and API patterns for each service
 */
export enum IntegrationType {
    /** Salesforce CRM integration using OAuth2 and REST API v54.0 */
    SALESFORCE = 'salesforce',
    
    /** HubSpot CRM integration using OAuth2/API key and v3 API */
    HUBSPOT = 'hubspot',
    
    /** Gmail email service integration using OAuth2 and Gmail API v1 */
    GMAIL = 'gmail',
    
    /** SendGrid email service integration using API key authentication */
    SENDGRID = 'sendgrid',
    
    /** LinkedIn Sales Navigator integration using OAuth2 authentication */
    LINKEDIN_SALES_NAVIGATOR = 'linkedin_sales_navigator',
    
    /** Slack communication integration using Bot tokens and Web API v2 */
    SLACK = 'slack'
}

/**
 * Authentication methods supported for external service integrations
 * Defines the security patterns and token management approaches
 */
export enum IntegrationAuthType {
    /** OAuth 2.0 flow with automatic token refresh */
    OAUTH2 = 'oauth2',
    
    /** Static API key for direct service authentication */
    API_KEY = 'api_key',
    
    /** JWT-based authentication with signature verification */
    JWT = 'jwt',
    
    /** Basic authentication with credentials (limited usage) */
    BASIC = 'basic'
}

/**
 * Integration connection status indicators
 * Used for monitoring and managing integration health
 */
export enum IntegrationStatus {
    /** Integration is connected and operational */
    ACTIVE = 'active',
    
    /** Integration is manually disabled or disconnected */
    INACTIVE = 'inactive',
    
    /** Integration setup or authentication is in progress */
    PENDING = 'pending',
    
    /** Integration connection has failed or encountered errors */
    FAILED = 'failed'
}

/**
 * Permission scopes for integration access control
 * Enables granular control over integration capabilities
 */
export enum IntegrationScope {
    /** Read-only access to integration resources */
    READ = 'read',
    
    /** Write-only access to integration resources */
    WRITE = 'write',
    
    /** Full read and write access to integration resources */
    READ_WRITE = 'read_write'
}