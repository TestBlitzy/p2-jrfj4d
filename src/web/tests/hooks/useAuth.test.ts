import { renderHook, act } from '@testing-library/react-hooks';
import { jest } from '@jest/globals';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

import { useAuth } from '../../src/hooks/useAuth';
import AuthService from '../../src/services/auth.service';
import { authConfig } from '../../src/config/auth.config';
import { AUTH_CONFIG } from '../../src/constants/auth.constants';
import { LoginCredentials, UserRole, AuthTokens } from '../../src/types/auth.types';

// Mock Redux
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    deviceRiskScore: 0,
    sessionStatus: {
      isValid: false,
      lastActivity: new Date(),
      expiresAt: new Date()
    },
    tempToken: 'mock-temp-token'
  })
}));

// Mock AuthService
jest.mock('../../src/services/auth.service', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  setupMFA: jest.fn(),
  verifyMFA: jest.fn(),
  refreshToken: jest.fn(),
  checkDeviceRisk: jest.fn(),
  logSecurityEvent: jest.fn(),
  getCurrentUser: jest.fn(),
  encryptToken: jest.fn()
}));

// Mock FingerprintJS
jest.mock('@fingerprintjs/fingerprintjs', () => ({
  load: jest.fn().mockResolvedValue({
    get: jest.fn().mockResolvedValue({ visitorId: 'mock-device-fingerprint' })
  })
}));

describe('useAuth Hook', () => {
  const mockCredentials: LoginCredentials = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    validation: {
      attempts: 0,
      lastAttempt: new Date(),
      ipAddress: 'localhost',
      userAgent: 'test-agent'
    }
  };

  const mockTokens: AuthTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: ['profile', 'email']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Login Flow', () => {
    test('should handle successful login with device fingerprinting', async () => {
      // Setup mocks
      (AuthService.checkDeviceRisk as jest.Mock).mockResolvedValue(20);
      (AuthService.login as jest.Mock).mockResolvedValue(mockTokens);
      (AuthService.encryptToken as jest.Mock).mockResolvedValue('encrypted-tokens');

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      expect(AuthService.checkDeviceRisk).toHaveBeenCalledWith({
        deviceFingerprint: 'mock-device-fingerprint',
        ipAddress: expect.any(String),
        userAgent: expect.any(String)
      });
      expect(AuthService.login).toHaveBeenCalledWith(expect.objectContaining({
        email: mockCredentials.email,
        deviceFingerprint: 'mock-device-fingerprint'
      }));
    });

    test('should trigger MFA when risk score exceeds threshold', async () => {
      (AuthService.checkDeviceRisk as jest.Mock).mockResolvedValue(90);
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      expect(AuthService.logSecurityEvent).toHaveBeenCalledWith(
        'login_failure',
        expect.any(Object)
      );
    });
  });

  describe('MFA Verification', () => {
    test('should handle successful MFA setup', async () => {
      const mockMfaSetup = {
        qrCode: 'mock-qr-code',
        secret: 'mock-secret'
      };
      (AuthService.setupMFA as jest.Mock).mockResolvedValue(mockMfaSetup);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.setupMFA();
        expect(response).toEqual(mockMfaSetup);
      });

      expect(AuthService.setupMFA).toHaveBeenCalled();
    });

    test('should verify MFA token and establish session', async () => {
      (AuthService.verifyMFA as jest.Mock).mockResolvedValue(mockTokens);
      (AuthService.encryptToken as jest.Mock).mockResolvedValue('encrypted-tokens');

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.verifyMFA('123456');
      });

      expect(AuthService.verifyMFA).toHaveBeenCalledWith('123456', 'mock-temp-token');
    });
  });

  describe('Session Management', () => {
    test('should handle session refresh', async () => {
      (AuthService.refreshToken as jest.Mock).mockResolvedValue(mockTokens);
      (AuthService.encryptToken as jest.Mock).mockResolvedValue('encrypted-tokens');

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(AuthService.refreshToken).toHaveBeenCalled();
    });

    test('should monitor session expiry', () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useAuth());

      act(() => {
        jest.advanceTimersByTime(AUTH_CONFIG.SESSION_INACTIVITY_TIMEOUT * 1000 + 1000);
      });

      expect(AuthService.logSecurityEvent).toHaveBeenCalledWith(
        'session_expired',
        expect.any(Object)
      );

      jest.useRealTimers();
    });
  });

  describe('Device Trust', () => {
    test('should handle device verification', async () => {
      const mockDeviceInfo = {
        deviceFingerprint: 'mock-device-fingerprint',
        riskScore: 30,
        lastVerified: new Date()
      };

      (AuthService.checkDeviceRisk as jest.Mock).mockResolvedValue(mockDeviceInfo.riskScore);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      expect(AuthService.checkDeviceRisk).toHaveBeenCalledWith(expect.objectContaining({
        deviceFingerprint: mockDeviceInfo.deviceFingerprint
      }));
    });

    test('should enforce adaptive MFA based on device trust', async () => {
      (AuthService.checkDeviceRisk as jest.Mock).mockResolvedValue(75);
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      expect(AuthService.logSecurityEvent).toHaveBeenCalledWith(
        'adaptive_mfa_required',
        expect.any(Object)
      );
    });
  });

  describe('Security Audit', () => {
    test('should log security events', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login(mockCredentials);
      });

      expect(AuthService.logSecurityEvent).toHaveBeenCalledWith(
        'login_attempt',
        expect.objectContaining({
          email: mockCredentials.email,
          deviceFingerprint: expect.any(String)
        })
      );
    });

    test('should track failed authentication attempts', async () => {
      (AuthService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login(mockCredentials);
        } catch (error) {
          expect(AuthService.logSecurityEvent).toHaveBeenCalledWith(
            'login_failure',
            expect.objectContaining({
              reason: 'Invalid credentials',
              attempts: expect.any(Number)
            })
          );
        }
      });
    });
  });

  describe('Logout Flow', () => {
    test('should handle secure logout', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(AuthService.logout).toHaveBeenCalled();
      expect(AuthService.logSecurityEvent).toHaveBeenCalledWith('logout_success');
    });

    test('should clean up session data on logout', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('sip_access_token')).toBeNull();
      expect(localStorage.getItem('sip_refresh_token')).toBeNull();
    });
  });
});