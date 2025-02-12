import Joi from 'joi'; // ^17.9.0
import { LoginDto, RegisterDto, MfaVerificationDto } from '../dto/auth.dto';
import { UserRole } from '../types/auth.types';

// Constants for validation rules
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MFA_CODE_REGEX = /^[0-9]{6}$/;

/**
 * Schema for validating login requests
 * Implements strict email format and password complexity validation
 */
const loginSchema = Joi.object({
    email: Joi.string()
        .required()
        .pattern(EMAIL_REGEX)
        .trim()
        .lowercase()
        .max(255)
        .messages({
            'string.pattern.base': 'Invalid email format',
            'string.empty': 'Email is required',
            'string.max': 'Email must not exceed 255 characters'
        }),
    
    password: Joi.string()
        .required()
        .min(8)
        .max(128)
        .pattern(PASSWORD_REGEX)
        .messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'string.min': 'Password must be at least 8 characters long',
            'string.max': 'Password must not exceed 128 characters'
        })
}).options({ stripUnknown: true, abortEarly: false });

/**
 * Schema for validating registration requests
 * Implements comprehensive validation including password confirmation and role verification
 */
const registrationSchema = Joi.object({
    email: Joi.string()
        .required()
        .pattern(EMAIL_REGEX)
        .trim()
        .lowercase()
        .max(255)
        .messages({
            'string.pattern.base': 'Invalid email format',
            'string.empty': 'Email is required',
            'string.max': 'Email must not exceed 255 characters'
        }),
    
    password: Joi.string()
        .required()
        .min(8)
        .max(128)
        .pattern(PASSWORD_REGEX)
        .messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'string.min': 'Password must be at least 8 characters long',
            'string.max': 'Password must not exceed 128 characters'
        }),
    
    confirmPassword: Joi.string()
        .required()
        .valid(Joi.ref('password'))
        .messages({
            'any.only': 'Passwords must match'
        }),
    
    role: Joi.string()
        .required()
        .valid(...Object.values(UserRole))
        .messages({
            'any.only': `Role must be one of: ${Object.values(UserRole).join(', ')}`
        })
}).options({ stripUnknown: true, abortEarly: false });

/**
 * Schema for validating MFA verification requests
 * Implements strict validation for TOTP codes and user IDs
 */
const mfaVerificationSchema = Joi.object({
    userId: Joi.string()
        .required()
        .pattern(UUID_REGEX)
        .messages({
            'string.pattern.base': 'Invalid user ID format',
            'string.empty': 'User ID is required'
        }),
    
    code: Joi.string()
        .required()
        .pattern(MFA_CODE_REGEX)
        .messages({
            'string.pattern.base': 'MFA code must be exactly 6 digits',
            'string.empty': 'MFA code is required'
        })
}).options({ stripUnknown: true, abortEarly: false });

/**
 * Validates login request payload against schema with enhanced security rules
 * @param loginData - Login request data to validate
 * @returns Promise resolving to true if validation passes
 * @throws ValidationError with detailed messages if validation fails
 */
export async function validateLoginRequest(loginData: LoginDto): Promise<boolean> {
    try {
        await loginSchema.validateAsync(loginData);
        return true;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Login validation failed: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Validates user registration request payload against schema with strict security rules
 * @param registrationData - Registration request data to validate
 * @returns Promise resolving to true if validation passes
 * @throws ValidationError with detailed messages if validation fails
 */
export async function validateRegistrationRequest(registrationData: RegisterDto): Promise<boolean> {
    try {
        await registrationSchema.validateAsync(registrationData);
        return true;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Registration validation failed: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Validates MFA verification request payload against schema with enhanced security
 * @param mfaData - MFA verification request data to validate
 * @returns Promise resolving to true if validation passes
 * @throws ValidationError with detailed messages if validation fails
 */
export async function validateMfaVerification(mfaData: MfaVerificationDto): Promise<boolean> {
    try {
        await mfaVerificationSchema.validateAsync(mfaData);
        return true;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`MFA verification validation failed: ${error.message}`);
        }
        throw error;
    }
}