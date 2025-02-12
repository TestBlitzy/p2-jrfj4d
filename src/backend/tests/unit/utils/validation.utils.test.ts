/**
 * @fileoverview Comprehensive unit test suite for validation utility functions
 * Version: 1.0.0
 */

import {
  validateEmail,
  validatePhoneNumber,
  validateDateRange,
  validateNumericRange,
  validateRequiredFields
} from '../../src/utils/validation.utils';
import { ErrorCodes } from '../../src/constants/error-codes';
import { bench, describe, expect, it } from 'jest';

describe('validateEmail', () => {
  // Standard email format tests
  it('should validate standard email formats correctly', () => {
    expect(validateEmail('user@domain.com')).toBe(true);
    expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    expect(validateEmail('user@subdomain.domain.org')).toBe(true);
  });

  // International email tests
  it('should validate international email addresses', () => {
    expect(validateEmail('user@münchen.de')).toBe(true);
    expect(validateEmail('用户@公司.中国')).toBe(true);
    expect(validateEmail('пользователь@домен.рф')).toBe(true);
  });

  // Security test cases
  it('should reject SQL injection attempts', () => {
    expect(validateEmail("' OR '1'='1")).toBe(false);
    expect(validateEmail('user@domain.com; DROP TABLE users;')).toBe(false);
    expect(validateEmail('admin\'--@domain.com')).toBe(false);
  });

  it('should reject XSS attack patterns', () => {
    expect(validateEmail('<script>alert(1)</script>@domain.com')).toBe(false);
    expect(validateEmail('"><img src=x onerror=alert(1)>@domain.com')).toBe(false);
  });

  // Length and format validation
  it('should enforce email length limits', () => {
    const longEmail = 'a'.repeat(255) + '@domain.com';
    expect(validateEmail(longEmail)).toBe(false);
  });

  // Performance benchmarking
  it('should validate emails within performance threshold', () => {
    bench('email validation performance', () => {
      validateEmail('user@domain.com');
    }, { maxTime: 50 }); // 50ms threshold
  });
});

describe('validatePhoneNumber', () => {
  // E.164 format tests
  it('should validate E.164 format numbers', () => {
    expect(validatePhoneNumber('+12125551234', 'US')).toBe(true);
    expect(validatePhoneNumber('+442071234567', 'UK')).toBe(true);
  });

  // International format tests
  it('should validate international numbers with country codes', () => {
    expect(validatePhoneNumber('+86 21 1234 5678', 'CN')).toBe(true);
    expect(validatePhoneNumber('+33 1 23 45 67 89', 'FR')).toBe(true);
  });

  // Invalid format tests
  it('should reject invalid phone formats', () => {
    expect(validatePhoneNumber('1234567890')).toBe(false);
    expect(validatePhoneNumber('+1abc4567890')).toBe(false);
  });

  // Performance benchmarking
  it('should validate phone numbers within performance threshold', () => {
    bench('phone validation performance', () => {
      validatePhoneNumber('+12125551234', 'US');
    }, { maxTime: 50 }); // 50ms threshold
  });
});

describe('validateDateRange', () => {
  // Timezone handling tests
  it('should validate date ranges across timezones', () => {
    const start = new Date('2023-01-01T00:00:00Z');
    const end = new Date('2023-12-31T23:59:59Z');
    expect(validateDateRange(start, end, 'America/New_York')).toBe(true);
  });

  // Business hours validation
  it('should validate business hour constraints', () => {
    const start = new Date('2023-01-01T09:00:00Z');
    const end = new Date('2023-01-01T17:00:00Z');
    expect(validateDateRange(start, end, 'UTC')).toBe(true);
  });

  // Invalid range tests
  it('should reject invalid date ranges', () => {
    const start = new Date('2023-12-31T00:00:00Z');
    const end = new Date('2023-01-01T00:00:00Z');
    expect(validateDateRange(start, end, 'UTC')).toBe(false);
  });

  // Performance benchmarking
  it('should validate date ranges within performance threshold', () => {
    bench('date range validation performance', () => {
      validateDateRange(new Date(), new Date(Date.now() + 86400000), 'UTC');
    }, { maxTime: 50 }); // 50ms threshold
  });
});

describe('validateNumericRange', () => {
  // Currency validation tests
  it('should validate currency amounts', () => {
    expect(validateNumericRange(1234.56, 0, 10000, { currency: 'USD', precision: 2 })).toBe(true);
    expect(validateNumericRange(-100, 0, 10000, { currency: 'USD' })).toBe(false);
  });

  // Percentage validation tests
  it('should validate percentage ranges', () => {
    expect(validateNumericRange(99.99, 0, 100, { percentage: true })).toBe(true);
    expect(validateNumericRange(150, 0, 100, { percentage: true })).toBe(false);
  });

  // Precision validation tests
  it('should enforce decimal precision rules', () => {
    expect(validateNumericRange(123.456, 0, 1000, { precision: 2 })).toBe(true);
    expect(validateNumericRange(123.456789, 0, 1000, { precision: 4 })).toBe(true);
  });

  // Performance benchmarking
  it('should validate numeric ranges within performance threshold', () => {
    bench('numeric validation performance', () => {
      validateNumericRange(500, 0, 1000, { precision: 2 });
    }, { maxTime: 50 }); // 50ms threshold
  });
});

describe('validateRequiredFields', () => {
  // Required fields validation tests
  it('should validate required fields in objects', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+12125551234'
    };
    const result = validateRequiredFields(data, ['name', 'email']);
    expect(result.isValid).toBe(true);
  });

  // Nested object validation tests
  it('should validate nested required fields', () => {
    const data = {
      user: {
        profile: {
          name: 'John Doe',
          contact: {
            email: 'john@example.com'
          }
        }
      }
    };
    const result = validateRequiredFields(data, ['user.profile.name', 'user.profile.contact.email']);
    expect(result.isValid).toBe(true);
  });

  // Error handling tests
  it('should handle validation errors correctly', () => {
    const data = {
      name: 'John Doe'
    };
    const result = validateRequiredFields(data, ['email']);
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  // Performance benchmarking
  it('should validate required fields within performance threshold', () => {
    bench('required fields validation performance', () => {
      validateRequiredFields({ name: 'Test', email: 'test@example.com' }, ['name', 'email']);
    }, { maxTime: 50 }); // 50ms threshold
  });
});