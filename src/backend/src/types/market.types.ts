/**
 * @fileoverview TypeScript type definitions and enums for market intelligence functionality
 * @version 5.0.0
 */

/**
 * Enum representing different types of competitor activities
 */
export enum ActivityType {
    PRODUCT_LAUNCH = 'PRODUCT_LAUNCH',
    PRICE_CHANGE = 'PRICE_CHANGE',
    MARKETING_CAMPAIGN = 'MARKETING_CAMPAIGN',
    PARTNERSHIP = 'PARTNERSHIP'
}

/**
 * Enum representing impact levels of competitor activities
 */
export enum ImpactLevel {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

/**
 * Enum representing market sentiment analysis results
 */
export enum SentimentType {
    POSITIVE = 'POSITIVE',
    NEUTRAL = 'NEUTRAL',
    NEGATIVE = 'NEGATIVE'
}

/**
 * Enum representing analysis timeframes
 */
export enum TimeframeType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY'
}

/**
 * Enum representing price alert conditions
 */
export enum AlertCondition {
    ABOVE = 'ABOVE',
    BELOW = 'BELOW',
    EQUAL = 'EQUAL'
}

/**
 * Type definition for competitor data
 */
export type CompetitorType = {
    id: string;
    name: string;
    website: string;
    description: string;
    marketShare: number;
    lastUpdated: Date;
}

/**
 * Type definition for competitor activity data
 */
export type CompetitorActivityType = {
    id: string;
    competitorId: string;
    type: ActivityType;
    description: string;
    impactLevel: ImpactLevel;
    date: Date;
}

/**
 * Type definition for market trend data
 */
export type MarketTrendType = {
    id: string;
    keyword: string;
    mentionCount: number;
    sentiment: SentimentType;
    timeframe: TimeframeType;
    sources: string[];
}

/**
 * Type definition for price alert configuration
 */
export type PriceAlertType = {
    id: string;
    competitorProductId: string;
    condition: AlertCondition;
    threshold: number;
    isActive: boolean;
}