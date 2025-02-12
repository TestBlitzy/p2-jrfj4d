/**
 * @fileoverview Constants and configuration values for market intelligence functionality
 * @version 1.0.0
 * Package Dependencies:
 * - typescript@5.0.0
 */

import { ActivityType, ImpactLevel } from '../types/market.types';

/**
 * Human-readable labels for different types of competitor activities
 */
export const ACTIVITY_TYPES: Record<ActivityType, string> = {
    [ActivityType.PRODUCT_LAUNCH]: 'Product Launch',
    [ActivityType.PRICE_CHANGE]: 'Price Change',
    [ActivityType.MARKETING_CAMPAIGN]: 'Marketing Campaign',
    [ActivityType.PARTNERSHIP]: 'Partnership'
};

/**
 * Human-readable labels for impact levels of market activities
 */
export const IMPACT_LEVELS: Record<ImpactLevel, string> = {
    [ImpactLevel.HIGH]: 'High Impact',
    [ImpactLevel.MEDIUM]: 'Medium Impact',
    [ImpactLevel.LOW]: 'Low Impact'
};

/**
 * Interval for refreshing market intelligence data (in milliseconds)
 * Set to 5 minutes for real-time tracking while preventing API overload
 */
export const MARKET_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Timeframe constants for trend analysis (in milliseconds)
 */
export const TREND_ANALYSIS_TIMEFRAMES: Record<string, number> = {
    DAILY: 24 * 60 * 60 * 1000,      // 1 day
    WEEKLY: 7 * 24 * 60 * 60 * 1000, // 7 days
    MONTHLY: 30 * 24 * 60 * 60 * 1000, // 30 days
    QUARTERLY: 90 * 24 * 60 * 60 * 1000 // 90 days
};

/**
 * Configuration settings for competitor tracking functionality
 */
export const COMPETITOR_TRACKING_CONFIG = {
    MAX_ACTIVITIES: 100,              // Maximum number of activities to track per competitor
    HISTORY_RETENTION_DAYS: 365,      // Number of days to retain historical data
    UPDATE_FREQUENCY: 60 * 60 * 1000, // Update frequency in milliseconds (1 hour)
    ALERT_DEBOUNCE_TIME: 5 * 60 * 1000, // Minimum time between similar alerts (5 minutes)
    DEFAULT_PAGE_SIZE: 20,            // Default number of activities per page
    MAX_TRACKED_COMPETITORS: 50       // Maximum number of competitors to track
};

/**
 * Threshold constants for price monitoring alerts (in percentage)
 */
export const PRICE_ALERT_THRESHOLDS = {
    MIN_THRESHOLD: 5,     // Minimum price change percentage to trigger alert
    MAX_THRESHOLD: 50,    // Maximum price change percentage to track
    DEFAULT_THRESHOLD: 10 // Default alert threshold percentage
};