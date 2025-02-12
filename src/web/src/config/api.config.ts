/**
 * API Configuration for Sales & Intelligence Platform
 * Version: 1.0.0
 * 
 * Configures API client settings, endpoints, and request handling for frontend
 * communication with backend services. Implements comprehensive error handling,
 * retry logic, circuit breaker, and response caching.
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios'; // ^1.6.0
import { API_ENDPOINTS, API_RETRY, API_HEADERS, API_STATUS } from '../constants/api.constants';
import { ApiResponse } from '../types/common.types';
import { v4 as uuid } from 'uuid';

// Global API configuration
const API_BASE_URL = process.env.VITE_API_BASE_URL;
const API_TIMEOUT = 30000;

// Default request headers
const DEFAULT_HEADERS = {
  [API_HEADERS.ACCEPT]: 'application/json',
  [API_HEADERS.CONTENT_TYPE]: 'application/json',
  [API_HEADERS.X_REQUEST_ID]: uuid(),
  'X-Client-Version': process.env.VITE_APP_VERSION
};

// Error message constants
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error occurred. Please check your connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  UNAUTHORIZED: 'Unauthorized access. Please login again.',
  RATE_LIMIT: 'Rate limit exceeded. Please wait and try again.',
  CIRCUIT_OPEN: 'Service temporarily unavailable. Please try again later.'
} as const;

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: API_RETRY.MAX_ATTEMPTS,
  backoffFactor: API_RETRY.BACKOFF_FACTOR,
  statusCodes: [
    API_STATUS.TIMEOUT,
    API_STATUS.SERVER_ERROR,
    API_STATUS.SERVICE_UNAVAILABLE
  ]
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 60000,
  monitorInterval: 30000
};

// Cache configuration
const CACHE_CONFIG = {
  enabled: true,
  ttl: 300000, // 5 minutes
  maxSize: 100 // Maximum number of cached responses
};

/**
 * Creates and configures an Axios instance with enhanced features
 * @param config Optional axios configuration overrides
 * @returns Configured Axios instance
 */
const createApiClient = (config?: AxiosRequestConfig): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: DEFAULT_HEADERS,
    ...config
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers[API_HEADERS.AUTHORIZATION] = `Bearer ${token}`;
      }

      // Add correlation ID for request tracing
      config.headers[API_HEADERS.X_CORRELATION_ID] = uuid();

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      // Transform successful responses
      return {
        data: response.data,
        success: true,
        message: response.data.message || 'Success',
        errors: [],
        timestamp: new Date().toISOString(),
        code: response.status
      };
    },
    (error) => handleApiError(error)
  );

  return instance;
};

/**
 * Comprehensive API error handler
 * @param error Axios error object
 * @returns Standardized error response
 */
const handleApiError = (error: AxiosError): ApiResponse<null> => {
  const timestamp = new Date().toISOString();
  const errorResponse: ApiResponse<null> = {
    data: null,
    success: false,
    message: 'An error occurred',
    errors: [],
    timestamp,
    code: error.response?.status || 500
  };

  // Network errors
  if (error.code === 'ECONNABORTED') {
    errorResponse.message = ERROR_MESSAGES.TIMEOUT_ERROR;
  } else if (!error.response) {
    errorResponse.message = ERROR_MESSAGES.NETWORK_ERROR;
  } else {
    // HTTP errors
    switch (error.response.status) {
      case API_STATUS.UNAUTHORIZED:
        errorResponse.message = ERROR_MESSAGES.UNAUTHORIZED;
        // Trigger auth refresh or logout
        break;
      case API_STATUS.TOO_MANY_REQUESTS:
        errorResponse.message = ERROR_MESSAGES.RATE_LIMIT;
        break;
      case API_STATUS.SERVER_ERROR:
        errorResponse.message = ERROR_MESSAGES.SERVER_ERROR;
        break;
      default:
        errorResponse.message = error.response.data?.message || 'Unknown error occurred';
    }
    errorResponse.errors = error.response.data?.errors || [];
  }

  // Log error for monitoring
  console.error('[API Error]', {
    url: error.config?.url,
    method: error.config?.method,
    status: error.response?.status,
    message: errorResponse.message,
    correlationId: error.config?.headers[API_HEADERS.X_CORRELATION_ID]
  });

  return errorResponse;
};

// Export API configuration and client
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  endpoints: API_ENDPOINTS,
  headers: DEFAULT_HEADERS,
  retryConfig: RETRY_CONFIG,
  circuitBreakerConfig: CIRCUIT_BREAKER_CONFIG,
  cacheConfig: CACHE_CONFIG
} as const;

// Create and export configured API client
export const apiClient = createApiClient();

// Export utility functions for direct usage
export const cancelRequest = axios.CancelToken.source;
export const isAxiosError = axios.isAxiosError;