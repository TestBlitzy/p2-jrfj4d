/**
 * Lead Management Service
 * Version: 1.0.0
 * 
 * Provides comprehensive service layer for lead management operations including
 * lead scoring, qualification, and engagement tracking. Implements features
 * F-201 AI Lead Scoring and F-202 Automated Qualification with enhanced error
 * handling and performance optimizations.
 */

import { AxiosResponse } from 'axios'; // ^1.6.0
import { apiClient } from '../config/api.config';
import { API_ENDPOINTS } from '../constants/api.constants';
import { 
  Lead, 
  LeadStatus, 
  LeadScoreMetrics, 
  LeadEngagement, 
  LeadFilters,
  LeadSortOption 
} from '../types/lead.types';
import { 
  ApiResponse, 
  PaginatedResponse,
  ErrorState 
} from '../types/common.types';

// Cache configuration for lead data
const LEAD_CACHE = {
  TTL: 5 * 60 * 1000, // 5 minutes
  SCORE_TTL: 30 * 60 * 1000 // 30 minutes
};

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * Lead service class providing comprehensive lead management functionality
 */
class LeadService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  /**
   * Retrieves a paginated list of leads with filtering and caching
   */
  async getLeads(
    filters: Partial<LeadFilters>,
    pagination: PaginationOptions,
    sort?: LeadSortOption
  ): Promise<ApiResponse<PaginatedResponse<Lead>>> {
    try {
      const cacheKey = this.generateCacheKey('leads', { filters, pagination, sort });
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      const response = await apiClient.get<PaginatedResponse<Lead>>(
        API_ENDPOINTS.LEADS.BASE,
        {
          params: {
            ...filters,
            page: pagination.page,
            pageSize: pagination.pageSize,
            sortField: sort?.field,
            sortDirection: sort?.direction
          }
        }
      );

      this.setCache(cacheKey, response, LEAD_CACHE.TTL);
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves detailed AI-generated lead score metrics
   */
  async getLeadScore(leadId: string): Promise<ApiResponse<LeadScoreMetrics>> {
    try {
      const cacheKey = `lead-score-${leadId}`;
      const cachedScore = this.getFromCache(cacheKey);

      if (cachedScore) {
        return cachedScore;
      }

      const response = await apiClient.get<LeadScoreMetrics>(
        `${API_ENDPOINTS.LEADS.SCORE}/${leadId}`
      );

      this.setCache(cacheKey, response, LEAD_CACHE.SCORE_TTL);
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Creates a new lead with validation
   */
  async createLead(leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score'>): Promise<ApiResponse<Lead>> {
    try {
      const response = await apiClient.post<Lead>(
        API_ENDPOINTS.LEADS.BASE,
        leadData
      );
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Updates lead information and invalidates relevant caches
   */
  async updateLead(leadId: string, leadData: Partial<Lead>): Promise<ApiResponse<Lead>> {
    try {
      const response = await apiClient.put<Lead>(
        `${API_ENDPOINTS.LEADS.BASE}/${leadId}`,
        leadData
      );
      
      // Invalidate related caches
      this.invalidateCache(`lead-score-${leadId}`);
      this.invalidateCache((key) => key.startsWith('leads'));
      
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves lead engagement metrics with caching
   */
  async getLeadEngagement(leadId: string): Promise<ApiResponse<LeadEngagement>> {
    try {
      const cacheKey = `lead-engagement-${leadId}`;
      const cachedEngagement = this.getFromCache(cacheKey);

      if (cachedEngagement) {
        return cachedEngagement;
      }

      const response = await apiClient.get<LeadEngagement>(
        `${API_ENDPOINTS.LEADS.ENGAGEMENT}/${leadId}`
      );

      this.setCache(cacheKey, response, LEAD_CACHE.TTL);
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Qualifies a lead using AI-driven analysis
   */
  async qualifyLead(leadId: string): Promise<ApiResponse<{ status: LeadStatus; confidence: number }>> {
    try {
      const response = await apiClient.post<{ status: LeadStatus; confidence: number }>(
        `${API_ENDPOINTS.LEADS.QUALIFY}/${leadId}`
      );
      
      // Invalidate lead caches after qualification
      this.invalidateCache(`lead-score-${leadId}`);
      this.invalidateCache((key) => key.startsWith('leads'));
      
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Batch processes multiple leads for efficiency
   */
  async batchProcessLeads(leadIds: string[]): Promise<ApiResponse<{ processed: number; failed: number }>> {
    try {
      const response = await apiClient.post<{ processed: number; failed: number }>(
        API_ENDPOINTS.LEADS.BATCH,
        { leadIds }
      );
      
      // Invalidate all lead-related caches after batch processing
      this.invalidateCache((key) => key.startsWith('lead'));
      
      return response;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generates cache key based on request parameters
   */
  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    return `${prefix}-${JSON.stringify(params)}`;
  }

  /**
   * Retrieves data from cache if valid
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < LEAD_CACHE.TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Sets data in cache with expiration
   */
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Schedule cache invalidation
    setTimeout(() => this.cache.delete(key), ttl);
  }

  /**
   * Invalidates cache entries based on key or predicate
   */
  private invalidateCache(keyOrPredicate: string | ((key: string) => boolean)): void {
    if (typeof keyOrPredicate === 'string') {
      this.cache.delete(keyOrPredicate);
    } else {
      for (const key of this.cache.keys()) {
        if (keyOrPredicate(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Handles and transforms API errors
   */
  private handleError(error: any): ErrorState {
    const errorState: ErrorState = {
      message: 'An error occurred while processing the lead operation',
      code: 'LEAD_SERVICE_ERROR',
      details: {},
      timestamp: new Date().toISOString()
    };

    if (error.response) {
      errorState.code = `LEAD_${error.response.status}`;
      errorState.message = error.response.data?.message || errorState.message;
      errorState.details = error.response.data?.errors || {};
    }

    // Log error for monitoring
    console.error('[LeadService Error]', errorState);

    return errorState;
  }
}

// Export singleton instance
export const leadService = new LeadService();