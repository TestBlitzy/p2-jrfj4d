import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { jest } from '@jest/globals';
import { SecurityLogger } from '@security/logger';

import LoginForm from '../../../../src/components/auth/LoginForm';
import { useAuth } from '../../../../src/hooks/useAuth';
import { authConfig } from '../../../../src/config/auth.config';

// Mock dependencies
jest.mock('../../../../src/hooks/useAuth');
jest.mock('@security/logger');

// Mock store setup
const mockStore = {
  getState: () => ({
    auth: {
      isAuthenticated: false,
      loading: false,
      error: null
    }
  }),
  dispatch: jest.fn(),
  subscribe: jest.fn()
};

describe('LoginForm', () => {
  // Test setup with security mocks
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth hook with security features
    (useAuth as jest.Mock).mockReturnValue({
      login: jest.fn(),
      verifyMFA: jest.fn(),
      handleOAuth: jest.fn(),
      isAuthenticated: false,
      getDeviceFingerprint: jest.fn().mockResolvedValue('mock-device-fingerprint'),
      logSecurityEvent: jest.fn()
    });

    // Mock SecurityLogger
    (SecurityLogger.logEvent as jest.Mock).mockImplementation(() => Promise.resolve());
  });

  it('should handle secure login flow with device fingerprinting', async () => {
    const mockLogin = jest.fn().mockResolvedValue({
      success: true,
      requireMFA: false
    });
    (useAuth as jest.Mock).mockReturnValue({
      ...useAuth(),
      login: mockLogin
    });

    const { getByLabelText, getByRole } = render(
      <Provider store={mockStore}>
        <LoginForm />
      </Provider>
    );

    // Fill in credentials
    fireEvent.change(getByLabelText('Email address'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(getByLabelText('Password'), {
      target: { value: 'SecurePass123!' }
    });

    // Submit form
    fireEvent.click(getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      // Verify login called with enhanced security
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
        deviceFingerprint: 'mock-device-fingerprint',
        validation: expect.objectContaining({
          attempts: 0,
          lastAttempt: expect.any(Date),
          ipAddress: expect.any(String),
          userAgent: expect.any(String)
        })
      });
    });

    // Verify security event logged
    expect(SecurityLogger.logEvent).toHaveBeenCalledWith(
      'login_attempt_success',
      expect.objectContaining({
        email: 'test@example.com',
        timestamp: expect.any(String)
      })
    );
  });

  it('should handle MFA verification with TOTP', async () => {
    const mockLogin = jest.fn().mockResolvedValue({
      success: true,
      requireMFA: true
    });
    const mockVerifyMFA = jest.fn().mockResolvedValue({ success: true });

    (useAuth as jest.Mock).mockReturnValue({
      ...useAuth(),
      login: mockLogin,
      verifyMFA: mockVerifyMFA
    });

    const { getByLabelText, getByRole } = render(
      <Provider store={mockStore}>
        <LoginForm />
      </Provider>
    );

    // Initial login
    fireEvent.change(getByLabelText('Email address'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(getByLabelText('Password'), {
      target: { value: 'SecurePass123!' }
    });
    fireEvent.click(getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      // Verify MFA input rendered
      expect(getByLabelText('MFA verification code')).toBeInTheDocument();
    });

    // Enter MFA code
    fireEvent.change(getByLabelText('MFA verification code'), {
      target: { value: '123456' }
    });
    fireEvent.click(getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      // Verify MFA verification called
      expect(mockVerifyMFA).toHaveBeenCalledWith('123456');
      // Verify security event logged
      expect(SecurityLogger.logEvent).toHaveBeenCalledWith(
        'mfa_verification_success',
        expect.any(Object)
      );
    });
  });

  it('should handle OAuth provider login with security measures', async () => {
    const mockHandleOAuth = jest.fn();
    (useAuth as jest.Mock).mockReturnValue({
      ...useAuth(),
      handleOAuth: mockHandleOAuth
    });

    const { getByRole } = render(
      <Provider store={mockStore}>
        <LoginForm />
      </Provider>
    );

    // Click OAuth button
    fireEvent.click(getByRole('button', { name: 'Sign in with Google' }));

    await waitFor(() => {
      // Verify OAuth handler called with security context
      expect(SecurityLogger.logEvent).toHaveBeenCalledWith(
        'oauth_login_initiated',
        expect.objectContaining({
          provider: 'google',
          timestamp: expect.any(String)
        })
      );
    });
  });

  it('should handle login validation errors securely', async () => {
    const mockLogin = jest.fn().mockRejectedValue({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password'
    });

    (useAuth as jest.Mock).mockReturnValue({
      ...useAuth(),
      login: mockLogin
    });

    const { getByLabelText, getByRole, getByText } = render(
      <Provider store={mockStore}>
        <LoginForm />
      </Provider>
    );

    // Submit with invalid credentials
    fireEvent.change(getByLabelText('Email address'), {
      target: { value: 'invalid@example.com' }
    });
    fireEvent.change(getByLabelText('Password'), {
      target: { value: 'wrong' }
    });
    fireEvent.click(getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      // Verify error displayed
      expect(getByText('Invalid email or password')).toBeInTheDocument();
      // Verify security event logged
      expect(SecurityLogger.logEvent).toHaveBeenCalledWith(
        'login_attempt_failure',
        expect.objectContaining({
          error: 'Invalid email or password',
          timestamp: expect.any(String)
        })
      );
    });
  });

  it('should enforce password complexity requirements', async () => {
    const { getByLabelText, getByRole, getByText } = render(
      <Provider store={mockStore}>
        <LoginForm />
      </Provider>
    );

    // Submit with weak password
    fireEvent.change(getByLabelText('Email address'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(getByLabelText('Password'), {
      target: { value: 'weak' }
    });
    fireEvent.click(getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      // Verify password complexity error
      expect(getByText(/Password must contain/)).toBeInTheDocument();
    });
  });

  it('should handle device fingerprint failures gracefully', async () => {
    const mockGetDeviceFingerprint = jest.fn().mockRejectedValue(new Error('Fingerprint failed'));
    
    (useAuth as jest.Mock).mockReturnValue({
      ...useAuth(),
      getDeviceFingerprint: mockGetDeviceFingerprint
    });

    render(
      <Provider store={mockStore}>
        <LoginForm />
      </Provider>
    );

    await waitFor(() => {
      // Verify security event logged for fingerprint failure
      expect(SecurityLogger.logEvent).toHaveBeenCalledWith(
        'fingerprint_failed',
        expect.objectContaining({
          error: expect.any(Error)
        })
      );
    });
  });
});