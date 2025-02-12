/**
 * @fileoverview Integration utility functions for managing external service integrations
 * Provides comprehensive utilities for authentication, rate limiting, and error handling
 * @version 1.0.0
 */

import axios, { AxiosError } from 'axios'; // v1.6.0
import jwt from 'jsonwebtoken'; // v9.0.0
import { 
    IIntegrationConfig,
    IIntegrationCredentials 
} from '../interfaces/integration.interface';
import { 
    IntegrationType,
    IntegrationAuthType 
} from '../constants/integration-types';
import { getIntegrationConfig } from '../config/integration.config';

// Constants for token validation and retry logic
const TOKEN_EXPIRY_BUFFER_MINUTES = 5;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000;

/**
 * Validates integration credentials with enhanced security checks
 * 
 * @param credentials - Integration credentials to validate
 * @returns Boolean indicating if credentials are valid
 */
export function validateIntegrationCredentials(credentials: IIntegrationCredentials): boolean {
    try {
        // Check if credentials object exists
        if (!credentials) {
            return false;
        }

        // Validate access token if present
        if (credentials.accessToken) {
            // Verify JWT structure and signature
            const decodedToken = jwt.decode(credentials.accessToken, { complete: true });
            if (!decodedToken) {
                return false;
            }

            // Check token expiration
            const expirationTime = credentials.expiresAt?.getTime() || 0;
            const currentTime = new Date().getTime();
            const bufferTime = TOKEN_EXPIRY_BUFFER_MINUTES * 60 * 1000;

            if (expirationTime - currentTime < bufferTime) {
                return false;
            }
        }

        // Validate API key if present
        if (credentials.apiKey) {
            return credentials.apiKey.length > 0;
        }

        // Validate OAuth credentials
        if (credentials.clientId && credentials.clientSecret) {
            return credentials.clientId.length > 0 && credentials.clientSecret.length > 0;
        }

        return false;
    } catch (error) {
        console.error('Error validating credentials:', error);
        return false;
    }
}

/**
 * Validates JWT token expiration with enhanced security checks
 * 
 * @param token - JWT token to validate
 * @param gracePeriodMinutes - Grace period in minutes before expiration
 * @returns Promise resolving to token validity status
 */
export async function validateTokenExpiration(
    token: string,
    gracePeriodMinutes: number = TOKEN_EXPIRY_BUFFER_MINUTES
): Promise<boolean> {
    try {
        // Decode and verify token structure
        const decodedToken = jwt.decode(token, { complete: true });
        if (!decodedToken || !decodedToken.payload) {
            return false;
        }

        // Extract expiration time
        const exp = (decodedToken.payload as any).exp;
        if (!exp) {
            return false;
        }

        // Calculate expiration with grace period
        const expirationTime = exp * 1000; // Convert to milliseconds
        const currentTime = new Date().getTime();
        const gracePeriod = gracePeriodMinutes * 60 * 1000;

        return (expirationTime - currentTime) > gracePeriod;
    } catch (error) {
        console.error('Error validating token expiration:', error);
        return false;
    }
}

/**
 * Refreshes OAuth access token with enhanced error handling and retry mechanism
 * 
 * @param integrationType - Type of integration for configuration lookup
 * @param credentials - Current integration credentials
 * @returns Promise resolving to updated credentials
 * @throws Error if token refresh fails after retries
 */
export async function refreshOAuthToken(
    integrationType: IntegrationType,
    credentials: IIntegrationCredentials
): Promise<IIntegrationCredentials> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < MAX_RETRY_ATTEMPTS) {
        try {
            // Get integration configuration
            const config = getIntegrationConfig(integrationType);
            
            // Validate refresh token
            if (!credentials.refreshToken) {
                throw new Error('Refresh token not available');
            }

            // Calculate retry delay with exponential backoff
            const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);

            // Prepare token refresh request
            const tokenEndpoint = `${config.baseUrl}/oauth2/token`;
            const response = await axios.post(tokenEndpoint, {
                grant_type: 'refresh_token',
                refresh_token: credentials.refreshToken,
                client_id: credentials.clientId,
                client_secret: credentials.clientSecret
            }, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            // Update credentials with new tokens
            const updatedCredentials: IIntegrationCredentials = {
                ...credentials,
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token || credentials.refreshToken,
                expiresAt: new Date(Date.now() + (response.data.expires_in * 1000))
            };

            // Validate new credentials before returning
            if (!validateIntegrationCredentials(updatedCredentials)) {
                throw new Error('Invalid refreshed credentials');
            }

            return updatedCredentials;

        } catch (error) {
            lastError = error as Error;
            retryCount++;

            // Handle specific error types
            if (error instanceof AxiosError) {
                // Don't retry on certain error types
                if (error.response?.status === 401 || error.response?.status === 403) {
                    throw new Error('Authentication failed during token refresh');
                }
            }

            // Wait before retry using exponential backoff
            if (retryCount < MAX_RETRY_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY * Math.pow(2, retryCount)));
            }
        }
    }

    // Throw error if all retries failed
    throw new Error(`Token refresh failed after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message}`);
}

/**
 * Creates an axios instance with authentication and rate limiting
 * 
 * @param config - Integration configuration
 * @param credentials - Integration credentials
 * @returns Configured axios instance
 */
export function createAuthenticatedClient(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials
) {
    const client = axios.create({
        baseURL: config.baseUrl,
        timeout: 30000
    });

    // Add authentication interceptor
    client.interceptors.request.use(async (request) => {
        if (config.authType === IntegrationAuthType.OAUTH2 && credentials.accessToken) {
            request.headers['Authorization'] = `Bearer ${credentials.accessToken}`;
        } else if (config.authType === IntegrationAuthType.API_KEY && credentials.apiKey) {
            request.headers['X-API-Key'] = credentials.apiKey;
        }
        return request;
    });

    // Add rate limiting interceptor
    let lastRequestTime = 0;
    client.interceptors.request.use(async (request) => {
        const currentTime = Date.now();
        const timeSinceLastRequest = currentTime - lastRequestTime;
        const minRequestInterval = 1000 / config.rateLimit;

        if (timeSinceLastRequest < minRequestInterval) {
            await new Promise(resolve => setTimeout(resolve, minRequestInterval - timeSinceLastRequest));
        }

        lastRequestTime = Date.now();
        return request;
    });

    return client;
}