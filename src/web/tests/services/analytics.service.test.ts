import { AnalyticsService } from '../../src/services/analytics.service';
import { 
  AnalyticsMetricType,
  AnalyticsDataPoint,
  RevenueForecast,
  MarketTrend,
  AnalyticsInsight,
  isAnalyticsDataPoint,
  isValidMarketTrend
} from '../../src/types/analytics.types';
import { ANALYTICS_TIME_RANGES, ANALYTICS_THRESHOLDS, PATTERN_RECOGNITION_CONFIG, MARKET_TREND_CONFIG } from '../../src/constants/analytics.constants';
import { API_ENDPOINTS } from '../../src/constants/api.constants';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../src/config/api.config';
import { WebSocket, Server } from 'mock-socket';
import { performance } from 'perf_hooks';

// Test configuration
const LARGE_DATASET_SIZE = 1_000_000;
const TEST_TIMEOUT = 30000;
const PERFORMANCE_THRESHOLD = 3600000; // 1 hour in milliseconds

describe('AnalyticsService Integration Tests', () => {
  let analyticsService: AnalyticsService;
  let mockAxios: MockAdapter;
  let mockWebSocketServer: Server;

  beforeAll(() => {
    // Setup WebSocket mock server
    mockWebSocketServer = new Server('ws://localhost:8080');
    jest.setTimeout(TEST_TIMEOUT);
  });

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockWebSocketServer.close();
  });

  describe('Historical Data Analysis', () => {
    it('should process large datasets within performance threshold', async () => {
      // Generate large test dataset
      const testData: AnalyticsDataPoint[] = Array.from({ length: LARGE_DATASET_SIZE }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 60000),
        value: Math.random() * 1000,
        metricType: AnalyticsMetricType.REVENUE,
        metadata: {},
        tags: ['test'],
        source: 'test'
      }));

      mockAxios.onPost(API_ENDPOINTS.ANALYTICS.HISTORICAL).reply(200, testData);

      const startTime = performance.now();
      
      const dataStream = await analyticsService.getHistoricalData(
        AnalyticsMetricType.REVENUE,
        ANALYTICS_TIME_RANGES.LAST_30_DAYS,
        false
      );

      let processedData: AnalyticsDataPoint[] = [];
      await new Promise<void>((resolve) => {
        dataStream.subscribe({
          next: (data) => {
            processedData = processedData.concat(data);
          },
          complete: () => resolve()
        });
      });

      const processingTime = performance.now() - startTime;

      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLD);
      expect(processedData.length).toBe(LARGE_DATASET_SIZE);
      expect(processedData.every(isAnalyticsDataPoint)).toBe(true);
    });

    it('should handle real-time data updates correctly', async () => {
      const initialData: AnalyticsDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(),
        value: i,
        metricType: AnalyticsMetricType.REVENUE,
        metadata: {},
        tags: ['realtime'],
        source: 'test'
      }));

      mockAxios.onPost(API_ENDPOINTS.ANALYTICS.HISTORICAL).reply(200, initialData);
      mockAxios.onPost(API_ENDPOINTS.ANALYTICS.METRICS).reply(200, [
        {
          timestamp: new Date(),
          value: 1000,
          metricType: AnalyticsMetricType.REVENUE,
          metadata: {},
          tags: ['realtime'],
          source: 'test'
        }
      ]);

      const updates: AnalyticsDataPoint[] = [];
      const dataStream = await analyticsService.getHistoricalData(
        AnalyticsMetricType.REVENUE,
        ANALYTICS_TIME_RANGES.REAL_TIME,
        true
      );

      await new Promise<void>((resolve) => {
        const subscription = dataStream.subscribe({
          next: (data) => {
            updates.push(...data);
            if (updates.length >= 1) {
              subscription.unsubscribe();
              resolve();
            }
          }
        });
      });

      expect(updates.length).toBeGreaterThan(0);
      expect(updates.every(isAnalyticsDataPoint)).toBe(true);
    });
  });

  describe('Revenue Forecasting', () => {
    it('should generate accurate revenue forecasts with confidence intervals', async () => {
      const mockForecast: RevenueForecast = {
        predictions: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 86400000),
          value: 1000 + i * 100,
          metricType: AnalyticsMetricType.REVENUE,
          metadata: {},
          tags: ['forecast'],
          source: 'ai'
        })),
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
      };

      mockAxios.onPost(API_ENDPOINTS.ANALYTICS.FORECAST).reply(200, mockForecast);

      const forecast = await analyticsService.getRevenueForecast(30, 0.9);

      expect(forecast.modelAccuracy).toBeGreaterThanOrEqual(ANALYTICS_THRESHOLDS.CONFIDENCE_THRESHOLD);
      expect(forecast.predictions.length).toBe(30);
      expect(forecast.predictions.every(isAnalyticsDataPoint)).toBe(true);
    });

    it('should reject forecasts with insufficient confidence', async () => {
      const mockForecast: RevenueForecast = {
        predictions: [],
        confidenceInterval: 0.85,
        modelAccuracy: 0.85,
        forecastRange: {
          start: new Date(),
          end: new Date()
        },
        contributingFactors: [],
        seasonalityPattern: 'none'
      };

      mockAxios.onPost(API_ENDPOINTS.ANALYTICS.FORECAST).reply(200, mockForecast);

      await expect(analyticsService.getRevenueForecast(
        30,
        ANALYTICS_THRESHOLDS.CONFIDENCE_THRESHOLD
      )).rejects.toThrow('Forecast accuracy below required confidence level');
    });
  });

  describe('Market Trend Analysis', () => {
    it('should detect significant market trends', async () => {
      const mockTrends: MarketTrend[] = [{
        trend: 'Market expansion',
        impact: 0.8,
        competitors: ['competitor1', 'competitor2'],
        detectedAt: new Date(),
        category: 'market_shift',
        confidence: 0.95,
        relatedInsights: []
      }];

      mockAxios.onPost(API_ENDPOINTS.ANALYTICS.TRENDS).reply(200, mockTrends);
      mockAxios.onGet(API_ENDPOINTS.MARKET.COMPETITORS.ANALYSIS).reply(200, {
        competitor1: { marketShare: 0.3 },
        competitor2: { marketShare: 0.2 }
      });

      const trendsStream = await analyticsService.getMarketTrends(
        ANALYTICS_TIME_RANGES.LAST_30_DAYS,
        MARKET_TREND_CONFIG.TREND_CONFIDENCE_THRESHOLD
      );

      const trends: MarketTrend[] = await new Promise((resolve) => {
        trendsStream.subscribe({
          next: (data) => resolve(data)
        });
      });

      expect(trends.length).toBeGreaterThan(0);
      expect(trends.every(isValidMarketTrend)).toBe(true);
      expect(trends[0].confidence).toBeGreaterThanOrEqual(MARKET_TREND_CONFIG.TREND_CONFIDENCE_THRESHOLD);
    });
  });

  describe('Pattern Recognition', () => {
    it('should identify patterns with required accuracy', async () => {
      const mockInsights: AnalyticsInsight[] = [{
        type: 'pattern',
        description: 'Seasonal revenue pattern detected',
        confidence: 0.92,
        timestamp: new Date(),
        severity: 'medium',
        recommendations: ['Adjust inventory levels'],
        relatedMetrics: [AnalyticsMetricType.REVENUE]
      }];

      mockAxios.onPost(API_ENDPOINTS.ANALYTICS.AI.PREDICTIONS).reply(200, mockInsights);

      const insights = await analyticsService.getAnalyticsInsights(
        AnalyticsMetricType.REVENUE,
        PATTERN_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD
      );

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].confidence).toBeGreaterThanOrEqual(PATTERN_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD);
    });
  });

  describe('Error Handling', () => {
    it('should handle API failures gracefully', async () => {
      mockAxios.onPost(API_ENDPOINTS.ANALYTICS.HISTORICAL).networkError();

      await expect(analyticsService.getHistoricalData(
        AnalyticsMetricType.REVENUE,
        ANALYTICS_TIME_RANGES.LAST_30_DAYS
      )).rejects.toThrow();
    });

    it('should retry failed requests with exponential backoff', async () => {
      let attempts = 0;
      mockAxios.onPost(API_ENDPOINTS.ANALYTICS.HISTORICAL).reply(() => {
        attempts++;
        return attempts < 3 ? [500] : [200, []];
      });

      const dataStream = await analyticsService.getHistoricalData(
        AnalyticsMetricType.REVENUE,
        ANALYTICS_TIME_RANGES.LAST_24_HOURS
      );

      await new Promise<void>((resolve) => {
        dataStream.subscribe({
          complete: () => resolve()
        });
      });

      expect(attempts).toBe(3);
    });
  });
});