import { Auth0 } from '@auth0/auth0-react'; // ^2.0.0
import { TOKEN_KEYS } from '../constants/auth.constants';
import { UserRole } from '../types/auth.types';

/**
 * Comprehensive authentication and authorization configuration
 * with enhanced security features for the Sales & Intelligence Platform
 */
export const authConfig = {
  /**
   * Auth0 configuration for OAuth 2.0 and OpenID Connect integration
   */
  auth0: {
    domain: process.env.VITE_AUTH0_DOMAIN as string,
    clientId: process.env.VITE_AUTH0_CLIENT_ID as string,
    audience: process.env.VITE_AUTH0_AUDIENCE as string,
    redirectUri: window.location.origin,
    logoutUri: `${window.location.origin}/logout`,
    errorPath: '/error',
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
    advancedOptions: {
      defaultScope: 'openid profile email'
    }
  },

  /**
   * JWT token configuration with enhanced security features
   */
  jwt: {
    tokenExpirySeconds: 3600, // 1 hour
    refreshTokenExpirySeconds: 604800, // 7 days
    tokenType: 'Bearer',
    storagePrefix: 'sip_',
    accessTokenKey: TOKEN_KEYS.ACCESS_TOKEN,
    refreshTokenKey: TOKEN_KEYS.REFRESH_TOKEN,
    encryptionEnabled: true,
    rotationEnabled: true,
    rotationIntervalSeconds: 3300, // 55 minutes
    verifyOptions: {
      algorithms: ['RS256'],
      audience: process.env.VITE_AUTH0_AUDIENCE,
      issuer: `https://${process.env.VITE_AUTH0_DOMAIN}/`
    }
  },

  /**
   * Multi-factor authentication configuration with adaptive MFA
   */
  mfa: {
    enabled: true,
    codeLength: 6,
    codeExpirySeconds: 300, // 5 minutes
    maxAttempts: 5,
    lockoutDurationSeconds: 900, // 15 minutes
    recoveryCodesCount: 10,
    adaptiveMFAEnabled: true,
    riskFactors: ['location', 'device', 'timeOfDay'],
    rememberDeviceDays: 30,
    totpOptions: {
      encoding: 'base32',
      step: 30,
      window: 1
    }
  },

  /**
   * OAuth 2.0 configuration with PKCE and enhanced security
   */
  oauth: {
    providers: ['google', 'microsoft'],
    defaultScopes: ['profile', 'email', 'openid'],
    additionalScopes: ['offline_access', 'sales:read', 'sales:write'],
    responseType: 'code',
    grantType: 'authorization_code',
    pkceEnabled: true,
    pkceMethod: 'S256',
    stateValidationEnabled: true,
    customParams: {
      prompt: 'select_account',
      access_type: 'offline'
    }
  },

  /**
   * Role-based access control configuration with hierarchical permissions
   */
  roles: {
    availableRoles: [
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.SALES_REP
    ],
    defaultRole: UserRole.SALES_REP,
    permissionMatrix: {
      [UserRole.ADMIN]: ['*'],
      [UserRole.MANAGER]: [
        'read:*',
        'write:leads',
        'manage:team'
      ],
      [UserRole.SALES_REP]: [
        'read:leads',
        'write:own_leads'
      ]
    },
    roleHierarchy: {
      [UserRole.ADMIN]: [UserRole.MANAGER, UserRole.SALES_REP],
      [UserRole.MANAGER]: [UserRole.SALES_REP],
      [UserRole.SALES_REP]: []
    },
    contextualPermissions: {
      timeBasedAccess: true,
      locationBasedAccess: true,
      deviceBasedAccess: true
    }
  },

  /**
   * Security configuration with enhanced protection measures
   */
  security: {
    auditLogging: true,
    failedLoginThreshold: 10,
    passwordPolicyEnabled: true,
    sessionMonitoring: true,
    ipWhitelisting: false,
    corsOrigins: (process.env.VITE_ALLOWED_ORIGINS || '').split(','),
    securityHeaders: {
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    sanitization: {
      enableInputSanitization: true,
      enableOutputEncoding: true,
      allowedHtmlTags: [],
      allowedAttributes: []
    },
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 900000 // 15 minutes
    }
  }
};

/**
 * Returns the environment-specific authentication configuration
 * with enhanced security features
 */
export const getAuthConfig = () => {
  // Deep clone the config to prevent mutations
  const config = JSON.parse(JSON.stringify(authConfig));

  // Apply environment-specific overrides
  if (process.env.NODE_ENV === 'development') {
    config.security.auditLogging = false;
    config.security.rateLimit.enabled = false;
  }

  // Validate required environment variables
  const requiredEnvVars = [
    'VITE_AUTH0_DOMAIN',
    'VITE_AUTH0_CLIENT_ID',
    'VITE_AUTH0_AUDIENCE'
  ];

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  });

  return config;
};

export default authConfig;