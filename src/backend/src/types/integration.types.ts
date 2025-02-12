/**
 * @fileoverview Type definitions for external service integrations
 * Defines TypeScript interfaces and types for managing integrations with CRM systems,
 * email services, and communication tools in the Sales & Intelligence Platform
 * @version 1.0.0
 */

import {
    IntegrationType,
    IntegrationAuthType,
    IntegrationStatus,
    IntegrationScope
} from '../constants/integration-types';

/**
 * Configuration settings for external service integrations
 * Defines the core setup and operational parameters for each integration
 */
export type IntegrationConfigType = {
    /** The type of external service being integrated */
    type: IntegrationType;

    /** API version string for version-specific endpoints */
    apiVersion: string;

    /** Base URL for API endpoints */
    baseUrl: string;

    /** Authentication method used by the integration */
    authType: IntegrationAuthType;

    /** Rate limit in requests per day */
    rateLimit: number;
};

/**
 * Authentication credentials for integration connections
 * Manages OAuth2, API keys, and other authentication methods
 */
export type IntegrationCredentialsType = {
    /** OAuth2 client identifier */
    clientId?: string;

    /** OAuth2 client secret */
    clientSecret?: string;

    /** API key for direct authentication */
    apiKey?: string;

    /** OAuth2 access token */
    accessToken?: string;

    /** OAuth2 refresh token for token renewal */
    refreshToken?: string;

    /** Token expiration timestamp */
    expiresAt?: Date;
};

/**
 * Integration metadata and operational metrics
 * Tracks integration health, performance, and synchronization status
 */
export type IntegrationMetadataType = {
    /** Current integration connection status */
    status: IntegrationStatus;

    /** Integration permission scope */
    scope: IntegrationScope;

    /** Timestamp of last successful synchronization */
    lastSyncTime: Date;

    /** Count of integration errors */
    errorCount: number;

    /** Count of API requests made */
    requestCount: number;

    /** Most recent error message */
    lastErrorMessage?: string;

    /** Integration health score (0-100) */
    healthScore: number;

    /** Current synchronization status */
    syncStatus: 'syncing' | 'idle' | 'failed';
};

/**
 * Integration error handling and tracking
 * Manages error details, retry logic, and error context
 */
export type IntegrationErrorType = {
    /** Error code identifier */
    code: string;

    /** Human-readable error message */
    message: string;

    /** Error occurrence timestamp */
    timestamp: Date;

    /** Indicates if error can be retried */
    retryable: boolean;

    /** Additional error context and metadata */
    context: Record<string, any>;

    /** Error severity level */
    severity: 'low' | 'medium' | 'high';

    /** Number of retry attempts made */
    retryCount: number;

    /** Timestamp of last retry attempt */
    lastRetryTimestamp?: Date;
};