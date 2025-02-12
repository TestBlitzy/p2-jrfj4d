// @package jsonwebtoken ^9.0.0
import { JwtPayload } from 'jsonwebtoken';

/**
 * Enumeration of user roles for Role-Based Access Control (RBAC)
 * Used for controlling access to system resources and features
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES_REP = 'SALES_REP'
}

/**
 * Enhanced user interface with comprehensive security features
 * Implements enterprise-grade authentication requirements
 */
export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES_REP';
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'PENDING_VERIFICATION';
  failedLoginAttempts: number;
  passwordLastChanged: Date;
  mfaEnabled: boolean;
  mfaSecret: string;
  refreshTokens: string[];
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication token interface implementing OAuth 2.0 flow
 * Provides secure token management for API authentication
 */
export interface IAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Enhanced session interface with security tracking
 * Implements comprehensive session management and monitoring
 */
export interface ISession {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  isValid: boolean;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Multi-Factor Authentication (MFA) configuration interface
 * Implements TOTP-based two-factor authentication
 */
export interface IMfaConfig {
  secret: string;
  tempSecret: string;
  dataURL: string;
  otpURL: string;
}

/**
 * Enhanced user permission interface with multi-tenancy support
 * Implements RBAC, ABAC, and OAuth scope-based authorization
 */
export interface IUserPermission {
  resource: string;
  actions: string[];
  conditions: Record<string, any>;
  scope: string;
  tenant: string;
  metadata: Record<string, any>;
}

/**
 * Extended JWT payload interface with custom claims
 * Enhances the base JwtPayload with application-specific properties
 */
export interface ICustomJwtPayload extends JwtPayload {
  userId: string;
  role: UserRole;
  permissions: IUserPermission[];
  scope: string[];
  tenant: string;
}