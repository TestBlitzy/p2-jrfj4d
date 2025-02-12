import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { useAuth } from '../../hooks/useAuth';
import { LoginCredentials } from '../../types/auth.types';
import { loginSchema } from '../../validators/auth.validator';
import Button from '../common/Button';
import Input from '../common/Input';

interface LoginFormState {
  isLoading: boolean;
  error: string | null;
  requireMFA: boolean;
  deviceFingerprint: string | null;
}

/**
 * Secure login form component implementing OAuth 2.0, MFA, and enhanced security features
 */
const LoginForm: React.FC = () => {
  // Form state management with enhanced security validation
  const { register, handleSubmit: handleFormSubmit, formState: { errors }, setError } = useForm<LoginCredentials>({
    resolver: yupResolver(loginSchema),
    mode: 'onBlur'
  });

  // Component state
  const [formState, setFormState] = useState<LoginFormState>({
    isLoading: false,
    error: null,
    requireMFA: false,
    deviceFingerprint: null
  });

  // Auth hook with security features
  const { login, isAuthenticated, getDeviceFingerprint, logSecurityEvent } = useAuth();

  // Initialize device fingerprinting on mount
  useEffect(() => {
    const initializeFingerprint = async () => {
      try {
        const fingerprint = await getDeviceFingerprint();
        setFormState(prev => ({ ...prev, deviceFingerprint: fingerprint }));
      } catch (error) {
        logSecurityEvent('fingerprint_failed', { error });
      }
    };

    initializeFingerprint();
  }, [getDeviceFingerprint, logSecurityEvent]);

  /**
   * Handles secure form submission with enhanced validation and security logging
   */
  const handleSubmit = useCallback(async (data: LoginCredentials) => {
    setFormState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Enhance credentials with security metadata
      const enhancedCredentials: LoginCredentials = {
        ...data,
        deviceFingerprint: formState.deviceFingerprint || undefined,
        validation: {
          attempts: 0,
          lastAttempt: new Date(),
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent
        }
      };

      await login(enhancedCredentials);

      // Log successful authentication attempt
      logSecurityEvent('login_attempt_success', {
        email: data.email,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // Handle different error scenarios securely
      const errorMessage = error.message || 'Authentication failed';
      
      setFormState(prev => ({ 
        ...prev, 
        error: errorMessage,
        requireMFA: error.code === 'MFA_REQUIRED'
      }));

      setError('root', { 
        type: 'manual',
        message: errorMessage
      });

      // Log failed authentication attempt
      logSecurityEvent('login_attempt_failure', {
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    } finally {
      setFormState(prev => ({ ...prev, isLoading: false }));
    }
  }, [login, logSecurityEvent, formState.deviceFingerprint, setError]);

  /**
   * Handles OAuth authentication flow with security measures
   */
  const handleOAuthLogin = useCallback(async (provider: string) => {
    try {
      setFormState(prev => ({ ...prev, isLoading: true, error: null }));

      // Log OAuth initiation
      logSecurityEvent('oauth_login_initiated', {
        provider,
        timestamp: new Date().toISOString()
      });

      // Redirect to OAuth provider
      window.location.href = `/api/auth/${provider}`;

    } catch (error) {
      setFormState(prev => ({ 
        ...prev, 
        error: 'OAuth authentication failed'
      }));

      logSecurityEvent('oauth_login_failed', {
        provider,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }, [logSecurityEvent]);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <form 
      onSubmit={handleFormSubmit(handleSubmit)}
      className="login-form"
      aria-label="Login form"
      noValidate
    >
      {formState.error && (
        <div 
          className="login-form__error" 
          role="alert"
          aria-live="polite"
        >
          {formState.error}
        </div>
      )}

      <Input
        type="email"
        label="Email"
        error={errors.email?.message}
        required
        {...register('email')}
        aria-label="Email address"
      />

      <Input
        type="password"
        label="Password"
        error={errors.password?.message}
        required
        {...register('password')}
        aria-label="Password"
      />

      {formState.requireMFA && (
        <Input
          type="text"
          label="MFA Code"
          error={errors.mfaCode?.message}
          required
          {...register('mfaCode')}
          aria-label="MFA verification code"
          maxLength={6}
          pattern="[0-9]*"
        />
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        isLoading={formState.isLoading}
        disabled={formState.isLoading}
        aria-label="Sign in"
      >
        Sign In
      </Button>

      <div className="login-form__oauth">
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleOAuthLogin('google')}
          disabled={formState.isLoading}
          aria-label="Sign in with Google"
        >
          Sign in with Google
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => handleOAuthLogin('microsoft')}
          disabled={formState.isLoading}
          aria-label="Sign in with Microsoft"
        >
          Sign in with Microsoft
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;