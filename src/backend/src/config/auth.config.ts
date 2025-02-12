// @package dotenv ^16.0.0
import { config } from 'dotenv';
import { IAuthToken } from '../interfaces/auth.interface';
import { UserRole } from '../types/auth.types';

// Initialize environment configuration
config();

/**
 * Comprehensive authentication and authorization configuration
 * Implements enterprise-grade security controls and compliance requirements
 */
export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTokenExpiry: 3600, // 1 hour in seconds
    refreshTokenExpiry: 604800, // 7 days in seconds
    algorithm: 'HS256',
    issuer: 'sales-intelligence-platform',
    audience: 'sip-api',
    rotationSchedule: '30d', // Key rotation every 30 days
    maxTokensPerUser: 5 // Maximum concurrent refresh tokens per user
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
      scopes: ['profile', 'email', 'openid'],
      userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      verifyHostname: true
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackUrl: process.env.MICROSOFT_CALLBACK_URL,
      scopes: ['user.read', 'email', 'openid', 'profile'],
      userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
      tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      verifyHostname: true
    }
  },

  mfa: {
    enabled: true,
    type: 'TOTP', // Time-based One-Time Password
    issuer: 'Sales & Intelligence Platform',
    digits: 6,
    step: 30, // Time step in seconds
    window: 1, // Validation window for TOTP
    backupCodes: {
      count: 10, // Number of backup codes
      length: 10, // Length of each backup code
      algorithm: 'sha256'
    },
    rateLimit: {
      attempts: 3, // Maximum failed attempts
      windowMs: 300000 // 5 minutes window
    }
  },

  session: {
    store: 'redis',
    prefix: 'sess:',
    expiry: 86400, // 24 hours in seconds
    rolling: true, // Reset expiry on activity
    secure: true, // Requires HTTPS
    httpOnly: true,
    sameSite: 'strict' as const,
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      tls: true
    }
  },

  rbac: {
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_REP],
    defaultRole: UserRole.SALES_REP,
    superAdmin: UserRole.ADMIN,
    hierarchy: {
      [UserRole.ADMIN]: [UserRole.MANAGER, UserRole.SALES_REP],
      [UserRole.MANAGER]: [UserRole.SALES_REP],
      [UserRole.SALES_REP]: []
    },
    permissions: {
      [UserRole.ADMIN]: ['*'], // Full access
      [UserRole.MANAGER]: [
        'read:*',
        'write:leads',
        'write:reports'
      ],
      [UserRole.SALES_REP]: [
        'read:leads',
        'write:own_leads',
        'read:reports'
      ]
    }
  },

  security: {
    encryption: {
      algorithm: 'aes-256-gcm',
      keyRotation: '90d', // 90 days key rotation
      saltRounds: 12 // For password hashing
    },
    rateLimit: {
      windowMs: 900000, // 15 minutes
      max: 100 // Maximum requests per window
    },
    audit: {
      enabled: true,
      retention: '365d', // 1 year retention
      sensitiveFields: ['password', 'token', 'secret']
    }
  }
} as const;

// Type assertion to ensure configuration immutability
Object.freeze(authConfig);