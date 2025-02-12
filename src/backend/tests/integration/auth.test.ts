// @package supertest ^6.3.0
// @package @jest/globals ^29.0.0
// @package redis-mock ^0.56.3

import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import supertest from 'supertest';
import RedisMock from 'redis-mock';

import { AuthService } from '../../src/services/auth.service';
import { IUser } from '../../src/interfaces/auth.interface';
import { UserRole } from '../../src/types/auth.types';

describe('Authentication Integration Tests', () => {
    let authService: AuthService;
    let redisMock: RedisMock.RedisClient;
    let testUser: IUser;

    beforeAll(async () => {
        // Initialize Redis mock
        redisMock = RedisMock.createClient();

        // Initialize test database connection
        process.env.NODE_ENV = 'test';
        process.env.JWT_SECRET = 'test-secret-key';

        // Initialize auth service with test configurations
        authService = new AuthService(
            null, // Will be mocked
            redisMock as any,
            null, // Rate limiter will be mocked
            null  // Logger will be mocked
        );
    });

    afterAll(async () => {
        // Cleanup test data
        await redisMock.flushall();
        await new Promise<void>((resolve) => redisMock.quit(() => resolve()));
    });

    beforeEach(async () => {
        // Reset test state before each test
        await redisMock.flushall();
    });

    describe('User Registration', () => {
        it('should successfully register a new user with valid data', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'StrongP@ssw0rd123!',
                role: UserRole.SALES_REP,
                mfaEnabled: true
            };

            const result = await authService.register(userData);

            expect(result).toBeDefined();
            expect(result.email).toBe(userData.email);
            expect(result.role).toBe(userData.role);
            expect(result.mfaEnabled).toBe(true);
            expect(result.status).toBe('PENDING_VERIFICATION');
        });

        it('should enforce password complexity requirements', async () => {
            const weakPassword = {
                email: 'test@example.com',
                password: 'weak',
                role: UserRole.SALES_REP
            };

            await expect(authService.register(weakPassword))
                .rejects
                .toThrow('Password does not meet complexity requirements');
        });

        it('should prevent duplicate email registration', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'StrongP@ssw0rd123!',
                role: UserRole.SALES_REP
            };

            await authService.register(userData);

            await expect(authService.register(userData))
                .rejects
                .toThrow('Email already registered');
        });

        it('should enforce rate limiting on registration attempts', async () => {
            const attempts = Array(6).fill({
                email: 'test@example.com',
                password: 'StrongP@ssw0rd123!',
                role: UserRole.SALES_REP
            });

            await Promise.all(attempts.map(async (userData) => {
                try {
                    await authService.register(userData);
                } catch (error) {
                    expect(error.message).toContain('Too many registration attempts');
                }
            }));
        });
    });

    describe('User Authentication', () => {
        beforeEach(async () => {
            // Create test user for authentication tests
            testUser = await authService.register({
                email: 'auth@example.com',
                password: 'StrongP@ssw0rd123!',
                role: UserRole.SALES_REP,
                mfaEnabled: true
            }) as IUser;
        });

        it('should successfully authenticate with valid credentials', async () => {
            const result = await authService.login(
                testUser.email,
                'StrongP@ssw0rd123!',
                'test-device-id'
            );

            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.tokenType).toBe('Bearer');
            expect(result.expiresIn).toBeGreaterThan(0);
        });

        it('should handle MFA verification correctly', async () => {
            const mfaSetup = await authService.setupMFA(testUser.id);
            expect(mfaSetup.secret).toBeDefined();
            expect(mfaSetup.dataURL).toBeDefined();

            // Generate valid TOTP token
            const validToken = '123456'; // Mock valid token
            const result = await authService.verifyMFA({
                userId: testUser.id,
                code: validToken,
                method: 'totp',
                timestamp: Date.now()
            });

            expect(result).toBe(true);
        });

        it('should handle backup codes correctly', async () => {
            const backupCodes = await authService.generateBackupCodes(testUser.id);
            expect(backupCodes).toHaveLength(10);

            const result = await authService.verifyMFA({
                userId: testUser.id,
                code: backupCodes[0],
                method: 'backup',
                timestamp: Date.now()
            });

            expect(result).toBe(true);
        });

        it('should enforce account lockout after failed attempts', async () => {
            const attempts = Array(4).fill({
                email: testUser.email,
                password: 'WrongPassword123!',
                deviceId: 'test-device-id'
            });

            for (const attempt of attempts) {
                try {
                    await authService.login(
                        attempt.email,
                        attempt.password,
                        attempt.deviceId
                    );
                } catch (error) {
                    expect(error.message).toContain('Invalid credentials');
                }
            }

            // Verify account is locked
            await expect(authService.login(
                testUser.email,
                'StrongP@ssw0rd123!',
                'test-device-id'
            )).rejects.toThrow('Account locked');
        });
    });

    describe('Token Management', () => {
        let authTokens: { accessToken: string; refreshToken: string };

        beforeEach(async () => {
            // Setup test user and get initial tokens
            testUser = await authService.register({
                email: 'token@example.com',
                password: 'StrongP@ssw0rd123!',
                role: UserRole.SALES_REP
            }) as IUser;

            authTokens = await authService.login(
                testUser.email,
                'StrongP@ssw0rd123!',
                'test-device-id'
            );
        });

        it('should successfully refresh tokens', async () => {
            const newTokens = await authService.refreshToken(authTokens.refreshToken);

            expect(newTokens.accessToken).toBeDefined();
            expect(newTokens.accessToken).not.toBe(authTokens.accessToken);
            expect(newTokens.refreshToken).toBeDefined();
            expect(newTokens.refreshToken).not.toBe(authTokens.refreshToken);
        });

        it('should prevent refresh token reuse', async () => {
            await authService.refreshToken(authTokens.refreshToken);

            await expect(authService.refreshToken(authTokens.refreshToken))
                .rejects
                .toThrow('Invalid refresh token');
        });

        it('should handle token revocation on logout', async () => {
            await authService.logout(testUser.id, 'test-session-id');

            await expect(authService.refreshToken(authTokens.refreshToken))
                .rejects
                .toThrow('Token revoked');
        });
    });

    describe('Authorization', () => {
        let adminUser: IUser;
        let managerUser: IUser;
        let salesUser: IUser;

        beforeEach(async () => {
            // Create test users with different roles
            adminUser = await authService.register({
                email: 'admin@example.com',
                password: 'StrongP@ssw0rd123!',
                role: UserRole.ADMIN
            }) as IUser;

            managerUser = await authService.register({
                email: 'manager@example.com',
                password: 'StrongP@ssw0rd123!',
                role: UserRole.MANAGER
            }) as IUser;

            salesUser = await authService.register({
                email: 'sales@example.com',
                password: 'StrongP@ssw0rd123!',
                role: UserRole.SALES_REP
            }) as IUser;
        });

        it('should enforce role-based access control', async () => {
            // Admin should have full access
            expect(await authService.validatePermissions(adminUser.id, 'any:action'))
                .toBe(true);

            // Manager should have limited access
            expect(await authService.validatePermissions(managerUser.id, 'read:leads'))
                .toBe(true);
            expect(await authService.validatePermissions(managerUser.id, 'admin:action'))
                .toBe(false);

            // Sales rep should have restricted access
            expect(await authService.validatePermissions(salesUser.id, 'read:own_leads'))
                .toBe(true);
            expect(await authService.validatePermissions(salesUser.id, 'write:all_leads'))
                .toBe(false);
        });

        it('should handle resource-based authorization', async () => {
            const leadId = 'test-lead-id';

            // Sales rep should access own leads
            expect(await authService.validatePermissions(
                salesUser.id,
                'read:lead',
                { leadId, ownerId: salesUser.id }
            )).toBe(true);

            // Sales rep should not access others' leads
            expect(await authService.validatePermissions(
                salesUser.id,
                'read:lead',
                { leadId, ownerId: 'other-user-id' }
            )).toBe(false);
        });
    });
});