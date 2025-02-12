// @package @jest/globals ^29.0.0
// @package jsonwebtoken ^9.0.0
// @package bcrypt ^5.1.0

import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import {
  generateJwtToken,
  verifyJwtToken,
  hashPassword,
  comparePassword,
  generateMfaSecret,
  verifyMfaToken,
  checkPermission
} from '../../../src/utils/auth.utils';
import { authConfig } from '../../../src/config/auth.config';
import { IUser } from '../../../src/interfaces/auth.interface';

// Mock user data for testing
const mockUser: IUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  passwordSalt: 'salt',
  role: 'ADMIN',
  status: 'ACTIVE',
  failedLoginAttempts: 0,
  passwordLastChanged: new Date(),
  mfaEnabled: true,
  mfaSecret: 'test-mfa-secret',
  refreshTokens: [],
  lastLogin: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock device and tenant IDs
const mockDeviceId = 'test-device-id';
const mockTenantId = 'test-tenant-id';

describe('generateJwtToken', () => {
  test('should generate valid access and refresh tokens', async () => {
    const result = await generateJwtToken(mockUser, mockDeviceId);
    
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('refreshToken');
    
    const decodedToken = jwt.decode(result.token) as jwt.JwtPayload;
    expect(decodedToken).toMatchObject({
      userId: mockUser.id,
      role: mockUser.role,
      deviceId: mockDeviceId,
      iss: authConfig.jwt.issuer,
      aud: authConfig.jwt.audience
    });
  });

  test('should enforce token expiration settings', async () => {
    const { token } = await generateJwtToken(mockUser, mockDeviceId);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    
    expect(decoded.exp! - decoded.iat!).toBe(authConfig.jwt.accessTokenExpiry);
  });

  test('should include correct RBAC permissions in token', async () => {
    const { token } = await generateJwtToken(mockUser, mockDeviceId);
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    
    expect(decoded.scope).toEqual(authConfig.rbac.permissions[mockUser.role]);
  });

  test('should fail with invalid device ID', async () => {
    await expect(generateJwtToken(mockUser, '')).rejects.toThrow();
  });
});

describe('verifyJwtToken', () => {
  let validToken: string;

  beforeEach(async () => {
    const tokens = await generateJwtToken(mockUser, mockDeviceId);
    validToken = tokens.token;
  });

  test('should verify valid token successfully', async () => {
    const result = await verifyJwtToken(validToken, mockDeviceId);
    expect(result.userId).toBe(mockUser.id);
    expect(result.deviceId).toBe(mockDeviceId);
  });

  test('should reject expired token', async () => {
    jest.advanceTimersByTime(authConfig.jwt.accessTokenExpiry * 1000 + 1000);
    await expect(verifyJwtToken(validToken, mockDeviceId)).rejects.toThrow();
  });

  test('should reject token with mismatched device ID', async () => {
    await expect(verifyJwtToken(validToken, 'wrong-device')).rejects.toThrow();
  });

  test('should reject tampered token', async () => {
    const tamperedToken = validToken.slice(0, -5) + 'xxxxx';
    await expect(verifyJwtToken(tamperedToken, mockDeviceId)).rejects.toThrow();
  });
});

describe('hashPassword', () => {
  const testPassword = 'SecurePassword123!';

  test('should generate secure password hash', async () => {
    const hashedPassword = await hashPassword(testPassword);
    expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });

  test('should use configured salt rounds', async () => {
    const spy = jest.spyOn(bcrypt, 'hash');
    await hashPassword(testPassword);
    expect(spy).toHaveBeenCalledWith(testPassword, authConfig.security.encryption.saltRounds);
  });

  test('should reject weak passwords', async () => {
    await expect(hashPassword('weak')).rejects.toThrow();
  });

  test('should generate unique salts for same password', async () => {
    const hash1 = await hashPassword(testPassword);
    const hash2 = await hashPassword(testPassword);
    expect(hash1).not.toBe(hash2);
  });
});

