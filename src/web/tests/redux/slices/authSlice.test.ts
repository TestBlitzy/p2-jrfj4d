import { configureStore } from '@reduxjs/toolkit';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { reducer as authReducer, actions, login, logout, refreshToken, validateSession } from '../../../src/redux/slices/authSlice';
import AuthService from '../../../src/services/auth.service';
import type { AuthState, AuthTokens, User, LoginCredentials } from '../../../src/types/auth.types';

// Mock AuthService
jest.mock('../../../src/services/auth.service');

// Test data setup
const mockTokens: AuthTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
  tokenType: 'Bearer',
  scope: ['openid', 'profile']
};

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'SALES_REP',
  mfaEnabled: true,
  lastLogin: new Date(),
  firstName: 'Test',
  lastName: 'User',
  preferences: {
    theme: 'light',
    notifications: true,
    language: 'en',
    timezone: 'UTC'
  },
  sessionMetadata: {
    deviceId: 'device-123',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    lastActive: new Date(),
    expiresAt: new Date(Date.now() + 3600000)
  }
};

const mockDeviceFingerprint = 'mock-device-fingerprint';

describe('Auth Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer
      }
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      const state = store.getState().auth;
      expect(state).toEqual({
        isAuthenticated: false,
        user: null,
        tokens: null,
        loading: false,
        error: null,
        operationStates: {
          loginInProgress: false,
          mfaVerificationInProgress: false,
          tokenRefreshInProgress: false,
          logoutInProgress: false
        },
        lastActivity: expect.any(Number),
        deviceFingerprint: expect.any(String)
      });
    });
  });

  describe('Login Flow', () => {
    const mockCredentials: LoginCredentials = {
      email: 'test@example.com',
      password: 'Test123!@#',
      validation: {
        attempts: 0,
        lastAttempt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      }
    };

    test('should handle successful login without MFA', async () => {
      (AuthService.login as jest.Mock).mockResolvedValueOnce(mockTokens);
      (AuthService.getCurrentUser as jest.Mock).mockReturnValueOnce(mockUser);

      await store.dispatch(login(mockCredentials));
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.tokens).toEqual(mockTokens);
      expect(state.error).toBeNull();
      expect(state.operationStates.loginInProgress).toBe(false);
    });

    test('should handle login with MFA requirement', async () => {
      const mfaError = new Error('MFA verification required');
      (AuthService.login as jest.Mock).mockRejectedValueOnce(mfaError);

      await store.dispatch(login(mockCredentials));
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeTruthy();
      expect(state.operationStates.mfaVerificationInProgress).toBe(false);
    });

    test('should handle login failure', async () => {
      const error = { code: 'AUTH_ERROR', message: 'Invalid credentials' };
      (AuthService.login as jest.Mock).mockRejectedValueOnce(error);

      await store.dispatch(login(mockCredentials));
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toEqual(error);
      expect(state.operationStates.loginInProgress).toBe(false);
    });
  });

  describe('Token Management', () => {
    test('should handle successful token refresh', async () => {
      const newTokens = { ...mockTokens, accessToken: 'new-access-token' };
      (AuthService.refreshToken as jest.Mock).mockResolvedValueOnce(newTokens);

      await store.dispatch(refreshToken());
      const state = store.getState().auth;

      expect(state.tokens).toEqual(newTokens);
      expect(state.lastActivity).toBeTruthy();
      expect(state.operationStates.tokenRefreshInProgress).toBe(false);
    });

    test('should handle token refresh failure', async () => {
      const error = { code: 'REFRESH_ERROR', message: 'Invalid refresh token' };
      (AuthService.refreshToken as jest.Mock).mockRejectedValueOnce(error);

      await store.dispatch(refreshToken());
      const state = store.getState().auth;

      expect(state.error).toEqual(error);
      expect(state.operationStates.tokenRefreshInProgress).toBe(false);
    });
  });

  describe('Session Management', () => {
    test('should validate active session', async () => {
      (AuthService.validateSession as jest.Mock).mockResolvedValueOnce(true);

      await store.dispatch(validateSession());
      const state = store.getState().auth;

      expect(state.lastActivity).toBeTruthy();
    });

    test('should handle session timeout', async () => {
      store = configureStore({
        reducer: {
          auth: authReducer
        },
        preloadedState: {
          auth: {
            ...store.getState().auth,
            lastActivity: Date.now() - 1900000 // 31 minutes ago
          }
        }
      });

      await store.dispatch(validateSession());
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
    });
  });

  describe('Logout Flow', () => {
    test('should handle successful logout', async () => {
      (AuthService.logout as jest.Mock).mockResolvedValueOnce(undefined);

      store = configureStore({
        reducer: {
          auth: authReducer
        },
        preloadedState: {
          auth: {
            ...store.getState().auth,
            isAuthenticated: true,
            user: mockUser,
            tokens: mockTokens
          }
        }
      });

      await store.dispatch(logout());
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.deviceFingerprint).toBeTruthy();
    });

    test('should handle logout failure', async () => {
      const error = { code: 'LOGOUT_ERROR', message: 'Logout failed' };
      (AuthService.logout as jest.Mock).mockRejectedValueOnce(error);

      await store.dispatch(logout());
      const state = store.getState().auth;

      expect(state.error).toEqual(error);
      expect(state.operationStates.logoutInProgress).toBe(false);
    });
  });

  describe('Security Operations', () => {
    test('should update last activity timestamp', () => {
      const previousTimestamp = store.getState().auth.lastActivity;
      store.dispatch(actions.updateLastActivity());
      const newTimestamp = store.getState().auth.lastActivity;

      expect(newTimestamp).toBeGreaterThan(previousTimestamp);
    });

    test('should update device fingerprint', () => {
      const previousFingerprint = store.getState().auth.deviceFingerprint;
      store.dispatch(actions.updateDeviceFingerprint());
      const newFingerprint = store.getState().auth.deviceFingerprint;

      expect(newFingerprint).not.toEqual(previousFingerprint);
      expect(newFingerprint).toBeTruthy();
    });

    test('should reset error state', () => {
      store = configureStore({
        reducer: {
          auth: authReducer
        },
        preloadedState: {
          auth: {
            ...store.getState().auth,
            error: { code: 'TEST_ERROR', message: 'Test error' }
          }
        }
      });

      store.dispatch(actions.resetError());
      const state = store.getState().auth;

      expect(state.error).toBeNull();
    });
  });
});