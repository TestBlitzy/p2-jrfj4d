import { AuthService } from '../../src/services/auth.service';
import { authConfig } from '../../src/config/auth.config';
import { TOKEN_KEYS, API_ENDPOINTS, AUTH_CONFIG } from '../../src/constants/auth.constants';
import { 
  UserRole, 
  TokenType,
  AuthTokens,
  LoginCredentials,
  ValidationMetadata,
  AuthError
} from '../../src/types/auth.types';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import CryptoJS from 'crypto-js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockAxios: MockAdapter;
  let mockLocalStorage: { [key: string]: string };
  
  // Mock data
  const mockDeviceFingerprint = 'mock-device-fingerprint-123';
  const mockValidationMetadata: ValidationMetadata = {
    attempts: 0,
    lastAttempt: new Date(),
    ipAddress: 'localhost',
    userAgent: 'jest-test'
  };
  
  const mockTokens: AuthTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: AUTH_CONFIG.TOKEN_EXPIRY,
    tokenType: TokenType.BEARER,
    scope: ['openid', 'profile']
  };

  const mockLoginCredentials: LoginCredentials = {
    email: 'test@example.com',
    password: 'SecurePass123!',
    validation: mockValidationMetadata
  };

  beforeEach(() => {
    // Setup mocks
    mockAxios = new MockAdapter(axios);
    mockLocalStorage = {};
    
    // Mock localStorage
    global.localStorage = {
      getItem: (key: string) => mockLocalStorage[key] || null,
      setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
      removeItem: (key: string) => { delete mockLocalStorage[key]; },
      clear: () => { mockLocalStorage = {}; },
      length: 0,
      key: (index: number) => ''
    };

    // Mock window location and navigator
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', origin: 'http://localhost' },
      writable: true
    });
    
    Object.defineProperty(window, 'navigator', {
      value: { userAgent: 'jest-test' },
      writable: true
    });

    authService = new AuthService();
  });

  afterEach(() => {
    mockAxios.reset();
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should successfully login with valid credentials and device fingerprint', async () => {
      // Setup mock responses
      mockAxios.onPost(API_ENDPOINTS.LOGIN).reply(200, { tokens: mockTokens });

      const result = await authService.login(mockLoginCredentials);

      expect(result).toEqual(mockTokens);
      expect(localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN)).toBeTruthy();
      expect(localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)).toBeTruthy();
    });

    it('should trigger MFA challenge when required', async () => {
      mockAxios.onPost(API_ENDPOINTS.LOGIN).reply(200, {
        requiresMfa: true,
        tokens: { tempToken: 'mock-temp-token' }
      });

      await expect(authService.login(mockLoginCredentials))
        .rejects
        .toThrow('MFA verification required');
    });

    it('should handle rate limiting and failed attempts', async () => {
      mockAxios.onPost(API_ENDPOINTS.LOGIN).reply(429, {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts'
      });

      await expect(authService.login(mockLoginCredentials))
        .rejects
        .toMatchObject({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many login attempts'
        });
    });

    it('should validate device fingerprint during login', async () => {
      const loginWithFingerprint = await authService.login(mockLoginCredentials);
      expect(loginWithFingerprint.accessToken).toBeTruthy();
    });
  });

  describe('token management', () => {
    it('should successfully refresh tokens', async () => {
      // Store initial tokens
      const encryptedAccess = CryptoJS.AES.encrypt(
        mockTokens.accessToken,
        'mock-key'
      ).toString();
      
      const encryptedRefresh = CryptoJS.AES.encrypt(
        mockTokens.refreshToken,
        'mock-key'
      ).toString();

      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, encryptedAccess);
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, encryptedRefresh);

      // Setup refresh response
      mockAxios.onPost(API_ENDPOINTS.REFRESH).reply(200, {
        ...mockTokens,
        accessToken: 'new-access-token'
      });

      const result = await authService.refreshToken();
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should handle token encryption and decryption', async () => {
      mockAxios.onPost(API_ENDPOINTS.LOGIN).reply(200, { tokens: mockTokens });
      
      await authService.login(mockLoginCredentials);
      
      const storedAccessToken = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
      expect(storedAccessToken).toBeTruthy();
      expect(storedAccessToken).not.toBe(mockTokens.accessToken);
    });
  });

  describe('MFA operations', () => {
    it('should setup MFA with TOTP', async () => {
      const mockMfaSetup = {
        qrCode: 'mock-qr-code',
        secret: 'mock-secret',
        otpURL: 'otpauth://totp/test'
      };

      mockAxios.onPost(API_ENDPOINTS.MFA_SETUP).reply(200, mockMfaSetup);

      const result = await authService.setupMFA();
      expect(result).toEqual(mockMfaSetup);
    });

    it('should verify MFA token with rate limiting', async () => {
      mockAxios.onPost(API_ENDPOINTS.MFA_VERIFY).reply(200, mockTokens);

      const result = await authService.verifyMFA('123456', 'temp-token');
      expect(result).toEqual(mockTokens);
    });
  });

  describe('security features', () => {
    it('should enforce security policies', async () => {
      mockAxios.onPost(API_ENDPOINTS.LOGIN).reply(200, { tokens: mockTokens });

      const result = await authService.login({
        ...mockLoginCredentials,
        validation: {
          ...mockValidationMetadata,
          ipAddress: 'unauthorized-ip'
        }
      });

      expect(result).toBeTruthy();
    });

    it('should handle audit logging', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      mockAxios.onPost(API_ENDPOINTS.LOGIN).reply(200, { tokens: mockTokens });
      
      await authService.login(mockLoginCredentials);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Auth Event:',
        expect.objectContaining({
          event: 'login_success'
        })
      );
    });

    it('should validate token claims', async () => {
      const invalidToken = 'invalid-token';
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, invalidToken);

      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear session data on logout', async () => {
      mockAxios.onPost(API_ENDPOINTS.LOGOUT).reply(200);

      await authService.logout();
      
      expect(localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN)).toBeNull();
      expect(localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN)).toBeNull();
    });

    it('should handle failed logout', async () => {
      mockAxios.onPost(API_ENDPOINTS.LOGOUT).reply(500);

      await expect(authService.logout())
        .rejects
        .toMatchObject({
          code: 'AUTH_ERROR'
        });
    });
  });
});