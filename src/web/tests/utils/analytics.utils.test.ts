import {
    formatMetricValue,
    formatChartData,
    calculateGrowthRate,
    aggregateDataPoints,
} from '../../src/utils/analytics.utils';
import { AnalyticsMetricType, AnalyticsDataPoint } from '../../src/types/analytics.types';

// Test data setup
const mockLargeDataset: AnalyticsDataPoint[] = Array.from({ length: 1_000_000 }, (_, index) => ({
    timestamp: new Date(2023, 0, 1 + Math.floor(index / 1000)),
    value: Math.random() * 10000,
    metricType: AnalyticsMetricType.REVENUE,
    metadata: {},
    tags: [],
    source: 'test'
}));

describe('formatMetricValue', () => {
    it('should format revenue values with proper currency symbols', () => {
        expect(formatMetricValue(1234.567, AnalyticsMetricType.REVENUE))
            .toBe('$1,234.57');
        expect(formatMetricValue(1234.567, AnalyticsMetricType.REVENUE, { locale: 'de-DE' }))
            .toBe('1.234,57 €');
    });

    it('should format conversion rates as percentages', () => {
        expect(formatMetricValue(0.4567, AnalyticsMetricType.CONVERSION_RATE))
            .toBe('45.67%');
    });

    it('should handle large numbers with appropriate formatting', () => {
        expect(formatMetricValue(1000000, AnalyticsMetricType.REVENUE))
            .toBe('$1,000,000.00');
    });

    it('should handle invalid inputs gracefully', () => {
        expect(formatMetricValue(NaN, AnalyticsMetricType.REVENUE)).toBe('N/A');
        expect(formatMetricValue(undefined as any, AnalyticsMetricType.REVENUE)).toBe('N/A');
    });

    it('should respect precision options', () => {
        expect(formatMetricValue(123.4567, AnalyticsMetricType.REVENUE, { precision: 3 }))
            .toBe('$123.457');
    });
});

describe('formatChartData', () => {
    const sampleData: AnalyticsDataPoint[] = [
        {
            timestamp: new Date('2023-01-01'),
            value: 1000,
            metricType: AnalyticsMetricType.REVENUE,
            metadata: {},
            tags: [],
            source: 'test'
        },
        {
            timestamp: new Date('2023-01-02'),
            value: 1500,
            metricType: AnalyticsMetricType.REVENUE,
            metadata: {},
            tags: [],
            source: 'test'
        }
    ];

    it('should format chart data with proper structure', () => {
        const result = formatChartData(sampleData, AnalyticsMetricType.REVENUE);
        expect(result).toHaveProperty('labels');
        expect(result).toHaveProperty('datasets');
        expect(result).toHaveProperty('patterns');
        expect(result).toHaveProperty('metadata');
    });

    it('should detect patterns with high confidence', () => {
        const result = formatChartData(sampleData, AnalyticsMetricType.REVENUE, {
            patternDetection: true,
            confidenceThreshold: 0.9
        });
        expect(result.patterns.length).toBeGreaterThan(0);
        expect(result.patterns[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should handle timezone conversions correctly', () => {
        const result = formatChartData(sampleData, AnalyticsMetricType.REVENUE, {
            timeZone: 'America/New_York'
        });
        expect(result.labels[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should apply smoothing when enabled', () => {
        const result = formatChartData(sampleData, AnalyticsMetricType.REVENUE, {
            smoothing: true
        });
        expect(result.datasets[0].tension).toBe(0.4);
    });
});

describe('Performance Tests', () => {
    it('should process large datasets within performance thresholds', () => {
        const startTime = performance.now();
        const result = formatChartData(mockLargeDataset, AnalyticsMetricType.REVENUE);
        const endTime = performance.now();
        const processingTime = endTime - startTime;

        expect(processingTime).toBeLessThan(1000); // Sub-second requirement
        expect(result.metadata.dataPoints).toBe(mockLargeDataset.length);
    });

    it('should maintain memory efficiency with large datasets', () => {
        const initialMemory = process.memoryUsage().heapUsed;
        formatChartData(mockLargeDataset, AnalyticsMetricType.REVENUE);
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be reasonable for dataset size
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
});

describe('Pattern Recognition Accuracy', () => {
    const trendData: AnalyticsDataPoint[] = Array.from({ length: 100 }, (_, index) => ({
        timestamp: new Date(2023, 0, index + 1),
        value: 1000 + (index * 10), // Linear upward trend
        metricType: AnalyticsMetricType.REVENUE,
        metadata: {},
        tags: [],
        source: 'test'
    }));

    it('should detect trends with high accuracy', () => {
        const result = formatChartData(trendData, AnalyticsMetricType.REVENUE, {
            patternDetection: true
        });
        const trendPattern = result.patterns.find(p => p.type === 'trend');
        expect(trendPattern).toBeDefined();
        expect(trendPattern.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should identify seasonal patterns correctly', () => {
        const seasonalData = trendData.map((point, index) => ({
            ...point,
            value: point.value + Math.sin(index / 7) * 100 // Weekly seasonality
        }));

        const result = formatChartData(seasonalData, AnalyticsMetricType.REVENUE, {
            patternDetection: true
        });
        const seasonalPattern = result.patterns.find(p => p.type === 'seasonality');
        expect(seasonalPattern).toBeDefined();
        expect(seasonalPattern.period).toBe(7);
    });
});

describe('Accessibility and Internationalization', () => {
    it('should provide accessible number formatting', () => {
        const formattedValue = formatMetricValue(1234.56, AnalyticsMetricType.REVENUE);
        expect(formattedValue).toMatch(/^\$[\d,]+\.\d{2}$/);
    });

    it('should support multiple locales', () => {
        const locales = ['en-US', 'de-DE', 'fr-FR', 'ja-JP'];
        locales.forEach(locale => {
            const formatted = formatMetricValue(1234.56, AnalyticsMetricType.REVENUE, { locale });
            expect(formatted).toBeTruthy();
        });
    });
});

describe('Error Handling', () => {
    it('should handle empty datasets gracefully', () => {
        expect(() => formatChartData([], AnalyticsMetricType.REVENUE))
            .toThrow('Invalid or empty data points array');
    });

    it('should handle invalid metric types', () => {
        expect(() => formatMetricValue(100, 'invalid_metric' as AnalyticsMetricType))
            .toThrow('Unsupported metric type');
    });

    it('should handle null values in datasets', () => {
        const dataWithNull = [...sampleData, {
            timestamp: new Date(),
            value: null as any,
            metricType: AnalyticsMetricType.REVENUE,
            metadata: {},
            tags: [],
            source: 'test'
        }];
        expect(() => formatChartData(dataWithNull, AnalyticsMetricType.REVENUE))
            .not.toThrow();
    });
});