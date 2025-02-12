/**
 * Market Intelligence Service
 * Version: 1.0.0
 * 
 * Provides comprehensive market intelligence operations including competitor tracking,
 * market trends analysis, and price monitoring with enhanced error handling,
 * caching, and observability features.
 */

import { apiClient } from '../config/api.config';
import { API_ENDPOINTS } from '../constants/api.constants';
import {
  Competitor,
  CompetitorActivity,
  MarketTrend,
  PriceAlert,
  ActivityType,
  ImpactLevel,
  SentimentType,
  TimeframeType,
  AlertCondition
} from '../types/market.types';

// Cache configuration for market intelligence data
const CACHE_CONFIG = {
  COMPETITORS_TTL: 300000, // 5 minutes
  TRENDS_TTL: 900000, // 15 minutes
  ACTIVITIES_TTL: 60000 // 1 minute
};

// In-memory cache store
const cache = new Map<string, { data: any; timestamp: number }>();

/**
 * Retrieves list of tracked competitors with caching support
 * @returns Promise resolving to array of competitors
 */
const getCompetitors = async (): Promise<Competitor[]> => {
  const cacheKey = 'competitors';
  const cachedData = cache.get(cacheKey);

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_CONFIG.COMPETITORS_TTL) {
    return cachedData.data;
  }

  const response = await apiClient.get(API_ENDPOINTS.MARKET.COMPETITORS.LIST);
  
  if (response.success) {
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
    return response.data;
  }
  
  throw new Error(response.message);
};

/**
 * Fetches recent competitor activities with real-time updates
 * @param competitorId - Unique identifier of the competitor
 * @param timeframe - Analysis timeframe
 * @returns Promise resolving to array of competitor activities
 */
const getCompetitorActivities = async (
  competitorId: string,
  timeframe: TimeframeType
): Promise<CompetitorActivity[]> => {
  const response = await apiClient.get(
    `${API_ENDPOINTS.MARKET.COMPETITORS.TRACKING}/${competitorId}`,
    {
      params: { timeframe }
    }
  );

  if (response.success) {
    return response.data;
  }

  throw new Error(response.message);
};

/**
 * Retrieves market trend analysis data with AI insights
 * @param timeframe - Analysis timeframe
 * @returns Promise resolving to array of market trends
 */
const getMarketTrends = async (timeframe: TimeframeType): Promise<MarketTrend[]> => {
  const cacheKey = `trends_${timeframe}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData && Date.now() - cachedData.timestamp < CACHE_CONFIG.TRENDS_TTL) {
    return cachedData.data;
  }

  const response = await apiClient.get(API_ENDPOINTS.MARKET.TRENDS.INDUSTRY, {
    params: { timeframe }
  });

  if (response.success) {
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
    return response.data;
  }

  throw new Error(response.message);
};

/**
 * Creates new price monitoring alert with validation
 * @param alertData - Price alert configuration
 * @returns Promise resolving to created price alert
 */
const createPriceAlert = async (
  alertData: Omit<PriceAlert, 'id'>
): Promise<PriceAlert> => {
  const response = await apiClient.post(
    API_ENDPOINTS.MARKET.INTELLIGENCE.ALERTS,
    alertData
  );

  if (response.success) {
    return response.data;
  }

  throw new Error(response.message);
};

/**
 * Updates existing price alert configuration with validation
 * @param alertId - Unique identifier of the alert
 * @param updateData - Partial alert data to update
 * @returns Promise resolving to updated price alert
 */
const updatePriceAlert = async (
  alertId: string,
  updateData: Partial<PriceAlert>
): Promise<PriceAlert> => {
  const response = await apiClient.put(
    `${API_ENDPOINTS.MARKET.INTELLIGENCE.ALERTS}/${alertId}`,
    updateData
  );

  if (response.success) {
    return response.data;
  }

  throw new Error(response.message);
};

/**
 * Removes price monitoring alert with cleanup
 * @param alertId - Unique identifier of the alert
 * @returns Promise resolving to void on successful deletion
 */
const deletePriceAlert = async (alertId: string): Promise<void> => {
  const response = await apiClient.delete(
    `${API_ENDPOINTS.MARKET.INTELLIGENCE.ALERTS}/${alertId}`
  );

  if (!response.success) {
    throw new Error(response.message);
  }
};

/**
 * Retrieves comprehensive market intelligence report with aggregated insights
 * @param timeframe - Analysis timeframe
 * @returns Promise resolving to combined market intelligence data
 */
const getMarketIntelligence = async (
  timeframe: TimeframeType
): Promise<{
  competitors: Competitor[];
  activities: CompetitorActivity[];
  trends: MarketTrend[];
}> => {
  const response = await apiClient.get(API_ENDPOINTS.MARKET.INTELLIGENCE.INSIGHTS, {
    params: { timeframe }
  });

  if (response.success) {
    return response.data;
  }

  throw new Error(response.message);
};

// Export market intelligence service functions
export const MarketService = {
  getCompetitors,
  getCompetitorActivities,
  getMarketTrends,
  createPriceAlert,
  updatePriceAlert,
  deletePriceAlert,
  getMarketIntelligence
};