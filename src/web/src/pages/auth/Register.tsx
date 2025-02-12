import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { object, string } from 'yup';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { MFASetup } from '../../components/auth/MFASetup';
import Button from '../../components/common/Button';
import { LoadingState } from '../../types/common.types';
import { authConfig } from '../../config/auth.config';

// Enhanced password regex with security requirements
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

// Registration form validation schema with enhanced security rules
const registrationSchema = object().shape({
  email: string()
    .required('Email is required')
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .test('domain-blacklist', 'Email domain not allowed', (value) => {
      if (!value) return false;
      const domain = value.split('@')[1];
      return !authConfig.security.blockedDomains?.includes(domain);
    }),
  password: string()
    .required('Password is required')
    .matches(
      PASSWORD_REGEX,
      'Password must contain at least 12 characters, one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .max(128, 'Password must not exceed 128 characters'),
  confirmPassword: string()
    .required('Please confirm your password')
    .oneOf([string().required().ref('password')], 'Passwords must match'),
  firstName: string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters'),
  lastName: string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters'),
  acceptTerms: string()
    .required('You must accept the terms and conditions')
    .oneOf(['true'], 'You must accept the terms and conditions')
});

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  deviceFingerprint?: string;
  securityToken?: string;
}

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registrationSchema),
    mode: 'onBlur'
  });

  // Initialize device fingerprinting on component mount
  useEffect(() => {
    const initializeDeviceFingerprint = async () => {
      try {
        const fpPromise = import('@fingerprintjs/fingerprintjs');
        const fp = await (await fpPromise).load();
        const result = await fp.get();
        return result.visitorId;
      } catch (error) {
        console.error('Failed to generate device fingerprint:', error);
        return null;
      }
    };

    initializeDeviceFingerprint();
  }, []);

  // Handle form submission with enhanced security measures
  const onSubmit = useCallback(async (formData: RegisterFormData) => {
    try {
      setLoadingState(LoadingState.LOADING);
      setRegistrationError(null);

      // Generate security token
      const securityToken = window.btoa(String(Date.now()));

      // Enhanced registration data with security metadata
      const registrationData = {
        ...formData,
        deviceFingerprint: await initializeDeviceFingerprint(),
        securityToken,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        ipAddress: window.location.hostname
      };

      // Attempt registration with security validation
      const result = await registerUser(registrationData);

      if (result.requiresMFA) {
        setShowMFASetup(true);
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      setRegistrationError(error.message || 'Registration failed. Please try again.');
      setLoadingState(LoadingState.ERROR);
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  }, [registerUser, navigate]);

  // Handle MFA setup completion
  const handleMFASetupComplete = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className="register-page" data-testid="register-page">
      <div className="register-container">
        <h1>Create Your Account</h1>
        
        {!showMFASetup ? (
          <form onSubmit={handleSubmit(onSubmit)} className="register-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className={errors.email ? 'error' : ''}
                autoComplete="email"
              />
              {errors.email && (
                <span className="error-message">{errors.email.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                {...register('firstName')}
                className={errors.firstName ? 'error' : ''}
                autoComplete="given-name"
              />
              {errors.firstName && (
                <span className="error-message">{errors.firstName.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                {...register('lastName')}
                className={errors.lastName ? 'error' : ''}
                autoComplete="family-name"
              />
              {errors.lastName && (
                <span className="error-message">{errors.lastName.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className={errors.password ? 'error' : ''}
                autoComplete="new-password"
              />
              {errors.password && (
                <span className="error-message">{errors.password.message}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'error' : ''}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword.message}</span>
              )}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  {...register('acceptTerms')}
                />
                I accept the terms and conditions
              </label>
              {errors.acceptTerms && (
                <span className="error-message">{errors.acceptTerms.message}</span>
              )}
            </div>

            {registrationError && (
              <div className="error-message" role="alert">
                {registrationError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={loadingState === LoadingState.LOADING}
              disabled={loadingState === LoadingState.LOADING}
              testId="register-submit-button"
            >
              Create Account
            </Button>
          </form>
        ) : (
          <MFASetup
            onSetupComplete={handleMFASetupComplete}
            onError={(error) => {
              setRegistrationError(error.message);
              setShowMFASetup(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Register;