/**
 * @fileoverview Analytics module request validation with enterprise-grade validation rules
 * for historical data analysis, revenue forecasting, and pattern detection parameters.
 * Version: 1.0.0
 */

import * as Joi from 'joi'; // ^17.9.0
import { validateDateRange, validateNumericRange } from '../utils/validation.utils';
import { AnalyticsMetricType, TimeGranularity, HistoricalDataParams, RevenueForecastParams, PatternDetectionParams, PatternType } from '../types/analytics.types';
import { ErrorCodes } from '../constants/error-codes';

// Global validation constants
const MIN_DATA_POINTS = 1000;
const MAX_FORECAST_MONTHS = 24;
const MIN_CONFIDENCE_THRESHOLD = 0.85;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.90;

// Cached validation schemas for performance
const baseAnalyticsSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  filters: Joi.array().items(Joi.object({
    field: Joi.string().required(),
    operator: Joi.string().valid('equals', 'contains', 'greaterThan', 'lessThan', 'between').required(),
    value: Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.date().iso(),
      Joi.array()
    ).required()
  }))
});

/**
 * Validates historical data analysis parameters ensuring minimum data points and valid date ranges
 * @param params - Historical data analysis parameters
 * @returns Promise<boolean> - True if valid, throws ValidationError otherwise
 */
export const validateHistoricalDataParams = async (params: HistoricalDataParams): Promise<boolean> => {
  try {
    // Validate base schema
    await baseAnalyticsSchema.validateAsync(params);

    // Validate date range
    if (!validateDateRange(params.startDate, params.endDate, 'UTC')) {
      throw new Error('Invalid date range specified');
    }

    // Validate metric type
    if (!Object.values(AnalyticsMetricType).includes(params.metricType)) {
      throw new Error(`Invalid metric type: ${params.metricType}`);
    }

    // Validate granularity
    if (!Object.values(TimeGranularity).includes(params.granularity)) {
      throw new Error(`Invalid time granularity: ${params.granularity}`);
    }

    // Validate minimum data points requirement
    const timeDiff = params.endDate.getTime() - params.startDate.getTime();
    const estimatedDataPoints = timeDiff / (getGranularityMilliseconds(params.granularity));
    
    if (estimatedDataPoints < MIN_DATA_POINTS) {
      throw new Error(`Insufficient data points. Minimum required: ${MIN_DATA_POINTS}`);
    }

    // Validate processing capacity (1M+ records/hour)
    const recordsPerHour = (estimatedDataPoints * 3600000) / timeDiff;
    if (recordsPerHour > 1000000) {
      throw new Error('Data volume exceeds processing capacity');
    }

    return true;
  } catch (error) {
    throw {
      code: ErrorCodes.VALIDATION_ERROR,
      message: `Historical data validation failed: ${error.message}`
    };
  }
};

/**
 * Validates revenue forecasting parameters including model configuration and confidence intervals
 * @param params - Revenue forecast parameters
 * @returns Promise<boolean> - True if valid, throws ValidationError otherwise
 */
export const validateRevenueForecastParams = async (params: RevenueForecastParams): Promise<boolean> => {
  try {
    // Validate forecast period
    if (!validateNumericRange(params.forecastPeriod, 1, MAX_FORECAST_MONTHS, { precision: 0 })) {
      throw new Error(`Forecast period must be between 1 and ${MAX_FORECAST_MONTHS} months`);
    }

    // Validate model configuration
    if (!params.modelConfig || !params.modelConfig.layers || params.modelConfig.layers.length === 0) {
      throw new Error('Invalid model configuration');
    }

    // Validate confidence level
    if (!validateNumericRange(params.confidenceLevel, 0, 1, { precision: 2 })) {
      throw new Error('Confidence level must be between 0 and 1');
    }

    // Validate seasonality configuration
    if (!params.seasonalityFactors || typeof params.seasonalityFactors !== 'object') {
      throw new Error('Invalid seasonality configuration');
    }

    // Validate external factors
    if (params.externalFactors) {
      for (const factor of params.externalFactors) {
        if (!validateNumericRange(factor.impact, -1, 1, { precision: 2 })) {
          throw new Error(`Invalid impact value for external factor: ${factor.name}`);
        }
        if (!validateNumericRange(factor.confidence, 0, 1, { precision: 2 })) {
          throw new Error(`Invalid confidence value for external factor: ${factor.name}`);
        }
      }
    }

    return true;
  } catch (error) {
    throw {
      code: ErrorCodes.VALIDATION_ERROR,
      message: `Revenue forecast validation failed: ${error.message}`
    };
  }
};

/**
 * Validates pattern detection parameters including confidence thresholds and data requirements
 * @param params - Pattern detection parameters
 * @returns Promise<boolean> - True if valid, throws ValidationError otherwise
 */
export const validatePatternDetectionParams = async (params: PatternDetectionParams): Promise<boolean> => {
  try {
    // Validate pattern type
    if (!Object.values(PatternType).includes(params.patternType)) {
      throw new Error(`Invalid pattern type: ${params.patternType}`);
    }

    // Validate confidence threshold
    if (!validateNumericRange(params.confidenceThreshold, MIN_CONFIDENCE_THRESHOLD, 1, { precision: 2 })) {
      throw new Error(`Confidence threshold must be at least ${MIN_CONFIDENCE_THRESHOLD}`);
    }

    // Validate data points
    if (!params.dataPoints || params.dataPoints.length < MIN_DATA_POINTS) {
      throw new Error(`Insufficient data points. Minimum required: ${MIN_DATA_POINTS}`);
    }

    // Validate time window
    if (!validateDateRange(params.timeWindow.start, params.timeWindow.end, 'UTC')) {
      throw new Error('Invalid time window specified');
    }

    // Validate algorithm configuration
    if (!params.algorithmConfig || !params.algorithmConfig.algorithm) {
      throw new Error('Invalid algorithm configuration');
    }

    // Validate algorithm thresholds
    for (const [key, value] of Object.entries(params.algorithmConfig.thresholds)) {
      if (!validateNumericRange(value, 0, 1, { precision: 2 })) {
        throw new Error(`Invalid threshold value for: ${key}`);
      }
    }

    return true;
  } catch (error) {
    throw {
      code: ErrorCodes.VALIDATION_ERROR,
      message: `Pattern detection validation failed: ${error.message}`
    };
  }
};

/**
 * Helper function to convert time granularity to milliseconds
 * @param granularity - Time granularity enum value
 * @returns number - Milliseconds for the granularity
 */
const getGranularityMilliseconds = (granularity: TimeGranularity): number => {
  const HOUR = 3600000;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;
  const QUARTER = 3 * MONTH;
  const YEAR = 365 * DAY;

  switch (granularity) {
    case TimeGranularity.HOURLY:
      return HOUR;
    case TimeGranularity.DAILY:
      return DAY;
    case TimeGranularity.WEEKLY:
      return WEEK;
    case TimeGranularity.MONTHLY:
      return MONTH;
    case TimeGranularity.QUARTERLY:
      return QUARTER;
    case TimeGranularity.YEARLY:
      return YEAR;
    default:
      return DAY;
  }
};