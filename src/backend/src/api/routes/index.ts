/**
 * @fileoverview Main router configuration aggregating all API routes
 * Implements enterprise-grade routing with versioning, security, monitoring,
 * rate limiting, and comprehensive documentation.
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import helmet from 'helmet'; // v7.0.0
import rateLimit from 'express-rate-limit'; // v7.0.0
import cors from 'cors'; // v2.8.5
import swaggerUi from 'swagger-ui-express'; // v5.0.0
import CircuitBreaker from 'opossum'; // v7.1.0

// Import route modules
import { analyticsRouter } from './analytics.routes';
import { authRouter } from './auth.routes';
import { leadsRouter } from './leads.routes';
import { marketRouter } from './market.routes';
import { integrationRouter } from './integration.routes';

// Import middleware
import { errorHandler } from '../middleware/error.middleware';
import { requestLogger } from '../middleware/logging.middleware';

// Initialize router
const router = Router();

// Global rate limit configuration
const rateLimitConfig = {
    windowMs: 900000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false
};

// Circuit breaker configuration
const circuitBreakerConfig = {
    timeout: 3000, // 3 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000 // 30 seconds
};

/**
 * Initializes and configures all application routes with enterprise-grade
 * middleware and monitoring
 */
function initializeRoutes(): Router {
    // Apply security middleware
    router.use(helmet({
        contentSecurityPolicy: true,
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: true,
        dnsPrefetchControl: true,
        frameguard: true,
        hidePoweredBy: true,
        hsts: true,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: true,
        referrerPolicy: true,
        xssFilter: true
    }));

    // Configure CORS
    router.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(','),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 86400 // 24 hours
    }));

    // Apply rate limiting
    router.use(rateLimit(rateLimitConfig));

    // Request logging and correlation IDs
    router.use(requestLogger);

    // Mount OpenAPI documentation
    router.use('/api/docs', swaggerUi.serve);
    router.get('/api/docs', swaggerUi.setup(require('../../docs/swagger.json')));

    // Health check endpoint
    router.get('/api/health', healthCheck);

    // Mount versioned API routes
    router.use('/api/v1/analytics', analyticsRouter);
    router.use('/api/v1/auth', authRouter);
    router.use('/api/v1/leads', leadsRouter);
    router.use('/api/v1/market', marketRouter);
    router.use('/api/v1/integrations', integrationRouter);

    // Global error handling
    router.use(errorHandler);

    return router;
}

/**
 * Health check endpoint with detailed system status
 */
async function healthCheck(req: Request, res: Response): Promise<void> {
    try {
        const status = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: await checkDatabaseConnection(),
                cache: await checkCacheConnection(),
                integrations: await checkIntegrationStatus()
            },
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            }
        };

        res.status(200).json(status);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
}

// Initialize and export configured router
const configuredRouter = initializeRoutes();
export default configuredRouter;

// Named exports for specific routes
export {
    analyticsRouter,
    authRouter,
    leadsRouter,
    marketRouter,
    integrationRouter
};