/**
 * @fileoverview Unit tests for AI utility functions covering data preprocessing,
 * model interaction, and AI operations for lead scoring, revenue forecasting,
 * and market intelligence features.
 * @version 1.0.0
 */

import {
  preprocessLeadData,
  calculateLeadScore,
  preprocessRevenueData,
  generateRevenueForecast,
  analyzeMarketData
} from '../../../src/utils/ai.utils';
import { AI_CONFIG } from '../../../src/config/ai.config';
import { ErrorCodes } from '../../../src/constants';
import * as tf from '@tensorflow/tfjs';

// Mock TensorFlow and AI Config
jest.mock('@tensorflow/tfjs');
jest.mock('../../../src/config/ai.config');

// Test data constants
const sampleLeadData = {
  email: 'test@example.com',
  company: 'Test Corp',
  revenue: 1000000,
  employees: 500,
  industry: 'Technology',
  interactions: 10,
  lastContact: new Date().toISOString()
};

const sampleRevenueData = Array.from({ length: 12 }, (_, i) => ({
  revenue: 100000 + (i * 10000),
  timeStamp: new Date(2023, i, 1).toISOString()
}));

const sampleMarketData = {
  text: 'Competitor A launched new AI product with machine learning capabilities.',
  source: 'news',
  timestamp: new Date().toISOString(),
  relevance: 0.85
};

describe('preprocessLeadData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should successfully preprocess valid lead data', async () => {
    const result = await preprocessLeadData(sampleLeadData);
    expect(result).toHaveProperty('features');
    expect(result).toHaveProperty('metadata');
    expect(result.metadata.validationStatus).toBe(true);
  });

  test('should handle missing values in lead data', async () => {
    const incompleteData = { ...sampleLeadData };
    delete incompleteData.revenue;
    
    const result = await preprocessLeadData(incompleteData);
    expect(result.metadata.confidenceScore).toBeLessThan(1);
  });

  test('should throw error for invalid input structure', async () => {
    await expect(preprocessLeadData(null)).rejects.toThrow('Invalid lead data structure');
  });

  test('should normalize numerical features correctly', async () => {
    const result = await preprocessLeadData(sampleLeadData);
    expect(result.features).toBeInstanceOf(Array);
    expect(result.features[0]).toHaveLength(expect.any(Number));
  });
});

describe('calculateLeadScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tf.loadLayersModel as jest.Mock).mockResolvedValue({
      predict: jest.fn().mockReturnValue({
        data: jest.fn().mockResolvedValue([0.85])
      })
    });
  });

  test('should calculate score with valid preprocessed data', async () => {
    const processedData = {
      features: [[1, 2, 3, 4]],
      metadata: {
        processingTime: 100,
        confidenceScore: 0.9,
        validationStatus: true
      }
    };

    const score = await calculateLeadScore(processedData);
    expect(score).toBe(85);
  });

  test('should handle model prediction errors', async () => {
    (tf.loadLayersModel as jest.Mock).mockRejectedValue(new Error('Model loading failed'));
    
    const processedData = {
      features: [[1, 2, 3, 4]],
      metadata: { processingTime: 100, confidenceScore: 0.9, validationStatus: true }
    };

    await expect(calculateLeadScore(processedData)).rejects.toThrow('Lead score calculation failed');
  });

  test('should validate score range', async () => {
    const processedData = {
      features: [[1, 2, 3, 4]],
      metadata: { processingTime: 100, confidenceScore: 0.9, validationStatus: true }
    };

    const score = await calculateLeadScore(processedData);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('preprocessRevenueData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should validate minimum data requirements', async () => {
    const insufficientData = sampleRevenueData.slice(0, 2);
    await expect(preprocessRevenueData(insufficientData))
      .rejects.toThrow('Insufficient historical revenue data');
  });

  test('should handle time series data correctly', async () => {
    const result = await preprocessRevenueData(sampleRevenueData);
    expect(result.features).toHaveLength(sampleRevenueData.length);
    expect(result.metadata.validationStatus).toBe(true);
  });

  test('should normalize revenue values', async () => {
    const result = await preprocessRevenueData(sampleRevenueData);
    const normalizedValues = result.features.map(f => f[0]);
    expect(Math.max(...normalizedValues)).toBeLessThanOrEqual(1);
    expect(Math.min(...normalizedValues)).toBeGreaterThanOrEqual(0);
  });
});

describe('generateRevenueForecast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (tf.loadLayersModel as jest.Mock).mockResolvedValue({
      predict: jest.fn().mockReturnValue({
        data: jest.fn().mockResolvedValue([120000, 130000, 140000])
      })
    });
  });

  test('should generate forecast with confidence intervals', async () => {
    const processedData = {
      features: sampleRevenueData.map(d => [d.revenue, new Date(d.timeStamp).getTime()]),
      metadata: { processingTime: 100, confidenceScore: 0.9, validationStatus: true }
    };

    const forecast = await generateRevenueForecast(processedData);
    expect(forecast).toHaveProperty('forecast');
    expect(forecast).toHaveProperty('confidence');
    expect(forecast).toHaveProperty('timestamp');
  });

  test('should handle model prediction errors', async () => {
    (tf.loadLayersModel as jest.Mock).mockRejectedValue(new Error('Model loading failed'));
    
    const processedData = {
      features: [[1, 2]],
      metadata: { processingTime: 100, confidenceScore: 0.9, validationStatus: true }
    };

    await expect(generateRevenueForecast(processedData))
      .rejects.toThrow('Revenue forecast generation failed');
  });
});

describe('analyzeMarketData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should analyze market data and generate insights', async () => {
    const insights = await analyzeMarketData(sampleMarketData);
    expect(Array.isArray(insights)).toBe(true);
    expect(insights[0]).toHaveProperty('trend');
    expect(insights[0]).toHaveProperty('confidence');
    expect(insights[0]).toHaveProperty('impact');
  });

  test('should handle BERT model errors', async () => {
    const invalidData = { ...sampleMarketData, text: null };
    await expect(analyzeMarketData(invalidData))
      .rejects.toThrow('Market data analysis failed');
  });

  test('should validate insight confidence scores', async () => {
    const insights = await analyzeMarketData(sampleMarketData);
    insights.forEach(insight => {
      expect(insight.confidence).toBeGreaterThanOrEqual(0);
      expect(insight.confidence).toBeLessThanOrEqual(1);
    });
  });

  test('should generate relevant recommendations', async () => {
    const insights = await analyzeMarketData(sampleMarketData);
    insights.forEach(insight => {
      expect(Array.isArray(insight.recommendations)).toBe(true);
    });
  });
});