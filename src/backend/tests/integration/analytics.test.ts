import { Test, TestingModule } from '@nestjs/testing'; // v10.0.0
import { PrismaClient } from '@prisma/client'; // v5.0.0
import * as tf from '@tensorflow/tfjs-node-gpu'; // v4.0.0
import { TestDataGenerator } from '@test/data-generator'; // v1.0.0
import { describe, it, beforeAll, afterAll, expect, jest } from 'jest'; // v29.0.0

import { AnalyticsService } from '../../src/services/analytics.service';
import { AnalyticsModel } from '../../src/models/analytics.model';
import { 
  AnalyticsMetricType, 
  TimeGranularity,
  PatternType,
  DEFAULT_CONFIDENCE_THRESHOLD,
  MIN_DATA_POINTS
} from '../../src/types/analytics.types';

describe('AnalyticsService Integration Tests', () => {
  let analyticsService: AnalyticsService;
  let prisma: PrismaClient;
  let testDataGenerator: TestDataGenerator;
  let module: TestingModule;

  beforeAll(async () => {
    // Initialize test module
    module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        AnalyticsModel,
        PrismaClient,
        TestDataGenerator
      ],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaClient>(PrismaClient);
    testDataGenerator = module.get<TestDataGenerator>(TestDataGenerator);

    // Verify GPU availability
    await tf.setBackend('tensorflow');
    await tf.ready();
    expect(tf.getBackend()).toBe('tensorflow');

    // Generate test data
    await testDataGenerator.generateHistoricalData({
      recordCount: MIN_DATA_POINTS + 1000, // Exceed minimum requirement
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate: new Date(),
      metricType: AnalyticsMetricType.REVENUE
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.salesData.deleteMany({});
    await prisma.marketData.deleteMany({});
    
    // Close connections
    await prisma.$disconnect();
    await module.close();
  });

  describe('Historical Data Analysis', () => {
    it('should process 1M+ records within 1 hour', async () => {
      const startTime = Date.now();
      const result = await analyticsService.analyzeHistoricalData({
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        metricType: AnalyticsMetricType.REVENUE,
        granularity: TimeGranularity.DAILY,
        insights: []
      });

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(3600000); // 1 hour in milliseconds
      expect(result.insights.length).toBeGreaterThan(0);
    }, 3600000); // Test timeout 1 hour

    it('should achieve 90% accuracy in trend identification', async () => {
      const knownTrends = await testDataGenerator.getKnownTrends();
      const result = await analyticsService.analyzeHistoricalData({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        metricType: AnalyticsMetricType.REVENUE,
        granularity: TimeGranularity.DAILY,
        insights: []
      });

      const detectedTrends = result.insights.filter(i => i.confidence >= DEFAULT_CONFIDENCE_THRESHOLD);
      const accuracyRate = detectedTrends.length / knownTrends.length;
      expect(accuracyRate).toBeGreaterThanOrEqual(0.9);
    });

    it('should provide sub-second query responses', async () => {
      const queryStartTime = Date.now();
      await analyticsService.analyzeHistoricalData({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        metricType: AnalyticsMetricType.REVENUE,
        granularity: TimeGranularity.HOURLY,
        insights: []
      });

      const queryTime = Date.now() - queryStartTime;
      expect(queryTime).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Revenue Forecasting', () => {
    it('should utilize GPU acceleration for predictions', async () => {
      const gpuSpy = jest.spyOn(tf, 'setBackend');
      
      await analyticsService.generateRevenueForecast({
        forecastPeriod: 12,
        predictions: [],
        confidenceInterval: 0.95,
        seasonalityConfig: {
          seasonalPeriod: 12,
          decompositionMethod: 'multiplicative',
          seasonalityFactors: []
        },
        modelConfig: {
          modelType: 'LSTM',
          hyperparameters: {},
          trainingConfig: {
            epochs: 100,
            batchSize: 32,
            validationSplit: 0.2
          }
        }
      });

      expect(gpuSpy).toHaveBeenCalledWith('tensorflow');
      expect(await tf.getBackend()).toBe('tensorflow');
    });

    it('should generate forecasts with confidence intervals', async () => {
      const result = await analyticsService.generateRevenueForecast({
        forecastPeriod: 6,
        predictions: [],
        confidenceInterval: 0.95,
        seasonalityConfig: {
          seasonalPeriod: 12,
          decompositionMethod: 'multiplicative',
          seasonalityFactors: []
        },
        modelConfig: {
          modelType: 'LSTM',
          hyperparameters: {},
          trainingConfig: {
            epochs: 100,
            batchSize: 32,
            validationSplit: 0.2
          }
        }
      });

      expect(result.predictions.length).toBe(6);
      result.predictions.forEach(prediction => {
        expect(prediction.upperBound).toBeGreaterThan(prediction.predictedValue);
        expect(prediction.lowerBound).toBeLessThan(prediction.predictedValue);
        expect(prediction.confidenceInterval).toBeGreaterThanOrEqual(0.95);
      });
    });
  });

  describe('Pattern Detection', () => {
    it('should detect patterns with statistical significance', async () => {
      const result = await analyticsService.detectPatterns({
        patternType: PatternType.TREND,
        patternCategory: 'revenue_trend',
        confidence: 0,
        confidenceParams: {
          threshold: 0.9,
          minDataPoints: MIN_DATA_POINTS,
          significanceLevel: 0.05,
          outlierSensitivity: 0.1
        },
        dataPoints: await testDataGenerator.getTestDataPoints(),
        correlationMatrix: [],
        anomalyThresholds: {
          upper: 2,
          lower: -2
        }
      });

      expect(result.confidence).toBeGreaterThanOrEqual(DEFAULT_CONFIDENCE_THRESHOLD);
      expect(result.patternType).toBe(PatternType.TREND);
    });

    it('should validate minimum 12-month data requirement', async () => {
      const insufficientData = testDataGenerator.getTestDataPoints().slice(0, MIN_DATA_POINTS - 1);
      
      await expect(analyticsService.detectPatterns({
        patternType: PatternType.TREND,
        patternCategory: 'revenue_trend',
        confidence: 0,
        confidenceParams: {
          threshold: 0.9,
          minDataPoints: MIN_DATA_POINTS,
          significanceLevel: 0.05,
          outlierSensitivity: 0.1
        },
        dataPoints: insufficientData,
        correlationMatrix: [],
        anomalyThresholds: {
          upper: 2,
          lower: -2
        }
      })).rejects.toThrow('Insufficient data points for pattern detection');
    });
  });
});