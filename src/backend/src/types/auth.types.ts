import { JwtPayload } from 'jsonwebtoken'; // ^9.0.0

/**
 * Enum defining user roles for role-based access control (RBAC)
 * Used for coarse-grained access control across the application
 */
export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    SALES_REP = 'SALES_REP'
}

/**
 * Type definition for login credentials with optional MFA token
 * @property email - User's email address for authentication
 * @property password - User's password (should be hashed before transmission)
 * @property mfaToken - Optional MFA token for two-factor authentication
 */
export type LoginCredentials = {
    email: string;
    password: string;
    mfaToken?: string;
};

/**
 * Type definition for authentication tokens response
 * Includes comprehensive token metadata for enhanced security
 */
export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
};

/**
 * Extended JWT payload interface with comprehensive user security information
 * Extends the standard JWT payload with custom security-related fields
 */
export interface JwtCustomPayload extends JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
    permissions: UserPermission[];
    mfaEnabled: boolean;
    sessionId: string;
}

/**
 * Type definition for MFA verification requests
 * Supports multiple authentication methods with timestamp validation
 */
export type MfaVerification = {
    userId: string;
    code: string;
    method: 'totp' | 'sms' | 'email';
    timestamp: number;
};

/**
 * Comprehensive type for MFA setup including backup and recovery options
 * Provides complete MFA configuration with security fallbacks
 */
export type MfaSetup = {
    secret: string;
    otpAuthUrl: string;
    qrCodeUrl: string;
    backupCodes: string[];
    recoveryEmail: string;
};

/**
 * Advanced type definition for granular permissions
 * Supports both RBAC and ABAC with OAuth scopes and conditional access
 */
export type UserPermission = {
    resource: string;
    actions: string[];
    conditions: Record<string, any>;
    attributes: Record<string, any>;
    scope: string[];
    expiry: number | null;
};