describe('comparePassword', () => {
  const testPassword = 'SecurePassword123!';
  let hashedPassword: string;

  beforeEach(async () => {
    hashedPassword = await hashPassword(testPassword);
  });

  test('should validate correct password', async () => {
    const result = await comparePassword(testPassword, hashedPassword);
    expect(result).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const result = await comparePassword('wrongpassword', hashedPassword);
    expect(result).toBe(false);
  });

  test('should handle timing attacks', async () => {
    const startTime = process.hrtime();
    await comparePassword('wrongpassword', hashedPassword);
    const endTime = process.hrtime(startTime);
    
    const startTime2 = process.hrtime();
    await comparePassword(testPassword, hashedPassword);
    const endTime2 = process.hrtime(startTime2);
    
    expect(Math.abs(endTime[1] - endTime2[1])).toBeLessThan(1000000); // 1ms difference max
  });
});

describe('generateMfaSecret', () => {
  test('should generate valid MFA secret and backup codes', async () => {
    const result = await generateMfaSecret(mockUser.id);
    
    expect(result.secret).toHaveLength(32);
    expect(result.backupCodes).toHaveLength(authConfig.mfa.backupCodes.count);
    expect(result.backupCodes[0]).toHaveLength(authConfig.mfa.backupCodes.length);
  });

  test('should enforce rate limiting', async () => {
    for (let i = 0; i < authConfig.mfa.rateLimit.attempts + 1; i++) {
      if (i === authConfig.mfa.rateLimit.attempts) {
        await expect(generateMfaSecret(mockUser.id)).rejects.toThrow('Rate limit exceeded');
      } else {
        await generateMfaSecret(mockUser.id);
      }
    }
  });

  test('should generate unique backup codes', async () => {
    const result = await generateMfaSecret(mockUser.id);
    const uniqueCodes = new Set(result.backupCodes);
    expect(uniqueCodes.size).toBe(result.backupCodes.length);
  });
});

describe('verifyMfaToken', () => {
  const mockToken = '123456';
  const mockSecret = 'test-mfa-secret';

  test('should verify valid TOTP token', async () => {
    const result = await verifyMfaToken(mockToken, mockSecret, mockUser.id);
    expect(result).toBe(true);
  });

  test('should enforce rate limiting on failed attempts', async () => {
    for (let i = 0; i < authConfig.mfa.rateLimit.attempts + 1; i++) {
      if (i === authConfig.mfa.rateLimit.attempts) {
        await expect(verifyMfaToken('invalid', mockSecret, mockUser.id))
          .rejects.toThrow('Rate limit exceeded');
      } else {
        await verifyMfaToken('invalid', mockSecret, mockUser.id).catch(() => {});
      }
    }
  });

  test('should validate backup codes', async () => {
    const { backupCodes } = await generateMfaSecret(mockUser.id);
    const result = await verifyMfaToken(backupCodes[0], mockSecret, mockUser.id);
    expect(result).toBe(true);
  });
});

describe('checkPermission', () => {
  test('should validate role hierarchy correctly', async () => {
    const result = await checkPermission('ADMIN', 'SALES_REP');
    expect(result).toBe(true);
    
    const reverseResult = await checkPermission('SALES_REP', 'ADMIN');
    expect(reverseResult).toBe(false);
  });

  test('should validate resource-based access', async () => {
    const result = await checkPermission(
      'MANAGER',
      'SALES_REP',
      'resource-123',
      ['read:leads']
    );
    expect(result).toBe(true);
  });

  test('should validate required scopes', async () => {
    const result = await checkPermission(
      'ADMIN',
      'MANAGER',
      undefined,
      ['read:*', 'write:leads']
    );
    expect(result).toBe(true);
  });

  test('should handle multi-tenancy access', async () => {
    const result = await checkPermission(
      'MANAGER',
      'SALES_REP',
      `${mockTenantId}:resource-123`
    );
    expect(result).toBe(true);
  });
});