/**
 * @fileoverview Lead Management Routes Configuration
 * @version 1.0.0
 * 
 * Implements secure and validated routes for lead management functionality including
 * creation, scoring, qualification and batch processing with comprehensive error handling
 * and performance optimization.
 */

import { Router } from 'express'; // ^4.18.0
import { LeadsController } from '../../controllers/leads.controller';
import { 
    authenticateToken, 
    requireRole 
} from '../middleware/auth.middleware';
import { 
    validateBody,
    validateParams 
} from '../middleware/validation.middleware';
import {
    validateNewLead,
    validateLeadScore,
    validateLeadQualification
} from '../../validators/leads.validator';
import { UserRole } from '../../interfaces/auth.interface';
import rateLimit from 'express-rate-limit'; // ^6.7.0
import timeout from 'connect-timeout'; // ^1.9.0

// Initialize LeadsController (dependency injection would be used in production)
const leadsController = new LeadsController();

// Configure rate limiters for different endpoints
const createLeadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many lead creation requests, please try again later'
});

const scoringLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: 'Too many scoring requests, please try again later'
});

const qualificationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 150,
    message: 'Too many qualification requests, please try again later'
});

const batchLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50,
    message: 'Too many batch processing requests, please try again later'
});

/**
 * Configures and returns Express router with lead management routes
 * Implements comprehensive security, validation, and error handling
 */
const configureLeadRoutes = (): Router => {
    const router = Router();

    /**
     * POST /leads
     * Create new lead with validation and rate limiting
     * Requires: SALES_REP role
     */
    router.post('/',
        authenticateToken,
        requireRole(UserRole.SALES_REP),
        createLeadLimiter,
        validateBody(validateNewLead),
        timeout('5s'),
        leadsController.createLead
    );

    /**
     * PUT /leads/:id/score
     * Update lead score with AI analysis
     * Requires: SALES_REP role
     */
    router.put('/:id/score',
        authenticateToken,
        requireRole(UserRole.SALES_REP),
        scoringLimiter,
        validateParams,
        validateBody(validateLeadScore),
        timeout('3s'),
        leadsController.updateLeadScore
    );

    /**
     * POST /leads/:id/qualify
     * Qualify lead based on comprehensive criteria
     * Requires: MANAGER role
     */
    router.post('/:id/qualify',
        authenticateToken,
        requireRole(UserRole.MANAGER),
        qualificationLimiter,
        validateParams,
        validateBody(validateLeadQualification),
        timeout('4s'),
        leadsController.qualifyLead
    );

    /**
     * POST /leads/batch
     * Batch process leads with enhanced validation
     * Requires: MANAGER role
     */
    router.post('/batch',
        authenticateToken,
        requireRole(UserRole.MANAGER),
        batchLimiter,
        validateBody(validateNewLead),
        timeout('10s'),
        leadsController.batchProcessLeads
    );

    /**
     * GET /leads/:id
     * Retrieve lead details with caching
     * Requires: SALES_REP role
     */
    router.get('/:id',
        authenticateToken,
        requireRole(UserRole.SALES_REP),
        validateParams,
        timeout('2s'),
        leadsController.getLeadById
    );

    /**
     * GET /leads
     * Search leads with filtering and pagination
     * Requires: SALES_REP role
     */
    router.get('/',
        authenticateToken,
        requireRole(UserRole.SALES_REP),
        timeout('3s'),
        leadsController.searchLeads
    );

    return router;
};

// Create and export configured router
export const leadsRouter = configureLeadRoutes();

// Default export for modular usage
export default leadsRouter;