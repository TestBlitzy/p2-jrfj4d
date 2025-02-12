/**
 * @fileoverview Express router configuration for analytics endpoints implementing AI-driven analytics features
 * with comprehensive security, validation, caching, and monitoring capabilities.
 * Version: 1.0.0
 */

// Express router and middleware - v4.18.x
import { Router } from 'express';

// Rate limiting - v6.7.x
import rateLimit from 'express-rate-limit';

// Response caching - v1.x.x
import cacheResponse from 'express-cache-middleware';

// Performance monitoring - v2.x.x
import monitor from 'express-monitor';

// Internal imports
import { AnalyticsController } from '../../controllers/analytics.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { errorHandler } from '../middleware/error.middleware';

// Analytics validation schemas
import {
  historicalAnalysisSchema,
  revenueForecastSchema,
  patternDetectionSchema
} from '../../schemas/analytics.schema';

// Initialize router
const analyticsRouter = Router();

// Configure rate limiting
const analyticsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later'
});

// Configure response caching
const cacheConfig = {
  ttl: 300, // 5 minutes cache
  prefix: 'analytics:',
  exclude: ['/historical-analysis', '/revenue-forecast'] // Don't cache write operations
};

// Historical Data Analysis endpoint
analyticsRouter.post(
  '/historical-analysis',
  authenticateToken,
  requireRole('MANAGER', 'analytics', { scope: ['read:analytics'] }),
  validateBody(historicalAnalysisSchema),
  analyticsRateLimiter,
  monitor({
    path: true,
    performance: true,
    gpu: true
  }),
  async (req, res, next) => {
    try {
      const results = await AnalyticsController.analyzeHistoricalData(req.body);
      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  }
);

// Revenue Forecasting endpoint
analyticsRouter.post(
  '/revenue-forecast',
  authenticateToken,
  requireRole('MANAGER', 'analytics', { scope: ['read:analytics'] }),
  validateBody(revenueForecastSchema),
  analyticsRateLimiter,
  monitor({
    path: true,
    performance: true,
    gpu: true
  }),
  async (req, res, next) => {
    try {
      const forecast = await AnalyticsController.generateRevenueForecast(req.body);
      res.status(200).json(forecast);
    } catch (error) {
      next(error);
    }
  }
);

// Pattern Detection endpoint
analyticsRouter.post(
  '/pattern-detection',
  authenticateToken,
  requireRole('MANAGER', 'analytics', { scope: ['read:analytics'] }),
  validateBody(patternDetectionSchema),
  analyticsRateLimiter,
  cacheResponse(cacheConfig),
  monitor({
    path: true,
    performance: true,
    gpu: true
  }),
  async (req, res, next) => {
    try {
      const patterns = await AnalyticsController.detectPatterns(req.body);
      res.status(200).json(patterns);
    } catch (error) {
      next(error);
    }
  }
);

// Metric Types endpoint
analyticsRouter.get(
  '/metric-types',
  authenticateToken,
  requireRole('SALES_REP', 'analytics', { scope: ['read:analytics'] }),
  cacheResponse(cacheConfig),
  async (req, res, next) => {
    try {
      const metricTypes = await AnalyticsController.getMetricTypes();
      res.status(200).json(metricTypes);
    } catch (error) {
      next(error);
    }
  }
);

// Time Granularities endpoint
analyticsRouter.get(
  '/time-granularities',
  authenticateToken,
  requireRole('SALES_REP', 'analytics', { scope: ['read:analytics'] }),
  cacheResponse(cacheConfig),
  async (req, res, next) => {
    try {
      const granularities = await AnalyticsController.getTimeGranularities();
      res.status(200).json(granularities);
    } catch (error) {
      next(error);
    }
  }
);

// Pattern Types endpoint
analyticsRouter.get(
  '/pattern-types',
  authenticateToken,
  requireRole('SALES_REP', 'analytics', { scope: ['read:analytics'] }),
  cacheResponse(cacheConfig),
  async (req, res, next) => {
    try {
      const patternTypes = await AnalyticsController.getPatternTypes();
      res.status(200).json(patternTypes);
    } catch (error) {
      next(error);
    }
  }
);

// Error handling middleware
analyticsRouter.use(errorHandler);

export { analyticsRouter };