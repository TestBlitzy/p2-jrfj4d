/**
 * @fileoverview Market intelligence data validation schemas and functions
 * @version 1.0.0
 * Dependencies:
 * - zod: ^3.22.0
 */

import { z } from 'zod';
import { ActivityType, ImpactLevel, SentimentType, TimeframeType, AlertCondition } from '../types/market.types';
import { validateRequired } from '../utils/validation.utils';

// Constants for validation rules
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_KEYWORD_LENGTH = 50;
const MIN_LENGTH = 2;
const URL_PATTERN = /^https?:\/\/.+/;

/**
 * Schema for competitor validation with enhanced security measures
 */
const competitorSchema = z.object({
  name: z.string()
    .min(MIN_LENGTH, `Name must be at least ${MIN_LENGTH} characters`)
    .max(MAX_NAME_LENGTH, `Name cannot exceed ${MAX_NAME_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9\s\-&.]+$/, 'Name contains invalid characters')
    .transform(val => val.trim()),

  website: z.string()
    .url('Invalid website URL')
    .regex(URL_PATTERN, 'URL must start with http:// or https://')
    .max(2048, 'URL is too long'),

  description: z.string()
    .min(MIN_LENGTH, `Description must be at least ${MIN_LENGTH} characters`)
    .max(MAX_DESCRIPTION_LENGTH, `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`)
    .transform(val => val.trim()),

  marketShare: z.number()
    .min(0, 'Market share cannot be negative')
    .max(100, 'Market share cannot exceed 100')
    .transform(val => Number(val.toFixed(2))),
});

/**
 * Schema for competitor activity validation with temporal validation
 */
const competitorActivitySchema = z.object({
  type: z.nativeEnum(ActivityType, {
    errorMap: () => ({ message: 'Invalid activity type' })
  }),

  description: z.string()
    .min(MIN_LENGTH, `Description must be at least ${MIN_LENGTH} characters`)
    .max(MAX_DESCRIPTION_LENGTH, `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`)
    .transform(val => val.trim()),

  impactLevel: z.nativeEnum(ImpactLevel, {
    errorMap: () => ({ message: 'Invalid impact level' })
  }),

  date: z.date()
    .refine(date => date <= new Date(), 'Activity date cannot be in the future')
    .transform(date => new Date(date)),
});

/**
 * Schema for market trend validation with trend analysis validation
 */
const marketTrendSchema = z.object({
  keyword: z.string()
    .min(MIN_LENGTH, `Keyword must be at least ${MIN_LENGTH} characters`)
    .max(MAX_KEYWORD_LENGTH, `Keyword cannot exceed ${MAX_KEYWORD_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9\s\-]+$/, 'Keyword contains invalid characters')
    .transform(val => val.trim()),

  mentionCount: z.number()
    .int('Mention count must be an integer')
    .min(0, 'Mention count cannot be negative'),

  sentiment: z.nativeEnum(SentimentType, {
    errorMap: () => ({ message: 'Invalid sentiment type' })
  }),

  timeframe: z.nativeEnum(TimeframeType, {
    errorMap: () => ({ message: 'Invalid timeframe type' })
  }),

  sources: z.array(z.string().url('Invalid source URL'))
    .min(1, 'At least one source is required')
    .max(100, 'Too many sources provided'),
});

/**
 * Schema for price alert validation with threshold validation
 */
const priceAlertSchema = z.object({
  competitorProductId: z.string()
    .uuid('Invalid competitor product ID'),

  condition: z.nativeEnum(AlertCondition, {
    errorMap: () => ({ message: 'Invalid alert condition' })
  }),

  threshold: z.number()
    .positive('Threshold must be positive')
    .transform(val => Number(val.toFixed(2))),

  isActive: z.boolean(),
});

/**
 * Validates competitor data with enhanced security measures
 * @param competitorData - Competitor data to validate
 * @returns Validation result with detailed error messages
 */
export const validateCompetitor = (competitorData: unknown) => {
  try {
    const requiredError = validateRequired(competitorData, 'Competitor data');
    if (requiredError) {
      return { success: false, errors: [requiredError] };
    }

    const result = competitorSchema.safeParse(competitorData);
    return {
      success: result.success,
      errors: result.success ? [] : result.error.errors.map(err => err.message),
      data: result.success ? result.data : undefined
    };
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid competitor data format']
    };
  }
};

/**
 * Validates competitor activity data with temporal validation
 * @param activityData - Activity data to validate
 * @returns Validation result with activity-specific validation details
 */
export const validateCompetitorActivity = (activityData: unknown) => {
  try {
    const requiredError = validateRequired(activityData, 'Activity data');
    if (requiredError) {
      return { success: false, errors: [requiredError] };
    }

    const result = competitorActivitySchema.safeParse(activityData);
    return {
      success: result.success,
      errors: result.success ? [] : result.error.errors.map(err => err.message),
      data: result.success ? result.data : undefined
    };
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid activity data format']
    };
  }
};

/**
 * Validates market trend data with trend analysis validation
 * @param trendData - Trend data to validate
 * @returns Validation result with trend-specific validation details
 */
export const validateMarketTrend = (trendData: unknown) => {
  try {
    const requiredError = validateRequired(trendData, 'Trend data');
    if (requiredError) {
      return { success: false, errors: [requiredError] };
    }

    const result = marketTrendSchema.safeParse(trendData);
    return {
      success: result.success,
      errors: result.success ? [] : result.error.errors.map(err => err.message),
      data: result.success ? result.data : undefined
    };
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid trend data format']
    };
  }
};

/**
 * Validates price alert configuration with threshold validation
 * @param alertData - Alert data to validate
 * @returns Validation result with alert-specific validation details
 */
export const validatePriceAlert = (alertData: unknown) => {
  try {
    const requiredError = validateRequired(alertData, 'Alert data');
    if (requiredError) {
      return { success: false, errors: [requiredError] };
    }

    const result = priceAlertSchema.safeParse(alertData);
    return {
      success: result.success,
      errors: result.success ? [] : result.error.errors.map(err => err.message),
      data: result.success ? result.data : undefined
    };
  } catch (error) {
    return {
      success: false,
      errors: ['Invalid alert data format']
    };
  }
};