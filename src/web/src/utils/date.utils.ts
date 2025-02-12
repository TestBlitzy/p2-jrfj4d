/**
 * @fileoverview Date manipulation and formatting utilities with enhanced internationalization,
 * accessibility, and performance optimizations for the Sales & Intelligence Platform.
 * @version 1.0.0
 * @package date-fns ^2.30.0
 * @package lodash ^4.17.21
 */

import { format, isValid, parseISO, differenceInDays, addDays, subDays } from 'date-fns';
import { memoize } from 'lodash';
import { DateRange } from '../types/common.types';

/**
 * Error messages for date operations
 */
const DATE_ERRORS = {
  INVALID_DATE: 'Invalid date provided',
  INVALID_FORMAT: 'Invalid format string',
  INVALID_RANGE: 'Invalid date range: start date must be before end date',
  MISSING_DATE: 'Date is required',
} as const;

/**
 * Formats a date with internationalization and accessibility support
 * @param date - Date to format
 * @param formatString - Format pattern (date-fns compatible)
 * @param locale - Optional locale for internationalization
 * @returns Formatted date string with ARIA attributes
 */
export const formatDate = (
  date: Date | string,
  formatString: string,
  locale?: Locale
): string => {
  try {
    if (!date) {
      throw new Error(DATE_ERRORS.MISSING_DATE);
    }

    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    const formattedDate = format(dateObj, formatString, { locale });
    
    // Add ARIA attributes for accessibility
    return `<time datetime="${dateObj.toISOString()}" aria-label="${formattedDate}">${formattedDate}</time>`;
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

/**
 * Validates if the provided value is a valid date
 * @param value - Value to validate as date
 * @returns Boolean indicating if the value is a valid date
 */
export const isValidDate = (value: any): boolean => {
  if (!value) {
    return false;
  }

  try {
    const date = typeof value === 'string' ? parseISO(value) : value;
    return isValid(date);
  } catch (error) {
    console.error('Date validation error:', error);
    return false;
  }
};

/**
 * Creates a memoized date range object with validation
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @param label - Optional label for the date range
 * @returns DateRange object
 */
export const getDateRange = memoize(
  (startDate: Date | string, endDate: Date | string, label?: string): DateRange => {
    try {
      const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
      const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

      if (!isValid(start) || !isValid(end)) {
        throw new Error(DATE_ERRORS.INVALID_DATE);
      }

      if (differenceInDays(end, start) < 0) {
        throw new Error(DATE_ERRORS.INVALID_RANGE);
      }

      return {
        startDate: start,
        endDate: end,
        label
      };
    } catch (error) {
      console.error('Date range creation error:', error);
      throw error;
    }
  },
  // Custom resolver for memoization key
  (startDate, endDate, label) => `${startDate}-${endDate}-${label}`
);

/**
 * Converts a date to an accessible relative time string
 * @param date - Date to convert
 * @param locale - Optional locale for internationalization
 * @returns Localized relative time string with ARIA attributes
 */
export const getRelativeTimeString = memoize(
  (date: Date | string, locale?: Locale): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date;

      if (!isValid(dateObj)) {
        throw new Error(DATE_ERRORS.INVALID_DATE);
      }

      const now = new Date();
      const diffDays = differenceInDays(now, dateObj);

      let relativeString: string;
      if (diffDays === 0) {
        relativeString = 'Today';
      } else if (diffDays === 1) {
        relativeString = 'Yesterday';
      } else if (diffDays === -1) {
        relativeString = 'Tomorrow';
      } else if (diffDays > 1) {
        relativeString = `${diffDays} days ago`;
      } else {
        relativeString = `In ${Math.abs(diffDays)} days`;
      }

      // Add ARIA attributes for accessibility
      return `<time datetime="${dateObj.toISOString()}" aria-label="${relativeString}">${relativeString}</time>`;
    } catch (error) {
      console.error('Relative time calculation error:', error);
      return 'Invalid date';
    }
  },
  // Custom resolver for memoization key
  (date, locale) => `${date}-${locale?.code || 'default'}`
);

/**
 * Adds days to a date with validation
 * @param date - Base date
 * @param days - Number of days to add
 * @returns New date with added days
 */
export const addDaysToDate = (date: Date | string, days: number): Date => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    return addDays(dateObj, days);
  } catch (error) {
    console.error('Date addition error:', error);
    throw error;
  }
};

/**
 * Subtracts days from a date with validation
 * @param date - Base date
 * @param days - Number of days to subtract
 * @returns New date with subtracted days
 */
export const subtractDaysFromDate = (date: Date | string, days: number): Date => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) {
      throw new Error(DATE_ERRORS.INVALID_DATE);
    }

    return subDays(dateObj, days);
  } catch (error) {
    console.error('Date subtraction error:', error);
    throw error;
  }
};