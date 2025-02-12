import { UserRole } from '../types/auth.types';

/**
 * Local storage keys for authentication tokens
 */
export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'sip_access_token',
  REFRESH_TOKEN: 'sip_refresh_token',
  TOKEN_TYPE: 'Bearer'
} as const;

/**
 * Authentication API endpoint paths with enhanced security endpoints
 */
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REFRESH: '/api/auth/refresh',
  PASSWORD_RESET: '/api/auth/password-reset',
  MFA_SETUP: '/api/auth/mfa/setup',
  MFA_VERIFY: '/api/auth/mfa/verify',
  SESSION_VERIFY: '/api/auth/session/verify',
  PASSWORD_POLICY: '/api/auth/password/policy'
} as const;

/**
 * Authentication configuration values with enhanced security settings
 * All time values are in seconds
 */
export const AUTH_CONFIG = {
  // JWT access token expiry - 1 hour
  TOKEN_EXPIRY: 3600,
  // Refresh token expiry - 7 days
  REFRESH_EXPIRY: 604800,
  // TOTP MFA code length
  MFA_CODE_LENGTH: 6,
  // MFA code expiry - 5 minutes
  MFA_CODE_EXPIRY: 300,
  // Maximum failed login attempts before account lockout
  MAX_LOGIN_ATTEMPTS: 5,
  // Account lockout duration - 15 minutes
  LOCKOUT_DURATION: 900,
  // Minimum password length requirement
  PASSWORD_MIN_LENGTH: 12,
  // Number of previous passwords to prevent reuse
  PASSWORD_HISTORY_SIZE: 5,
  // Session inactivity timeout - 30 minutes
  SESSION_INACTIVITY_TIMEOUT: 1800
} as const;

/**
 * Supported OAuth provider identifiers
 */
export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  MICROSOFT: 'microsoft'
} as const;

/**
 * OAuth scopes with role-based and resource-specific permissions
 */
export const OAUTH_SCOPES = {
  // Default scopes required for basic authentication
  DEFAULT: ['profile', 'email', 'openid'],

  // Role-based scopes mapping for different user roles
  ROLE_BASED: {
    [UserRole.ADMIN]: ['admin:read', 'admin:write', 'system:manage'],
    [UserRole.MANAGER]: ['team:manage', 'reports:read', 'leads:manage'],
    [UserRole.SALES_REP]: ['leads:read', 'leads:write', 'profile:manage']
  },

  // Resource-specific scopes for granular permissions
  RESOURCE: {
    LEADS: ['leads:read', 'leads:write', 'leads:delete'],
    ANALYTICS: ['analytics:read', 'analytics:export'],
    SETTINGS: ['settings:read', 'settings:write']
  }
} as const;