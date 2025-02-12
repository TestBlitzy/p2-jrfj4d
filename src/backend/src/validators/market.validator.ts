/**
 * @fileoverview Market intelligence data validation schemas and functions
 * Implements validation rules for competitor tracking, market trends, and price monitoring
 * Version: 1.0.0
 */

import * as Joi from 'joi'; // ^17.9.0
import { 
    validateRequiredFields, 
    validateNumericRange, 
    validateDateRange 
} from '../utils/validation.utils';
import { 
    ICompetitor, 
    ICompetitorActivity, 
    IMarketTrend, 
    IPriceAlert,
    ActivityType,
    ImpactLevel,
    SentimentType,
    TimeframeType,
    AlertCondition
} from '../interfaces/market.interface';

// Cached validation schemas for performance optimization
const competitorSchema = Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().min(2).max(200).required(),
    website: Joi.string().uri().required(),
    description: Joi.string().min(10).max(2000).required(),
    marketShare: Joi.number().min(0).max(100).precision(2).required(),
    lastUpdated: Joi.date().iso().required()
});

const competitorActivitySchema = Joi.object({
    id: Joi.string().uuid().required(),
    competitorId: Joi.string().uuid().required(),
    type: Joi.string().valid(...Object.values(ActivityType)).required(),
    description: Joi.string().min(10).max(1000).required(),
    impactLevel: Joi.string().valid(...Object.values(ImpactLevel)).required(),
    date: Joi.date().iso().less('now').required()
});

const marketTrendSchema = Joi.object({
    id: Joi.string().uuid().required(),
    keyword: Joi.string().min(2).max(100).required(),
    mentionCount: Joi.number().integer().min(0).required(),
    sentiment: Joi.string().valid(...Object.values(SentimentType)).required(),
    timeframe: Joi.string().valid(...Object.values(TimeframeType)).required(),
    sources: Joi.array().items(Joi.string().uri()).min(1).required()
});

const priceAlertSchema = Joi.object({
    id: Joi.string().uuid().required(),
    competitorProductId: Joi.string().uuid().required(),
    condition: Joi.string().valid(...Object.values(AlertCondition)).required(),
    threshold: Joi.number().min(0).precision(2).required(),
    isActive: Joi.boolean().required()
});

/**
 * Validates competitor data against schema requirements
 * @param competitorData - Competitor information to validate
 * @returns Promise<boolean> - Validation result
 * @throws ValidationError with detailed message if validation fails
 */
export const validateCompetitor = async (competitorData: ICompetitor): Promise<boolean> => {
    try {
        // Validate required fields
        const requiredFields = ['name', 'website', 'description', 'marketShare', 'lastUpdated'];
        const fieldValidation = validateRequiredFields(competitorData, requiredFields);
        
        if (!fieldValidation.isValid) {
            throw new Error(`Required fields validation failed: ${fieldValidation.errors.join(', ')}`);
        }

        // Validate market share range
        if (!validateNumericRange(competitorData.marketShare, 0, 100, { percentage: true, precision: 2 })) {
            throw new Error('Market share must be between 0 and 100 percent');
        }

        // Validate date
        if (!validateDateRange(competitorData.lastUpdated, new Date(), 'UTC')) {
            throw new Error('Last updated date must be valid and not in the future');
        }

        // Validate against Joi schema
        const { error } = competitorSchema.validate(competitorData, { abortEarly: false });
        if (error) {
            throw new Error(`Schema validation failed: ${error.details.map(d => d.message).join(', ')}`);
        }

        return true;
    } catch (error) {
        throw new Error(`Competitor validation error: ${error.message}`);
    }
};

/**
 * Validates market trend data with sentiment analysis support
 * @param trendData - Market trend information to validate
 * @returns Promise<boolean> - Validation result
 * @throws ValidationError with detailed message if validation fails
 */
export const validateMarketTrend = async (trendData: IMarketTrend): Promise<boolean> => {
    try {
        // Validate required fields
        const requiredFields = ['keyword', 'mentionCount', 'sentiment', 'timeframe', 'sources'];
        const fieldValidation = validateRequiredFields(trendData, requiredFields);
        
        if (!fieldValidation.isValid) {
            throw new Error(`Required fields validation failed: ${fieldValidation.errors.join(', ')}`);
        }

        // Validate mention count
        if (!validateNumericRange(trendData.mentionCount, 0, Number.MAX_SAFE_INTEGER)) {
            throw new Error('Mention count must be a positive number');
        }

        // Validate sources array
        if (!Array.isArray(trendData.sources) || trendData.sources.length === 0) {
            throw new Error('At least one source must be provided');
        }

        // Validate against Joi schema
        const { error } = marketTrendSchema.validate(trendData, { abortEarly: false });
        if (error) {
            throw new Error(`Schema validation failed: ${error.details.map(d => d.message).join(', ')}`);
        }

        return true;
    } catch (error) {
        throw new Error(`Market trend validation error: ${error.message}`);
    }
};

/**
 * Validates price alert configuration with threshold monitoring
 * @param alertData - Price alert configuration to validate
 * @returns Promise<boolean> - Validation result
 * @throws ValidationError with detailed message if validation fails
 */
export const validatePriceAlert = async (alertData: IPriceAlert): Promise<boolean> => {
    try {
        // Validate required fields
        const requiredFields = ['competitorProductId', 'condition', 'threshold', 'isActive'];
        const fieldValidation = validateRequiredFields(alertData, requiredFields);
        
        if (!fieldValidation.isValid) {
            throw new Error(`Required fields validation failed: ${fieldValidation.errors.join(', ')}`);
        }

        // Validate threshold value
        if (!validateNumericRange(alertData.threshold, 0, Number.MAX_SAFE_INTEGER, { precision: 2 })) {
            throw new Error('Threshold must be a positive number with maximum 2 decimal places');
        }

        // Validate against Joi schema
        const { error } = priceAlertSchema.validate(alertData, { abortEarly: false });
        if (error) {
            throw new Error(`Schema validation failed: ${error.details.map(d => d.message).join(', ')}`);
        }

        return true;
    } catch (error) {
        throw new Error(`Price alert validation error: ${error.message}`);
    }
};