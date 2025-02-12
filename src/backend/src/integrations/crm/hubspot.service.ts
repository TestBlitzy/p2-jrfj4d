/**
 * @fileoverview HubSpot CRM integration service implementation
 * Handles HubSpot API interactions with rate limiting, retries, and error handling
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'; // v1.6.0
import * as querystring from 'querystring'; // v0.2.1
import { IIntegrationConfig } from '../../interfaces/integration.interface';
import { IntegrationType } from '../../constants/integration-types';
import { INTEGRATION_CONFIGS } from '../../config/integration.config';

/**
 * Interface for lead synchronization options
 */
interface LeadSyncOptions {
  lastSyncTime?: Date;
  batchSize?: number;
  includeProperties?: string[];
}

/**
 * Interface for synchronization results
 */
interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Error[];
  timestamp: Date;
}

/**
 * Interface for retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  currentAttempt: number;
}

/**
 * HubSpot CRM integration service class
 * Implements enterprise-grade integration with HubSpot API v3
 */
export class HubSpotService {
  private readonly apiClient: AxiosInstance;
  private accessToken: string | null = null;
  private rateLimitRemaining: number;
  private lastSyncTimestamp: number;
  private readonly retryConfigs: Map<string, RetryConfig>;
  private readonly RATE_LIMIT_BUFFER = 1000; // Buffer to prevent rate limit exhaustion
  private readonly BATCH_SIZE = 100; // Optimal batch size for HubSpot API

  constructor(private readonly config: IIntegrationConfig) {
    // Validate configuration
    if (config.type !== IntegrationType.HUBSPOT) {
      throw new Error('Invalid integration type for HubSpot service');
    }

    // Initialize API client
    this.apiClient = axios.create({
      baseURL: `${config.baseUrl}/${config.apiVersion}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sales-Intelligence-Platform/1.0.0'
      }
    });

    // Initialize rate limiting
    this.rateLimitRemaining = config.rateLimit;
    this.lastSyncTimestamp = Date.now();
    this.retryConfigs = new Map();

    // Configure request interceptor
    this.apiClient.interceptors.request.use(
      async (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        await this.checkRateLimit();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Configure response interceptor
    this.apiClient.interceptors.response.use(
      (response) => {
        this.handleRateLimit(response);
        return response;
      },
      async (error: AxiosError) => {
        return this.handleApiError(error);
      }
    );
  }

  /**
   * Authenticates with HubSpot using OAuth2
   * @param code - OAuth authorization code
   */
  public async authenticate(code: string): Promise<void> {
    try {
      const tokenResponse = await this.apiClient.post('/oauth/v1/token', 
        querystring.stringify({
          grant_type: 'authorization_code',
          client_id: process.env.HUBSPOT_CLIENT_ID,
          client_secret: process.env.HUBSPOT_CLIENT_SECRET,
          redirect_uri: process.env.HUBSPOT_REDIRECT_URI,
          code
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = tokenResponse.data.access_token;
      
      // Verify token validity
      await this.verifyAuthentication();
    } catch (error) {
      throw new Error(`HubSpot authentication failed: ${error.message}`);
    }
  }

  /**
   * Synchronizes leads between platform and HubSpot
   * @param options - Lead synchronization options
   */
  public async syncLeads(options: LeadSyncOptions = {}): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      const batchSize = options.batchSize || this.BATCH_SIZE;
      let hasMore = true;
      let offset = 0;

      while (hasMore) {
        const response = await this.apiClient.get('/contacts/v1/lists/all/contacts/recent', {
          params: {
            count: batchSize,
            vidOffset: offset,
            property: options.includeProperties,
            timeOffset: options.lastSyncTime ? options.lastSyncTime.getTime() : undefined
          }
        });

        const { contacts, has-more: hasMoreContacts, vid-offset: newOffset } = response.data;
        
        // Process batch of contacts
        for (const contact of contacts) {
          try {
            await this.processContact(contact);
            result.syncedCount++;
          } catch (error) {
            result.failedCount++;
            result.errors.push(error);
          }
        }

        hasMore = hasMoreContacts;
        offset = newOffset;
      }

      result.success = true;
      this.lastSyncTimestamp = Date.now();
    } catch (error) {
      result.errors.push(error);
    }

    return result;
  }

  /**
   * Handles rate limit tracking from API responses
   * @param response - Axios response object
   */
  private handleRateLimit(response: AxiosResponse): void {
    const dailyLimit = parseInt(response.headers['x-hubspot-ratelimit-daily'], 10);
    const dailyRemaining = parseInt(response.headers['x-hubspot-ratelimit-daily-remaining'], 10);
    
    if (!isNaN(dailyRemaining)) {
      this.rateLimitRemaining = dailyRemaining;
    }

    // Alert if approaching rate limit
    if (this.rateLimitRemaining < this.RATE_LIMIT_BUFFER) {
      console.warn(`HubSpot rate limit warning: ${this.rateLimitRemaining} requests remaining`);
    }
  }

  /**
   * Checks current rate limit before making requests
   */
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= this.RATE_LIMIT_BUFFER) {
      const waitTime = this.calculateRateLimitWaitTime();
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Handles API errors with retry logic
   * @param error - Axios error object
   */
  private async handleApiError(error: AxiosError): Promise<any> {
    const endpoint = error.config.url;
    const retryConfig = this.getRetryConfig(endpoint);

    if (this.isRetryableError(error) && retryConfig.currentAttempt < retryConfig.maxAttempts) {
      retryConfig.currentAttempt++;
      const backoffTime = retryConfig.backoffMs * Math.pow(2, retryConfig.currentAttempt - 1);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return this.apiClient.request(error.config);
    }

    throw error;
  }

  /**
   * Processes a single contact record
   * @param contact - HubSpot contact object
   */
  private async processContact(contact: any): Promise<void> {
    // Implement contact processing logic
    // This would include mapping HubSpot fields to internal schema
    // and updating local database records
  }

  /**
   * Verifies authentication token validity
   */
  private async verifyAuthentication(): Promise<void> {
    try {
      await this.apiClient.get('/oauth/v1/access-tokens/check');
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Gets retry configuration for an endpoint
   * @param endpoint - API endpoint
   */
  private getRetryConfig(endpoint: string): RetryConfig {
    if (!this.retryConfigs.has(endpoint)) {
      this.retryConfigs.set(endpoint, {
        maxAttempts: 3,
        backoffMs: 1000,
        currentAttempt: 0
      });
    }
    return this.retryConfigs.get(endpoint);
  }

  /**
   * Determines if an error is retryable
   * @param error - Axios error object
   */
  private isRetryableError(error: AxiosError): boolean {
    return error.response?.status === 429 || // Rate limit exceeded
           error.response?.status === 503 || // Service unavailable
           error.code === 'ECONNRESET' ||    // Connection reset
           error.code === 'ETIMEDOUT';       // Timeout
  }

  /**
   * Calculates wait time for rate limit reset
   */
  private calculateRateLimitWaitTime(): number {
    const now = Date.now();
    const resetTime = new Date().setHours(24, 0, 0, 0); // Reset at midnight
    return Math.max(0, resetTime - now);
  }
}