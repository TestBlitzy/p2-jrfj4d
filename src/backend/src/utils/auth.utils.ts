// @package jsonwebtoken ^9.0.0
// @package bcrypt ^5.1.0
// @package speakeasy ^2.0.0
// @package rate-limiter-flexible ^2.4.1

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { authConfig } from '../config/auth.config';
import { IUser, ICustomJwtPayload } from '../interfaces/auth.interface';

// Initialize rate limiter for MFA attempts
const mfaRateLimiter = new RateLimiterRedis({
  storeClient: authConfig.session.redis,
  keyPrefix: 'mfa_limit',
  points: authConfig.mfa.rateLimit.attempts,
  duration: authConfig.mfa.rateLimit.windowMs / 1000,
});

/**
 * Generates JWT access and refresh tokens with enhanced security features
 * Implements device-based validation and token rotation policies
 */
export async function generateJwtToken(
  user: IUser,
  deviceId: string
): Promise<{ token: string; refreshToken: string }> {
  // Create token payload with enhanced security claims
  const payload: ICustomJwtPayload = {
    userId: user.id,
    role: user.role,
    deviceId,
    scope: authConfig.rbac.permissions[user.role],
    iss: authConfig.jwt.issuer,
    aud: authConfig.jwt.audience,
    iat: Math.floor(Date.now() / 1000),
  };

  // Generate access token with short expiry
  const token = jwt.sign(payload, authConfig.jwt.secret!, {
    expiresIn: authConfig.jwt.accessTokenExpiry,
    algorithm: authConfig.jwt.algorithm as jwt.Algorithm,
  });

  // Generate refresh token with longer expiry
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    authConfig.jwt.secret!,
    {
      expiresIn: authConfig.jwt.refreshTokenExpiry,
      algorithm: authConfig.jwt.algorithm as jwt.Algorithm,
    }
  );

  // Store refresh token hash in user record (implementation required)
  await storeRefreshToken(user.id, refreshToken);

  return { token, refreshToken };
}

/**
 * Verifies JWT token with comprehensive security checks
 * Implements device validation and token blacklist checking
 */
export async function verifyJwtToken(
  token: string,
  deviceId: string
): Promise<ICustomJwtPayload> {
  try {
    // Check token blacklist
    if (await isTokenBlacklisted(token)) {
      throw new Error('Token has been revoked');
    }

    // Verify token signature and decode payload
    const decoded = jwt.verify(token, authConfig.jwt.secret!, {
      algorithms: [authConfig.jwt.algorithm as jwt.Algorithm],
      issuer: authConfig.jwt.issuer,
      audience: authConfig.jwt.audience,
    }) as ICustomJwtPayload;

    // Validate device ID
    if (decoded.deviceId !== deviceId) {
      throw new Error('Invalid device identifier');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Generates MFA secret and backup codes with enhanced security
 * Implements rate limiting and secure storage
 */
export async function generateMfaSecret(
  userId: string
): Promise<{ secret: string; backupCodes: string[] }> {
  try {
    // Check rate limits for MFA generation
    await mfaRateLimiter.consume(userId);

    // Generate secure TOTP secret
    const secret = speakeasy.generateSecret({
      length: 32,
      name: authConfig.mfa.issuer,
      issuer: authConfig.mfa.issuer,
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: authConfig.mfa.backupCodes.count }, () =>
      generateSecureBackupCode(authConfig.mfa.backupCodes.length)
    );

    // Hash and store backup codes (implementation required)
    await storeBackupCodes(userId, backupCodes);

    return {
      secret: secret.base32,
      backupCodes,
    };
  } catch (error) {
    if (error.remainingPoints !== undefined) {
      throw new Error('Rate limit exceeded for MFA generation');
    }
    throw error;
  }
}

/**
 * Verifies MFA token or backup code with rate limiting
 * Implements comprehensive security checks and logging
 */
export async function verifyMfaToken(
  token: string,
  secret: string,
  userId: string
): Promise<boolean> {
  try {
    // Check rate limits for verification attempts
    await mfaRateLimiter.consume(userId);

    // Verify TOTP token
    const isValidTotp = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: authConfig.mfa.window,
      digits: authConfig.mfa.digits,
      step: authConfig.mfa.step,
    });

    if (isValidTotp) {
      return true;
    }

    // Check backup codes if TOTP fails
    const isValidBackup = await verifyAndInvalidateBackupCode(userId, token);
    
    // Log verification attempt (implementation required)
    await logMfaAttempt(userId, isValidBackup);

    return isValidBackup;
  } catch (error) {
    if (error.remainingPoints !== undefined) {
      throw new Error('Rate limit exceeded for MFA verification');
    }
    throw error;
  }
}

/**
 * Validates user permissions with role hierarchy
 * Implements RBAC with resource-based access control
 */
export async function checkPermission(
  userRole: string,
  requiredRole: string,
  resourceId?: string,
  requiredScopes: string[] = []
): Promise<boolean> {
  // Get role hierarchy
  const hierarchy = authConfig.rbac.hierarchy;
  const userRoleLevel = getRoleLevel(userRole, hierarchy);
  const requiredRoleLevel = getRoleLevel(requiredRole, hierarchy);

  // Check role hierarchy
  if (userRoleLevel < requiredRoleLevel) {
    return false;
  }

  // Validate resource access if resourceId provided
  if (resourceId) {
    const hasResourceAccess = await validateResourceAccess(userRole, resourceId);
    if (!hasResourceAccess) {
      return false;
    }
  }

  // Check required scopes
  if (requiredScopes.length > 0) {
    const userScopes = authConfig.rbac.permissions[userRole];
    const hasRequiredScopes = requiredScopes.every(scope =>
      userScopes.includes(scope) || userScopes.includes('*')
    );
    if (!hasRequiredScopes) {
      return false;
    }
  }

  return true;
}

// Helper functions (implementations required)
async function storeRefreshToken(userId: string, token: string): Promise<void> {
  // Implementation for storing refresh token hash
}

async function isTokenBlacklisted(token: string): Promise<boolean> {
  // Implementation for checking token blacklist
  return false;
}

async function storeBackupCodes(userId: string, codes: string[]): Promise<void> {
  // Implementation for storing hashed backup codes
}

async function verifyAndInvalidateBackupCode(
  userId: string,
  code: string
): Promise<boolean> {
  // Implementation for backup code verification and invalidation
  return false;
}

async function logMfaAttempt(userId: string, success: boolean): Promise<void> {
  // Implementation for logging MFA attempts
}

async function validateResourceAccess(
  role: string,
  resourceId: string
): Promise<boolean> {
  // Implementation for resource-based access validation
  return true;
}

function getRoleLevel(role: string, hierarchy: Record<string, string[]>): number {
  // Implementation for determining role level in hierarchy
  return 0;
}

function generateSecureBackupCode(length: number): string {
  // Implementation for generating cryptographically secure backup codes
  return '';
}