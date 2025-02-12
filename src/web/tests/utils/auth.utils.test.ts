import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  getAuthTokens,
  setAuthTokens,
  clearAuthTokens,
  isTokenExpired,
  hasRequiredRole
} from '../../src/utils/auth.utils';
import { UserRole, AuthTokens } from '../../src/types/auth.types';
import { TOKEN_KEYS } from '../../src/constants/auth.constants';

// Mock jwt-decode
jest.mock('jwt-decode', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('Authentication Utilities', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: { [key: string]: string } = {};
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      })
    };
  })();

  // Mock tokens for testing
  const mockTokens: AuthTokens = {
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: []
  };

  beforeEach(() => {
    // Setup test environment
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
    jest.resetAllMocks();
  });

  describe('getAuthTokens', () => {
    test('should return null when no tokens exist', () => {
      const tokens = getAuthTokens();
      expect(tokens).toBeNull();
      expect(localStorageMock.getItem).toHaveBeenCalledTimes(2);
    });

    test('should return tokens when valid tokens exist', () => {
      localStorageMock.setItem(TOKEN_KEYS.ACCESS_TOKEN, mockTokens.accessToken);
      localStorageMock.setItem(TOKEN_KEYS.REFRESH_TOKEN, mockTokens.refreshToken);

      const tokens = getAuthTokens();
      expect(tokens).toEqual(expect.objectContaining({
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken
      }));
    });

    test('should return null when tokens are partially missing', () => {
      localStorageMock.setItem(TOKEN_KEYS.ACCESS_TOKEN, mockTokens.accessToken);

      const tokens = getAuthTokens();
      expect(tokens).toBeNull();
    });

    test('should handle corrupted token data', () => {
      localStorageMock.setItem(TOKEN_KEYS.ACCESS_TOKEN, 'invalid-token');
      localStorageMock.setItem(TOKEN_KEYS.REFRESH_TOKEN, 'invalid-token');

      const tokens = getAuthTokens();
      expect(tokens).toBeNull();
    });
  });

  describe('setAuthTokens', () => {
    test('should store tokens correctly', () => {
      setAuthTokens(mockTokens);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        TOKEN_KEYS.ACCESS_TOKEN,
        mockTokens.accessToken
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        TOKEN_KEYS.REFRESH_TOKEN,
        mockTokens.refreshToken
      );
    });

    test('should throw error for invalid token format', () => {
      const invalidTokens = { ...mockTokens, accessToken: '' };
      expect(() => setAuthTokens(invalidTokens)).toThrow('Invalid token format');
    });

    test('should handle storage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => setAuthTokens(mockTokens)).toThrow();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(TOKEN_KEYS.ACCESS_TOKEN);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(TOKEN_KEYS.REFRESH_TOKEN);
    });
  });

  describe('clearAuthTokens', () => {
    test('should remove all auth tokens', () => {
      setAuthTokens(mockTokens);
      clearAuthTokens();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(TOKEN_KEYS.ACCESS_TOKEN);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(TOKEN_KEYS.REFRESH_TOKEN);
    });

    test('should handle missing tokens gracefully', () => {
      clearAuthTokens();
      expect(() => clearAuthTokens()).not.toThrow();
    });

    test('should handle storage errors during cleanup', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => clearAuthTokens()).not.toThrow();
    });
  });

  describe('isTokenExpired', () => {
    const mockJwtDecode = require('jwt-decode').default;

    test('should identify expired tokens', () => {
      const expiredToken = 'expired.token.jwt';
      mockJwtDecode.mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) - 3600 });

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    test('should validate active tokens', () => {
      const validToken = 'valid.token.jwt';
      mockJwtDecode.mockReturnValueOnce({ exp: Math.floor(Date.now() / 1000) + 3600 });

      expect(isTokenExpired(validToken)).toBe(false);
    });

    test('should handle malformed tokens', () => {
      expect(isTokenExpired('malformed-token')).toBe(true);
    });

    test('should handle tokens near expiration with grace period', () => {
      const nearExpiryToken = 'near.expiry.token';
      const currentTime = Math.floor(Date.now() / 1000);
      mockJwtDecode.mockReturnValueOnce({ exp: currentTime + 200 }); // Within 5-min grace period

      expect(isTokenExpired(nearExpiryToken)).toBe(true);
    });
  });

  describe('hasRequiredRole', () => {
    test('should grant access for exact role match', () => {
      expect(hasRequiredRole(UserRole.MANAGER, UserRole.MANAGER)).toBe(true);
    });

    test('should grant access for admin to all roles', () => {
      expect(hasRequiredRole(UserRole.SALES_REP, UserRole.ADMIN)).toBe(true);
      expect(hasRequiredRole(UserRole.MANAGER, UserRole.ADMIN)).toBe(true);
    });

    test('should grant access for manager to sales rep roles', () => {
      expect(hasRequiredRole(UserRole.SALES_REP, UserRole.MANAGER)).toBe(true);
    });

    test('should deny access for insufficient role level', () => {
      expect(hasRequiredRole(UserRole.ADMIN, UserRole.SALES_REP)).toBe(false);
      expect(hasRequiredRole(UserRole.MANAGER, UserRole.SALES_REP)).toBe(false);
    });

    test('should handle invalid role combinations', () => {
      expect(hasRequiredRole(UserRole.ADMIN, '' as UserRole)).toBe(false);
      expect(hasRequiredRole('' as UserRole, UserRole.ADMIN)).toBe(false);
    });
  });
});