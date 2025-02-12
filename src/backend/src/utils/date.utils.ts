/**
 * Enterprise-grade date manipulation utilities for high-performance analytics and lead management
 * Supporting global deployment with UTC handling and fiscal year calculations
 * @packageDocumentation
 */

import dayjs from 'dayjs'; // ^1.11.0
import utc from 'dayjs/plugin/utc'; // ^1.11.0
import { HistoricalDataParams } from '../types/analytics.types';

// Configure dayjs with UTC plugin
dayjs.extend(utc);

// Global constants
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const UTC_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

// Cache for date range calculations
const dateRangeCache = new Map<string, { startDate: Date; endDate: Date }>();

/**
 * Interface for date formatting options
 */
interface DateFormatOptions {
  useUTC?: boolean;
  locale?: string;
  fiscalYearStart?: number;
}

/**
 * Interface for date range options
 */
interface DateRangeOptions {
  useUTC?: boolean;
  fiscalYearStart?: number;
  cacheResults?: boolean;
}

/**
 * Formats a date into a standardized string format with locale support
 * @param date - Input date to format
 * @param format - Output format string
 * @param options - Formatting options
 * @returns Formatted date string
 * @throws Error if date is invalid
 */
export const formatDate = (
  date: Date,
  format: string = DEFAULT_DATE_FORMAT,
  options: DateFormatOptions = {}
): string => {
  if (!date) {
    throw new Error('Invalid date input');
  }

  const { useUTC = true, locale } = options;
  let dateObj = dayjs(date);

  if (useUTC) {
    dateObj = dateObj.utc();
  }

  if (locale) {
    dateObj = dateObj.locale(locale);
  }

  return dateObj.format(format);
};

/**
 * High-performance date range calculator with caching
 * @param period - Time period number
 * @param unit - Time unit (days, months, years)
 * @param options - Calculation options
 * @returns Object containing start and end dates
 */
export const calculateDateRange = (
  period: number,
  unit: string,
  options: DateRangeOptions = {}
): { startDate: Date; endDate: Date } => {
  if (period <= 0) {
    throw new Error('Period must be positive');
  }

  const { useUTC = true, cacheResults = true } = options;
  const cacheKey = `${period}-${unit}-${useUTC}`;

  if (cacheResults && dateRangeCache.has(cacheKey)) {
    return dateRangeCache.get(cacheKey)!;
  }

  const endDate = useUTC ? dayjs.utc() : dayjs();
  const startDate = endDate.subtract(period, unit as any);

  const result = {
    startDate: startDate.toDate(),
    endDate: endDate.toDate()
  };

  if (cacheResults) {
    dateRangeCache.set(cacheKey, result);
  }

  return result;
};

/**
 * Optimized date range checker with timezone awareness
 * @param date - Date to check
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @param options - Check options
 * @returns Boolean indicating if date is within range
 */
export const isWithinRange = (
  date: Date,
  startDate: Date,
  endDate: Date,
  options: { useUTC?: boolean } = {}
): boolean => {
  if (!date || !startDate || !endDate) {
    throw new Error('Invalid date input');
  }

  const { useUTC = true } = options;
  const dateObj = useUTC ? dayjs.utc(date) : dayjs(date);
  const start = useUTC ? dayjs.utc(startDate) : dayjs(startDate);
  const end = useUTC ? dayjs.utc(endDate) : dayjs(endDate);

  return dateObj.isAfter(start) && dateObj.isBefore(end);
};

/**
 * Adds time to date with performance optimization for bulk operations
 * @param date - Base date
 * @param amount - Amount to add
 * @param unit - Time unit to add
 * @param options - Addition options
 * @returns New date with added time
 */
export const addToDate = (
  date: Date,
  amount: number,
  unit: string,
  options: { useUTC?: boolean } = {}
): Date => {
  if (!date || amount === undefined) {
    throw new Error('Invalid input parameters');
  }

  const { useUTC = true } = options;
  const dateObj = useUTC ? dayjs.utc(date) : dayjs(date);
  
  return dateObj.add(amount, unit as any).toDate();
};

/**
 * Gets fiscal quarter date range with caching and performance optimization
 * @param quarter - Fiscal quarter (1-4)
 * @param year - Fiscal year
 * @param options - Quarter calculation options
 * @returns Object containing quarter start and end dates
 */
export const getQuarterRange = (
  quarter: number,
  year: number,
  options: DateRangeOptions = {}
): { startDate: Date; endDate: Date } => {
  if (quarter < 1 || quarter > 4) {
    throw new Error('Invalid quarter number');
  }

  const { useUTC = true, fiscalYearStart = 1, cacheResults = true } = options;
  const cacheKey = `Q${quarter}-${year}-${fiscalYearStart}-${useUTC}`;

  if (cacheResults && dateRangeCache.has(cacheKey)) {
    return dateRangeCache.get(cacheKey)!;
  }

  const startMonth = ((quarter - 1) * 3 + fiscalYearStart - 1) % 12;
  const startDate = useUTC ? 
    dayjs.utc().year(year).month(startMonth).startOf('month') :
    dayjs().year(year).month(startMonth).startOf('month');
  
  const endDate = startDate.add(3, 'month').subtract(1, 'millisecond');

  const result = {
    startDate: startDate.toDate(),
    endDate: endDate.toDate()
  };

  if (cacheResults) {
    dateRangeCache.set(cacheKey, result);
  }

  return result;
};

/**
 * High-performance UTC date parser with validation
 * @param dateString - Date string to parse
 * @param options - Parsing options
 * @returns Validated UTC Date object
 * @throws Error if date string is invalid
 */
export const parseUTCDate = (
  dateString: string,
  options: { format?: string } = {}
): Date => {
  if (!dateString) {
    throw new Error('Invalid date string');
  }

  const { format = UTC_DATE_FORMAT } = options;
  const parsed = dayjs.utc(dateString, format);

  if (!parsed.isValid()) {
    throw new Error('Invalid date format');
  }

  return parsed.toDate();
};

/**
 * Clears the date range calculation cache
 * @internal
 */
export const clearDateRangeCache = (): void => {
  dateRangeCache.clear();
};

// Performance optimization: Pre-compile frequently used date formats
const commonFormats = [
  DEFAULT_DATE_FORMAT,
  UTC_DATE_FORMAT,
  'YYYY-MM-DD HH:mm:ss',
  'MM/DD/YYYY'
].map(format => dayjs().format(format));