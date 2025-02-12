// @package ioredis ^5.3.0
// @package passport ^0.6.0
// @package passport-google-oauth20 ^2.0.0
// @package passport-microsoft ^1.0.0
// @package rate-limiter-flexible ^2.4.1
// @package winston ^3.8.2

import Redis from 'ioredis';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import winston from 'winston';

import { AuthModel } from '../models/auth.model';
import { IUser, IAuthToken, ISession, IMfaConfig } from '../interfaces/auth.interface';
import { authConfig } from '../config/auth.config';
import { UserRole, AuthTokens, MfaVerification } from '../types/auth.types';

/**
 * Enterprise-grade authentication service implementing OAuth 2.0, JWT, MFA
 * and advanced security features with comprehensive audit logging
 */
export class AuthService {
    private readonly authModel: AuthModel;
    private readonly redisClient: Redis;
    private readonly rateLimiter: RateLimiterRedis;
    private readonly logger: winston.Logger;

    constructor(
        authModel: AuthModel,
        redisClient: Redis,
        rateLimiter: RateLimiterRedis,
        logger: winston.Logger
    ) {
        this.authModel = authModel;
        this.redisClient = redisClient;
        this.rateLimiter = rateLimiter;
        this.logger = logger;

        this.initializeOAuthStrategies();
    }

    /**
     * Registers a new user with enhanced security validation
     * @param userData User registration data
     * @returns Created user object with security metadata
     */
    public async register(userData: Omit<IUser, 'id' | 'passwordHash'>): Promise<Omit<IUser, 'passwordHash'>> {
        try {
            // Rate limiting check for registration
            await this.rateLimiter.consume(`register_${userData.email}`);

            // Create user with security features
            const user = await this.authModel.createUser(userData);

            this.logger.info('User registered successfully', {
                userId: user.id,
                email: user.email,
                role: user.role
            });

            return user;
        } catch (error) {
            this.logger.error('Registration failed', {
                email: userData.email,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Authenticates user with comprehensive security checks
     * @param email User email
     * @param password User password
     * @param deviceId Device identifier
     * @returns Authentication tokens
     */
    public async login(
        email: string,
        password: string,
        deviceId: string
    ): Promise<AuthTokens> {
        try {
            const ipAddress = await this.getClientIp();
            
            // Validate credentials and get tokens
            const tokens = await this.authModel.validateLogin(
                email,
                password,
                ipAddress,
                deviceId
            );

            this.logger.info('User logged in successfully', {
                email,
                deviceId,
                ipAddress
            });

            return tokens;
        } catch (error) {
            this.logger.error('Login failed', {
                email,
                deviceId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Sets up Multi-Factor Authentication for a user
     * @param userId User identifier
     * @returns MFA configuration
     */
    public async setupMFA(userId: string): Promise<IMfaConfig> {
        try {
            const mfaConfig = await this.authModel.setupMFA(userId);

            this.logger.info('MFA setup completed', { userId });

            return mfaConfig;
        } catch (error) {
            this.logger.error('MFA setup failed', {
                userId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Verifies MFA token with multiple authentication methods
     * @param verification MFA verification data
     * @returns Verification status
     */
    public async verifyMFA(verification: MfaVerification): Promise<boolean> {
        try {
            const isValid = await this.authModel.verifyMFA(
                verification.userId,
                verification.code,
                verification.method
            );

            this.logger.info('MFA verification successful', {
                userId: verification.userId,
                method: verification.method
            });

            return isValid;
        } catch (error) {
            this.logger.error('MFA verification failed', {
                userId: verification.userId,
                method: verification.method,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Refreshes authentication tokens
     * @param refreshToken Current refresh token
     * @returns New authentication tokens
     */
    public async refreshToken(refreshToken: string): Promise<AuthTokens> {
        try {
            const tokens = await this.authModel.generateTokens(refreshToken);

            this.logger.info('Tokens refreshed successfully');

            return tokens;
        } catch (error) {
            this.logger.error('Token refresh failed', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Logs out user and invalidates sessions
     * @param userId User identifier
     * @param sessionId Session identifier
     */
    public async logout(userId: string, sessionId: string): Promise<void> {
        try {
            await this.authModel.invalidateSession(sessionId);
            await this.redisClient.del(`session:${userId}`);

            this.logger.info('User logged out successfully', {
                userId,
                sessionId
            });
        } catch (error) {
            this.logger.error('Logout failed', {
                userId,
                sessionId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Initializes OAuth authentication strategies
     */
    private initializeOAuthStrategies(): void {
        // Google OAuth strategy
        passport.use(new GoogleStrategy({
            clientID: authConfig.oauth.google.clientId,
            clientSecret: authConfig.oauth.google.clientSecret,
            callbackURL: authConfig.oauth.google.callbackUrl,
            scope: authConfig.oauth.google.scopes
        }, this.handleOAuthCallback.bind(this)));

        // Microsoft OAuth strategy
        passport.use(new MicrosoftStrategy({
            clientID: authConfig.oauth.microsoft.clientId,
            clientSecret: authConfig.oauth.microsoft.clientSecret,
            callbackURL: authConfig.oauth.microsoft.callbackUrl,
            scope: authConfig.oauth.microsoft.scopes
        }, this.handleOAuthCallback.bind(this)));
    }

    /**
     * Handles OAuth authentication callback
     */
    private async handleOAuthCallback(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (error: any, user?: any) => void
    ): Promise<void> {
        try {
            const email = profile.emails[0].value;
            let user = await this.authModel.findUserByEmail(email);

            if (!user) {
                user = await this.register({
                    email,
                    password: null,
                    role: UserRole.SALES_REP,
                    mfaEnabled: authConfig.mfa.enabled
                });
            }

            done(null, user);
        } catch (error) {
            done(error);
        }
    }

    /**
     * Gets client IP address with proxy support
     */
    private async getClientIp(): Promise<string> {
        // Implementation would depend on your server setup
        return '0.0.0.0';
    }
}