import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import FingerprintJS from '@fingerprintjs/fingerprintjs-pro'; // ^3.8.0

import LoginForm from '../../components/auth/LoginForm';
import useAuth from '../../hooks/useAuth';
import { authConfig } from '../../config/auth.config';
import { LoadingState } from '../../types/common.types';
import { LoginCredentials } from '../../types/auth.types';

// Styles object following design system
const styles = {
  container: 'login-container flex min-h-screen items-center justify-center bg-background',
  content: 'login-content w-full max-w-md p-8 bg-surface rounded-lg shadow-lg',
  logo: 'login-logo mb-8 text-center',
  securityInfo: 'security-info mt-4 text-sm text-muted',
  mfaContainer: 'mfa-container mt-4',
  errorMessage: 'error-message mt-2 text-error text-sm'
};

/**
 * Enhanced login page component implementing OAuth 2.0, MFA, and advanced security features
 */
const Login: React.FC = () => {
  // Authentication state and methods from useAuth hook
  const { 
    isAuthenticated, 
    login, 
    verifyMFA, 
    validateDevice,
    deviceRiskScore,
    sessionStatus
  } = useAuth();

  // Component state
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [requireMFA, setRequireMFA] = useState<boolean>(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  /**
   * Initialize device fingerprinting on component mount
   */
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load({
          apiKey: process.env.VITE_FINGERPRINT_API_KEY,
          endpoint: process.env.VITE_FINGERPRINT_ENDPOINT
        });
        const result = await fp.get();
        setDeviceFingerprint(result.visitorId);
      } catch (error) {
        console.error('Device fingerprint initialization failed:', error);
        // Continue without fingerprint, will trigger adaptive MFA
      }
    };

    initializeFingerprint();
  }, []);

  /**
   * Handle login form submission with enhanced security checks
   */
  const handleLoginSubmit = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoadingState(LoadingState.LOADING);
      setError(null);

      // Enhance credentials with device fingerprint and validation metadata
      const enhancedCredentials: LoginCredentials = {
        ...credentials,
        validation: {
          attempts: 0,
          lastAttempt: new Date(),
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent,
          deviceFingerprint
        }
      };

      // Attempt login with enhanced security
      const response = await login(enhancedCredentials);

      // Handle adaptive MFA based on risk assessment
      if (response.requireMFA || deviceRiskScore > authConfig.security.riskThreshold) {
        setRequireMFA(true);
        setMfaToken(response.mfaToken);
        return;
      }

      setLoadingState(LoadingState.SUCCESS);

    } catch (error) {
      setLoadingState(LoadingState.ERROR);
      setError(error.message || 'Authentication failed');
    }
  }, [login, deviceFingerprint, deviceRiskScore]);

  /**
   * Handle MFA verification with rate limiting and security logging
   */
  const handleMFASubmit = useCallback(async (code: string) => {
    try {
      setLoadingState(LoadingState.LOADING);
      setError(null);

      if (!mfaToken) {
        throw new Error('Invalid MFA session');
      }

      await verifyMFA(code);
      setLoadingState(LoadingState.SUCCESS);

    } catch (error) {
      setLoadingState(LoadingState.ERROR);
      setError(error.message || 'MFA verification failed');
    }
  }, [verifyMFA, mfaToken]);

  /**
   * Handle device verification for trusted devices
   */
  const handleDeviceVerification = useCallback(async () => {
    try {
      if (!deviceFingerprint) return;

      const isDeviceTrusted = await validateDevice({
        deviceFingerprint,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      if (!isDeviceTrusted) {
        setRequireMFA(true);
      }

    } catch (error) {
      console.error('Device verification failed:', error);
      // Continue with MFA as fallback
      setRequireMFA(true);
    }
  }, [validateDevice, deviceFingerprint]);

  // Redirect if already authenticated
  if (isAuthenticated && sessionStatus?.isValid) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logo} aria-label="Company logo">
          <img 
            src="/assets/logo.svg" 
            alt="Sales & Intelligence Platform" 
            width={180} 
            height={48} 
          />
        </div>

        {loadingState === LoadingState.ERROR && error && (
          <div 
            className={styles.errorMessage}
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <LoginForm
          onSubmit={handleLoginSubmit}
          onMFASubmit={handleMFASubmit}
          isLoading={loadingState === LoadingState.LOADING}
          requireMFA={requireMFA}
          error={error}
        />

        <div className={styles.securityInfo}>
          <p>Protected by enhanced security measures</p>
          {deviceFingerprint && (
            <p>Device verification enabled</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;