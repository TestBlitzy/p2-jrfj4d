/**
 * @fileoverview Express middleware for request validation using Joi schemas and custom validation rules.
 * Provides centralized validation for all API endpoints with support for caching, monitoring, and detailed error reporting.
 * Version: 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import * as Joi from 'joi'; // v17.9.0
import { createClient } from 'redis'; // v4.6.7
import { validateEmail, validateRequiredFields } from '../../utils/validation.utils';
import { CustomError } from '../middleware/error.middleware';
import { logger } from './logging.middleware';
import { ErrorCodes } from '../../constants/error-codes';

// Initialize Redis client for validation caching
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    logger.error('Redis client error', err, { context: 'validation_cache' });
});

// Connect to Redis
(async () => {
    await redisClient.connect();
})();

// Validation cache configuration
const CACHE_TTL = 300; // 5 minutes in seconds
const CACHE_PREFIX = 'validation:';

/**
 * Interface for validation options
 */
interface ValidationOptions {
    cache?: boolean;
    stripUnknown?: boolean;
    abortEarly?: boolean;
    allowUnknown?: boolean;
    context?: Record<string, any>;
}

/**
 * Interface for validation result cache
 */
interface ValidationCache {
    isValid: boolean;
    errors?: string[];
    timestamp: number;
}

/**
 * Generates cache key for validation results
 */
const generateCacheKey = (data: any, schemaName: string): string => {
    const hash = require('crypto')
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');
    return `${CACHE_PREFIX}${schemaName}:${hash}`;
};

/**
 * Higher-order function that creates validation middleware for specific schemas
 * @param schema - Joi validation schema
 * @param options - Validation options
 */
export const validateRequest = (
    schema: Record<string, Joi.Schema>,
    options: ValidationOptions = {}
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const startTime = process.hrtime();
        const validationContext = { ...options.context, user: req.user };

        try {
            // Prepare data object combining relevant request parts
            const dataToValidate = {
                body: req.body,
                query: req.query,
                params: req.params
            };

            // Check cache if enabled
            if (options.cache) {
                const cacheKey = generateCacheKey(dataToValidate, schema.toString());
                const cachedResult = await redisClient.get(cacheKey);

                if (cachedResult) {
                    const parsed: ValidationCache = JSON.parse(cachedResult);
                    if (parsed.isValid) {
                        return next();
                    }
                    throw new CustomError(
                        parsed.errors?.join(', ') || 'Validation failed',
                        400,
                        ErrorCodes.VALIDATION_ERROR
                    );
                }
            }

            // Validate against schema
            const { error, value } = Joi.object(schema).validate(dataToValidate, {
                stripUnknown: options.stripUnknown ?? true,
                abortEarly: options.abortEarly ?? false,
                allowUnknown: options.allowUnknown ?? true,
                context: validationContext
            });

            // Record validation metrics
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const duration = seconds * 1000 + nanoseconds / 1000000;
            logger.trackMetric('validation_duration', {
                duration,
                schema: schema.toString(),
                path: req.path
            });

            if (error) {
                // Log validation failure
                logger.error('Validation failed', error, {
                    path: req.path,
                    data: dataToValidate
                });

                // Cache validation failure if enabled
                if (options.cache) {
                    const cacheKey = generateCacheKey(dataToValidate, schema.toString());
                    await redisClient.setEx(
                        cacheKey,
                        CACHE_TTL,
                        JSON.stringify({
                            isValid: false,
                            errors: error.details.map(detail => detail.message),
                            timestamp: Date.now()
                        })
                    );
                }

                throw new CustomError(
                    error.details.map(detail => detail.message).join(', '),
                    400,
                    ErrorCodes.VALIDATION_ERROR,
                    { details: error.details }
                );
            }

            // Cache successful validation if enabled
            if (options.cache) {
                const cacheKey = generateCacheKey(dataToValidate, schema.toString());
                await redisClient.setEx(
                    cacheKey,
                    CACHE_TTL,
                    JSON.stringify({
                        isValid: true,
                        timestamp: Date.now()
                    })
                );
            }

            // Update validated values
            req.body = value.body;
            req.query = value.query;
            req.params = value.params;

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware for validating request body data
 * @param schema - Joi validation schema for request body
 * @param options - Validation options
 */
export const validateBody = (
    schema: Joi.Schema,
    options: ValidationOptions = {}
) => {
    return validateRequest({ body: schema }, options);
};

/**
 * Middleware for validating required fields with custom rules
 * @param requiredFields - Array of required field paths
 * @param customRules - Additional validation rules
 */
export const validateRequiredData = (
    requiredFields: string[],
    customRules?: Record<string, any>
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = validateRequiredFields(req.body, requiredFields, customRules);

            if (!result.isValid) {
                throw new CustomError(
                    result.errors.join(', '),
                    400,
                    ErrorCodes.VALIDATION_ERROR,
                    { fields: requiredFields }
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware for validating email fields
 * @param emailField - Name of the email field to validate
 */
export const validateEmailField = (emailField: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const email = req.body[emailField];
            
            if (!validateEmail(email)) {
                throw new CustomError(
                    `Invalid email format for field: ${emailField}`,
                    400,
                    ErrorCodes.VALIDATION_ERROR,
                    { field: emailField }
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};