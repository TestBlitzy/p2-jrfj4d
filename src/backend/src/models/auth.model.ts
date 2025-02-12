// @package @prisma/client ^5.0.0
// @package bcrypt ^5.1.0
// @package jsonwebtoken ^9.0.0
// @package otplib ^12.0.1
// @package rate-limiter-flexible ^2.4.1
// @package redis ^4.6.7

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'redis';

import { IUser, ISession, IMfaConfig, IAuthToken, IUserPermission } from '../interfaces/auth.interface';
import { UserRole, MfaVerification, AuthTokens } from '../types/auth.types';
import { authConfig } from '../config/auth.config';

/**
 * Enhanced authentication model implementing comprehensive security features
 * Provides enterprise-grade user management, session handling, and MFA
 */
export class AuthModel {
  private readonly prisma: PrismaClient;
  private readonly redis: Redis.RedisClient;
  private readonly rateLimiter: RateLimiterRedis;
  private readonly sessionPrefix = 'sess:';

  constructor() {
    this.prisma = new PrismaClient();
    this.redis = Redis.createClient(authConfig.session.redis);
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      points: authConfig.security.rateLimit.max,
      duration: authConfig.security.rateLimit.windowMs / 1000,
      blockDuration: 900 // 15 minutes block
    });

    // Configure authenticator settings
    authenticator.options = {
      window: authConfig.mfa.window,
      step: authConfig.mfa.step
    };
  }

  /**
   * Creates a new user account with enhanced security validation
   * @param userData User registration data
   * @returns Created user object without sensitive data
   */
  async createUser(userData: Omit<IUser, 'id' | 'passwordHash'>): Promise<Omit<IUser, 'passwordHash'>> {
    // Validate email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Generate password hash with salt
    const salt = await bcrypt.genSalt(authConfig.security.encryption.saltRounds);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    // Generate MFA secret
    const mfaSecret = authenticator.generateSecret();
    const mfaConfig: IMfaConfig = {
      secret: mfaSecret,
      tempSecret: mfaSecret,
      dataURL: authenticator.keyuri(userData.email, authConfig.mfa.issuer, mfaSecret),
      otpURL: `otpauth://totp/${authConfig.mfa.issuer}:${userData.email}?secret=${mfaSecret}&issuer=${authConfig.mfa.issuer}`
    };

    // Create user with enhanced security features
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        passwordHash,
        passwordSalt: salt,
        role: userData.role || UserRole.SALES_REP,
        status: 'PENDING_VERIFICATION',
        mfaEnabled: authConfig.mfa.enabled,
        mfaSecret: mfaConfig.secret,
        failedLoginAttempts: 0,
        passwordLastChanged: new Date(),
        lastLogin: null,
        refreshTokens: []
      }
    });

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes(user.id);

    // Audit log user creation
    await this.logAuditEvent('USER_CREATED', user.id, {
      email: user.email,
      role: user.role
    });

    // Return sanitized user object
    const { passwordHash: _, mfaSecret: __, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Validates login credentials with rate limiting and security checks
   * @param email User email
   * @param password User password
   * @param ipAddress Client IP address
   * @param deviceId Unique device identifier
   */
  async validateLogin(email: string, password: string, ipAddress: string, deviceId: string): Promise<AuthTokens> {
    // Check rate limiting
    try {
      await this.rateLimiter.consume(ipAddress);
    } catch (error) {
      throw new Error('Too many login attempts. Please try again later.');
    }

    // Find user and validate credentials
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status === 'LOCKED') {
      throw new Error('Invalid credentials or account locked');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await this.handleFailedLogin(user.id);
      throw new Error('Invalid credentials');
    }

    // Create session
    const session = await this.createSession(user.id, ipAddress, deviceId);

    // Generate tokens
    const tokens = await this.generateAuthTokens(user, session.id);

    // Update last login and reset failed attempts
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        failedLoginAttempts: 0
      }
    });

    // Audit log successful login
    await this.logAuditEvent('USER_LOGIN', user.id, {
      ipAddress,
      deviceId,
      sessionId: session.id
    });

    return tokens;
  }

  /**
   * Handles MFA verification with multiple authentication methods
   * @param userId User ID
   * @param token MFA token
   * @param method Authentication method
   */
  async handleMFA(userId: string, token: string, method: 'totp' | 'backup'): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaEnabled) {
      throw new Error('MFA not configured for user');
    }

    let isValid = false;

    if (method === 'totp') {
      isValid = authenticator.verify({
        token,
        secret: user.mfaSecret
      });
    } else if (method === 'backup') {
      isValid = await this.validateBackupCode(userId, token);
    }

    if (!isValid) {
      await this.logAuditEvent('MFA_FAILED', userId, { method });
      throw new Error('Invalid MFA token');
    }

    await this.logAuditEvent('MFA_SUCCESS', userId, { method });
    return true;
  }

  /**
   * Manages user sessions with enhanced security features
   * @param sessionId Session identifier
   * @param userId User identifier
   */
  async manageSession(sessionId: string, userId: string): Promise<ISession> {
    const session = await this.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new Error('Invalid session');
    }

    if (new Date() > session.expiresAt) {
      await this.invalidateSession(sessionId);
      throw new Error('Session expired');
    }

    // Extend session if rolling
    if (authConfig.session.rolling) {
      await this.extendSession(sessionId);
    }

    return session;
  }

  /**
   * Generates secure authentication tokens
   * @param user User object
   * @param sessionId Session identifier
   */
  private async generateAuthTokens(user: IUser, sessionId: string): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        sessionId
      },
      authConfig.jwt.secret,
      {
        expiresIn: authConfig.jwt.accessTokenExpiry,
        algorithm: authConfig.jwt.algorithm as jwt.Algorithm,
        issuer: authConfig.jwt.issuer,
        audience: authConfig.jwt.audience
      }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId },
      authConfig.jwt.secret,
      {
        expiresIn: authConfig.jwt.refreshTokenExpiry,
        algorithm: authConfig.jwt.algorithm as jwt.Algorithm
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: authConfig.jwt.accessTokenExpiry,
      tokenType: 'Bearer'
    };
  }

  /**
   * Handles failed login attempts and account locking
   * @param userId User identifier
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: {
          increment: 1
        }
      }
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user.failedLoginAttempts >= authConfig.mfa.rateLimit.attempts) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'LOCKED' }
      });

      await this.logAuditEvent('ACCOUNT_LOCKED', userId, {
        reason: 'Too many failed login attempts'
      });
    }
  }

  /**
   * Creates a new session with security context
   * @param userId User identifier
   * @param ipAddress Client IP address
   * @param deviceId Device identifier
   */
  private async createSession(userId: string, ipAddress: string, deviceId: string): Promise<ISession> {
    const session: ISession = {
      id: crypto.randomUUID(),
      userId,
      token: crypto.randomUUID(),
      ipAddress,
      userAgent: deviceId,
      isValid: true,
      expiresAt: new Date(Date.now() + authConfig.session.expiry * 1000),
      createdAt: new Date()
    };

    await this.redis.setex(
      `${this.sessionPrefix}${session.id}`,
      authConfig.session.expiry,
      JSON.stringify(session)
    );

    return session;
  }

  /**
   * Generates backup codes for MFA recovery
   * @param userId User identifier
   */
  private async generateBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < authConfig.mfa.backupCodes.count; i++) {
      codes.push(crypto.randomBytes(authConfig.mfa.backupCodes.length).toString('hex'));
    }

    await this.redis.setex(
      `backup_codes:${userId}`,
      authConfig.session.expiry,
      JSON.stringify(codes)
    );

    return codes;
  }

  /**
   * Logs security audit events
   * @param event Event type
   * @param userId User identifier
   * @param metadata Event metadata
   */
  private async logAuditEvent(event: string, userId: string, metadata: Record<string, any>): Promise<void> {
    if (!authConfig.security.audit.enabled) return;

    await this.prisma.auditLog.create({
      data: {
        event,
        userId,
        metadata,
        timestamp: new Date()
      }
    });
  }

  /**
   * Cleanup method for proper resource management
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    await new Promise<void>((resolve) => this.redis.quit(() => resolve()));
  }
}