/**
 * @fileoverview Enterprise-grade validation utilities for the Sales & Intelligence Platform
 * @version 1.0.0
 * Dependencies:
 * - zod: ^3.22.0
 */

import { z } from 'zod';
import { ApiResponse } from '../types/common.types';

// Constants for validation rules
const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;
const MAX_STRING_LENGTH = 1000; // General safety limit
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Sanitizes input string to prevent XSS attacks
 * @param input - String to sanitize
 * @returns Sanitized string
 */
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

/**
 * Validates email format using RFC 5322 compliant regex
 * @param email - Email address to validate
 * @returns Boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const sanitizedEmail = sanitizeInput(email);
  
  if (sanitizedEmail.length > MAX_EMAIL_LENGTH) return false;
  if (sanitizedEmail.length === 0) return false;
  
  // Check for RFC 5322 compliance
  if (!EMAIL_REGEX.test(sanitizedEmail)) return false;
  
  // Additional security checks
  if (sanitizedEmail.includes('..')) return false;
  if (sanitizedEmail.startsWith('.') || sanitizedEmail.endsWith('.')) return false;
  
  return true;
};

/**
 * Validates required fields with type checking
 * @param value - Value to check
 * @param fieldName - Name of the field for error message
 * @returns Error message if invalid, empty string if valid
 */
export const validateRequired = (value: any, fieldName: string): string => {
  const sanitizedFieldName = sanitizeInput(fieldName);
  
  if (value === undefined || value === null) {
    return `${sanitizedFieldName} is required`;
  }
  
  if (typeof value === 'string' && value.trim().length === 0) {
    return `${sanitizedFieldName} is required`;
  }
  
  if (Array.isArray(value) && value.length === 0) {
    return `${sanitizedFieldName} must have at least one item`;
  }
  
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return `${sanitizedFieldName} cannot be empty`;
  }
  
  return '';
};

/**
 * Validates string length with unicode support
 * @param value - String to validate
 * @param minLength - Minimum allowed length
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of the field for error message
 * @returns Error message if invalid, empty string if valid
 */
export const validateLength = (
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): string => {
  const sanitizedValue = sanitizeInput(value);
  const sanitizedFieldName = sanitizeInput(fieldName);
  
  // Use Array.from to properly handle unicode characters
  const length = Array.from(sanitizedValue).length;
  
  if (length < minLength) {
    return `${sanitizedFieldName} must be at least ${minLength} characters`;
  }
  
  if (length > maxLength) {
    return `${sanitizedFieldName} cannot exceed ${maxLength} characters`;
  }
  
  if (length > MAX_STRING_LENGTH) {
    return `${sanitizedFieldName} exceeds maximum safe length`;
  }
  
  return '';
};

/**
 * Validates numeric ranges with precision handling
 * @param value - Number to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fieldName - Name of the field for error message
 * @returns Error message if invalid, empty string if valid
 */
export const validateNumericRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string
): string => {
  const sanitizedFieldName = sanitizeInput(fieldName);
  
  if (typeof value !== 'number' || isNaN(value)) {
    return `${sanitizedFieldName} must be a valid number`;
  }
  
  if (value < min) {
    return `${sanitizedFieldName} must be at least ${min}`;
  }
  
  if (value > max) {
    return `${sanitizedFieldName} cannot exceed ${max}`;
  }
  
  if (Math.abs(value) > MAX_SAFE_INTEGER) {
    return `${sanitizedFieldName} exceeds maximum safe integer value`;
  }
  
  return '';
};

/**
 * Validates date ranges with timezone handling
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns Error message if invalid, empty string if valid
 */
export const validateDateRange = (startDate: Date, endDate: Date): string => {
  // Ensure valid date objects
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    return 'Invalid start date';
  }
  
  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    return 'Invalid end date';
  }
  
  // Convert to UTC for consistent comparison
  const utcStartDate = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  
  const utcEndDate = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  
  if (utcStartDate > utcEndDate) {
    return 'Start date must be before or equal to end date';
  }
  
  // Validate against business rules
  const maxRangeDays = 365; // Maximum one year range
  const daysDiff = Math.ceil((utcEndDate - utcStartDate) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > maxRangeDays) {
    return `Date range cannot exceed ${maxRangeDays} days`;
  }
  
  return '';
};

// Zod schemas for complex validations
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .max(MAX_EMAIL_LENGTH, `Email cannot exceed ${MAX_EMAIL_LENGTH} characters`)
  .email('Invalid email format')
  .refine((email) => isValidEmail(email), 'Invalid email format');

export const passwordSchema = z.string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Type guard to check if response contains errors
 * @param response - API response object
 * @returns Boolean indicating if response has errors
 */
export const hasErrors = (response: ApiResponse<any>): boolean => {
  return !response.success || (response.errors && response.errors.length > 0);
};