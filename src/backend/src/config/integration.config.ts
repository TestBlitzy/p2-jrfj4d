/**
 * @fileoverview Integration configuration management for external services
 * Centralizes configuration settings and credentials for CRM, email, and communication tool integrations
 * @version 1.0.0
 */

import { config } from 'dotenv'; // v16.3.1
import { 
    IntegrationType,
    IntegrationAuthType
} from '../constants/integration-types';
import { IIntegrationConfig } from '../interfaces/integration.interface';

// Load environment variables
config();

/**
 * Comprehensive integration configurations for all supported external services
 * Includes API versions, rate limits, and authentication settings based on technical specifications
 */
export const INTEGRATION_CONFIGS: Record<IntegrationType, IIntegrationConfig> = {
    [IntegrationType.SALESFORCE]: {
        type: IntegrationType.SALESFORCE,
        apiVersion: 'v54.0',
        baseUrl: 'https://api.salesforce.com',
        authType: IntegrationAuthType.OAUTH2,
        rateLimit: 100000,
        rateLimitPeriod: 'day'
    },

    [IntegrationType.HUBSPOT]: {
        type: IntegrationType.HUBSPOT,
        apiVersion: 'v3',
        baseUrl: 'https://api.hubspot.com',
        authType: IntegrationAuthType.API_KEY,
        rateLimit: 500000,
        rateLimitPeriod: 'day'
    },

    [IntegrationType.GMAIL]: {
        type: IntegrationType.GMAIL,
        apiVersion: 'v1',
        baseUrl: 'https://gmail.googleapis.com',
        authType: IntegrationAuthType.OAUTH2,
        rateLimit: 1000000,
        rateLimitPeriod: 'day'
    },

    [IntegrationType.SENDGRID]: {
        type: IntegrationType.SENDGRID,
        apiVersion: 'v3',
        baseUrl: 'https://api.sendgrid.com',
        authType: IntegrationAuthType.API_KEY,
        rateLimit: 100,
        rateLimitPeriod: 'second'
    },

    [IntegrationType.LINKEDIN_SALES_NAVIGATOR]: {
        type: IntegrationType.LINKEDIN_SALES_NAVIGATOR,
        apiVersion: 'v2',
        baseUrl: 'https://api.linkedin.com/v2',
        authType: IntegrationAuthType.OAUTH2,
        rateLimit: 100,
        rateLimitPeriod: 'day/user'
    },

    [IntegrationType.SLACK]: {
        type: IntegrationType.SLACK,
        apiVersion: 'v2',
        baseUrl: 'https://slack.com/api',
        authType: IntegrationAuthType.OAUTH2,
        rateLimit: 1,
        rateLimitPeriod: 'second'
    }
};

/**
 * Retrieves configuration settings for a specified integration type
 * Includes validation and error handling for configuration access
 * 
 * @param type - The integration type to retrieve configuration for
 * @returns Configuration object for the specified integration
 * @throws Error if configuration is missing or invalid
 */
export function getIntegrationConfig(type: IntegrationType): IIntegrationConfig {
    // Validate integration type exists
    if (!Object.values(IntegrationType).includes(type)) {
        throw new Error(`Invalid integration type: ${type}`);
    }

    // Get configuration for requested type
    const config = INTEGRATION_CONFIGS[type];

    // Verify configuration exists
    if (!config) {
        throw new Error(`Configuration not found for integration type: ${type}`);
    }

    // Validate required configuration fields
    const requiredFields: (keyof IIntegrationConfig)[] = [
        'type',
        'apiVersion',
        'baseUrl',
        'authType',
        'rateLimit',
        'rateLimitPeriod'
    ];

    const missingFields = requiredFields.filter(field => !config[field]);
    if (missingFields.length > 0) {
        throw new Error(`Missing required configuration fields for ${type}: ${missingFields.join(', ')}`);
    }

    return config;
}