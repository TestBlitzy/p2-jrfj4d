import { Tensor } from '@tensorflow/tfjs'; // v4.x

// Global constants
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;
export const MIN_DATA_POINTS = 1000;
export const CHART_DATE_FORMAT = 'YYYY-MM-DD';
export const MAX_FORECAST_DAYS = 365;
export const MIN_PATTERN_CONFIDENCE = 0.85;

// Enums
export enum AnalyticsMetricType {
    REVENUE = 'revenue',
    CONVERSION_RATE = 'conversion_rate',
    SALES_VELOCITY = 'sales_velocity',
    MARKET_SHARE = 'market_share',
    LEAD_SCORE = 'lead_score',
    ENGAGEMENT_RATE = 'engagement_rate'
}

export enum InsightSeverity {
    CRITICAL = 'critical',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low',
    INFO = 'info'
}

export enum TrendCategory {
    MARKET_SHIFT = 'market_shift',
    COMPETITOR_ACTION = 'competitor_action',
    INDUSTRY_TREND = 'industry_trend',
    REGULATORY_CHANGE = 'regulatory_change',
    TECHNOLOGY_ADVANCEMENT = 'technology_advancement'
}

export enum ChartType {
    LINE = 'line',
    BAR = 'bar',
    SCATTER = 'scatter',
    AREA = 'area',
    CANDLESTICK = 'candlestick'
}

// Interfaces
export interface AnalyticsDataPoint {
    timestamp: Date;
    value: number;
    metricType: AnalyticsMetricType;
    metadata: Record<string, any>;
    tags: string[];
    source: string;
}

export interface AnalyticsInsight {
    type: string;
    description: string;
    confidence: number;
    timestamp: Date;
    severity: InsightSeverity;
    recommendations: string[];
    relatedMetrics: AnalyticsMetricType[];
}

export interface RevenueForecast {
    predictions: AnalyticsDataPoint[];
    confidenceInterval: number;
    modelAccuracy: number;
    forecastRange: {
        start: Date;
        end: Date;
    };
    contributingFactors: {
        factor: string;
        impact: number;
    }[];
    seasonalityPattern: string;
}

export interface MarketTrend {
    trend: string;
    impact: number;
    competitors: string[];
    detectedAt: Date;
    category: TrendCategory;
    confidence: number;
    relatedInsights: AnalyticsInsight[];
}

export interface ChartCustomization {
    colors: string[];
    fontFamily: string;
    fontSize: number;
    gridLines: boolean;
    tooltips: boolean;
    annotations: {
        text: string;
        position: { x: number; y: number };
    }[];
}

export interface ExportOptions {
    formats: ('png' | 'svg' | 'csv' | 'pdf')[];
    resolution?: number;
    includeMetadata: boolean;
    fileName?: string;
}

export interface AnalyticsChartOptions {
    metricType: AnalyticsMetricType;
    timeRange: string;
    showLegend: boolean;
    enableZoom: boolean;
    chartType: ChartType;
    customization: ChartCustomization;
    exportOptions: ExportOptions;
}

// ML Model Types
export interface ModelMetadata {
    version: string;
    trainedOn: Date;
    accuracy: number;
    parameters: number;
    inputShape: number[];
    outputShape: number[];
}

export interface PredictionResult {
    value: number;
    confidence: number;
    tensor?: Tensor;
    metadata?: ModelMetadata;
}

// Type Guards
export function isAnalyticsDataPoint(obj: any): obj is AnalyticsDataPoint {
    return obj 
        && typeof obj.timestamp === 'object'
        && typeof obj.value === 'number'
        && Object.values(AnalyticsMetricType).includes(obj.metricType);
}

export function isValidMarketTrend(obj: any): obj is MarketTrend {
    return obj
        && typeof obj.trend === 'string'
        && typeof obj.impact === 'number'
        && Array.isArray(obj.competitors)
        && typeof obj.confidence === 'number'
        && obj.confidence >= 0
        && obj.confidence <= 1;
}

// Utility Types
export type TimeRange = {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
};

export type MetricAggregation = {
    metricType: AnalyticsMetricType;
    aggregationType: 'sum' | 'average' | 'min' | 'max' | 'count';
    timeRange: TimeRange;
};

export type AnalyticsFilter = {
    metricTypes?: AnalyticsMetricType[];
    dateRange?: TimeRange;
    tags?: string[];
    confidence?: number;
    sources?: string[];
};