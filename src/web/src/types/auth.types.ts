import { JwtPayload } from 'jsonwebtoken'; // ^9.0.0

/**
 * User role enumeration for Role-Based Access Control (RBAC)
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES_REP = 'SALES_REP'
}

/**
 * Token type enumeration for OAuth 2.0 flow
 */
export enum TokenType {
  BEARER = 'Bearer',
  JWT = 'JWT'
}

/**
 * Validation metadata for login form
 */
export interface ValidationMetadata {
  attempts: number;
  lastAttempt: Date;
  ipAddress: string;
  userAgent: string;
}

/**
 * User preferences interface
 */
export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
  timezone: string;
}

/**
 * Session metadata interface
 */
export interface SessionMetadata {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  lastActive: Date;
  expiresAt: Date;
}

/**
 * Permission conditions for ABAC
 */
export interface PermissionConditions {
  timeRestrictions?: {
    start: string;
    end: string;
    timezone: string;
  };
  ipRestrictions?: string[];
  deviceRestrictions?: string[];
  contextualRules?: Record<string, unknown>;
}

/**
 * Validation rule for permissions
 */
export interface ValidationRule {
  type: string;
  value: unknown;
  errorMessage: string;
}

/**
 * Operation states for auth actions
 */
export interface OperationStates {
  loginInProgress: boolean;
  mfaVerificationInProgress: boolean;
  tokenRefreshInProgress: boolean;
  logoutInProgress: boolean;
}

/**
 * Authentication error interface
 */
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * User interface for frontend application
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  mfaEnabled: boolean;
  lastLogin: Date;
  firstName: string;
  lastName: string;
  preferences: UserPreferences;
  sessionMetadata: SessionMetadata;
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
  validation: ValidationMetadata;
}

/**
 * Authentication tokens interface for OAuth 2.0 flow
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: TokenType;
  scope: string[];
}

/**
 * MFA setup interface for TOTP-based 2FA
 */
export interface MfaSetup {
  qrCode: string;
  secret: string;
  otpURL: string;
}

/**
 * User permission interface for RBAC/ABAC authorization
 */
export interface UserPermission {
  resource: string;
  actions: string[];
  conditions: PermissionConditions;
  validationRules: ValidationRule[];
}

/**
 * Authentication state interface for Redux store
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: AuthError | null;
  operationStates: OperationStates;
}

/**
 * Extended JWT payload interface
 */
export interface ExtendedJwtPayload extends JwtPayload {
  userId: string;
  role: UserRole;
  scope: string[];
  sessionId: string;
}