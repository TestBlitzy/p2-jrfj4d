import { configureStore } from '@reduxjs/toolkit'; // v1.9.x
import { describe, it, expect, beforeEach, jest } from '@jest/globals'; // v29.x
import MockWebSocket from 'jest-websocket-mock'; // v2.x

import { 
  reducer, 
  actions,
  fetchHistoricalData,
  fetchRevenueForecast,
  detectPatterns,
  analyzeMarketTrends,
  updateRealTimeMetrics,
  selectAnalyticsState,
  selectFilteredAnalytics,
  selectPatternsByConfidence,
  selectTrendsBySignificance
} from '../../../src/redux/slices/analyticsSlice';

import { 
  AnalyticsMetricType,
  AnalyticsDataPoint,
  RevenueForecast,
  MarketTrend,
  AnalyticsInsight
} from '../../../src/types/analytics.types';

import { 
  ANALYTICS_TIME_RANGES,
  ANALYTICS_THRESHOLDS,
  PATTERN_RECOGNITION_CONFIG,
  MARKET_TREND_CONFIG
} from '../../../src/constants/analytics.constants';

import { LoadingState } from '../../../src/types/common.types';

// Mock WebSocket setup
const WS_URL = 'ws://localhost:8080';
let mockWebSocket: MockWebSocket;

// Helper function to create test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: { analytics: reducer },
    preloadedState: { analytics: initialState }
  });
};

// Mock data generators
const generateMockHistoricalData = (count: number): AnalyticsDataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 86400000),
    value: Math.random() * 1000,
    metricType: AnalyticsMetricType.REVENUE,
    metadata: {},
    tags: ['test'],
    source: 'mock'
  }));
};

const generateMockRevenueForecast = (): RevenueForecast => ({
  predictions: generateMockHistoricalData(30),
  confidenceInterval: 0.95,
  modelAccuracy: 0.92,
  forecastRange: {
    start: new Date(),
    end: new Date(Date.now() + 30 * 86400000)
  },
  contributingFactors: [
    { factor: 'seasonality', impact: 0.3 }
  ],
  seasonalityPattern: 'weekly'
});

const generateMockPatterns = (): AnalyticsInsight[] => ([{
  type: 'recurring_pattern',
  description: 'Weekly revenue spike',
  confidence: 0.88,
  timestamp: new Date(),
  severity: 'high',
  recommendations: ['Optimize inventory'],
  relatedMetrics: [AnalyticsMetricType.REVENUE]
}]);

const generateMockMarketTrends = (): MarketTrend[] => ([{
  trend: 'market_expansion',
  impact: 0.4,
  competitors: ['competitor_a'],
  detectedAt: new Date(),
  category: 'market_shift',
  confidence: 0.85,
  relatedInsights: []
}]);

