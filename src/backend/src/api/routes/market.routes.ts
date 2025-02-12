/**
 * Market Intelligence Routes Configuration
 * Implements secure, validated, and monitored routes for market intelligence operations
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import { MarketController } from '../../controllers/market.controller';
import { 
    authenticateToken, 
    requireRole 
} from '../middleware/auth.middleware';
import { 
    validateBody,
    validateQuery,
    validateRequiredData 
} from '../middleware/validation.middleware';
import { 
    competitorSchema,
    marketTrendSchema,
    priceAlertSchema 
} from '../../validators/market.validator';
import { UserRole } from '../../interfaces/auth.interface';
import { logger } from '../middleware/logging.middleware';
import { ErrorCodes } from '../../constants/error-codes';

// Initialize router and controller
const router = Router();
const marketController = new MarketController();

// Initialize routes with comprehensive security and validation
router.use(authenticateToken);

/**
 * Track new competitor with AI-powered analysis
 * POST /api/market/competitors
 */
router.post('/competitors',
    requireRole(UserRole.MANAGER, 'competitors', { 
        scope: ['write:competitors'] 
    }),
    validateBody(competitorSchema, { 
        cache: true,
        stripUnknown: true 
    }),
    async (req, res, next) => {
        try {
            const competitor = await marketController.trackCompetitor(req.body);
            logger.info('Competitor tracked successfully', { 
                competitorId: competitor.id 
            });
            res.status(201).json(competitor);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Update competitor activity with impact analysis
 * PUT /api/market/competitors/:id/activity
 */
router.put('/competitors/:id/activity',
    requireRole(UserRole.SALES_REP, 'competitors', { 
        scope: ['write:activities'] 
    }),
    validateRequiredData(['type', 'description']),
    async (req, res, next) => {
        try {
            const activity = await marketController.updateCompetitorActivity({
                competitorId: req.params.id,
                ...req.body
            });
            res.json(activity);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Get market trends with AI-powered analysis
 * GET /api/market/trends
 */
router.get('/trends',
    requireRole(UserRole.SALES_REP, 'market', { 
        scope: ['read:trends'] 
    }),
    validateQuery(marketTrendSchema),
    async (req, res, next) => {
        try {
            const trends = await marketController.getMarketTrends(
                req.query.timeframe,
                {
                    minMentionCount: parseInt(req.query.minMentions as string) || 10,
                    includeSentiment: req.query.sentiment === 'true',
                    sourceTypes: (req.query.sources as string || '').split(',')
                }
            );
            res.json(trends);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Set price alert with real-time monitoring
 * POST /api/market/alerts/price
 */
router.post('/alerts/price',
    requireRole(UserRole.SALES_REP, 'alerts', { 
        scope: ['write:alerts'] 
    }),
    validateBody(priceAlertSchema),
    async (req, res, next) => {
        try {
            const alert = await marketController.setPriceAlert(req.body);
            logger.info('Price alert created', { 
                alertId: alert.id 
            });
            res.status(201).json(alert);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Generate comprehensive market intelligence report
 * GET /api/market/reports
 */
router.get('/reports',
    requireRole(UserRole.MANAGER, 'reports', { 
        scope: ['read:reports'] 
    }),
    validateQuery({
        startDate: marketTrendSchema.startDate,
        endDate: marketTrendSchema.endDate,
        format: marketTrendSchema.format
    }),
    async (req, res, next) => {
        try {
            const report = await marketController.generateReport({
                startDate: new Date(req.query.startDate as string),
                endDate: new Date(req.query.endDate as string),
                format: req.query.format as string
            });
            res.json(report);
        } catch (error) {
            if (error.code === ErrorCodes.API_TIMEOUT) {
                logger.error('Report generation timeout', error);
                res.status(504).json({
                    error: 'Report generation timed out',
                    retryAfter: 60
                });
                return;
            }
            next(error);
        }
    }
);

export default router;