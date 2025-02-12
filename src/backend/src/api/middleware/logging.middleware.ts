/**
 * @fileoverview Express middleware for centralized request/response logging, performance monitoring,
 * and integration with observability systems including ELK Stack and Prometheus metrics collection.
 * Implements comprehensive logging and monitoring capabilities as specified in section 4.4 of the
 * technical documentation.
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import winston from 'winston'; // v3.11.0
import pino from 'pino'; // v8.16.0
import * as prometheus from 'prom-client'; // v14.2.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { ErrorCodes } from '../../constants/error-codes';

/**
 * Interface for extended Express Request with logging context
 */
interface RequestWithContext extends Request {
    correlationId?: string;
    startTime?: [number, number];
    logger?: winston.Logger;
}

/**
 * Centralized Logger class implementing multiple logging strategies with observability integration
 */
class Logger {
    private winstonLogger: winston.Logger;
    private pinoLogger: pino.Logger;
    private requestTimers: Map<string, [number, number]>;
    private metrics: {
        requestCounter: prometheus.Counter;
        responseTimeHistogram: prometheus.Histogram;
        statusCodeCounter: prometheus.Counter;
        throughputGauge: prometheus.Gauge;
    };

    constructor() {
        // Initialize Winston logger with multiple transports
        this.winstonLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'error.log', level: 'error' }),
                new winston.transports.File({ filename: 'combined.log' })
            ]
        });

        // Initialize Pino logger for high-performance logging
        this.pinoLogger = pino({
            level: 'info',
            timestamp: pino.stdTimeFunctions.isoTime
        });

        // Initialize request timers storage
        this.requestTimers = new Map();

        // Initialize Prometheus metrics
        this.initializeMetrics();
    }

    private initializeMetrics(): void {
        // Initialize Prometheus metrics collectors
        this.metrics = {
            requestCounter: new prometheus.Counter({
                name: 'api_requests_total',
                help: 'Total number of API requests',
                labelNames: ['method', 'path', 'status']
            }),
            responseTimeHistogram: new prometheus.Histogram({
                name: 'api_response_time_seconds',
                help: 'API response time in seconds',
                buckets: [0.1, 0.5, 1, 2, 5]
            }),
            statusCodeCounter: new prometheus.Counter({
                name: 'api_response_status_total',
                help: 'API response status codes',
                labelNames: ['status_code']
            }),
            throughputGauge: new prometheus.Gauge({
                name: 'api_throughput_bytes',
                help: 'API throughput in bytes'
            })
        };
    }

    public info(message: string, meta: Record<string, any> = {}): void {
        const enrichedMeta = this.enrichLogContext(meta);
        this.winstonLogger.info(message, enrichedMeta);
        this.pinoLogger.info(enrichedMeta, message);
    }

    public error(message: string, error: Error, meta: Record<string, any> = {}): void {
        const enrichedMeta = this.enrichLogContext({
            ...meta,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        });
        this.winstonLogger.error(message, enrichedMeta);
        this.pinoLogger.error(enrichedMeta, message);
    }

    private enrichLogContext(meta: Record<string, any>): Record<string, any> {
        return {
            ...meta,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            service: 'sales-intelligence-platform'
        };
    }

    public startTimer(correlationId: string): void {
        this.requestTimers.set(correlationId, process.hrtime());
    }

    public endTimer(correlationId: string): number {
        const startTime = this.requestTimers.get(correlationId);
        if (!startTime) return 0;

        const [seconds, nanoseconds] = process.hrtime(startTime);
        this.requestTimers.delete(correlationId);
        return seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    }

    public updateMetrics(method: string, path: string, statusCode: number, responseTime: number, responseSize: number): void {
        this.metrics.requestCounter.inc({ method, path, status: statusCode });
        this.metrics.responseTimeHistogram.observe(responseTime / 1000); // Convert to seconds
        this.metrics.statusCodeCounter.inc({ status_code: statusCode });
        this.metrics.throughputGauge.set(responseSize);
    }
}

// Create singleton logger instance
export const logger = new Logger();

/**
 * Middleware for logging incoming HTTP requests with correlation IDs and performance tracking
 */
export const requestLogger = (req: RequestWithContext, res: Response, next: NextFunction): void => {
    // Generate correlation ID
    const correlationId = uuidv4();
    req.correlationId = correlationId;

    // Start performance timer
    logger.startTimer(correlationId);

    // Log request details
    logger.info('Incoming request', {
        correlationId,
        method: req.method,
        path: req.path,
        query: req.query,
        headers: {
            'user-agent': req.get('user-agent'),
            'x-forwarded-for': req.get('x-forwarded-for')
        },
        ip: req.ip
    });

    next();
};

/**
 * Middleware for logging HTTP response details with performance metrics and error tracking
 */
export const responseLogger = (req: RequestWithContext, res: Response, next: NextFunction): void => {
    // Capture original end function
    const originalEnd = res.end;
    const correlationId = req.correlationId as string;

    // Override end function to log response
    res.end = function(chunk?: any, encoding?: string, callback?: () => void): Response {
        // Calculate response time
        const responseTime = logger.endTimer(correlationId);
        const responseSize = parseInt(res.get('content-length') || '0');

        // Log response details
        const logData = {
            correlationId,
            statusCode: res.statusCode,
            responseTime,
            responseSize,
            method: req.method,
            path: req.path
        };

        if (res.statusCode >= 400) {
            logger.error('Request error', new Error(`HTTP ${res.statusCode}`), logData);
            
            if (res.statusCode === ErrorCodes.API_TIMEOUT) {
                logger.error('API Timeout detected', new Error('Request timed out'), logData);
            }
        } else {
            logger.info('Request completed', logData);
        }

        // Update metrics
        logger.updateMetrics(req.method, req.path, res.statusCode, responseTime, responseSize);

        // Call original end function
        return originalEnd.call(this, chunk, encoding as BufferEncoding, callback);
    };

    next();
};