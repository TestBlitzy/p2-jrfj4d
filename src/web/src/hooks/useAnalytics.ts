import { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // v9.0.0
import { AnalyticsService } from '../services/analytics.service';
import { 
  AnalyticsMetricType,
  AnalyticsDataPoint,
  RevenueForecast,
  MarketTrend,
  AnalyticsInsight,
  TimeRange
} from '../types/analytics.types';
import { analyticsSlice } from '../redux/slices/analyticsSlice';

// Constants for real-time updates and caching
const REAL_TIME_UPDATE_INTERVAL = 5000; // 5 seconds
const CACHE_TTL = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;

/**
 * Advanced hook for managing analytics state and operations with real-time updates
 * @param metricType - Type of analytics metric to track
 * @param timeRange - Time range for data analysis
 * @param options - Additional configuration options
 */
export const useAnalytics = (
  metricType: AnalyticsMetricType,
  timeRange: string,
  options: {
    enableRealTime?: boolean;
    confidenceThreshold?: number;
    cacheResults?: boolean;
    retryOnError?: boolean;
    batchSize?: number;
  } = {}
) => {
  // Destructure options with defaults
  const {
    enableRealTime = true,
    confidenceThreshold = 0.9,
    cacheResults = true,
    retryOnError = true,
    batchSize = 1000
  } = options;

  // Redux setup
  const dispatch = useDispatch();
  const {
    selectAnalyticsData,
    selectTimeRange,
    selectPredictions,
    selectPatterns,
    selectMarketTrends
  } = analyticsSlice.actions;

  // Local state management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [realTimeStatus, setRealTimeStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [paginationInfo, setPaginationInfo] = useState({
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false
  });

  // Initialize analytics service
  const analyticsService = useMemo(() => new AnalyticsService(), []);

  /**
   * Fetches historical analytics data with pagination support
   */
  const fetchAnalyticsData = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getHistoricalData(
        metricType,
        timeRange,
        enableRealTime
      );

      dispatch(selectAnalyticsData(response));
      setPaginationInfo({
        currentPage: page,
        totalPages: Math.ceil(response.length / batchSize),
        hasNextPage: response.length > page * batchSize
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics data'));
      if (retryOnError) {
        await retryOperation(() => fetchAnalyticsData(page));
      }
    } finally {
      setLoading(false);
    }
  }, [metricType, timeRange, batchSize, enableRealTime]);

  /**
   * Fetches revenue forecast with AI predictions
   */
  const fetchRevenueForecast = useCallback(async () => {
    try {
      setLoading(true);
      const forecast = await analyticsService.getRevenueForecast(30, confidenceThreshold);
      dispatch(selectPredictions(forecast));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch revenue forecast'));
    } finally {
      setLoading(false);
    }
  }, [confidenceThreshold]);

  /**
   * Sets up real-time data subscription
   */
  const setupRealTimeSubscription = useCallback(() => {
    if (!enableRealTime) return;

    const subscription = analyticsService.subscribeToRealTimeUpdates(
      metricType,
      (data: AnalyticsDataPoint[]) => {
        dispatch(selectAnalyticsData(data));
        setRealTimeStatus('connected');
      },
      (error: Error) => {
        setRealTimeStatus('error');
        setError(error);
      }
    );

    return () => {
      analyticsService.unsubscribeFromRealTimeUpdates(subscription);
      setRealTimeStatus('disconnected');
    };
  }, [metricType, enableRealTime]);

  /**
   * Fetches pattern analysis with confidence threshold
   */
  const fetchPatternAnalysis = useCallback(async () => {
    try {
      const patterns = await analyticsService.getPatternAnalysis(
        metricType,
        confidenceThreshold
      );
      dispatch(selectPatterns(patterns));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch pattern analysis'));
    }
  }, [metricType, confidenceThreshold]);

  /**
   * Fetches market trends analysis
   */
  const fetchMarketTrends = useCallback(async () => {
    try {
      const trends = await analyticsService.getMarketTrends(timeRange);
      dispatch(selectMarketTrends(trends));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch market trends'));
    }
  }, [timeRange]);

  /**
   * Retry operation with exponential backoff
   */
  const retryOperation = async (operation: () => Promise<void>) => {
    let attempts = 0;
    while (attempts < MAX_RETRY_ATTEMPTS) {
      try {
        await operation();
        break;
      } catch (err) {
        attempts++;
        if (attempts === MAX_RETRY_ATTEMPTS) throw err;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempts)));
      }
    }
  };

  // Effect for initial data fetch and real-time setup
  useEffect(() => {
    fetchAnalyticsData();
    fetchRevenueForecast();
    fetchPatternAnalysis();
    fetchMarketTrends();

    const cleanup = setupRealTimeSubscription();

    return () => {
      if (cleanup) cleanup();
    };
  }, [metricType, timeRange]);

  // Cache invalidation effect
  useEffect(() => {
    if (!cacheResults) return;

    const cacheInvalidationTimer = setInterval(() => {
      fetchAnalyticsData();
    }, CACHE_TTL);

    return () => clearInterval(cacheInvalidationTimer);
  }, [cacheResults, CACHE_TTL]);

  return {
    loading,
    error,
    realTimeStatus,
    paginationInfo,
    fetchAnalyticsData,
    fetchRevenueForecast,
    fetchPatternAnalysis,
    fetchMarketTrends,
    retryOperation
  };
};

export default useAnalytics;