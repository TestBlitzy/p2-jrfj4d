/**
 * API Constants for Sales & Intelligence Platform
 * Version: 1.0.0
 * 
 * Defines comprehensive API endpoint constants and configuration values for frontend
 * communication with backend services, including authentication, analytics,
 * market intelligence, and third-party integrations.
 */

// API Version and Global Configuration
export const API_VERSION = '/v1';
export const API_TIMEOUT = 30000;
export const API_RETRY_ATTEMPTS = 3;

// API Endpoint Configurations
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    MFA_SETUP: '/auth/mfa/setup',
    MFA_VERIFY: '/auth/mfa/verify',
    MFA_BACKUP: '/auth/mfa/backup-codes',
    OAUTH: {
      GOOGLE: '/auth/oauth/google',
      MICROSOFT: '/auth/oauth/microsoft',
      CALLBACK: '/auth/oauth/callback'
    },
    PASSWORD: {
      RESET: '/auth/password/reset',
      CHANGE: '/auth/password/change',
      FORGOT: '/auth/password/forgot'
    }
  },
  LEADS: {
    BASE: '/leads',
    SCORE: '/leads/score',
    QUALIFY: '/leads/qualify',
    ENGAGEMENT: '/leads/engagement',
    ANALYTICS: '/leads/analytics',
    BATCH: '/leads/batch',
    EXPORT: '/leads/export',
    IMPORT: '/leads/import',
    HISTORY: '/leads/history'
  },
  ANALYTICS: {
    HISTORICAL: '/analytics/historical',
    FORECAST: '/analytics/forecast',
    PATTERNS: '/analytics/patterns',
    TRENDS: '/analytics/trends',
    METRICS: '/analytics/metrics',
    AI: {
      MODELS: '/analytics/ai/models',
      PREDICTIONS: '/analytics/ai/predictions',
      TRAINING: '/analytics/ai/training'
    },
    REPORTS: {
      CUSTOM: '/analytics/reports/custom',
      SCHEDULED: '/analytics/reports/scheduled',
      EXPORT: '/analytics/reports/export'
    }
  },
  MARKET: {
    COMPETITORS: {
      LIST: '/market/competitors/list',
      ANALYSIS: '/market/competitors/analysis',
      TRACKING: '/market/competitors/tracking'
    },
    TRENDS: {
      INDUSTRY: '/market/trends/industry',
      REGIONAL: '/market/trends/regional',
      SEASONAL: '/market/trends/seasonal'
    },
    INTELLIGENCE: {
      INSIGHTS: '/market/intelligence/insights',
      ALERTS: '/market/intelligence/alerts',
      REPORTS: '/market/intelligence/reports'
    }
  },
  INTEGRATIONS: {
    CRM: {
      SALESFORCE: {
        CONNECT: '/integrations/crm/salesforce/connect',
        SYNC: '/integrations/crm/salesforce/sync',
        WEBHOOK: '/integrations/crm/salesforce/webhook'
      },
      HUBSPOT: {
        CONNECT: '/integrations/crm/hubspot/connect',
        SYNC: '/integrations/crm/hubspot/sync',
        WEBHOOK: '/integrations/crm/hubspot/webhook'
      }
    },
    EMAIL: {
      GMAIL: '/integrations/email/gmail',
      OUTLOOK: '/integrations/email/outlook',
      SENDGRID: '/integrations/email/sendgrid'
    },
    SOCIAL: {
      LINKEDIN: '/integrations/social/linkedin',
      TWITTER: '/integrations/social/twitter'
    }
  },
  MONITORING: {
    HEALTH: '/monitoring/health',
    METRICS: '/monitoring/metrics',
    LOGS: '/monitoring/logs',
    TRACES: '/monitoring/traces',
    ALERTS: '/monitoring/alerts'
  }
} as const;

// HTTP Methods Enum
export enum API_METHODS {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

// Standard API Headers
export const API_HEADERS = {
  CONTENT_TYPE: 'application/json',
  ACCEPT: 'application/json',
  AUTHORIZATION: 'Authorization',
  X_API_KEY: 'X-Api-Key',
  X_REQUEST_ID: 'X-Request-ID',
  X_CORRELATION_ID: 'X-Correlation-ID'
} as const;

// API Status Codes
export const API_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// API Timeout Configurations
export const API_TIMEOUTS = {
  DEFAULT: 30000,
  LONG: 60000,
  SHORT: 10000
} as const;

// API Retry Configurations
export const API_RETRY = {
  MAX_ATTEMPTS: 3,
  BACKOFF_FACTOR: 2,
  INITIAL_DELAY: 1000
} as const;

// Type definitions for strongly-typed usage
export type ApiEndpoint = typeof API_ENDPOINTS;
export type ApiMethod = keyof typeof API_METHODS;
export type ApiHeader = keyof typeof API_HEADERS;
export type ApiStatus = typeof API_STATUS[keyof typeof API_STATUS];
export type ApiTimeout = typeof API_TIMEOUTS[keyof typeof API_TIMEOUTS];