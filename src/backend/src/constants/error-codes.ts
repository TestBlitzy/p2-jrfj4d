/**
 * @fileoverview Centralized error code definitions and configurations for standardized error handling
 * across the application. Includes comprehensive retry strategies and monitoring-friendly error codes.
 * 
 * This file implements the error handling specifications from section 3.5 of the technical documentation,
 * providing standardized error tracking and system health monitoring capabilities.
 */

/**
 * Monitoring-friendly numeric error codes for consistent error handling and tracking.
 * Range 4xxx represents client errors, 5xxx represents server errors.
 */
export enum ErrorCodes {
    VALIDATION_ERROR = 4001,
    AUTHENTICATION_ERROR = 4010,
    AUTHORIZATION_ERROR = 4030,
    INTEGRATION_ERROR = 5001,
    API_TIMEOUT = 5080,
    AI_PROCESSING_ERROR = 5020,
    DATABASE_ERROR = 5030,
    NETWORK_ERROR = 5040
}

/**
 * User-friendly error messages with placeholders for dynamic content.
 * Messages follow a consistent format and support template literals for variable injection.
 */
export const ErrorMessages = {
    VALIDATION_ERROR: 'Data validation failed: ${details}. Please review input and try again.',
    AUTHENTICATION_ERROR: 'Authentication failed. Please verify credentials and try again.',
    AUTHORIZATION_ERROR: 'Insufficient permissions to perform this action.',
    INTEGRATION_ERROR: 'Integration error with ${service}: ${details}. Retrying operation.',
    API_TIMEOUT: 'Request timed out. Automatic retry in progress.',
    AI_PROCESSING_ERROR: 'AI processing failed. Falling back to rule-based analysis.',
    DATABASE_ERROR: 'Database operation failed: ${details}. Please try again.',
    NETWORK_ERROR: 'Network connectivity issue detected. Please check your connection.'
} as const;

/**
 * Type definition for backoff strategies
 */
type BackoffType = 'exponential' | 'fixed';

/**
 * Interface for retry configuration
 */
interface RetryConfig {
    maxAttempts: number;
    backoffType: BackoffType;
    initialInterval?: number;
    interval?: number;
    maxInterval?: number;
    fallback: string;
}

/**
 * Detailed retry configurations including attempts, intervals, backoff strategies,
 * and fallback behaviors. Implements the retry strategies specified in the technical
 * documentation section 3.5.
 */
export const ErrorRetryConfig: Record<string, RetryConfig> = {
    API_TIMEOUT: {
        maxAttempts: 3,
        backoffType: 'exponential',
        initialInterval: 1000, // 1 second
        maxInterval: 5000, // 5 seconds
        fallback: 'cache'
    },
    INTEGRATION_ERROR: {
        maxAttempts: 5,
        backoffType: 'fixed',
        interval: 60000, // 1 minute
        fallback: 'offline_processing'
    },
    AI_PROCESSING_ERROR: {
        maxAttempts: 2,
        backoffType: 'fixed',
        interval: 30000, // 30 seconds
        fallback: 'rule_based'
    },
    DATABASE_ERROR: {
        maxAttempts: 3,
        backoffType: 'exponential',
        initialInterval: 2000, // 2 seconds
        maxInterval: 10000, // 10 seconds
        fallback: 'replica'
    }
} as const;

/**
 * Type guard to check if a given error code exists in ErrorCodes
 */
export const isValidErrorCode = (code: number): code is ErrorCodes => {
    return Object.values(ErrorCodes).includes(code);
};

/**
 * Type guard to check if a given error type has retry configuration
 */
export const hasRetryConfig = (errorType: string): errorType is keyof typeof ErrorRetryConfig => {
    return errorType in ErrorRetryConfig;
};

/**
 * Formats an error message by replacing placeholders with actual values
 * @param message The message template from ErrorMessages
 * @param params Object containing values for template placeholders
 */
export const formatErrorMessage = (message: string, params: Record<string, string>): string => {
    return Object.entries(params).reduce(
        (msg, [key, value]) => msg.replace(`\${${key}}`, value),
        message
    );
};