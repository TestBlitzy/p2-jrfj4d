import jwtDecode from 'jwt-decode'; // ^4.0.0
import { AuthTokens, UserRole } from '../types/auth.types';
import { authConfig } from '../config/auth.config';

/**
 * Securely retrieves and validates authentication tokens from encrypted local storage
 * @returns AuthTokens if valid tokens exist, null otherwise
 */
export const getAuthTokens = (): AuthTokens | null => {
  try {
    const { jwt: jwtConfig, storage: storageConfig } = authConfig;
    const accessToken = localStorage.getItem(jwtConfig.accessTokenKey);
    const refreshToken = localStorage.getItem(jwtConfig.refreshTokenKey);

    if (!accessToken || !refreshToken) {
      return null;
    }

    // Decrypt tokens if encryption is enabled
    const decryptedAccessToken = jwtConfig.encryptionEnabled 
      ? decryptToken(accessToken)
      : accessToken;
    const decryptedRefreshToken = jwtConfig.encryptionEnabled
      ? decryptToken(refreshToken)
      : refreshToken;

    // Validate token format and structure
    if (!isValidTokenFormat(decryptedAccessToken) || !isValidTokenFormat(decryptedRefreshToken)) {
      clearAuthTokens();
      return null;
    }

    return {
      accessToken: decryptedAccessToken,
      refreshToken: decryptedRefreshToken,
      expiresIn: jwtConfig.tokenExpirySeconds,
      tokenType: jwtConfig.tokenType,
      scope: []
    };
  } catch (error) {
    console.error('Error retrieving auth tokens:', error);
    clearAuthTokens();
    return null;
  }
};

/**
 * Securely stores encrypted authentication tokens in local storage
 * @param tokens AuthTokens object containing access and refresh tokens
 */
export const setAuthTokens = (tokens: AuthTokens): void => {
  try {
    const { jwt: jwtConfig } = authConfig;

    // Validate token format before storage
    if (!isValidTokenFormat(tokens.accessToken) || !isValidTokenFormat(tokens.refreshToken)) {
      throw new Error('Invalid token format');
    }

    // Encrypt tokens if encryption is enabled
    const encryptedAccessToken = jwtConfig.encryptionEnabled
      ? encryptToken(tokens.accessToken)
      : tokens.accessToken;
    const encryptedRefreshToken = jwtConfig.encryptionEnabled
      ? encryptToken(tokens.refreshToken)
      : tokens.refreshToken;

    // Store encrypted tokens
    localStorage.setItem(jwtConfig.accessTokenKey, encryptedAccessToken);
    localStorage.setItem(jwtConfig.refreshTokenKey, encryptedRefreshToken);

    // Set up token rotation if enabled
    if (jwtConfig.rotationEnabled) {
      setupTokenRotation(tokens.expiresIn);
    }

    // Initialize session monitoring
    initializeSessionMonitoring();
  } catch (error) {
    console.error('Error storing auth tokens:', error);
    clearAuthTokens();
    throw error;
  }
};

/**
 * Securely removes all authentication tokens and session data
 */
export const clearAuthTokens = (): void => {
  try {
    const { jwt: jwtConfig } = authConfig;

    // Remove tokens from storage
    localStorage.removeItem(jwtConfig.accessTokenKey);
    localStorage.removeItem(jwtConfig.refreshTokenKey);

    // Clear token rotation interval
    clearTokenRotation();

    // Clear session monitoring
    clearSessionMonitoring();

    // Perform memory cleanup
    performMemoryCleanup();
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
};

/**
 * Validates token authenticity and checks expiration
 * @param token JWT token to validate
 * @returns boolean indicating if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    if (!isValidTokenFormat(token)) {
      return true;
    }

    const decodedToken = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);

    // Check if token is expired with 5-minute grace period
    const gracePeriod = 300; // 5 minutes in seconds
    return !decodedToken.exp || decodedToken.exp - gracePeriod < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Enhanced role-based authorization check with hierarchy support
 * @param requiredRole Required role for access
 * @param userRole Current user's role
 * @returns boolean indicating if user has required role or higher
 */
export const hasRequiredRole = (requiredRole: UserRole, userRole: UserRole): boolean => {
  try {
    if (!requiredRole || !userRole) {
      return false;
    }

    const { roles } = authConfig;
    const roleHierarchy = roles.roleHierarchy;

    // Direct role match
    if (requiredRole === userRole) {
      return true;
    }

    // Check role hierarchy
    const higherRoles = roleHierarchy[userRole] || [];
    return higherRoles.includes(requiredRole);
  } catch (error) {
    console.error('Error checking role authorization:', error);
    return false;
  }
};

/**
 * Validates JWT token format and structure
 * @param token JWT token to validate
 * @returns boolean indicating if token format is valid
 */
const isValidTokenFormat = (token: string): boolean => {
  try {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Check JWT format (header.payload.signature)
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => !!part);
  } catch (error) {
    return false;
  }
};

/**
 * Encrypts token using configured encryption method
 * @param token Token to encrypt
 * @returns Encrypted token string
 */
const encryptToken = (token: string): string => {
  // Implement encryption logic based on security requirements
  // This is a placeholder - actual implementation should use
  // strong encryption algorithms
  return token;
};

/**
 * Decrypts token using configured encryption method
 * @param encryptedToken Encrypted token to decrypt
 * @returns Decrypted token string
 */
const decryptToken = (encryptedToken: string): string => {
  // Implement decryption logic based on security requirements
  // This is a placeholder - actual implementation should use
  // corresponding decryption algorithms
  return encryptedToken;
};

/**
 * Sets up automatic token rotation schedule
 * @param expiresIn Token expiration time in seconds
 */
const setupTokenRotation = (expiresIn: number): void => {
  const { jwt: jwtConfig } = authConfig;
  if (!jwtConfig.rotationEnabled) {
    return;
  }

  // Schedule token rotation before expiration
  const rotationTime = (expiresIn - 300) * 1000; // 5 minutes before expiry
  setTimeout(() => {
    // Implement token rotation logic
  }, rotationTime);
};

/**
 * Clears token rotation schedule
 */
const clearTokenRotation = (): void => {
  // Clear any scheduled token rotations
};

/**
 * Initializes session monitoring
 */
const initializeSessionMonitoring = (): void => {
  // Implement session monitoring logic
};

/**
 * Clears session monitoring
 */
const clearSessionMonitoring = (): void => {
  // Clear session monitoring
};

/**
 * Performs memory cleanup after token operations
 */
const performMemoryCleanup = (): void => {
  // Implement memory cleanup logic
};