/**
 * @fileoverview Integration interfaces for external service connections
 * Defines TypeScript interfaces for managing integrations with CRM systems,
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
 * Configuration interface for external service integrations
 * Defines the core settings required to establish and maintain service connections
 */
export interface IIntegrationConfig {
    /** The type of external service being integrated */
    type: IntegrationType;

    /** API version string for version-specific endpoints */
    apiVersion: string;

    /** Base URL for API requests to the external service */
    baseUrl: string;

    /** Authentication method required by the service */
    authType: IntegrationAuthType;

    /** Rate limit specifications in requests per time unit */
    rateLimit: number;
}

/**
 * Authentication credentials interface for service integrations
 * Manages various authentication tokens and credentials based on auth type
 */
export interface IIntegrationCredentials {
    /** OAuth client identifier */
    clientId?: string;

    /** OAuth client secret */
    clientSecret?: string;

    /** API key for services using key-based auth */
    apiKey?: string;

    /** OAuth access token or JWT */
    accessToken?: string;

    /** OAuth refresh token for token renewal */
    refreshToken?: string;

    /** Token expiration timestamp */
    expiresAt?: Date;
}

/**
 * Integration metadata interface for monitoring and metrics
 * Tracks integration health, performance, and usage statistics
 */
export interface IIntegrationMetadata {
    /** Current integration connection status */
    status: IntegrationStatus;

    /** Granted permission scope for the integration */
    scope: IntegrationScope;

    /** Timestamp of last successful data synchronization */
    lastSyncTime: Date;

    /** Count of errors encountered during integration operations */
    errorCount: number;

    /** Count of API requests made to the integration */
    requestCount: number;
}

/**
 * Integration error interface for standardized error handling
 * Provides detailed error context for debugging and recovery
 */
export interface IIntegrationError {
    /** Error code identifier */
    code: string;

    /** Human-readable error message */
    message: string;

    /** Error occurrence timestamp */
    timestamp: Date;

    /** Indicates if the operation can be retried */
    retryable: boolean;

    /** Additional error context and metadata */
    context: Record<string, any>;
}