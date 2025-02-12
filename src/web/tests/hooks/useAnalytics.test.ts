import { renderHook, act } from '@testing-library/react-hooks'; // v8.0.1
import { MockWebSocket, Server } from 'jest-websocket-mock'; // v2.4.0
import { useAnalytics } from '../../src/hooks/useAnalytics';
import { AnalyticsService } from '../../src/services/analytics.service';
import { 
  AnalyticsMetricType,
  AnalyticsDataPoint,
  RevenueForecast,
  MarketTrend,
  TrendCategory,
  InsightSeverity
} from '../../src/types/analytics.types';
import { 
  ANALYTICS_THRESHOLDS,
  ANALYTICS_TIME_RANGES,
  PATTERN_RECOGNITION_CONFIG,
  MARKET_TREND_CONFIG 
} from '../../src/constants/analytics.constants';
import { LoadingState } from '../../src/types/common.types';

// Mock the analytics service
jest.mock('../../src/services/analytics.service');

// Mock data
const mockHistoricalData: AnalyticsDataPoint[] = [
  {
    timestamp: new Date('2023-01-01'),
    value: 1000,
    metricType: AnalyticsMetricType.REVENUE,
    metadata: {},
    tags: ['sales'],
    source: 'crm'
  }
];

const mockRevenueForecast: RevenueForecast = {
  predictions: mockHistoricalData,
  confidenceInterval: 0.95,
  modelAccuracy: 0.92,
  forecastRange: {
    start: new Date('2023-01-01'),
    end: new Date('2023-12-31')
  },
  contributingFactors: [
    { factor: 'seasonality', impact: 0.3 }
  ],
  seasonalityPattern: 'quarterly'
};

const mockMarketTrends: MarketTrend[] = [
  {
    trend: 'Market expansion',
    impact: 0.8,
    competitors: ['competitor-1'],
    detectedAt: new Date(),
    category: TrendCategory.MARKET_SHIFT,
    confidence: 0.9,
    relatedInsights: []
  }
];

describe('useAnalytics', () => {
  let mockWebSocketServer: Server;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup WebSocket mock server
    mockWebSocketServer = new Server('ws://localhost:8080/analytics');
    
    // Mock AnalyticsService methods
    (AnalyticsService as jest.Mock).mockImplementation(() => ({
      getHistoricalData: jest.fn().mockResolvedValue(mockHistoricalData),
      getRevenueForecast: jest.fn().mockResolvedValue(mockRevenueForecast),
      getMarketTrends: jest.fn().mockResolvedValue(mockMarketTrends),
      subscribeToRealTimeUpdates: jest.fn(),
      unsubscribeFromRealTimeUpdates: jest.fn()
    }));
  });

  afterEach(() => {
    mockWebSocketServer.close();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAnalytics(
      AnalyticsMetricType.REVENUE,
      ANALYTICS_TIME_RANGES.LAST_30_DAYS
    ));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.realTimeStatus).toBe('disconnected');
  });

  it('should fetch historical data successfully', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAnalytics(
      AnalyticsMetricType.REVENUE,
      ANALYTICS_TIME_RANGES.LAST_30_DAYS
    ));

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockHistoricalData);
  });

  it('should handle historical data fetch error', async () => {
    const errorMessage = 'Failed to fetch data';
    (AnalyticsService as jest.Mock).mockImplementation(() => ({
      getHistoricalData: jest.fn().mockRejectedValue(new Error(errorMessage))
    }));

    const { result, waitForNextUpdate } = renderHook(() => useAnalytics(
      AnalyticsMetricType.REVENUE,
      ANALYTICS_TIME_RANGES.LAST_30_DAYS
    ));

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe(errorMessage);
  });

  it('should handle real-time updates', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAnalytics(
      AnalyticsMetricType.REVENUE,
      ANALYTICS_TIME_RANGES.LAST_30_DAYS,
      { enableRealTime: true }
    ));

    await waitForNextUpdate();

    const newDataPoint: AnalyticsDataPoint = {
      timestamp: new Date(),
      value: 2000,
      metricType: AnalyticsMetricType.REVENUE,
      metadata: {},
      tags: ['sales'],
      source: 'crm'
    };

    act(() => {
      mockWebSocketServer.send(JSON.stringify(newDataPoint));
    });

    expect(result.current.realTimeStatus).toBe('connected');
    expect(result.current.data).toContainEqual(newDataPoint);
  });

  it('should validate pattern recognition confidence threshold', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAnalytics(
      AnalyticsMetricType.REVENUE,
      ANALYTICS_TIME_RANGES.LAST_30_DAYS,
      { confidenceThreshold: PATTERN_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD }
    ));

    await waitForNextUpdate();

    expect(result.current.data.every(point => 
      point.confidence >= PATTERN_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD
    )).toBe(true);
  });

  it('should handle market trend analysis with significance testing', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAnalytics(
      AnalyticsMetricType.MARKET_SHARE,
      ANALYTICS_TIME_RANGES.LAST_90_DAYS
    ));

    await waitForNextUpdate();

    expect(result.current.marketTrends.every(trend => 
      trend.confidence >= MARKET_TREND_CONFIG.TREND_CONFIDENCE_THRESHOLD
    )).toBe(true);
  });

  it('should handle pagination correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useAnalytics(
      AnalyticsMetricType.REVENUE,
      ANALYTICS_TIME_RANGES.LAST_30_DAYS,
      { batchSize: 50 }
    ));

    await waitForNextUpdate();

    expect(result.current.paginationInfo.currentPage).toBe(1);
    expect(result.current.paginationInfo.pageSize).toBe(50);

    act(() => {
      result.current.fetchAnalyticsData(2);
    });

    await waitForNextUpdate();

    expect(result.current.paginationInfo.currentPage).toBe(2);
  });

  it('should cleanup subscriptions on unmount', () => {
    const unsubscribeMock = jest.fn();
    (AnalyticsService as jest.Mock).mockImplementation(() => ({
      subscribeToRealTimeUpdates: jest.fn().mockReturnValue(unsubscribeMock)
    }));

    const { unmount } = renderHook(() => useAnalytics(
      AnalyticsMetricType.REVENUE,
      ANALYTICS_TIME_RANGES.LAST_30_DAYS,
      { enableRealTime: true }
    ));

    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('should retry failed requests with exponential backoff', async () => {
    const mockGetHistoricalData = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockHistoricalData);

    (AnalyticsService as jest.Mock).mockImplementation(() => ({
      getHistoricalData: mockGetHistoricalData
    }));

    const { result, waitForNextUpdate } = renderHook(() => useAnalytics(
      AnalyticsMetricType.REVENUE,
      ANALYTICS_TIME_RANGES.LAST_30_DAYS,
      { retryOnError: true }
    ));

    await waitForNextUpdate();

    expect(mockGetHistoricalData).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(mockHistoricalData);
  });
});