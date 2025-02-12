import { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from '../redux/hooks';
import { 
  marketActions, 
  selectCompetitors, 
  selectMarketTrends,
  fetchCompetitors,
  fetchMarketTrends,
  createAlert,
  setTimeframe,
  selectMarketState
} from '../redux/slices/marketSlice';
import { MarketService } from '../services/market.service';
import { 
  CompetitorType, 
  MarketTrendType, 
  PriceAlertType, 
  TimeframeType,
  ActivityType,
  ImpactLevel
} from '../types/market.types';
import { 
  MARKET_REFRESH_INTERVAL,
  COMPETITOR_TRACKING_CONFIG,
  PRICE_ALERT_THRESHOLDS
} from '../constants/market.constants';
import { LoadingState } from '../types/common.types';

/**
 * Custom hook for managing market intelligence operations with real-time updates,
 * caching, and comprehensive error handling.
 * 
 * @returns Market intelligence state and operations
 * @version 1.0.0
 */
export const useMarket = () => {
  // Redux state management
  const dispatch = useDispatch();
  const marketState = useSelector(selectMarketState);
  const competitors = useSelector(selectCompetitors);
  const marketTrends = useSelector(selectMarketTrends);

  // Local state management
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  /**
   * Fetches competitor data with caching and real-time updates
   */
  const fetchCompetitorData = useCallback(async () => {
    try {
      setLoading(LoadingState.LOADING);
      setError(null);

      // Check cache validity
      const now = Date.now();
      if (marketState.cache.timestamp && 
          now - marketState.cache.timestamp < COMPETITOR_TRACKING_CONFIG.UPDATE_FREQUENCY) {
        return;
      }

      await dispatch(fetchCompetitors()).unwrap();
      setLoading(LoadingState.SUCCESS);
    } catch (error: any) {
      setLoading(LoadingState.ERROR);
      setError(error.message || 'Failed to fetch competitor data');
    }
  }, [dispatch, marketState.cache.timestamp]);

  /**
   * Fetches market trends with timeframe filtering
   */
  const fetchMarketTrendData = useCallback(async (timeframe: TimeframeType) => {
    try {
      setLoading(LoadingState.LOADING);
      setError(null);

      await dispatch(fetchMarketTrends(timeframe)).unwrap();
      dispatch(setTimeframe(timeframe));
      setLoading(LoadingState.SUCCESS);
    } catch (error: any) {
      setLoading(LoadingState.ERROR);
      setError(error.message || 'Failed to fetch market trends');
    }
  }, [dispatch]);

  /**
   * Creates price monitoring alert with validation
   */
  const createPriceAlert = useCallback(async (alertData: Omit<PriceAlertType, 'id'>) => {
    try {
      setLoading(LoadingState.LOADING);
      setError(null);

      // Validate alert thresholds
      if (alertData.threshold < PRICE_ALERT_THRESHOLDS.MIN_THRESHOLD || 
          alertData.threshold > PRICE_ALERT_THRESHOLDS.MAX_THRESHOLD) {
        throw new Error(`Threshold must be between ${PRICE_ALERT_THRESHOLDS.MIN_THRESHOLD}% and ${PRICE_ALERT_THRESHOLDS.MAX_THRESHOLD}%`);
      }

      await dispatch(createAlert(alertData)).unwrap();
      setLoading(LoadingState.SUCCESS);
    } catch (error: any) {
      setLoading(LoadingState.ERROR);
      setError(error.message || 'Failed to create price alert');
    }
  }, [dispatch]);

  /**
   * Tracks specific competitor activities
   */
  const trackCompetitor = useCallback(async (competitorId: string) => {
    try {
      setLoading(LoadingState.LOADING);
      setError(null);

      const activities = await MarketService.getCompetitorActivities(
        competitorId,
        marketState.selectedTimeframe
      );

      // Filter high-impact activities
      const highImpactActivities = activities.filter(
        activity => activity.impactLevel === ImpactLevel.HIGH
      );

      setLoading(LoadingState.SUCCESS);
      return highImpactActivities;
    } catch (error: any) {
      setLoading(LoadingState.ERROR);
      setError(error.message || 'Failed to track competitor');
      return [];
    }
  }, [marketState.selectedTimeframe]);

  // Setup real-time updates
  useEffect(() => {
    const setupRefreshInterval = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      const interval = setInterval(() => {
        fetchCompetitorData();
        fetchMarketTrendData(marketState.selectedTimeframe);
      }, MARKET_REFRESH_INTERVAL);

      setRefreshInterval(interval);
    };

    setupRefreshInterval();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [fetchCompetitorData, fetchMarketTrendData, marketState.selectedTimeframe]);

  // Initial data fetch
  useEffect(() => {
    fetchCompetitorData();
    fetchMarketTrendData(marketState.selectedTimeframe);
  }, [fetchCompetitorData, fetchMarketTrendData, marketState.selectedTimeframe]);

  return {
    // State
    competitors,
    marketTrends,
    loading,
    error,
    selectedTimeframe: marketState.selectedTimeframe,
    lastUpdated: marketState.lastUpdated,

    // Operations
    fetchCompetitors: fetchCompetitorData,
    fetchMarketTrends: fetchMarketTrendData,
    createPriceAlert,
    trackCompetitor,
    setTimeframe: (timeframe: TimeframeType) => dispatch(setTimeframe(timeframe)),
    clearError: () => setError(null)
  };
};

export default useMarket;