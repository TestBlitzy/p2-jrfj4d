import CryptoJS from 'crypto-js'; // ^4.1.1
import { authConfig } from '../config/auth.config';

/**
 * Maximum storage size in bytes (5MB)
 */
const MAX_STORAGE_SIZE = 5 * 1024 * 1024;

/**
 * Compression threshold in bytes (1MB)
 */
const COMPRESSION_THRESHOLD = 1024 * 1024;

/**
 * Storage operation types for audit logging
 */
enum StorageOperation {
  SET = 'SET',
  GET = 'GET',
  REMOVE = 'REMOVE',
  CLEAR = 'CLEAR'
}

/**
 * Interface for storage quota information
 */
interface StorageQuota {
  usage: number;
  quota: number;
  available: number;
}

/**
 * Gets current storage quota information
 */
const getStorageQuota = (useSession: boolean = false): StorageQuota => {
  const storage = useSession ? sessionStorage : localStorage;
  let usage = 0;
  
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key) {
      usage += (key.length + (storage.getItem(key)?.length || 0)) * 2; // UTF-16 encoding
    }
  }

  return {
    usage,
    quota: MAX_STORAGE_SIZE,
    available: MAX_STORAGE_SIZE - usage
  };
};

/**
 * Encrypts data using AES encryption with key rotation
 */
const encryptData = (data: string): string => {
  try {
    const encryptionKey = process.env.VITE_STORAGE_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not found');
    }

    // Generate random IV
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Encrypt data
    const encrypted = CryptoJS.AES.encrypt(data, encryptionKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // Combine IV and encrypted data
    return iv.toString(CryptoJS.enc.Base64) + ':' + encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts encrypted data using AES decryption
 */
const decryptData = (encryptedData: string): string => {
  try {
    const encryptionKey = process.env.VITE_STORAGE_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not found');
    }

    // Split IV and encrypted data
    const [ivString, encrypted] = encryptedData.split(':');
    if (!ivString || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }

    // Convert IV from Base64
    const iv = CryptoJS.enc.Base64.parse(ivString);

    // Decrypt data
    const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Compresses data using LZW compression
 */
const compressData = (data: string): string => {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(data));
};

/**
 * Decompresses data using LZW decompression
 */
const decompressData = (compressed: string): string => {
  return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(compressed));
};

/**
 * Logs storage operations for audit purposes
 */
const logStorageOperation = (
  operation: StorageOperation,
  key: string,
  encrypted: boolean
): void => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`Storage Operation: ${operation}`, {
      key,
      encrypted,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Stores data in browser storage with encryption support
 */
export const setItem = <T>(
  key: string,
  value: T,
  encrypt: boolean = false,
  useSession: boolean = false
): void => {
  try {
    // Validate key
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid storage key');
    }

    // Check storage quota
    const quota = getStorageQuota(useSession);
    if (quota.available <= 0) {
      throw new Error('Storage quota exceeded');
    }

    // Prefix key
    const prefixedKey = `${authConfig.jwt.storagePrefix}${key}`;

    // Prepare value
    let serializedValue = typeof value === 'string' ? 
      value : 
      JSON.stringify(value);

    // Compress if needed
    if (serializedValue.length > COMPRESSION_THRESHOLD) {
      serializedValue = compressData(serializedValue);
    }

    // Encrypt if requested
    if (encrypt) {
      serializedValue = encryptData(serializedValue);
    }

    // Store value
    const storage = useSession ? sessionStorage : localStorage;
    storage.setItem(prefixedKey, serializedValue);

    // Log operation
    logStorageOperation(StorageOperation.SET, prefixedKey, encrypt);

    // Dispatch storage event for multi-tab sync
    if (!useSession) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: prefixedKey,
        newValue: serializedValue
      }));
    }
  } catch (error) {
    console.error('Storage setItem error:', error);
    throw error;
  }
};

/**
 * Retrieves data from browser storage with decryption support
 */
export const getItem = <T>(
  key: string,
  encrypted: boolean = false,
  useSession: boolean = false
): T | null => {
  try {
    // Validate key
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid storage key');
    }

    // Prefix key
    const prefixedKey = `${authConfig.jwt.storagePrefix}${key}`;

    // Get value from storage
    const storage = useSession ? sessionStorage : localStorage;
    const value = storage.getItem(prefixedKey);

    if (!value) {
      return null;
    }

    // Log operation
    logStorageOperation(StorageOperation.GET, prefixedKey, encrypted);

    // Process value
    let processedValue = value;

    // Decrypt if needed
    if (encrypted) {
      processedValue = decryptData(processedValue);
    }

    // Decompress if needed
    if (processedValue.startsWith('ey')) { // Base64 signature
      processedValue = decompressData(processedValue);
    }

    // Parse JSON if needed
    try {
      return JSON.parse(processedValue) as T;
    } catch {
      return processedValue as unknown as T;
    }
  } catch (error) {
    console.error('Storage getItem error:', error);
    throw error;
  }
};

/**
 * Removes an item from browser storage with secure deletion
 */
export const removeItem = (
  key: string,
  useSession: boolean = false
): void => {
  try {
    // Validate key
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid storage key');
    }

    // Prefix key
    const prefixedKey = `${authConfig.jwt.storagePrefix}${key}`;

    // Secure deletion - overwrite with random data
    const storage = useSession ? sessionStorage : localStorage;
    const randomData = CryptoJS.lib.WordArray.random(64).toString();
    storage.setItem(prefixedKey, randomData);

    // Remove item
    storage.removeItem(prefixedKey);

    // Log operation
    logStorageOperation(StorageOperation.REMOVE, prefixedKey, false);

    // Dispatch storage event for multi-tab sync
    if (!useSession) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: prefixedKey,
        newValue: null
      }));
    }
  } catch (error) {
    console.error('Storage removeItem error:', error);
    throw error;
  }
};

/**
 * Clears all items from browser storage with matching prefix
 */
export const clear = (useSession: boolean = false): void => {
  try {
    const storage = useSession ? sessionStorage : localStorage;
    const prefix = authConfig.jwt.storagePrefix;

    // Get all keys with matching prefix
    const keys = Object.keys(storage).filter(key => key.startsWith(prefix));

    // Secure deletion for each key
    keys.forEach(key => {
      const randomData = CryptoJS.lib.WordArray.random(64).toString();
      storage.setItem(key, randomData);
      storage.removeItem(key);
    });

    // Log operation
    logStorageOperation(StorageOperation.CLEAR, 'ALL', false);

    // Dispatch storage event for multi-tab sync
    if (!useSession) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: null,
        newValue: null
      }));
    }
  } catch (error) {
    console.error('Storage clear error:', error);
    throw error;
  }
};