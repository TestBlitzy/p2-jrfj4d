/**
 * @fileoverview Express router configuration for external service integrations
 * Implements secure, scalable routes with comprehensive middleware chains
 * @version 1.0.0
 */

import { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import CircuitBreaker from 'circuit-breaker-js';
import prometheusMiddleware from 'express-prometheus-middleware';

import { IntegrationController } from '../../controllers/integration.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { UserRole } from '../../interfaces/auth.interface';
import { IntegrationType } from '../../constants/integration-types';

// Initialize router
const router = Router();

// Initialize circuit breaker for external service calls
const breaker = new CircuitBreaker({
    windowDuration: 10000, // 10 seconds
    numBuckets: 10,
    timeoutDuration: 8000,
    errorThreshold: 50,
    volumeThreshold: 10
});

// Initialize rate limiter
const rateLimiter = new RateLimiterRedis({
    storeClient: null, // Redis client will be injected
    points: 100, // Number of points
    duration: 60, // Per 60 seconds
    blockDuration: 600 // Block for 10 minutes if exceeded
});

// Apply global middleware
router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

router.use(helmet());

// Prometheus metrics middleware
router.use(prometheusMiddleware({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 2, 5]
}));

// Authentication middleware for all routes
router.use(authenticateToken);

// Integration Routes

/**
 * @route POST /api/integrations/connect
 * @desc Connect new external service integration
 */
router.post('/connect',
    requireRole(UserRole.ADMIN),
    validateBody({
        type: IntegrationType,
        credentials: {
            clientId: String,
            clientSecret: String,
            apiKey: String,
            scopes: Array
        }
    }),
    async (req, res, next) => {
        try {
            const result = await breaker.run(
                () => IntegrationController.connect(req.body)
            );
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route POST /api/integrations/:type/sync
 * @desc Synchronize data with external service
 */
router.post('/:type/sync',
    validateParams({ type: Object.values(IntegrationType) }),
    async (req, res, next) => {
        try {
            await rateLimiter.consume(req.ip);
            const result = await breaker.run(
                () => IntegrationController.sync(req.params.type)
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route GET /api/integrations/:type/status
 * @desc Get integration connection status
 */
router.get('/:type/status',
    validateParams({ type: Object.values(IntegrationType) }),
    async (req, res, next) => {
        try {
            const result = await IntegrationController.getStatus(req.params.type);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route POST /api/integrations/:type/disconnect
 * @desc Disconnect external service integration
 */
router.post('/:type/disconnect',
    requireRole(UserRole.ADMIN),
    validateParams({ type: Object.values(IntegrationType) }),
    async (req, res, next) => {
        try {
            await IntegrationController.disconnect(req.params.type);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route GET /api/integrations/health
 * @desc Check health status of all integrations
 */
router.get('/health',
    async (req, res, next) => {
        try {
            const statuses = await Promise.all(
                Object.values(IntegrationType).map(type => 
                    IntegrationController.getStatus(type)
                )
            );
            res.status(200).json({ integrations: statuses });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route POST /api/integrations/:type/webhook
 * @desc Handle integration webhooks
 */
router.post('/:type/webhook',
    validateParams({ type: Object.values(IntegrationType) }),
    async (req, res, next) => {
        try {
            await rateLimiter.consume(req.ip);
            // Webhook handling implementation
            res.status(200).send();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * @route GET /api/integrations/:type/oauth/callback
 * @desc Handle OAuth callbacks
 */
router.get('/:type/oauth/callback',
    validateParams({ type: Object.values(IntegrationType) }),
    async (req, res, next) => {
        try {
            // OAuth callback handling implementation
            res.status(200).send();
        } catch (error) {
            next(error);
        }
    }
);

export { router as integrationRoutes };