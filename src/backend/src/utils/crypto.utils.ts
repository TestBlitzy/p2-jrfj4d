// @package crypto ^1.0.0
// @package bcrypt ^5.1.0
import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import * as bcrypt from 'bcrypt';
import { authConfig } from '../config/auth.config';

// Promisify scrypt for async key derivation
const scryptAsync = promisify(scrypt);

/**
 * Custom error class for cryptographic operations
 * Provides detailed error handling for security operations
 */
export class CryptoError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'CryptoError';
    Object.setPrototypeOf(this, CryptoError.prototype);
  }
}

/**
 * Key type enumeration for different cryptographic purposes
 */
export enum KeyType {
  ENCRYPTION = 'encryption',
  SIGNING = 'signing',
  MFA = 'mfa'
}

/**
 * Encrypts sensitive data using AES-256-GCM with secure IV generation
 * Implements enterprise-grade encryption with authentication
 * 
 * @param data - Data to encrypt
 * @param key - Encryption key (must be 32 bytes)
 * @returns Promise<string> - Base64 encoded encrypted data with IV and auth tag
 * @throws CryptoError
 */
export async function encryptData(data: string, key: Buffer): Promise<string> {
  try {
    if (!data || !key) {
      throw new CryptoError('INVALID_INPUT', 'Data and key are required');
    }

    if (key.length !== 32) {
      throw new CryptoError('INVALID_KEY_LENGTH', 'Key must be 32 bytes');
    }

    // Generate a random 16-byte IV
    const iv = randomBytes(16);

    // Create cipher with AES-256-GCM
    const cipher = createCipheriv(
      authConfig.security.encryption.algorithm,
      key,
      iv
    );

    // Encrypt the data
    const encryptedData = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    // Get the auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV, encrypted data, and auth tag
    const combined = Buffer.concat([iv, encryptedData, authTag]);

    // Return as base64 string
    return combined.toString('base64');
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      'ENCRYPTION_FAILED',
      `Encryption failed: ${error.message}`
    );
  }
}

/**
 * Decrypts AES-256-GCM encrypted data with authentication verification
 * 
 * @param encryptedData - Base64 encoded encrypted data with IV and auth tag
 * @param key - Decryption key (must be 32 bytes)
 * @returns Promise<string> - Decrypted original data
 * @throws CryptoError
 */
export async function decryptData(encryptedData: string, key: Buffer): Promise<string> {
  try {
    if (!encryptedData || !key) {
      throw new CryptoError('INVALID_INPUT', 'Encrypted data and key are required');
    }

    // Decode the base64 data
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract IV (first 16 bytes)
    const iv = combined.slice(0, 16);
    
    // Extract auth tag (last 16 bytes)
    const authTag = combined.slice(combined.length - 16);
    
    // Extract encrypted content (everything in between)
    const encryptedContent = combined.slice(16, combined.length - 16);

    // Create decipher
    const decipher = createDecipheriv(
      authConfig.security.encryption.algorithm,
      key,
      iv
    );

    // Set auth tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encryptedContent),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      'DECRYPTION_FAILED',
      `Decryption failed: ${error.message}`
    );
  }
}

/**
 * Securely hashes passwords using bcrypt with configurable salt rounds
 * Implements industry-standard password hashing
 * 
 * @param password - Plain text password to hash
 * @returns Promise<string> - Bcrypt hashed password
 * @throws CryptoError
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    if (!password) {
      throw new CryptoError('INVALID_INPUT', 'Password is required');
    }

    // Validate password complexity
    if (password.length < 8) {
      throw new CryptoError(
        'INVALID_PASSWORD',
        'Password must be at least 8 characters long'
      );
    }

    // Get salt rounds from config
    const saltRounds = authConfig.security.encryption.saltRounds;

    // Generate salt and hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    return hashedPassword;
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      'HASHING_FAILED',
      `Password hashing failed: ${error.message}`
    );
  }
}

/**
 * Securely verifies a password against its bcrypt hash
 * Implements constant-time comparison to prevent timing attacks
 * 
 * @param password - Plain text password to verify
 * @param hash - Stored bcrypt hash to compare against
 * @returns Promise<boolean> - True if password matches hash
 * @throws CryptoError
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    if (!password || !hash) {
      throw new CryptoError(
        'INVALID_INPUT',
        'Password and hash are required'
      );
    }

    // Use bcrypt's compare function for constant-time comparison
    const isMatch = await bcrypt.compare(password, hash);

    return isMatch;
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      'VERIFICATION_FAILED',
      `Password verification failed: ${error.message}`
    );
  }
}

/**
 * Generates cryptographically secure random key with specified strength
 * Supports different key types with appropriate derivation
 * 
 * @param length - Key length in bytes
 * @param type - Key type (encryption, signing, or MFA)
 * @returns Promise<Buffer> - Secure random key buffer
 * @throws CryptoError
 */
export async function generateSecureKey(
  length: number,
  type: KeyType
): Promise<Buffer> {
  try {
    if (length < 16) {
      throw new CryptoError(
        'INVALID_LENGTH',
        'Key length must be at least 16 bytes'
      );
    }

    // Generate random bytes
    const randomKey = randomBytes(length);

    // Apply key derivation based on type
    switch (type) {
      case KeyType.ENCRYPTION: {
        // Use scrypt for encryption keys
        const salt = randomBytes(16);
        const derivedKey = await scryptAsync(randomKey, salt, length);
        return Buffer.from(derivedKey);
      }
      case KeyType.SIGNING: {
        // Use SHA-512 for signing keys
        const { createHash } = await import('crypto');
        const hash = createHash('sha512');
        hash.update(randomKey);
        return Buffer.from(hash.digest().slice(0, length));
      }
      case KeyType.MFA: {
        // Use base32 encoding for MFA keys
        return randomKey;
      }
      default:
        throw new CryptoError('INVALID_KEY_TYPE', 'Unsupported key type');
    }
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      'KEY_GENERATION_FAILED',
      `Key generation failed: ${error.message}`
    );
  }
}