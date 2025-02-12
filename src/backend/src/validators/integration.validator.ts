/**
 * @fileoverview Integration validator for external service integrations
 * Implements validation logic for integration configurations, credentials,
 * and rate limits for the Sales & Intelligence Platform
 * @version 1.0.0
 */

import Joi from 'joi';
import { IntegrationType } from '../constants/integration-types';
import { IIntegrationConfig } from '../interfaces/integration.interface';

// Service-specific API version patterns
const API_VERSION_PATTERNS = {
    [IntegrationType.SALESFORCE]: /^v\d{2}\.0$/,
    [IntegrationType.HUBSPOT]: /^v\d+$/,
    [IntegrationType.GMAIL]: /^v\d+$/,
    [IntegrationType.SENDGRID]: /^v\d+$/,
    [IntegrationType.LINKEDIN_SALES_NAVIGATOR]: /^v\d+$/,
    [IntegrationType.SLACK]: /^v\d+$/
};

// Service-specific rate limits (requests per day)
const RATE_LIMIT_QUOTAS = {
    [IntegrationType.SALESFORCE]: 100000,
    [IntegrationType.HUBSPOT]: 500000,
    [IntegrationType.GMAIL]: 1000000,
    [IntegrationType.LINKEDIN_SALES_NAVIGATOR]: 100,
    [IntegrationType.SLACK]: 86400 // 1 request/second
};

// OAuth scope requirements per integration
const REQUIRED_OAUTH_SCOPES = {
    [IntegrationType.SALESFORCE]: ['api', 'refresh_token'],
    [IntegrationType.HUBSPOT]: ['contacts', 'timeline'],
    [IntegrationType.GMAIL]: ['https://www.googleapis.com/auth/gmail.send'],
    [IntegrationType.LINKEDIN_SALES_NAVIGATOR]: ['r_sales_nav'],
    [IntegrationType.SLACK]: ['chat:write', 'channels:read']
};

/**
 * Validates complete integration configuration
 * @param config Integration configuration object
 * @returns Validation result with detailed error messages
 */
export const validateIntegrationConfig = async (config: IIntegrationConfig): Promise<Joi.ValidationResult> => {
    const schema = Joi.object({
        type: Joi.string()
            .valid(...Object.values(IntegrationType))
            .required()
            .messages({
                'any.required': 'Integration type is required',
                'any.only': 'Invalid integration type'
            }),

        apiVersion: Joi.string()
            .required()
            .custom((value, helpers) => {
                const type = (helpers.state.ancestors[0] as IIntegrationConfig).type;
                if (!API_VERSION_PATTERNS[type].test(value)) {
                    return helpers.error('any.invalid');
                }
                return value;
            })
            .messages({
                'any.required': 'API version is required',
                'any.invalid': 'Invalid API version format for the specified integration type'
            }),

        baseUrl: Joi.string()
            .uri()
            .required()
            .messages({
                'any.required': 'Base URL is required',
                'string.uri': 'Invalid base URL format'
            }),

        rateLimit: Joi.object({
            requestsPerDay: Joi.number()
                .positive()
                .custom((value, helpers) => {
                    const type = (helpers.state.ancestors[1] as IIntegrationConfig).type;
                    if (value > RATE_LIMIT_QUOTAS[type]) {
                        return helpers.error('any.invalid');
                    }
                    return value;
                }),
            concurrentRequests: Joi.number()
                .positive()
                .max(100)
        }).required()
    });

    return schema.validateAsync(config, { abortEarly: false });
};

/**
 * Validates integration credentials based on integration type
 * @param credentials Integration credentials object
 * @param type Integration type
 * @returns Validation result for credentials
 */
export const validateIntegrationCredentials = async (
    credentials: any,
    type: IntegrationType
): Promise<Joi.ValidationResult> => {
    const oauthSchema = Joi.object({
        clientId: Joi.string().required(),
        clientSecret: Joi.string().required(),
        accessToken: Joi.string().required(),
        refreshToken: Joi.string().required(),
        expiresAt: Joi.date().greater('now').required()
    });

    const apiKeySchema = Joi.object({
        apiKey: Joi.string()
            .min(32)
            .required()
            .pattern(/^[A-Za-z0-9-_]+$/)
    });

    const schema = type === IntegrationType.SENDGRID ? apiKeySchema : oauthSchema;

    return schema.validateAsync(credentials, { abortEarly: false });
};

/**
 * Validates OAuth configuration for supported integrations
 * @param oauthConfig OAuth configuration object
 * @returns Validation result for OAuth configuration
 */
export const validateOAuthConfig = async (oauthConfig: any): Promise<Joi.ValidationResult> => {
    const schema = Joi.object({
        clientId: Joi.string().required(),
        clientSecret: Joi.string().required(),
        redirectUri: Joi.string()
            .uri()
            .pattern(/^https:\/\//)
            .required(),
        scopes: Joi.array()
            .items(Joi.string())
            .custom((value, helpers) => {
                const type = (helpers.state.ancestors[0] as any).type;
                const requiredScopes = REQUIRED_OAUTH_SCOPES[type];
                const missingScopes = requiredScopes.filter(scope => !value.includes(scope));
                
                if (missingScopes.length > 0) {
                    return helpers.error('array.missing', { missing: missingScopes });
                }
                return value;
            }),
        tokenEndpoint: Joi.string().uri().required(),
        authorizationEndpoint: Joi.string().uri().required()
    });

    return schema.validateAsync(oauthConfig, { abortEarly: false });
};

/**
 * Validates rate limit configuration against service quotas
 * @param rateLimitConfig Rate limit configuration object
 * @param type Integration type
 * @returns Validation result for rate limit configuration
 */
export const validateRateLimits = async (
    rateLimitConfig: any,
    type: IntegrationType
): Promise<Joi.ValidationResult> => {
    const schema = Joi.object({
        requestsPerSecond: Joi.number()
            .positive()
            .max(100)
            .required(),
        requestsPerDay: Joi.number()
            .positive()
            .max(RATE_LIMIT_QUOTAS[type])
            .required(),
        concurrentRequests: Joi.number()
            .positive()
            .max(100)
            .required(),
        retryAfter: Joi.number()
            .min(1000)
            .max(3600000)
            .required()
    });

    return schema.validateAsync(rateLimitConfig, { abortEarly: false });
};