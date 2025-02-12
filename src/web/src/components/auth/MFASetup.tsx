import React, { useState, useCallback, useEffect } from 'react';
import QRCode from 'qrcode.react'; // ^3.1.0
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import { MfaSetup } from '../../types/auth.types';

// Constants for MFA setup
const CODE_LENGTH = 6;
const VERIFICATION_TIMEOUT = 30000; // 30 seconds
const MAX_VERIFICATION_ATTEMPTS = 3;
const BACKUP_CODES_COUNT = 10;

interface MFASetupProps {
  onSetupComplete: () => void;
  onError?: (error: Error) => void;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onSetupComplete, onError }) => {
  const { user, setupMFA, verifyMFA } = useAuth();

  // Component state
  const [mfaData, setMfaData] = useState<MfaSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [verificationAttempts, setVerificationAttempts] = useState<number>(0);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState<'initial' | 'verification' | 'backupCodes'>('initial');

  // Security timeout for verification
  const [verificationTimeout, setVerificationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup verification timeout on unmount
  useEffect(() => {
    return () => {
      if (verificationTimeout) {
        clearTimeout(verificationTimeout);
      }
    };
  }, [verificationTimeout]);

  /**
   * Initiates MFA setup process with security checks
   */
  const handleSetupMFA = useCallback(async () => {
    if (!user) {
      setError('User must be authenticated to setup MFA');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Request MFA setup data with rate limiting
      const setupData = await setupMFA();
      setMfaData(setupData);
      setSetupStep('verification');

      // Set verification timeout
      const timeout = setTimeout(() => {
        setError('Verification timeout exceeded. Please try again.');
        setMfaData(null);
        setSetupStep('initial');
      }, VERIFICATION_TIMEOUT);

      setVerificationTimeout(timeout);

    } catch (err) {
      const error = err as Error;
      setError(error.message);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, setupMFA, onError]);

  /**
   * Handles verification code input with validation
   */
  const handleCodeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '');
    
    if (value.length <= CODE_LENGTH) {
      setVerificationCode(value);
      setError('');
    }
  }, []);

  /**
   * Verifies the entered MFA code with rate limiting and security measures
   */
  const handleVerifyCode = useCallback(async (code: string) => {
    // Verify attempt count
    if (verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      setError('Maximum verification attempts exceeded. Please try again later.');
      return;
    }

    // Validate code format
    if (!code || code.length !== CODE_LENGTH) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsVerifying(true);
      setError('');

      await verifyMFA(code);
      
      // Clear verification timeout
      if (verificationTimeout) {
        clearTimeout(verificationTimeout);
      }

      // Generate backup codes
      const generatedBackupCodes = Array.from({ length: BACKUP_CODES_COUNT }, 
        () => Math.random().toString(36).substr(2, 8));
      setBackupCodes(generatedBackupCodes);
      setSetupStep('backupCodes');

    } catch (err) {
      const error = err as Error;
      setError(error.message);
      setVerificationAttempts(prev => prev + 1);
      onError?.(error);
    } finally {
      setIsVerifying(false);
    }
  }, [verificationAttempts, verificationTimeout, verifyMFA, onError]);

  /**
   * Completes MFA setup and saves backup codes
   */
  const handleComplete = useCallback(() => {
    if (backupCodes.length !== BACKUP_CODES_COUNT) {
      setError('Backup codes generation failed');
      return;
    }

    // Store backup codes securely
    try {
      const encryptedCodes = backupCodes.map(code => 
        window.btoa(code)); // Basic encryption for demo
      localStorage.setItem('mfa_backup_codes', JSON.stringify(encryptedCodes));
      onSetupComplete();
    } catch (err) {
      const error = err as Error;
      setError('Failed to save backup codes');
      onError?.(error);
    }
  }, [backupCodes, onSetupComplete, onError]);

  return (
    <div className="mfa-setup" data-testid="mfa-setup">
      {setupStep === 'initial' && (
        <div className="mfa-setup__initial">
          <h2>Setup Two-Factor Authentication</h2>
          <p>Enhance your account security by setting up two-factor authentication.</p>
          <Button
            onClick={handleSetupMFA}
            isLoading={isLoading}
            disabled={isLoading}
            variant="primary"
            testId="setup-mfa-button"
          >
            Begin Setup
          </Button>
        </div>
      )}

      {setupStep === 'verification' && mfaData && (
        <div className="mfa-setup__verification">
          <h3>Scan QR Code</h3>
          <div className="mfa-setup__qr-container">
            <QRCode
              value={mfaData.otpURL}
              size={200}
              level="H"
              includeMargin
              renderAs="svg"
            />
          </div>
          
          <div className="mfa-setup__manual-key">
            <p>If you can't scan the QR code, enter this key manually:</p>
            <code>{mfaData.secret}</code>
          </div>

          <div className="mfa-setup__code-input">
            <label htmlFor="verification-code">Enter Verification Code:</label>
            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={CODE_LENGTH}
              value={verificationCode}
              onChange={handleCodeChange}
              disabled={isVerifying}
              data-testid="verification-code-input"
            />
          </div>

          <Button
            onClick={() => handleVerifyCode(verificationCode)}
            isLoading={isVerifying}
            disabled={isVerifying || verificationCode.length !== CODE_LENGTH}
            variant="primary"
            testId="verify-code-button"
          >
            Verify Code
          </Button>
        </div>
      )}

      {setupStep === 'backupCodes' && (
        <div className="mfa-setup__backup-codes">
          <h3>Save Your Backup Codes</h3>
          <p>Store these backup codes in a secure location. You'll need them if you lose access to your authenticator app.</p>
          
          <div className="mfa-setup__codes-grid">
            {backupCodes.map((code, index) => (
              <div key={index} className="backup-code">
                {code}
              </div>
            ))}
          </div>

          <Button
            onClick={handleComplete}
            variant="primary"
            testId="complete-setup-button"
          >
            Complete Setup
          </Button>
        </div>
      )}

      {error && (
        <div className="mfa-setup__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default MFASetup;