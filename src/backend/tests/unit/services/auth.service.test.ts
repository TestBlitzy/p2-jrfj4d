// @package jest ^29.0.0
// @package ioredis-mock ^8.0.0
// @package crypto-mock ^2.0.0

import { AuthService } from '../../src/services/auth.service';
import { AuthModel } from '../../src/models/auth.model';
import { UserRole, MfaVerification, AuthTokens } from '../../../types/auth.types';
import { IUser, IMfaConfig } from '../../../interfaces/auth.interface';
import Redis from 'ioredis-mock';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import winston from 'winston';
import crypto from 'crypto-mock';

describe('AuthService', () => {
    let authService: AuthService;
    let authModel: jest.Mocked<AuthModel>;
    let redisClient: Redis;
    let rateLimiter: jest.Mocked<RateLimiterRedis>;
    let logger: winston.Logger;

    const mockUser: Omit<IUser, 'passwordHash'> = {
        id: 'user-123',
        email: 'test@example.com',
        passwordSalt: 'salt123',
        role: UserRole.SALES_REP,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        passwordLastChanged: new Date(),
        mfaEnabled: true,
        mfaSecret: 'secret123',
        refreshTokens: [],
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockTokens: AuthTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 3600,
        tokenType: 'Bearer'
    };

    beforeEach(() => {
        // Initialize mocks
        authModel = {
            createUser: jest.fn(),
            validateLogin: jest.fn(),
            setupMFA: jest.fn(),
            verifyMFA: jest.fn(),
            generateTokens: jest.fn(),
            invalidateSession: jest.fn(),
            findUserByEmail: jest.fn(),
            disconnect: jest.fn()
        } as unknown as jest.Mocked<AuthModel>;

        redisClient = new Redis();
        rateLimiter = {
            consume: jest.fn(),
            delete: jest.fn(),
            get: jest.fn()
        } as unknown as jest.Mocked<RateLimiterRedis>;

        logger = winston.createLogger({
            transports: [new winston.transports.Console()]
        });

        authService = new AuthService(authModel, redisClient, rateLimiter, logger);
    });

    describe('Authentication', () => {
        test('should register new user with password hashing', async () => {
            const userData = {
                email: 'new@example.com',
                password: 'StrongPass123!',
                role: UserRole.SALES_REP
            };

            authModel.createUser.mockResolvedValue(mockUser);

            const result = await authService.register(userData);

            expect(authModel.createUser).toHaveBeenCalledWith(expect.objectContaining({
                email: userData.email,
                role: userData.role
            }));
            expect(result).toEqual(expect.objectContaining({
                email: mockUser.email,
                role: mockUser.role
            }));
        });

        test('should enforce password complexity requirements', async () => {
            const weakPassword = {
                email: 'test@example.com',
                password: 'weak',
                role: UserRole.SALES_REP
            };

            await expect(authService.register(weakPassword))
                .rejects
                .toThrow('Password does not meet complexity requirements');
        });

        test('should implement rate limiting for registration attempts', async () => {
            rateLimiter.consume.mockRejectedValue(new Error('Too many requests'));

            await expect(authService.register({
                email: 'test@example.com',
                password: 'StrongPass123!',
                role: UserRole.SALES_REP
            })).rejects.toThrow('Too many requests');
        });

        test('should login user with valid credentials', async () => {
            authModel.validateLogin.mockResolvedValue(mockTokens);

            const result = await authService.login(
                'test@example.com',
                'StrongPass123!',
                'device-123'
            );

            expect(result).toEqual(mockTokens);
            expect(authModel.validateLogin).toHaveBeenCalledWith(
                'test@example.com',
                'StrongPass123!',
                expect.any(String),
                'device-123'
            );
        });
    });

    describe('MFA', () => {
        const mockMfaConfig: IMfaConfig = {
            secret: 'mfa-secret-123',
            tempSecret: 'temp-secret-123',
            dataURL: 'data-url',
            otpURL: 'otp-url'
        };

        test('should setup TOTP-based MFA', async () => {
            authModel.setupMFA.mockResolvedValue(mockMfaConfig);

            const result = await authService.setupMFA('user-123');

            expect(result).toEqual(mockMfaConfig);
            expect(authModel.setupMFA).toHaveBeenCalledWith('user-123');
        });

        test('should validate MFA tokens', async () => {
            const verification: MfaVerification = {
                userId: 'user-123',
                code: '123456',
                method: 'totp',
                timestamp: Date.now()
            };

            authModel.verifyMFA.mockResolvedValue(true);

            const result = await authService.verifyMFA(verification);

            expect(result).toBe(true);
            expect(authModel.verifyMFA).toHaveBeenCalledWith(
                verification.userId,
                verification.code,
                verification.method
            );
        });
    });

    describe('Authorization', () => {
        test('should implement RBAC permissions', async () => {
            const mockPermissions = ['read:leads', 'write:own_leads'];
            
            authModel.validatePermissions = jest.fn().mockResolvedValue(true);

            const result = await authService.validatePermissions(
                'user-123',
                'leads',
                'read'
            );

            expect(result).toBe(true);
            expect(authModel.validatePermissions).toHaveBeenCalledWith(
                'user-123',
                'leads',
                'read'
            );
        });

        test('should validate OAuth scopes', async () => {
            const mockToken = 'oauth-token-123';
            const requiredScopes = ['profile', 'email'];

            authModel.validateOAuthScopes = jest.fn().mockResolvedValue(true);

            const result = await authService.validateOAuthScopes(
                mockToken,
                requiredScopes
            );

            expect(result).toBe(true);
        });
    });

    describe('Security', () => {
        test('should implement rate limiting', async () => {
            rateLimiter.consume.mockRejectedValue(new Error('Too many requests'));

            await expect(authService.login(
                'test@example.com',
                'password123',
                'device-123'
            )).rejects.toThrow('Too many requests');
        });

        test('should detect suspicious activities', async () => {
            const suspiciousLogin = {
                email: 'test@example.com',
                password: 'StrongPass123!',
                deviceId: 'unknown-device',
                ipAddress: '1.1.1.1'
            };

            authModel.validateDeviceFingerprint = jest.fn().mockResolvedValue(false);

            await expect(authService.login(
                suspiciousLogin.email,
                suspiciousLogin.password,
                suspiciousLogin.deviceId
            )).rejects.toThrow('Suspicious activity detected');
        });

        test('should maintain audit logs', async () => {
            const mockAuditLog = jest.spyOn(logger, 'info');

            await authService.login(
                'test@example.com',
                'StrongPass123!',
                'device-123'
            );

            expect(mockAuditLog).toHaveBeenCalledWith(
                'User logged in successfully',
                expect.any(Object)
            );
        });

        test('should handle token rotation', async () => {
            const oldToken = 'old-refresh-token';
            
            authModel.generateTokens.mockResolvedValue(mockTokens);

            const result = await authService.refreshToken(oldToken);

            expect(result).toEqual(mockTokens);
            expect(authModel.generateTokens).toHaveBeenCalledWith(oldToken);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});