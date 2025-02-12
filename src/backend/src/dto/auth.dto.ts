import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsString, Matches, Transform } from 'class-validator';
import { UserRole } from '../types/auth.types';

/**
 * Data Transfer Object for user login requests
 * Implements comprehensive validation for secure authentication
 */
export class LoginDto {
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email is required' })
    @Transform(({ value }) => value?.trim())
    email: string;

    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
        { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
    )
    password: string;
}

/**
 * Data Transfer Object for user registration
 * Implements enhanced validation including password confirmation and role assignment
 */
export class RegisterDto {
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email is required' })
    @Transform(({ value }) => value?.trim())
    email: string;

    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/,
        { message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
    )
    password: string;

    @IsString({ message: 'Password confirmation must be a string' })
    @IsNotEmpty({ message: 'Password confirmation is required' })
    confirmPassword: string;

    @IsEnum(UserRole, { message: 'Invalid user role' })
    role: UserRole;
}

/**
 * Data Transfer Object for MFA verification
 * Implements strict validation for 6-digit TOTP codes
 */
export class MfaVerificationDto {
    @IsString({ message: 'User ID must be a string' })
    @IsNotEmpty({ message: 'User ID is required' })
    userId: string;

    @IsString({ message: 'MFA code must be a string' })
    @IsNotEmpty({ message: 'MFA code is required' })
    @MinLength(6, { message: 'MFA code must be 6 digits' })
    @Matches(
        /^[0-9]{6}$/,
        { message: 'MFA code must contain exactly 6 digits' }
    )
    code: string;
}

/**
 * Data Transfer Object for password reset requests
 * Implements email validation for secure password recovery
 */
export class PasswordResetDto {
    @IsString({ message: 'Email must be a string' })
    @IsEmail({}, { message: 'Invalid email format' })
    @IsNotEmpty({ message: 'Email is required' })
    @Transform(({ value }) => value?.trim())
    email: string;
}

/**
 * Data Transfer Object for token refresh requests
 * Implements JWT format validation for secure token refresh
 */
export class TokenRefreshDto {
    @IsString({ message: 'Refresh token must be a string' })
    @IsNotEmpty({ message: 'Refresh token is required' })
    @Matches(
        /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
        { message: 'Invalid refresh token format' }
    )
    refreshToken: string;
}