/**
 * @fileoverview Express middleware for centralized error handling with monitoring integration,
 * retry strategies, and standardized error responses. Implements error handling specifications
 * from section 3.5 of the technical documentation.
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import retry from 'retry'; // v0.13.1
import { ErrorCodes } from '../constants/error-codes';
import { logger } from './logging.middleware';

/**
 * Enhanced custom error class with monitoring support and correlation tracking
 */
export class CustomError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: number;
    public readonly correlationId: string;
    public readonly metadata: Record<string, any>;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        errorCode: number = ErrorCodes.INTEGRATION_ERROR,
        metadata: Record<string, any> = {}
    ) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.correlationId = uuidv4();
        this.metadata = metadata;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }

    public toResponse(): Record<string, any> {
        return {
            error: {
                code: this.errorCode,
                message: this.message,
                correlationId: this.correlationId,
                timestamp: new Date().toISOString()
            }
        };
    }
}

/**
 * Handles validation errors with detailed field-level error messages
 */
const handleValidationError = (error: any): Record<string, any> => {
    const validationErrors = Array.isArray(error.errors) 
        ? error.errors.map((err: any) => ({
            field: err.path,
            message: err.message,
            value: err.value
        }))
        : [{ message: error.message }];

    logger.trackMetric('validation_errors', {
        count: validationErrors.length,
        fields: validationErrors.map(err => err.field)
    });

    return {
        error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Validation error',
            details: validationErrors
        }
    };
};

/**
 * Handles retryable errors with exponential backoff strategy
 */
const handleRetryableError = async (
    error: any,
    operation: () => Promise<any>
): Promise<any> => {
    const operation_id = uuidv4();
    
    const retryOperation = retry.operation({
        retries: 3,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000
    });

    return new Promise((resolve, reject) => {
        retryOperation.attempt(async (currentAttempt) => {
            try {
                logger.trackMetric('retry_attempt', {
                    operation_id,
                    attempt: currentAttempt,
                    error_type: error.errorCode
                });

                const result = await operation();
                resolve(result);
            } catch (err) {
                if (retryOperation.retry(err)) {
                    return;
                }
                reject(err);
            }
        });
    });
};

/**
 * Main error handling middleware with monitoring integration
 */
const errorHandler: ErrorRequestHandler = async (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    // Generate correlation ID if not exists
    const correlationId = error.correlationId || uuidv4();

    // Log error with correlation ID
    logger.error('Error occurred', error, {
        correlationId,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        user: req.user
    });

    // Determine error type and handle accordingly
    let errorResponse: Record<string, any>;
    let statusCode: number = error.statusCode || 500;

    try {
        switch (error.errorCode) {
            case ErrorCodes.VALIDATION_ERROR:
                errorResponse = handleValidationError(error);
                statusCode = 400;
                break;

            case ErrorCodes.API_TIMEOUT:
                // Attempt retry for timeout errors
                try {
                    const result = await handleRetryableError(error, async () => {
                        // Retry the original operation
                        return error.operation();
                    });
                    return res.status(200).json(result);
                } catch (retryError) {
                    errorResponse = {
                        error: {
                            code: ErrorCodes.API_TIMEOUT,
                            message: 'Operation timed out after retries',
                            correlationId
                        }
                    };
                    statusCode = 504;
                }
                break;

            case ErrorCodes.INTEGRATION_ERROR:
                errorResponse = {
                    error: {
                        code: ErrorCodes.INTEGRATION_ERROR,
                        message: 'Integration service error',
                        correlationId,
                        details: error.message
                    }
                };
                statusCode = 502;
                break;

            case ErrorCodes.AUTHENTICATION_ERROR:
                errorResponse = {
                    error: {
                        code: ErrorCodes.AUTHENTICATION_ERROR,
                        message: 'Authentication failed',
                        correlationId
                    }
                };
                statusCode = 401;
                break;

            default:
                errorResponse = {
                    error: {
                        code: error.errorCode || 500,
                        message: error.message || 'Internal server error',
                        correlationId
                    }
                };
                statusCode = error.statusCode || 500;
        }

        // Track error metrics
        logger.trackMetric('error_occurrence', {
            error_code: error.errorCode,
            status_code: statusCode,
            path: req.path,
            correlation_id: correlationId
        });

        // Send error response
        res.status(statusCode).json({
            ...errorResponse,
            timestamp: new Date().toISOString(),
            path: req.path
        });
    } catch (handlingError) {
        // Log error handling failure
        logger.error('Error handling failed', handlingError as Error, {
            correlationId,
            originalError: error
        });

        // Send fallback error response
        res.status(500).json({
            error: {
                code: 500,
                message: 'Internal server error',
                correlationId
            }
        });
    }
};

export default errorHandler;