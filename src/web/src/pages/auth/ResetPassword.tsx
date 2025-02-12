import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as yup from 'yup';

import AuthService from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';

// Password validation schema with security requirements
const passwordValidationSchema = yup.object().shape({
  password: yup
    .string()
    .required('Password is required')
    .min(12, 'Password must be at least 12 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
      'Password must contain uppercase, lowercase, number, and special character'
    )
    .notOneOf(
      ['Password123!', 'Admin123!', 'Welcome123!'],
      'Common passwords not allowed'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match')
});

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { loading, error, resetError } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Validate reset token on component mount
  useEffect(() => {
    const validateResetToken = async () => {
      if (!token) {
        setValidationErrors({ token: 'Invalid reset token' });
        return;
      }

      try {
        const isValid = await AuthService.validateResetToken(token);
        setIsTokenValid(isValid);
      } catch (error) {
        setValidationErrors({
          token: 'Password reset link has expired or is invalid'
        });
      }
    };

    validateResetToken();
  }, [token]);

  // Handle form validation
  const validateForm = useCallback(async () => {
    try {
      await passwordValidationSchema.validate(
        { password, confirmPassword },
        { abortEarly: false }
      );
      setValidationErrors({});
      return true;
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const errors: Record<string, string> = {};
        err.inner.forEach((error) => {
          if (error.path) {
            errors[error.path] = error.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  }, [password, confirmPassword]);

  // Handle password reset submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetError();

    if (!isTokenValid) {
      setValidationErrors({
        token: 'Password reset link has expired or is invalid'
      });
      return;
    }

    const isValid = await validateForm();
    if (!isValid) return;

    try {
      await AuthService.resetPassword({
        token,
        password,
        deviceFingerprint: window.navigator.userAgent,
        validation: {
          attempts: 0,
          lastAttempt: new Date(),
          ipAddress: window.location.hostname,
          userAgent: window.navigator.userAgent
        }
      });

      setResetSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Password has been reset successfully' }
        });
      }, 3000);
    } catch (error) {
      setValidationErrors({
        submit: 'Failed to reset password. Please try again.'
      });
    }
  };

  if (!isTokenValid) {
    return (
      <div className="reset-password-error">
        <h2>Invalid Reset Link</h2>
        <p>This password reset link has expired or is invalid.</p>
        <Button
          variant="primary"
          onClick={() => navigate('/forgot-password')}
        >
          Request New Reset Link
        </Button>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <h2>Reset Your Password</h2>
      {resetSuccess ? (
        <div className="reset-success">
          <p>Password reset successful! Redirecting to login...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={validationErrors.password ? 'error' : ''}
              autoComplete="new-password"
              aria-invalid={!!validationErrors.password}
              aria-describedby="password-error"
            />
            {validationErrors.password && (
              <span className="error-message" id="password-error">
                {validationErrors.password}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={validationErrors.confirmPassword ? 'error' : ''}
              autoComplete="new-password"
              aria-invalid={!!validationErrors.confirmPassword}
              aria-describedby="confirm-password-error"
            />
            {validationErrors.confirmPassword && (
              <span className="error-message" id="confirm-password-error">
                {validationErrors.confirmPassword}
              </span>
            )}
          </div>

          {validationErrors.submit && (
            <div className="error-message submit-error">
              {validationErrors.submit}
            </div>
          )}

          {error && (
            <div className="error-message submit-error">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={loading}
            fullWidth
            testId="reset-password-submit"
          >
            Reset Password
          </Button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;