/**
 * @fileoverview Common TypeScript type definitions for the Sales & Intelligence Platform
 * @version 1.0.0
 */

/**
 * Generic interface for standardized API responses
 * @template T The type of data contained in the response
 */
export interface ApiResponse<T> {
  /** The response payload */
  data: T;
  /** Indicates if the request was successful */
  success: boolean;
  /** Human-readable message about the response */
  message: string;
  /** Array of error messages if any occurred */
  errors: string[];
  /** ISO timestamp of when the response was generated */
  timestamp: string;
  /** HTTP status code or custom response code */
  code: number;
}

/**
 * Generic interface for paginated data responses
 * @template T The type of items in the paginated list
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of pages available */
  totalPages: number;
  /** Indicates if there is a next page available */
  hasNextPage: boolean;
  /** Indicates if there is a previous page available */
  hasPreviousPage: boolean;
}

/**
 * Type-safe enum for sort directions
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Comprehensive enum for component and data loading states
 */
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  PARTIAL = 'partial'
}

/**
 * Type-safe enum for application theme modes
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

/**
 * Base interface for common component props
 */
export interface BaseComponentProps {
  /** Optional CSS class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Optional unique identifier */
  id?: string;
  /** Optional test identifier for testing */
  testId?: string;
  /** Optional accessibility label */
  ariaLabel?: string;
  /** Optional disabled state */
  disabled?: boolean;
}

/**
 * Comprehensive interface for error state management
 */
export interface ErrorState {
  /** Human-readable error message */
  message: string;
  /** Error code for identification */
  code: string;
  /** Additional error details */
  details: Record<string, any>;
  /** ISO timestamp of when the error occurred */
  timestamp: string;
  /** Optional stack trace for debugging */
  stack?: string;
}

/**
 * Interface for date range selections
 */
export interface DateRange {
  /** Start date of the range */
  startDate: Date;
  /** End date of the range */
  endDate: Date;
  /** Optional label for the date range */
  label?: string;
}

/**
 * Enhanced interface for select/dropdown options
 */
export interface SelectOption {
  /** Option value */
  value: string | number;
  /** Display label */
  label: string;
  /** Optional disabled state */
  disabled?: boolean;
  /** Optional icon identifier */
  icon?: string;
  /** Optional description text */
  description?: string;
}

/**
 * Type guard to check if a value is a valid SortDirection
 */
export const isSortDirection = (value: any): value is SortDirection => {
  return Object.values(SortDirection).includes(value);
};

/**
 * Type guard to check if a value is a valid LoadingState
 */
export const isLoadingState = (value: any): value is LoadingState => {
  return Object.values(LoadingState).includes(value);
};

/**
 * Type guard to check if a value is a valid ThemeMode
 */
export const isThemeMode = (value: any): value is ThemeMode => {
  return Object.values(ThemeMode).includes(value);
};

/**
 * Utility type for making all properties of T required and non-nullable
 */
export type Required<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Utility type for making all properties of T optional
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Utility type for readonly arrays
 */
export type ReadonlyArray<T> = readonly T[];

/**
 * Utility type for function props with strongly typed parameters and return type
 */
export type FunctionProp<T extends (...args: any[]) => any> = T | undefined;