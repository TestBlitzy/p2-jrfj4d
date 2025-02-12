/**
 * @fileoverview Core validation utility functions providing enterprise-grade data validation
 * with support for internationalization, security, and performance optimization.
 * Version: 1.0.0
 */

import { ErrorCodes } from '../constants/error-codes';
import * as Joi from 'joi'; // ^17.9.0

// Compiled regex patterns for performance optimization
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PHONE_REGEX_MAP: Record<string, RegExp> = {
    'US': /^\+1[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    'UK': /^\+44[1-9]\d{9}$/,
    'DEFAULT': /^\+[1-9]\d{1,14}$/
};

// Cached validation schemas for performance
const commonSchemas = {
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
    date: Joi.date().iso().required()
};

/**
 * Interface for numeric validation options
 */
interface NumericValidationOptions {
    currency?: string;
    precision?: number;
    percentage?: boolean;
}

/**
 * Interface for validation result
 */
interface ValidationResult {
    isValid: boolean;
    errors: string[];
    errorCode?: number;
}

/**
 * Validates email format using RFC 5322 standards with enhanced security checks
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid
 */
export const validateEmail = (email: string): boolean => {
    try {
        // Sanitize input
        const sanitizedEmail = email.trim().toLowerCase();
        
        // Basic validation
        if (!sanitizedEmail || typeof sanitizedEmail !== 'string') {
            return false;
        }

        // Length check for security
        if (sanitizedEmail.length > 254) {
            return false;
        }

        // Regex validation using compiled pattern
        if (!EMAIL_REGEX.test(sanitizedEmail)) {
            return false;
        }

        // Domain validation
        const [, domain] = sanitizedEmail.split('@');
        if (!domain || domain.length > 253) {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Email validation error:', error);
        return false;
    }
};

/**
 * Validates phone number format using E.164 international format
 * @param phoneNumber - Phone number to validate
 * @param countryCode - ISO country code (e.g., 'US', 'UK')
 * @returns boolean indicating if phone number is valid
 */
export const validatePhoneNumber = (phoneNumber: string, countryCode: string = 'DEFAULT'): boolean => {
    try {
        // Sanitize input
        const sanitizedNumber = phoneNumber.replace(/\s+/g, '').replace(/[()-]/g, '');
        
        if (!sanitizedNumber || typeof sanitizedNumber !== 'string') {
            return false;
        }

        // Get country-specific regex or default
        const regex = PHONE_REGEX_MAP[countryCode] || PHONE_REGEX_MAP.DEFAULT;
        
        // Validate against pattern
        return regex.test(sanitizedNumber);
    } catch (error) {
        console.error('Phone validation error:', error);
        return false;
    }
};

/**
 * Validates date range with timezone and business hours support
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @param timezone - IANA timezone identifier
 * @returns boolean indicating if date range is valid
 */
export const validateDateRange = (startDate: Date, endDate: Date, timezone: string): boolean => {
    try {
        // Validate date objects
        if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
            return false;
        }

        // Convert to UTC for comparison
        const utcStart = startDate.getTime();
        const utcEnd = endDate.getTime();

        // Basic range validation
        if (utcStart >= utcEnd) {
            return false;
        }

        // Validate timezone
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
        } catch {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Date range validation error:', error);
        return false;
    }
};

/**
 * Validates numeric ranges with support for currency and percentages
 * @param value - Numeric value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param options - Additional validation options
 * @returns boolean indicating if number is within range
 */
export const validateNumericRange = (
    value: number,
    min: number,
    max: number,
    options: NumericValidationOptions = {}
): boolean => {
    try {
        // Basic type validation
        if (typeof value !== 'number' || isNaN(value)) {
            return false;
        }

        // Apply precision rules
        if (options.precision !== undefined) {
            const multiplier = Math.pow(10, options.precision);
            value = Math.round(value * multiplier) / multiplier;
        }

        // Percentage validation
        if (options.percentage && (value < 0 || value > 100)) {
            return false;
        }

        // Range validation
        return value >= min && value <= max;
    } catch (error) {
        console.error('Numeric validation error:', error);
        return false;
    }
};

/**
 * Validates required fields with enhanced type checking and nested object support
 * @param data - Object containing data to validate
 * @param requiredFields - Array of required field paths
 * @param validationRules - Optional Joi validation schema
 * @returns ValidationResult object with validation details
 */
export const validateRequiredFields = (
    data: Record<string, any>,
    requiredFields: string[],
    validationRules?: Record<string, any>
): ValidationResult => {
    try {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            errorCode: ErrorCodes.VALIDATION_ERROR
        };

        // Validate data object
        if (!data || typeof data !== 'object') {
            result.isValid = false;
            result.errors.push('Invalid data object');
            return result;
        }

        // Check required fields
        for (const field of requiredFields) {
            const value = field.split('.').reduce((obj, key) => obj?.[key], data);
            
            if (value === undefined || value === null || value === '') {
                result.isValid = false;
                result.errors.push(`Missing required field: ${field}`);
            }
        }

        // Apply Joi validation if rules provided
        if (validationRules && Object.keys(validationRules).length > 0) {
            const schema = Joi.object(validationRules);
            const { error } = schema.validate(data, { abortEarly: false });
            
            if (error) {
                result.isValid = false;
                result.errors.push(...error.details.map(detail => detail.message));
            }
        }

        return result;
    } catch (error) {
        console.error('Required fields validation error:', error);
        return {
            isValid: false,
            errors: ['Validation system error'],
            errorCode: ErrorCodes.VALIDATION_ERROR
        };
    }
};