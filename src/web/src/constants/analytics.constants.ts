import { AnalyticsMetricType } from '../types/analytics.types';

/**
 * Time range constants for analytics queries and filtering
 * @version 1.0.0
 */
export const ANALYTICS_TIME_RANGES = {
    LAST_24_HOURS: '24h',
    LAST_7_DAYS: '7d',
    LAST_30_DAYS: '30d',
    LAST_90_DAYS: '90d',
    LAST_12_MONTHS: '12m',
    CUSTOM: 'custom'
} as const;

/**
 * Chart type constants for visualization options
 * @version 1.0.0
 */
export const CHART_TYPES = {
    LINE: 'line',
    BAR: 'bar',
    PIE: 'pie',
    AREA: 'area',
    SCATTER: 'scatter',
    HEATMAP: 'heatmap'
} as const;

/**
 * Color scheme constants for different metric types and visualizations
 * @version 1.0.0
 */
export const CHART_COLORS = {
    REVENUE: '#4CAF50',
    CONVERSION: '#2196F3',
    VELOCITY: '#FFC107',
    MARKET_SHARE: '#9C27B0',
    PATTERN: '#FF5722',
    TREND: '#607D8B'
} as const;

/**
 * Standard date format for chart displays and data processing
 * @version 1.0.0
 */
export const CHART_DATE_FORMAT = 'YYYY-MM-DD';

/**
 * Default chart configuration options
 * @version 1.0.0
 */
export const DEFAULT_CHART_OPTIONS = {
    SHOW_LEGEND: true,
    ENABLE_ZOOM: true,
    SHOW_GRID: true,
    ANIMATION_DURATION: 500,
    ENABLE_TOOLTIPS: true,
    RESPONSIVE: true,
    MAINTAIN_ASPECT_RATIO: false
} as const;

/**
 * Threshold constants for analytics processing and validation
 * @version 1.0.0
 */
export const ANALYTICS_THRESHOLDS = {
    MIN_DATA_POINTS: 1000,
    CONFIDENCE_THRESHOLD: 0.9,
    PATTERN_DETECTION_THRESHOLD: 0.75,
    TREND_SIGNIFICANCE_THRESHOLD: 0.8,
    MIN_PATTERN_OCCURRENCE: 3,
    TREND_VALIDATION_PERIOD: 14
} as const;

/**
 * Forecast period constants for different time horizons
 * @version 1.0.0
 */
export const FORECAST_PERIODS = {
    SHORT_TERM: 30,
    MEDIUM_TERM: 90,
    LONG_TERM: 365,
    CUSTOM_MAX: 730
} as const;

/**
 * Display formatting options for different metric types
 * Includes localization and formatting preferences
 * @version 1.0.0
 */
export const METRIC_DISPLAY_OPTIONS = {
    [AnalyticsMetricType.REVENUE]: {
        prefix: '$',
        decimals: 2,
        format: 'currency',
        grouping: true,
        locale: 'en-US'
    },
    [AnalyticsMetricType.CONVERSION_RATE]: {
        suffix: '%',
        decimals: 1,
        format: 'percentage',
        min: 0,
        max: 100
    },
    [AnalyticsMetricType.SALES_VELOCITY]: {
        suffix: 'days',
        decimals: 1,
        format: 'number',
        min: 0
    },
    [AnalyticsMetricType.MARKET_SHARE]: {
        suffix: '%',
        decimals: 1,
        format: 'percentage',
        min: 0,
        max: 100
    }
} as const;

/**
 * Pattern recognition configuration constants
 * @version 1.0.0
 */
export const PATTERN_RECOGNITION_CONFIG = {
    MIN_SEQUENCE_LENGTH: 5,
    MAX_GAP_TOLERANCE: 2,
    SIMILARITY_THRESHOLD: 0.85,
    SEASONALITY_PERIODS: {
        DAILY: 24,
        WEEKLY: 7,
        MONTHLY: 30,
        QUARTERLY: 90,
        YEARLY: 365
    }
} as const;

/**
 * Market trend analysis configuration constants
 * @version 1.0.0
 */
export const MARKET_TREND_CONFIG = {
    MIN_DATA_POINTS_FOR_TREND: 14,
    TREND_CONFIDENCE_THRESHOLD: 0.8,
    TREND_TYPES: {
        UPWARD: 'upward',
        DOWNWARD: 'downward',
        SIDEWAYS: 'sideways',
        VOLATILE: 'volatile'
    },
    SIGNIFICANCE_LEVELS: {
        HIGH: 0.95,
        MEDIUM: 0.85,
        LOW: 0.75
    }
} as const;