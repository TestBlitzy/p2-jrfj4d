/**
 * @packageVersion typescript@5.0.0
 * Market intelligence interfaces and enums for competitor tracking, market trends, and price monitoring
 */

/**
 * Types of competitor activities that can be tracked in the system
 */
export enum ActivityType {
    PRODUCT_LAUNCH = 'PRODUCT_LAUNCH',
    PRICE_CHANGE = 'PRICE_CHANGE',
    MARKETING_CAMPAIGN = 'MARKETING_CAMPAIGN',
    PARTNERSHIP = 'PARTNERSHIP'
}

/**
 * Business impact levels for market activities
 */
export enum ImpactLevel {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

/**
 * Market sentiment analysis results from AI processing
 */
export enum SentimentType {
    POSITIVE = 'POSITIVE',
    NEUTRAL = 'NEUTRAL',
    NEGATIVE = 'NEGATIVE'
}

/**
 * Time periods for trend analysis and reporting
 */
export enum TimeframeType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY'
}

/**
 * Price monitoring alert conditions
 */
export enum AlertCondition {
    ABOVE = 'ABOVE',
    BELOW = 'BELOW',
    EQUAL = 'EQUAL'
}

/**
 * Core competitor information structure
 */
export interface ICompetitor {
    id: string;
    name: string;
    website: string;
    description: string;
    marketShare: number;
    lastUpdated: Date;
}

/**
 * Detailed competitor product information tracking
 */
export interface ICompetitorProduct {
    id: string;
    competitorId: string;
    name: string;
    description: string;
    price: number;
    features: string[];
}

/**
 * Competitor activity tracking and categorization
 */
export interface ICompetitorActivity {
    id: string;
    competitorId: string;
    type: ActivityType;
    description: string;
    impactLevel: ImpactLevel;
    date: Date;
}

/**
 * Market trend analysis data structure
 */
export interface IMarketTrend {
    id: string;
    keyword: string;
    mentionCount: number;
    sentiment: SentimentType;
    timeframe: TimeframeType;
    sources: string[];
}

/**
 * Price monitoring alert configuration
 */
export interface IPriceAlert {
    id: string;
    competitorProductId: string;
    condition: AlertCondition;
    threshold: number;
    isActive: boolean;
}

/**
 * Historical price tracking and analysis
 */
export interface IPriceHistory {
    id: string;
    competitorProductId: string;
    price: number;
    date: Date;
}