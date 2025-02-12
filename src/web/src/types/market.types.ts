/**
 * @fileoverview TypeScript type definitions for market intelligence functionality
 * @version 1.0.0
 * Package Dependencies:
 * - typescript@5.0.0
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
 * Interface representing competitor data
 */
export interface Competitor {
    id: string;
    name: string;
    website: string;
    description: string;
    marketShare: number;
    lastUpdated: Date;
}

/**
 * Interface representing competitor activity data
 */
export interface CompetitorActivity {
    id: string;
    competitorId: string;
    type: ActivityType;
    description: string;
    impactLevel: ImpactLevel;
    date: Date;
}

/**
 * Interface representing market trend data
 */
export interface MarketTrend {
    id: string;
    keyword: string;
    mentionCount: number;
    sentiment: SentimentType;
    timeframe: TimeframeType;
    sources: string[];
}

/**
 * Interface representing price alert configuration
 */
export interface PriceAlert {
    id: string;
    competitorProductId: string;
    condition: AlertCondition;
    threshold: number;
    isActive: boolean;
}