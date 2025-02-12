// @tensorflow/tfjs-node v4.x - TensorFlow.js ML model types and tensor operations
import * as tf from '@tensorflow/tfjs-node';

/**
 * Enum defining supported analytics metric types for analysis
 */
export enum AnalyticsMetricType {
  REVENUE = 'REVENUE',
  CONVERSION_RATE = 'CONVERSION_RATE',
  SALES_VELOCITY = 'SALES_VELOCITY',
  PIPELINE_VALUE = 'PIPELINE_VALUE'
}

/**
 * Enum defining time granularity options for analysis
 */
export enum TimeGranularity {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY'
}

/**
 * Enum defining supported pattern types for detection
 */
export enum PatternType {
  TREND = 'TREND',
  SEASONALITY = 'SEASONALITY',
  ANOMALY = 'ANOMALY',
  CORRELATION = 'CORRELATION'
}

/**
 * Interface for analytics insight data point
 */
export interface IAnalyticsInsight {
  timestamp: Date;
  value: number;
  metricType: AnalyticsMetricType;
  confidence: number;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for revenue prediction data point
 */
export interface IRevenuePrediction {
  timestamp: Date;
  predictedValue: number;
  upperBound: number;
  lowerBound: number;
  confidenceInterval: number;
}

/**
 * Interface for seasonality configuration
 */
export interface ISeasonalityConfig {
  seasonalPeriod: number;
  decompositionMethod: 'additive' | 'multiplicative';
  seasonalityFactors: number[];
}

/**
 * Interface for ML model configuration
 */
export interface IMLModelConfig {
  modelType: string;
  hyperparameters: Record<string, unknown>;
  tensorflowModel?: tf.LayersModel;
  trainingConfig?: {
    epochs: number;
    batchSize: number;
    validationSplit: number;
  };
}

/**
 * Interface for confidence parameters
 */
export interface IConfidenceParams {
  threshold: number;
  minDataPoints: number;
  significanceLevel: number;
  outlierSensitivity: number;
}

/**
 * Interface for data point in pattern detection
 */
export interface IDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for historical data analysis parameters and results
 */
export interface IHistoricalDataAnalysis {
  startDate: Date;
  endDate: Date;
  metricType: AnalyticsMetricType;
  granularity: TimeGranularity;
  insights: IAnalyticsInsight[];
  segmentationCriteria?: string[];
  aggregationMethod?: 'sum' | 'average' | 'median';
}

/**
 * Interface for revenue forecasting parameters and results
 */
export interface IRevenueForecast {
  forecastPeriod: number;
  predictions: IRevenuePrediction[];
  confidenceInterval: number;
  seasonalityConfig: ISeasonalityConfig;
  modelConfig: IMLModelConfig;
  baselineMetrics?: Record<string, number>;
  adjustmentFactors?: Record<string, number>;
}

/**
 * Interface for pattern detection parameters and results
 */
export interface IPatternDetection {
  patternType: PatternType;
  patternCategory: string;
  confidence: number;
  confidenceParams: IConfidenceParams;
  dataPoints: IDataPoint[];
  correlationMatrix?: number[][];
  anomalyThresholds?: {
    upper: number;
    lower: number;
  };
}

/**
 * Core interface for analytics service defining required methods for data analysis
 */
export interface IAnalyticsService {
  /**
   * Analyzes historical sales data to identify patterns and generate insights
   * @param params Historical data analysis parameters
   * @returns Analysis results with identified patterns and insights
   */
  analyzeHistoricalData(params: IHistoricalDataAnalysis): Promise<IHistoricalDataAnalysis>;

  /**
   * Generates revenue forecasts using historical data and ML models
   * @param params Revenue forecast parameters
   * @returns Revenue predictions with confidence intervals
   */
  generateRevenueForecast(params: IRevenueForecast): Promise<IRevenueForecast>;

  /**
   * Detects patterns in sales and customer behavior data
   * @param params Pattern detection parameters
   * @returns Detected patterns with confidence scores
   */
  detectPatterns(params: IPatternDetection): Promise<IPatternDetection>;
}