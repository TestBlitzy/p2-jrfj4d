// @tensorflow/tfjs-node v4.x - Type definitions for TensorFlow.js ML model types
import * as TensorFlow from '@tensorflow/tfjs-node';

/**
 * Enum defining supported analytics metric types for analysis and reporting
 */
export enum AnalyticsMetricType {
  REVENUE = 'REVENUE',
  CONVERSION_RATE = 'CONVERSION_RATE',
  SALES_VELOCITY = 'SALES_VELOCITY',
  LEAD_QUALITY = 'LEAD_QUALITY',
  PIPELINE_HEALTH = 'PIPELINE_HEALTH',
  MARKET_PENETRATION = 'MARKET_PENETRATION'
}

/**
 * Enum defining time granularity options for data analysis
 */
export enum TimeGranularity {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

/**
 * Type defining analytics filter structure
 */
export type AnalyticsFilter = {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: string | number | Date | Array<any>;
};

/**
 * Type defining analytics insight structure
 */
export type AnalyticsInsight = {
  type: string;
  description: string;
  impact: number;
  confidence: number;
  recommendations: string[];
};

/**
 * Type defining pattern structure for analysis results
 */
export type Pattern = {
  id: string;
  type: string;
  description: string;
  strength: number;
  frequency: number;
  timeRange: {
    start: Date;
    end: Date;
  };
};

/**
 * Type defining anomaly structure for analysis results
 */
export type Anomaly = {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  description: string;
  affectedMetrics: string[];
};

/**
 * Parameters for historical data analysis
 */
export type HistoricalDataParams = {
  startDate: Date;
  endDate: Date;
  metricType: AnalyticsMetricType;
  granularity: TimeGranularity;
  filters: AnalyticsFilter[];
};

/**
 * Results from historical data analysis
 */
export type HistoricalDataResult = {
  insights: Array<AnalyticsInsight>;
  patterns: Array<Pattern>;
  accuracy: number;
  confidenceScore: number;
  dataPoints: number;
  anomalies: Array<Anomaly>;
};

/**
 * Configuration for seasonality factors in forecasting
 */
export type SeasonalityConfig = {
  yearly: boolean;
  quarterly: boolean;
  monthly: boolean;
  weekly: boolean;
  dailyFactors: boolean;
};

/**
 * Configuration for external factors affecting forecasts
 */
export type ExternalFactorConfig = {
  name: string;
  impact: number;
  confidence: number;
  timeRange: {
    start: Date;
    end: Date;
  };
};

/**
 * Parameters for revenue forecasting
 */
export type RevenueForecastParams = {
  forecastPeriod: number;
  modelConfig: TensorFlow.ModelConfig;
  seasonalityFactors: SeasonalityConfig;
  externalFactors: ExternalFactorConfig[];
  confidenceLevel: number;
};

/**
 * Type defining revenue prediction structure
 */
export type RevenuePrediction = {
  timestamp: Date;
  value: number;
  confidence: number;
  factors: string[];
};

/**
 * Type defining confidence interval structure
 */
export type ConfidenceInterval = {
  upper: number;
  lower: number;
  median: number;
  percentile: number;
};

/**
 * Type defining seasonality impact structure
 */
export type SeasonalityImpact = {
  yearly: number;
  quarterly: number;
  monthly: number;
  weekly: number;
  daily: number;
};

/**
 * Type defining risk factor structure
 */
export type RiskFactor = {
  type: string;
  probability: number;
  impact: number;
  description: string;
  mitigationStrategies: string[];
};

/**
 * Results from revenue forecasting
 */
export type RevenueForecastResult = {
  predictions: Array<RevenuePrediction>;
  confidenceInterval: ConfidenceInterval;
  modelAccuracy: number;
  seasonalityImpact: SeasonalityImpact;
  riskFactors: Array<RiskFactor>;
};

/**
 * Enum defining pattern types for detection
 */
export enum PatternType {
  TREND = 'TREND',
  CYCLE = 'CYCLE',
  SEASONAL = 'SEASONAL',
  RANDOM = 'RANDOM'
}

/**
 * Type defining data point structure
 */
export type DataPoint = {
  timestamp: Date;
  value: number;
  metadata: Record<string, any>;
};

/**
 * Type defining time window structure
 */
export type TimeWindow = {
  start: Date;
  end: Date;
  intervalType: TimeGranularity;
};

/**
 * Configuration for pattern detection algorithm
 */
export type PatternAlgorithmConfig = {
  algorithm: string;
  parameters: Record<string, any>;
  thresholds: Record<string, number>;
};

/**
 * Type defining correlation structure
 */
export type Correlation = {
  factor1: string;
  factor2: string;
  coefficient: number;
  significance: number;
  description: string;
};

/**
 * Type defining pattern insight structure
 */
export type PatternInsight = {
  patternId: string;
  description: string;
  significance: number;
  actionItems: string[];
};

/**
 * Type defining validation metrics structure
 */
export type ValidationMetrics = {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
};

/**
 * Parameters for pattern detection
 */
export type PatternDetectionParams = {
  patternType: PatternType;
  dataPoints: Array<DataPoint>;
  confidenceThreshold: number;
  timeWindow: TimeWindow;
  algorithmConfig: PatternAlgorithmConfig;
};

/**
 * Results from pattern detection
 */
export type PatternDetectionResult = {
  patterns: Array<Pattern>;
  confidence: number;
  correlations: Array<Correlation>;
  insights: Array<PatternInsight>;
  validationMetrics: ValidationMetrics;
};

// Global constants
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;
export const MIN_DATA_POINTS = 1000;
export const MAX_FORECAST_PERIOD_MONTHS = 24;
export const MIN_PATTERN_CONFIDENCE = 0.85;
export const DEFAULT_TIME_GRANULARITY = TimeGranularity.DAILY;