// @package express ^4.18.2
// @package helmet ^7.0.0
// @package rate-limiter-flexible ^2.4.1
// @package winston ^3.8.2

import { Router } from 'express';
import helmet from 'helmet';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import winston from 'winston';
import { AuthController } from '../../controllers/auth.controller';
import { 
    authenticateToken, 
    requireRole, 
    verifyMfaToken 
} from '../middleware/auth.middleware';
import { validateLoginRequest } from '../../validators/auth.validator';
import { UserRole } from '../../types/auth.types';

// Initialize logger for audit logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'auth-audit.log' })
    ]
});

// Initialize rate limiter for auth endpoints
const rateLimiter = new RateLimiterRedis({
    storeClient: null, // Redis client will be injected by DI
    points: 100, // Number of points
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
});

// Initialize router with security middleware
const authRouter = Router();
const authController = new AuthController(null); // AuthService will be injected by DI

// Apply security headers
authRouter.use(helmet());

// Login endpoint with rate limiting and validation
authRouter.post('/login', 
    async (req, res, next) => {
        try {
            await rateLimiter.consume(req.ip);
            next();
        } catch (error) {
            next(error);
        }
    },
    validateLoginRequest,
    async (req, res, next) => {
        try {
            await authController.login(req, res, next);
            logger.info('Successful login attempt', {
                email: req.body.email,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
        } catch (error) {
            logger.error('Failed login attempt', {
                email: req.body.email,
                ip: req.ip,
                error: error.message
            });
            next(error);
        }
    }
);

// Registration endpoint with enhanced security
authRouter.post('/register',
    async (req, res, next) => {
        try {
            await rateLimiter.consume(req.ip);
            next();
        } catch (error) {
            next(error);
        }
    },
    async (req, res, next) => {
        try {
            await authController.register(req, res, next);
            logger.info('User registration successful', {
                email: req.body.email,
                role: req.body.role
            });
        } catch (error) {
            logger.error('Registration failed', {
                email: req.body.email,
                error: error.message
            });
            next(error);
        }
    }
);

// MFA setup endpoint with authentication
authRouter.post('/mfa/setup',
    authenticateToken,
    async (req, res, next) => {
        try {
            await authController.setupMFA(req, res, next);
            logger.info('MFA setup completed', {
                userId: req.user?.id
            });
        } catch (error) {
            logger.error('MFA setup failed', {
                userId: req.user?.id,
                error: error.message
            });
            next(error);
        }
    }
);

// MFA verification endpoint with rate limiting
authRouter.post('/mfa/verify',
    authenticateToken,
    async (req, res, next) => {
        try {
            await rateLimiter.consume(`mfa_${req.user?.id}`);
            await authController.verifyMFA(req, res, next);
            logger.info('MFA verification successful', {
                userId: req.user?.id,
                method: req.body.method
            });
        } catch (error) {
            logger.error('MFA verification failed', {
                userId: req.user?.id,
                error: error.message
            });
            next(error);
        }
    }
);

// Backup codes generation endpoint with role check
authRouter.post('/mfa/backup-codes',
    authenticateToken,
    requireRole(UserRole.ADMIN),
    async (req, res, next) => {
        try {
            await authController.generateBackupCodes(req, res, next);
            logger.info('Backup codes generated', {
                userId: req.user?.id
            });
        } catch (error) {
            logger.error('Backup codes generation failed', {
                userId: req.user?.id,
                error: error.message
            });
            next(error);
        }
    }
);

// Token refresh endpoint with validation
authRouter.post('/refresh-token',
    async (req, res, next) => {
        try {
            await authController.refreshToken(req, res, next);
            logger.info('Token refresh successful', {
                userId: req.user?.id
            });
        } catch (error) {
            logger.error('Token refresh failed', {
                error: error.message
            });
            next(error);
        }
    }
);

// Device validation endpoint
authRouter.post('/validate-device',
    authenticateToken,
    async (req, res, next) => {
        try {
            await authController.validateDevice(req, res, next);
            logger.info('Device validation successful', {
                userId: req.user?.id,
                deviceId: req.headers['x-device-id']
            });
        } catch (error) {
            logger.error('Device validation failed', {
                userId: req.user?.id,
                deviceId: req.headers['x-device-id'],
                error: error.message
            });
            next(error);
        }
    }
);

// Logout endpoint with session cleanup
authRouter.post('/logout',
    authenticateToken,
    async (req, res, next) => {
        try {
            await authController.logout(req, res, next);
            logger.info('Logout successful', {
                userId: req.user?.id,
                sessionId: req.user?.sessionId
            });
        } catch (error) {
            logger.error('Logout failed', {
                userId: req.user?.id,
                error: error.message
            });
            next(error);
        }
    }
);

export default authRouter;