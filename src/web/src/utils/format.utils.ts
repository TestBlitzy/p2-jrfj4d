/**
 * @fileoverview Utility functions for formatting data in the Sales & Intelligence Platform
 * @version 1.0.0
 */

import numeral from 'numeral'; // ^2.0.6
import { truncate } from 'lodash'; // ^4.17.21
import { ApiResponse } from '../types/common.types';

/**
 * Color coding thresholds for lead scores
 */
const SCORE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4
} as const;

/**
 * Interface for formatted lead score return value
 */
interface FormattedLeadScore {
  value: string;
  color: string;
  confidence: string;
  ariaLabel: string;
}

/**
 * Formats a number as a currency string with proper symbol and locale support
 * @param value - The numeric value to format
 * @param currency - The ISO currency code (e.g., 'USD', 'EUR')
 * @param locale - The locale identifier (e.g., 'en-US')
 * @returns Formatted currency string
 * @throws {TypeError} If value is not a valid number
 */
export const formatCurrency = (
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Value must be a valid number');
  }

  if (value === null || value === undefined) {
    return '—';
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatted = formatter.format(value);
  return `<span aria-label="${value} ${currency}">${formatted}</span>`;
};

/**
 * Formats a decimal number as a percentage with locale support
 * @param value - The decimal value to format (0-1 or 0-100)
 * @param decimals - Number of decimal places to display
 * @param locale - The locale identifier
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  decimals: number = 0,
  locale: string = 'en-US'
): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '—';
  }

  // Normalize value to 0-1 range
  const normalizedValue = value > 1 ? value / 100 : value;

  const formatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  const formatted = formatter.format(normalizedValue);
  return `<span aria-label="${formatted}">${formatted}</span>`;
};

/**
 * Formats a number with locale-aware separators and scientific notation support
 * @param value - The number to format
 * @param decimals - Number of decimal places
 * @param locale - The locale identifier
 * @param useScientific - Whether to use scientific notation for large numbers
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  decimals: number = 0,
  locale: string = 'en-US',
  useScientific: boolean = false
): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '—';
  }

  const absValue = Math.abs(value);
  
  if (useScientific && (absValue >= 1e6 || absValue <= 1e-6)) {
    return value.toExponential(decimals);
  }

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  const formatted = formatter.format(value);
  return `<span aria-label="${value}">${formatted}</span>`;
};

/**
 * Truncates text with HTML entity handling and word boundary support
 * @param text - The text to truncate
 * @param length - Maximum length
 * @param ellipsis - Custom ellipsis character
 * @param wordBoundary - Whether to respect word boundaries
 * @returns Safely truncated text string
 */
export const truncateText = (
  text: string,
  length: number = 100,
  ellipsis: string = '...',
  wordBoundary: boolean = true
): string => {
  if (!text) return '';

  // Sanitize input text
  const sanitized = text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const truncated = truncate(sanitized, {
    length,
    separator: wordBoundary ? ' ' : undefined,
    omission: ellipsis
  });

  return `<span title="${sanitized}">${truncated}</span>`;
};

/**
 * Formats a lead score with color coding and confidence indicator
 * @param score - The lead score (0-1)
 * @param confidence - The confidence score (0-1)
 * @returns Formatted score object with value, color, and confidence
 */
export const formatLeadScore = (
  score: number,
  confidence?: number
): FormattedLeadScore => {
  if (typeof score !== 'number' || score < 0 || score > 1) {
    throw new Error('Score must be a number between 0 and 1');
  }

  let color: string;
  if (score >= SCORE_THRESHOLDS.HIGH) {
    color = '#28a745'; // green
  } else if (score >= SCORE_THRESHOLDS.MEDIUM) {
    color = '#ffc107'; // yellow
  } else if (score >= SCORE_THRESHOLDS.LOW) {
    color = '#dc3545'; // red
  } else {
    color = '#6c757d'; // gray
  }

  const formattedScore = formatPercentage(score, 0);
  const confidenceIndicator = confidence 
    ? ` (${formatPercentage(confidence, 0)} confidence)`
    : '';

  return {
    value: formattedScore,
    color,
    confidence: confidenceIndicator,
    ariaLabel: `Lead score: ${formattedScore}${confidenceIndicator}`
  };
};

/**
 * Type guard to check if a value is a valid number for formatting
 * @param value - The value to check
 * @returns Boolean indicating if the value is valid
 */
const isValidNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * Formats an API error response for display
 * @param error - The API error response
 * @returns Formatted error message
 */
export const formatApiError = (error: ApiResponse<any>): string => {
  if (!error) return 'An unknown error occurred';
  
  const errorMessage = error.errors?.length 
    ? error.errors.join('. ')
    : error.message || 'An unknown error occurred';

  return `Error ${error.code}: ${errorMessage}`;
};