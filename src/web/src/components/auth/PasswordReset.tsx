/**
 * @fileoverview Secure password reset component with comprehensive validation and security measures
 * @version 1.0.0
 * Dependencies:
 * - react: ^18.2.0
 * - react-router-dom: ^6.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import Input from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import { validateLength, validateRequired, isValidEmail } from '../../utils/validation.utils';
import { AUTH_CONFIG } from '../../constants/auth.constants';

interface PasswordResetProps {
  token?: string;
  isTokenValid?: boolean;
  tokenExpiry?: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface PasswordResetState {
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  error: string;
  success: string;
  step: 'email' | 'reset';
  passwordValidation: ValidationResult;
  isTokenExpired: boolean;
  attemptCount: number;
}

export const PasswordReset: React.FC<PasswordResetProps> = ({
  token,
  isTokenValid = false,
  tokenExpiry,
}) => {
  const navigate = useNavigate();
  const { resetPassword, validateToken } = useAuth();
  const [state, setState] = useState<PasswordResetState>({
    email: '',
    password: '',
    confirmPassword: '',
    isLoading: false,
    error: '',
    success: '',
    step: token ? 'reset' : 'email',
    passwordValidation: { isValid: false, errors: [] },
    isTokenExpired: false,
    attemptCount: 0,
  });

  // Validate token on component mount
  useEffect(() => {
    const validateResetToken = async () => {
      if (token) {
        try {
          const isValid = await validateToken(token);
          setState(prev => ({
            ...prev,
            isTokenExpired: !isValid,
            error: !isValid ? 'Password reset link has expired. Please request a new one.' : '',
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            isTokenExpired: true,
            error: 'Invalid password reset link. Please request a new one.',
          }));
        }
      }
    };

    validateResetToken();
  }, [token, validateToken]);

  // Validate password against security requirements
  const validatePassword = useCallback((password: string): ValidationResult => {
    const errors: string[] = [];

    // Length validation
    const lengthError = validateLength(
      password,
      AUTH_CONFIG.PASSWORD_MIN_LENGTH,
      AUTH_CONFIG.PASSWORD_MIN_LENGTH * 2,
      'Password'
    );
    if (lengthError) errors.push(lengthError);

    // Complexity requirements
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  // Handle email submission for password reset request
  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate attempt count for rate limiting
    if (state.attemptCount >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
      setState(prev => ({
        ...prev,
        error: `Too many attempts. Please try again after ${AUTH_CONFIG.LOCKOUT_DURATION / 60} minutes.`,
      }));
      return;
    }

    // Email validation
    const emailError = validateRequired(state.email, 'Email');
    if (emailError || !isValidEmail(state.email)) {
      setState(prev => ({
        ...prev,
        error: emailError || 'Please enter a valid email address',
        attemptCount: prev.attemptCount + 1,
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: '' }));
      await resetPassword(state.email);
      setState(prev => ({
        ...prev,
        isLoading: false,
        success: 'Password reset instructions have been sent to your email.',
        attemptCount: 0,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to send reset instructions. Please try again.',
        attemptCount: prev.attemptCount + 1,
      }));
    }
  }, [state.email, state.attemptCount, resetPassword]);

  // Handle password reset submission
  const handlePasswordReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Token validation
    if (!token || state.isTokenExpired) {
      setState(prev => ({
        ...prev,
        error: 'Invalid or expired reset link. Please request a new one.',
      }));
      return;
    }

    // Password validation
    const validation = validatePassword(state.password);
    if (!validation.isValid) {
      setState(prev => ({
        ...prev,
        passwordValidation: validation,
        error: validation.errors[0],
      }));
      return;
    }

    // Password confirmation validation
    if (state.password !== state.confirmPassword) {
      setState(prev => ({
        ...prev,
        error: 'Passwords do not match',
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: '' }));
      await resetPassword(state.email, token, state.password);
      setState(prev => ({
        ...prev,
        isLoading: false,
        success: 'Password has been successfully reset.',
      }));
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to reset password. Please try again.',
      }));
    }
  }, [token, state.password, state.confirmPassword, state.isTokenExpired, state.email, resetPassword, navigate]);

  return (
    <div className="password-reset">
      {state.step === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="password-reset__form">
          <h2>Reset Password</h2>
          <Input
            type="email"
            label="Email"
            value={state.email}
            onChange={(value) => setState(prev => ({ ...prev, email: value }))}
            error={state.error}
            required
            disabled={state.isLoading}
            testId="password-reset-email-input"
          />
          <Button
            type="submit"
            isLoading={state.isLoading}
            disabled={state.isLoading || state.attemptCount >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS}
            testId="password-reset-submit-button"
          >
            Send Reset Instructions
          </Button>
          {state.success && (
            <div className="password-reset__success" role="alert">
              {state.success}
            </div>
          )}
        </form>
      ) : (
        <form onSubmit={handlePasswordReset} className="password-reset__form">
          <h2>Set New Password</h2>
          <Input
            type="password"
            label="New Password"
            value={state.password}
            onChange={(value) => {
              const validation = validatePassword(value);
              setState(prev => ({
                ...prev,
                password: value,
                passwordValidation: validation,
                error: validation.errors[0] || '',
              }));
            }}
            error={state.error}
            required
            disabled={state.isLoading || state.isTokenExpired}
            testId="password-reset-new-password-input"
          />
          <Input
            type="password"
            label="Confirm Password"
            value={state.confirmPassword}
            onChange={(value) => setState(prev => ({ ...prev, confirmPassword: value }))}
            error={state.password !== state.confirmPassword ? 'Passwords do not match' : ''}
            required
            disabled={state.isLoading || state.isTokenExpired}
            testId="password-reset-confirm-password-input"
          />
          <Button
            type="submit"
            isLoading={state.isLoading}
            disabled={state.isLoading || state.isTokenExpired || !state.passwordValidation.isValid}
            testId="password-reset-submit-button"
          >
            Reset Password
          </Button>
          {state.success && (
            <div className="password-reset__success" role="alert">
              {state.success}
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default PasswordReset;