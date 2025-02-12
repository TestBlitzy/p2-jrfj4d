/**
 * @fileoverview Central export point for all application constants
 * @version 1.0.0
 * 
 * This file serves as the unified interface for accessing all constant values
 * used throughout the backend application. It consolidates error codes,
 * integration types, lead statuses, and related configurations into a single
 * export point for consistent usage across the system.
 */

// Import error handling related constants
import {
    ErrorCodes,
    ErrorMessages,
    ErrorRetryConfig,
    isValidErrorCode,
    hasRetryConfig,
    formatErrorMessage
} from './error-codes';

// Import integration related enums
import {
    IntegrationType,
    IntegrationAuthType,
    IntegrationStatus,
    IntegrationScope
} from './integration-types';

// Import lead status enums
import {
    LeadStatus
} from './lead-status';

// Re-export error handling constants and utilities
export {
    ErrorCodes,
    ErrorMessages,
    ErrorRetryConfig,
    isValidErrorCode,
    hasRetryConfig,
    formatErrorMessage
};

// Re-export integration related constants
export {
    IntegrationType,
    IntegrationAuthType,
    IntegrationStatus,
    IntegrationScope
};

// Re-export lead status constants
export {
    LeadStatus
};

/**
 * System-wide configuration constants
 * These values are used across different modules for consistent behavior
 */
export const SystemConstants = {
    DEFAULT_RETRY_ATTEMPTS: 3,
    DEFAULT_TIMEOUT: 30000, // 30 seconds
    MAX_BATCH_SIZE: 1000,
    CACHE_TTL: 3600, // 1 hour in seconds
} as const;

/**
 * API rate limiting constants
 * Based on integration specifications from technical documentation
 */
export const RateLimits = {
    [IntegrationType.SALESFORCE]: 100000, // requests per day
    [IntegrationType.HUBSPOT]: 500000,    // requests per day
    [IntegrationType.LINKEDIN_SALES_NAVIGATOR]: 100, // requests per day per user
    [IntegrationType.GMAIL]: 1000000,     // requests per day
    [IntegrationType.SLACK]: 1,           // messages per second
} as const;

/**
 * Lead scoring thresholds
 * Used for automated lead status transitions
 */
export const LeadScoreThresholds = {
    QUALIFIED: 50,
    SALES_READY: 80,
    HIGH_PRIORITY: 90,
} as const;

/**
 * Integration version constants
 * Tracks API versions for external service integrations
 */
export const IntegrationVersions = {
    [IntegrationType.SALESFORCE]: 'v54.0',
    [IntegrationType.HUBSPOT]: 'v3',
    [IntegrationType.GMAIL]: 'v1',
    [IntegrationType.SLACK]: 'v2',
} as const;

/**
 * Type definitions for exported constants
 * Ensures type safety when using constant values
 */
export type SystemConstantKeys = keyof typeof SystemConstants;
export type RateLimitKeys = keyof typeof RateLimits;
export type LeadScoreThresholdKeys = keyof typeof LeadScoreThresholds;
export type IntegrationVersionKeys = keyof typeof IntegrationVersions;