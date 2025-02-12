/**
 * @fileoverview LinkedIn Sales Navigator integration service
 * Implements secure, rate-limited access to Sales Navigator API with enhanced resilience
 * @version 1.0.0
 */

import { injectable } from 'inversify';
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as rax from 'retry-axios';
import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { 
    IIntegrationConfig, 
    IIntegrationCredentials 
} from '../../interfaces/integration.interface';
import { IntegrationType } from '../../constants/integration-types';
import NodeCache from 'node-cache';

/**
 * Search parameters for lead queries
 */
class SearchParams {
    @IsString()
    @IsOptional()
    keywords?: string;

    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    company?: string;

    @IsNumber()
    @Min(1)
    @Max(100)
    limit: number = 25;
}

/**
 * Lead details response structure
 */
class LeadDetails {
    @IsString()
    id: string;

    @IsString()
    fullName: string;

    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    company?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    skills?: string[];
}

@injectable()
export class LinkedInSalesNavigatorService {
    private config: IIntegrationConfig;
    private credentials: IIntegrationCredentials;
    private httpClient: AxiosInstance;
    private rateLimiter: Map<string, number>;
    private responseCache: NodeCache;
    private readonly DAILY_RATE_LIMIT = 100;
    private readonly CACHE_TTL = 3600; // 1 hour

    constructor() {
        this.initializeService();
    }

    /**
     * Initializes the service with configuration and enhanced features
     */
    private async initializeService(): Promise<void> {
        // Load integration configuration
        this.config = {
            type: IntegrationType.LINKEDIN_SALES_NAVIGATOR,
            apiVersion: 'v2',
            baseUrl: 'https://api.linkedin.com/v2/salesNavigator',
            rateLimit: this.DAILY_RATE_LIMIT
        };

        // Initialize HTTP client with retry capability
        this.httpClient = axios.create({
            baseURL: this.config.baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });

        // Configure retry-axios with exponential backoff
        const raxConfig = {
            retry: 3,
            noResponseRetries: 2,
            retryDelay: 1000,
            backoffType: 'exponential',
            statusCodesToRetry: [[429, 429], [500, 599]],
            onRetryAttempt: (err: AxiosError) => {
                const cfg = rax.getConfig(err);
                console.log(`Retry attempt #${cfg?.currentRetryAttempt}`);
            }
        };

        this.httpClient.defaults.raxConfig = raxConfig;
        rax.attach(this.httpClient);

        // Initialize rate limiter and cache
        this.rateLimiter = new Map();
        this.responseCache = new NodeCache({
            stdTTL: this.CACHE_TTL,
            checkperiod: 120
        });

        // Configure request interceptor for authentication
        this.httpClient.interceptors.request.use(
            async (config) => {
                await this.checkAndRefreshToken();
                config.headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    /**
     * Authenticates with LinkedIn Sales Navigator using OAuth2
     * @param code - Authorization code from OAuth flow
     */
    public async authenticate(code: string): Promise<void> {
        try {
            const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
                grant_type: 'authorization_code',
                code,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                redirect_uri: process.env.LINKEDIN_REDIRECT_URI
            });

            this.credentials = {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
            };

            // Reset rate limiter for new session
            this.rateLimiter.clear();
        } catch (error) {
            throw new Error(`LinkedIn authentication failed: ${error.message}`);
        }
    }

    /**
     * Refreshes the OAuth access token
     */
    private async refreshToken(): Promise<void> {
        try {
            const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
                grant_type: 'refresh_token',
                refresh_token: this.credentials.refreshToken,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET
            });

            this.credentials = {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
            };
        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Checks and refreshes token if needed
     */
    private async checkAndRefreshToken(): Promise<void> {
        if (this.credentials?.expiresAt && this.credentials.expiresAt <= new Date(Date.now() + 300000)) {
            await this.refreshToken();
        }
    }

    /**
     * Checks rate limit before making requests
     */
    private checkRateLimit(endpoint: string): void {
        const today = new Date().toISOString().split('T')[0];
        const key = `${today}-${endpoint}`;
        const currentCount = this.rateLimiter.get(key) || 0;

        if (currentCount >= this.DAILY_RATE_LIMIT) {
            throw new Error('Daily rate limit exceeded for LinkedIn Sales Navigator API');
        }

        this.rateLimiter.set(key, currentCount + 1);
    }

    /**
     * Searches for leads with caching and rate limiting
     * @param params - Search parameters
     */
    public async searchLeads(params: SearchParams): Promise<LeadDetails[]> {
        await validateOrReject(plainToClass(SearchParams, params));
        
        const cacheKey = `search-${JSON.stringify(params)}`;
        const cachedResult = this.responseCache.get<LeadDetails[]>(cacheKey);
        
        if (cachedResult) {
            return cachedResult;
        }

        this.checkRateLimit('search');

        try {
            const response = await this.httpClient.get('/search', { params });
            const leads = response.data.elements.map(lead => plainToClass(LeadDetails, lead));
            
            await Promise.all(leads.map(lead => validateOrReject(lead)));
            this.responseCache.set(cacheKey, leads);
            
            return leads;
        } catch (error) {
            throw new Error(`Lead search failed: ${error.message}`);
        }
    }

    /**
     * Retrieves detailed lead information
     * @param leadId - LinkedIn lead identifier
     */
    public async getLeadDetails(leadId: string): Promise<LeadDetails> {
        if (!leadId.match(/^[0-9a-zA-Z-]+$/)) {
            throw new Error('Invalid lead ID format');
        }

        const cacheKey = `lead-${leadId}`;
        const cachedResult = this.responseCache.get<LeadDetails>(cacheKey);
        
        if (cachedResult) {
            return cachedResult;
        }

        this.checkRateLimit('details');

        try {
            const response = await this.httpClient.get(`/lead/${leadId}`);
            const leadDetails = plainToClass(LeadDetails, response.data);
            
            await validateOrReject(leadDetails);
            this.responseCache.set(cacheKey, leadDetails);
            
            return leadDetails;
        } catch (error) {
            throw new Error(`Failed to retrieve lead details: ${error.message}`);
        }
    }
}