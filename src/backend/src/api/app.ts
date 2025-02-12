/**
 * @fileoverview Main Express application configuration file
 * Implements comprehensive middleware stack, routing, security features,
 * and monitoring capabilities for the Sales & Intelligence Platform API
 * @version 1.0.0
 */

import express, { Express, Request, Response, NextFunction } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import morgan from 'morgan'; // v1.10.0
import swaggerUi from 'swagger-ui-express'; // v5.0.0
import { expressjwt as jwt } from 'express-jwt'; // v8.4.1
import rateLimit from 'express-rate-limit'; // v6.7.0
import CircuitBreaker from 'opossum'; // v7.1.0
import prometheusMiddleware from 'express-prometheus-middleware'; // v1.2.0
import { correlator } from 'correlation-id'; // v3.1.0

// Import routes
import router from './routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { authenticateToken } from './middleware/auth.middleware';
import { requestLogger, responseLogger } from './middleware/logging.middleware';

// Initialize Express application
const app: Express = express();

/**
 * Initializes and configures all application middleware
 * Implements comprehensive security, monitoring and optimization features
 */
function initializeMiddleware(app: Express): void {
  // Security middleware
  app.use(helmet({
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

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Response compression
  app.use(compression());

  // Request correlation
  app.use(correlator());

  // Logging middleware
  app.use(requestLogger);
  app.use(responseLogger);
  app.use(morgan('combined'));

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Prometheus metrics
  app.use(prometheusMiddleware({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 2, 5]
  }));

  // JWT authentication
  app.use(jwt({
    secret: process.env.JWT_SECRET!,
    algorithms: ['HS256'],
    credentialsRequired: false
  }).unless({ path: ['/api/v1/auth/login', '/api/v1/auth/register'] }));

  // Circuit breaker for external services
  const breaker = new CircuitBreaker(Promise.resolve, {
    timeout: 3000, // 3 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000 // 30 seconds
  });
}

/**
 * Initializes and mounts all application routes
 * Implements versioned API endpoints with documentation
 */
function initializeRoutes(app: Express): void {
  // API documentation
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs', swaggerUi.setup(require('../../docs/swagger.json')));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  });

  // Mount API routes
  app.use('/api/v1', router);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path
    });
  });

  // Global error handler
  app.use(errorHandler);
}

/**
 * Initializes the Express application with all middleware and routes
 * @returns Configured Express application
 */
function initializeApp(): Express {
  // Initialize middleware stack
  initializeMiddleware(app);

  // Initialize routes
  initializeRoutes(app);

  // Graceful shutdown handler
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
  });

  // Uncaught exception handler
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  return app;
}

// Initialize and export configured application
const configuredApp = initializeApp();
export default configuredApp;