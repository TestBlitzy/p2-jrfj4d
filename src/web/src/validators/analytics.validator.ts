import { z } from 'zod'; // v3.x
import { AnalyticsMetricType } from '../types/analytics.types';

// Constants for validation rules
const MAX_HISTORICAL_YEARS = 5;
const MIN_CONFIDENCE_SCORE = 0;
const MAX_CONFIDENCE_SCORE = 1;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * Schema for validating individual analytics data points
 * Ensures data integrity for historical analysis with support for 1M+ records
 */
export const analyticsDataPointSchema = z.object({
  timestamp: z.date()
    .refine(date => date <= new Date(), 'Timestamp cannot be in the future')
    .refine(date => date.getFullYear() >= new Date().getFullYear() - MAX_HISTORICAL_YEARS, 
      `Data cannot be older than ${MAX_HISTORICAL_YEARS} years`),
  
  value: z.number()
    .finite()
    .refine(val => !isNaN(val), 'Value must be a valid number'),
  
  metricType: z.nativeEnum(AnalyticsMetricType),
  
  source: z.string()
    .min(1, 'Source must not be empty')
    .optional(),
  
  confidence: z.number()
    .min(MIN_CONFIDENCE_SCORE)
    .max(MAX_CONFIDENCE_SCORE)
    .optional()
}).strict();

/**
 * Schema for validating analytics API request parameters
 * Supports historical data analysis and pattern recognition features
 */
export const analyticsRequestSchema = z.object({
  timeRange: z.string()
    .regex(ISO_DATE_REGEX, 'Time range must be in ISO 8601 format')
    .refine(range => {
      const [start, end] = range.split('/');
      return new Date(end) > new Date(start);
    }, 'End date must be after start date'),

  metricType: z.nativeEnum(AnalyticsMetricType),

  filters: z.object({
    sources: z.array(z.string()).optional(),
    minConfidence: z.number()
      .min(MIN_CONFIDENCE_SCORE)
      .max(MAX_CONFIDENCE_SCORE)
      .optional(),
    tags: z.array(z.string()).optional()
  }).optional(),

  aggregation: z.enum(['sum', 'average', 'min', 'max', 'count'])
    .optional()
}).strict();

/**
 * Schema for validating chart visualization options
 * Ensures proper display of analytics data and patterns
 */
export const chartOptionsSchema = z.object({
  metricType: z.nativeEnum(AnalyticsMetricType),
  
  timeRange: z.string()
    .regex(ISO_DATE_REGEX, 'Time range must be in ISO 8601 format'),
  
  showLegend: z.boolean()
    .default(true),
  
  enableZoom: z.boolean()
    .default(true),
  
  customColors: z.array(z.string()
    .regex(HEX_COLOR_REGEX, 'Colors must be valid hex codes'))
    .optional()
}).strict();

/**
 * Validates a batch of analytics data points for bulk processing
 * Optimized for handling 1M+ records within performance requirements
 */
export const validateAnalyticsBatch = (dataPoints: unknown[]): z.SafeParseReturnType<unknown, unknown>[] => {
  return dataPoints.map(point => analyticsDataPointSchema.safeParse(point));
};

/**
 * Validates revenue forecast parameters including confidence thresholds
 */
export const revenueForecastSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  confidenceThreshold: z.number()
    .min(0.5, 'Confidence threshold must be at least 50%')
    .max(1, 'Confidence threshold cannot exceed 100%'),
  includeSeasonality: z.boolean()
    .default(true),
  granularity: z.enum(['daily', 'weekly', 'monthly', 'quarterly'])
}).strict();

/**
 * Validates pattern recognition parameters for trend identification
 */
export const patternAnalysisSchema = z.object({
  minDataPoints: z.number()
    .min(1000, 'Minimum 1000 data points required for pattern analysis'),
  confidenceThreshold: z.number()
    .min(0.9, 'Confidence threshold must be at least 90% for accurate trend identification'),
  patternTypes: z.array(
    z.enum(['trend', 'seasonality', 'cyclical', 'anomaly'])
  ),
  timeWindow: z.string()
    .regex(ISO_DATE_REGEX, 'Time window must be in ISO 8601 format')
}).strict();

/**
 * Type guard to validate analytics metric type
 */
export const isValidMetricType = (type: unknown): type is AnalyticsMetricType => {
  return Object.values(AnalyticsMetricType).includes(type as AnalyticsMetricType);
};

/**
 * Validates and sanitizes time range parameters
 */
export const validateTimeRange = (start: Date, end: Date): boolean => {
  const now = new Date();
  const minDate = new Date();
  minDate.setFullYear(now.getFullYear() - MAX_HISTORICAL_YEARS);

  return start >= minDate && 
         end <= now && 
         start < end;
};