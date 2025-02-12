import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs'; // ^3.4.0

import AuthService from '../services/auth.service';
import { LoginCredentials, User, AuthError, AuthTokens } from '../types/auth.types';
import { authConfig } from '../config/auth.config';
import { AUTH_CONFIG } from '../constants/auth.constants';

// Types for hook return value
interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  deviceRiskScore: number;
  sessionStatus: {
    isValid: boolean;
    lastActivity: Date;
    expiresAt: Date;
  };
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  setupMFA: () => Promise<{ qrCode: string; secret: string }>;
  verifyMFA: (code: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Custom hook for managing authentication state and operations with enhanced security features
 * Implements OAuth 2.0, JWT session management, MFA, and device fingerprinting
 */
export const useAuth = (): UseAuthReturn => {
  const dispatch = useDispatch();
  const authState = useSelector((state: any) => state.auth);

  // Initialize device fingerprinting
  const fpPromise = FingerprintJS.load();
  
  /**
   * Handle secure user login with adaptive MFA and device verification
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'auth/loginStart' });

      // Generate device fingerprint
      const fp = await fpPromise;
      const result = await fp.get();
      const deviceFingerprint = result.visitorId;

      // Perform device risk assessment
      const riskScore = await AuthService.checkDeviceRisk({
        deviceFingerprint,
        ipAddress: window.location.hostname,
        userAgent: navigator.userAgent
      });

      // Enhanced credentials with security metadata
      const enhancedCredentials: LoginCredentials = {
        ...credentials,
        deviceFingerprint,
        validation: {
          attempts: 0,
          lastAttempt: new Date(),
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent
        }
      };

      // Attempt login with enhanced security
      const tokens = await AuthService.login(enhancedCredentials);

      // Handle adaptive MFA based on risk score
      if (riskScore > authConfig.security.riskThreshold || authConfig.mfa.enabled) {
        dispatch({ type: 'auth/mfaRequired' });
        return;
      }

      // Setup secure session
      await setupSecureSession(tokens);

      dispatch({ type: 'auth/loginSuccess', payload: { user: AuthService.getCurrentUser() } });
      
    } catch (error) {
      dispatch({ type: 'auth/loginFailure', payload: error });
      AuthService.logSecurityEvent('login_failure', { error });
    }
  }, [dispatch]);

  /**
   * Handle secure logout with session cleanup
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      dispatch({ type: 'auth/logoutStart' });
      await AuthService.logout();
      dispatch({ type: 'auth/logoutSuccess' });
    } catch (error) {
      dispatch({ type: 'auth/logoutFailure', payload: error });
      AuthService.logSecurityEvent('logout_failure', { error });
    }
  }, [dispatch]);

  /**
   * Setup MFA with TOTP
   */
  const setupMFA = useCallback(async () => {
    try {
      dispatch({ type: 'auth/mfaSetupStart' });
      const mfaSetup = await AuthService.setupMFA();
      dispatch({ type: 'auth/mfaSetupSuccess' });
      return mfaSetup;
    } catch (error) {
      dispatch({ type: 'auth/mfaSetupFailure', payload: error });
      throw error;
    }
  }, [dispatch]);

  /**
   * Verify MFA token
   */
  const verifyMFA = useCallback(async (code: string): Promise<void> => {
    try {
      dispatch({ type: 'auth/mfaVerifyStart' });
      const tokens = await AuthService.verifyMFA(code, authState.tempToken);
      await setupSecureSession(tokens);
      dispatch({ type: 'auth/mfaVerifySuccess', payload: { user: AuthService.getCurrentUser() } });
    } catch (error) {
      dispatch({ type: 'auth/mfaVerifyFailure', payload: error });
      throw error;
    }
  }, [dispatch, authState.tempToken]);

  /**
   * Setup secure session with token encryption and monitoring
   */
  const setupSecureSession = async (tokens: AuthTokens): Promise<void> => {
    // Encrypt tokens before storage
    const encryptedTokens = await AuthService.encryptToken(tokens);
    
    // Setup session monitoring
    const expiresAt = new Date(Date.now() + AUTH_CONFIG.SESSION_INACTIVITY_TIMEOUT * 1000);
    
    dispatch({
      type: 'auth/sessionSetup',
      payload: {
        tokens: encryptedTokens,
        sessionStatus: {
          isValid: true,
          lastActivity: new Date(),
          expiresAt
        }
      }
    });
  };

  /**
   * Refresh session and tokens
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const tokens = await AuthService.refreshToken();
      await setupSecureSession(tokens);
    } catch (error) {
      dispatch({ type: 'auth/sessionExpired' });
      await logout();
    }
  }, [dispatch, logout]);

  // Setup token refresh interval and session monitoring
  useEffect(() => {
    if (authState.isAuthenticated) {
      // Refresh tokens before expiry
      const refreshInterval = setInterval(() => {
        refreshSession();
      }, (AUTH_CONFIG.TOKEN_EXPIRY - 300) * 1000); // 5 minutes before expiry

      // Monitor session activity
      const activityInterval = setInterval(() => {
        if (Date.now() > authState.sessionStatus?.expiresAt) {
          logout();
        }
      }, 60000); // Check every minute

      return () => {
        clearInterval(refreshInterval);
        clearInterval(activityInterval);
      };
    }
  }, [authState.isAuthenticated, refreshSession, logout]);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.loading,
    error: authState.error,
    deviceRiskScore: authState.deviceRiskScore,
    sessionStatus: authState.sessionStatus,
    login,
    logout,
    setupMFA,
    verifyMFA,
    refreshSession
  };
};

export default useAuth;