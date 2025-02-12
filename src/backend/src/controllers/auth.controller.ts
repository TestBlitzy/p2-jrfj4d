// @package express ^4.18.0

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { 
    validateLoginRequest, 
    validateRegistrationRequest, 
    validateMfaVerification 
} from '../validators/auth.validator';

/**
 * Enterprise-grade authentication controller implementing OAuth 2.0, OpenID Connect,
 * TOTP-based MFA, and comprehensive security monitoring
 */
export class AuthController {
    private readonly authService: AuthService;

    constructor(authService: AuthService) {
        this.authService = authService;
    }

    /**
     * Handles user registration with enhanced security validation
     * @param req Express request object containing registration data
     * @param res Express response object
     * @param next Express next function for error handling
     */
    public register = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
        try {
            // Validate registration request
            await validateRegistrationRequest(req.body);

            // Register user with security features
            const user = await this.authService.register({
                email: req.body.email,
                password: req.body.password,
                role: req.body.role,
                mfaEnabled: true // Enable MFA by default for enhanced security
            });

            return res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    mfaEnabled: user.mfaEnabled,
                    status: user.status
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles user login with MFA and comprehensive security checks
     * @param req Express request object containing login credentials
     * @param res Express response object
     * @param next Express next function for error handling
     */
    public login = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
        try {
            // Validate login request
            await validateLoginRequest(req.body);

            // Get client information for security tracking
            const deviceId = req.headers['user-agent'] || 'unknown';

            // Authenticate user
            const authResult = await this.authService.login(
                req.body.email,
                req.body.password,
                deviceId
            );

            // Set secure cookie options
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict' as const,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            };

            // Set refresh token in HTTP-only cookie
            res.cookie('refreshToken', authResult.refreshToken, cookieOptions);

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    accessToken: authResult.accessToken,
                    expiresIn: authResult.expiresIn,
                    tokenType: authResult.tokenType
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles MFA setup with enhanced security features
     * @param req Express request object containing user ID
     * @param res Express response object
     * @param next Express next function for error handling
     */
    public setupMFA = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            const mfaConfig = await this.authService.setupMFA(userId);

            return res.status(200).json({
                success: true,
                message: 'MFA setup successful',
                data: {
                    otpAuthUrl: mfaConfig.otpURL,
                    qrCodeUrl: mfaConfig.dataURL,
                    secret: mfaConfig.tempSecret // Temporary secret for initial setup
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles MFA verification with device trust
     * @param req Express request object containing MFA verification data
     * @param res Express response object
     * @param next Express next function for error handling
     */
    public verifyMFA = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
        try {
            // Validate MFA verification request
            await validateMfaVerification(req.body);

            const isValid = await this.authService.verifyMFA({
                userId: req.body.userId,
                code: req.body.code,
                method: req.body.method || 'totp',
                timestamp: Date.now()
            });

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid MFA code'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'MFA verification successful'
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles token refresh with session validation
     * @param req Express request object containing refresh token
     * @param res Express response object
     * @param next Express next function for error handling
     */
    public refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token not found'
                });
            }

            const tokens = await this.authService.refreshToken(refreshToken);

            // Set new refresh token in HTTP-only cookie
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict' as const,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            };

            res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

            return res.status(200).json({
                success: true,
                message: 'Token refresh successful',
                data: {
                    accessToken: tokens.accessToken,
                    expiresIn: tokens.expiresIn,
                    tokenType: tokens.tokenType
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Handles user logout with session cleanup
     * @param req Express request object
     * @param res Express response object
     * @param next Express next function for error handling
     */
    public logout = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
        try {
            const refreshToken = req.cookies.refreshToken;
            const userId = req.user?.id;

            if (userId && refreshToken) {
                await this.authService.logout(userId, refreshToken);
            }

            // Clear refresh token cookie
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            return res.status(200).json({
                success: true,
                message: 'Logout successful'
            });
        } catch (error) {
            next(error);
        }
    };
}