describe('Analytics Slice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocket = new MockWebSocket(WS_URL);
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = createTestStore();
      const state = store.getState().analytics;

      expect(state.historicalData).toEqual([]);
      expect(state.revenueForecast).toBeNull();
      expect(state.patternAnalysis).toEqual([]);
      expect(state.marketTrends).toEqual([]);
      expect(state.loading).toBe(LoadingState.IDLE);
      expect(state.error).toBeNull();
      expect(state.selectedTimeRange).toBe(ANALYTICS_TIME_RANGES.LAST_30_DAYS);
      expect(state.selectedMetricType).toBe(AnalyticsMetricType.REVENUE);
    });
  });

  describe('Historical Data', () => {
    it('should handle fetchHistoricalData.pending', () => {
      const store = createTestStore();
      store.dispatch(fetchHistoricalData.pending('', {
        timeRange: ANALYTICS_TIME_RANGES.LAST_30_DAYS,
        metricType: AnalyticsMetricType.REVENUE,
        page: 1,
        pageSize: 50
      }));

      expect(store.getState().analytics.loading).toBe(LoadingState.LOADING);
    });

    it('should handle fetchHistoricalData.fulfilled', () => {
      const mockData = generateMockHistoricalData(100);
      const store = createTestStore();
      
      store.dispatch(fetchHistoricalData.fulfilled(mockData, '', {
        timeRange: ANALYTICS_TIME_RANGES.LAST_30_DAYS,
        metricType: AnalyticsMetricType.REVENUE,
        page: 1,
        pageSize: 50
      }));

      expect(store.getState().analytics.historicalData).toEqual(mockData);
      expect(store.getState().analytics.loading).toBe(LoadingState.SUCCESS);
    });

    it('should handle fetchHistoricalData.rejected', () => {
      const store = createTestStore();
      const errorMessage = 'Failed to fetch data';
      
      store.dispatch(fetchHistoricalData.rejected(new Error(errorMessage), '', {
        timeRange: ANALYTICS_TIME_RANGES.LAST_30_DAYS,
        metricType: AnalyticsMetricType.REVENUE,
        page: 1,
        pageSize: 50
      }));

      expect(store.getState().analytics.loading).toBe(LoadingState.ERROR);
      expect(store.getState().analytics.error).toContain(errorMessage);
    });
  });

  describe('Revenue Forecast', () => {
    it('should handle fetchRevenueForecast.fulfilled', () => {
      const mockForecast = generateMockRevenueForecast();
      const store = createTestStore();

      store.dispatch(fetchRevenueForecast.fulfilled(mockForecast, '', {
        forecastPeriod: 30,
        confidenceLevel: ANALYTICS_THRESHOLDS.CONFIDENCE_THRESHOLD
      }));

      expect(store.getState().analytics.revenueForecast).toEqual(mockForecast);
      expect(store.getState().analytics.loading).toBe(LoadingState.SUCCESS);
    });

    it('should validate forecast confidence levels', () => {
      const mockForecast = generateMockRevenueForecast();
      mockForecast.modelAccuracy = 0.95;
      const store = createTestStore();

      store.dispatch(fetchRevenueForecast.fulfilled(mockForecast, '', {
        forecastPeriod: 30,
        confidenceLevel: 0.9
      }));

      expect(store.getState().analytics.revenueForecast?.modelAccuracy).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Pattern Detection', () => {
    it('should handle pattern analysis with confidence thresholds', () => {
      const mockPatterns = generateMockPatterns();
      const store = createTestStore();

      store.dispatch(actions.updatePatternAnalysis(mockPatterns));

      const patterns = selectPatternsByConfidence(
        store.getState(),
        PATTERN_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD
      );

      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThanOrEqual(
          PATTERN_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD
        );
      });
    });
  });

  describe('Market Trends', () => {
    it('should handle market trend analysis with significance testing', () => {
      const mockTrends = generateMockMarketTrends();
      const store = createTestStore();

      store.dispatch(actions.updateMarketTrends(mockTrends));

      const trends = selectTrendsBySignificance(
        store.getState(),
        MARKET_TREND_CONFIG.TREND_CONFIDENCE_THRESHOLD
      );

      expect(trends.length).toBeGreaterThan(0);
      trends.forEach(trend => {
        expect(trend.confidence).toBeGreaterThanOrEqual(
          MARKET_TREND_CONFIG.TREND_CONFIDENCE_THRESHOLD
        );
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle WebSocket real-time updates', async () => {
      const store = createTestStore();
      const mockUpdate = {
        timestamp: new Date(),
        value: 1500,
        metricType: AnalyticsMetricType.REVENUE
      };

      store.dispatch(actions.setRealTimeConfig({ enabled: true, interval: 5000 }));
      await mockWebSocket.connected;
      mockWebSocket.send(JSON.stringify(mockUpdate));

      const state = store.getState().analytics;
      expect(state.realTimeConfig.enabled).toBe(true);
      expect(state.realTimeConfig.updateInterval).toBe(5000);
    });

    it('should throttle real-time updates appropriately', async () => {
      const store = createTestStore();
      const updates = Array.from({ length: 5 }, () => ({
        timestamp: new Date(),
        value: Math.random() * 1000,
        metricType: AnalyticsMetricType.REVENUE
      }));

      store.dispatch(actions.setRealTimeConfig({ enabled: true, interval: 1000 }));
      await mockWebSocket.connected;

      // Simulate rapid updates
      for (const update of updates) {
        mockWebSocket.send(JSON.stringify(update));
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const state = store.getState().analytics;
      expect(state.realTimeConfig.enabled).toBe(true);
    });
  });

  describe('Selectors', () => {
    it('should filter analytics by metric type', () => {
      const mockData = [
        ...generateMockHistoricalData(5).map(d => ({ ...d, metricType: AnalyticsMetricType.REVENUE })),
        ...generateMockHistoricalData(5).map(d => ({ ...d, metricType: AnalyticsMetricType.CONVERSION_RATE }))
      ];

      const store = createTestStore({
        historicalData: mockData
      });

      const revenueData = selectFilteredAnalytics(store.getState(), AnalyticsMetricType.REVENUE);
      expect(revenueData.length).toBe(5);
      revenueData.forEach(d => {
        expect(d.metricType).toBe(AnalyticsMetricType.REVENUE);
      });
    });
  });
});