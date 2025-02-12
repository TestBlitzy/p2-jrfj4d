/**
 * Analytics Service for Sales & Intelligence Platform
 * Version: 1.0.0
 * 
 * Provides comprehensive analytics operations including historical data analysis,
 * revenue forecasting, pattern detection, and market trend analysis with
 * enhanced real-time processing capabilities.
 */

import { Observable, from, of } from 'rxjs'; // ^7.8.0
import { map, catchError, retryWhen, delay, take } from 'rxjs/operators';
import { apiClient } from '../config/api.config';
import { 
  AnalyticsMetricType,
  AnalyticsDataPoint,
  RevenueForecast,
  MarketTrend,
  AnalyticsInsight,
  TimeRange,
  AnalyticsFilter,
  isAnalyticsDataPoint,
  isValidMarketTrend
} from '../types/analytics.types';
import { 
  ANALYTICS_TIME_RANGES,
  ANALYTICS_THRESHOLDS,
  PATTERN_RECOGNITION_CONFIG,
  MARKET_TREND_CONFIG
} from '../constants/analytics.constants';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Service class for handling analytics operations
 */
export class AnalyticsService {
  private readonly BATCH_SIZE = 1000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  /**
   * Retrieves historical data with support for real-time updates and large datasets
   * @param metricType Type of metric to retrieve
   * @param timeRange Time range for data retrieval
   * @param enableRealTime Enable real-time updates
   * @returns Observable stream of analytics data points
   */
  public async getHistoricalData(
    metricType: AnalyticsMetricType,
    timeRange: string,
    enableRealTime: boolean = false
  ): Promise<Observable<AnalyticsDataPoint[]>> {
    try {
      const filter: AnalyticsFilter = {
        metricTypes: [metricType],
        dateRange: this.parseTimeRange(timeRange)
      };

      const initialData = await apiClient.post(
        API_ENDPOINTS.ANALYTICS.HISTORICAL,
        { filter, batchSize: this.BATCH_SIZE }
      );

      // Validate response data
      const validatedData = initialData.data.filter(isAnalyticsDataPoint);

      if (validatedData.length < ANALYTICS_THRESHOLDS.MIN_DATA_POINTS) {
        throw new Error(`Insufficient data points. Required: ${ANALYTICS_THRESHOLDS.MIN_DATA_POINTS}`);
      }

      // Create observable stream
      const dataStream = enableRealTime
        ? this.createRealTimeStream(metricType, filter)
        : of(validatedData);

      return dataStream.pipe(
        map(data => this.processAnalyticsData(data)),
        retryWhen(errors =>
          errors.pipe(
            delay(this.RETRY_DELAY),
            take(this.MAX_RETRIES)
          )
        ),
        catchError(error => {
          console.error('[AnalyticsService] Historical data error:', error);
          throw error;
        })
      );
    } catch (error) {
      console.error('[AnalyticsService] getHistoricalData error:', error);
      throw error;
    }
  }

  /**
   * Retrieves AI-generated revenue forecasts with confidence intervals
   * @param forecastPeriod Number of days to forecast
   * @param confidenceLevel Required confidence level (0-1)
   * @returns Revenue forecast with predictions and confidence intervals
   */
  public async getRevenueForecast(
    forecastPeriod: number,
    confidenceLevel: number = ANALYTICS_THRESHOLDS.CONFIDENCE_THRESHOLD
  ): Promise<RevenueForecast> {
    try {
      if (forecastPeriod > ANALYTICS_THRESHOLDS.TREND_VALIDATION_PERIOD) {
        throw new Error(`Forecast period cannot exceed ${ANALYTICS_THRESHOLDS.TREND_VALIDATION_PERIOD} days`);
      }

      const response = await apiClient.post(API_ENDPOINTS.ANALYTICS.FORECAST, {
        period: forecastPeriod,
        confidenceLevel,
        includeSeasonality: true
      });

      const forecast = response.data;
      
      // Validate forecast accuracy
      if (forecast.modelAccuracy < confidenceLevel) {
        throw new Error(`Forecast accuracy below required confidence level`);
      }

      return {
        ...forecast,
        predictions: forecast.predictions.filter(isAnalyticsDataPoint)
      };
    } catch (error) {
      console.error('[AnalyticsService] getRevenueForecast error:', error);
      throw error;
    }
  }

  /**
   * Retrieves market trends with real-time updates and significance testing
   * @param timeRange Time range for trend analysis
   * @param significanceThreshold Minimum significance level for trends
   * @returns Observable stream of significant market trends
   */
  public async getMarketTrends(
    timeRange: string,
    significanceThreshold: number = MARKET_TREND_CONFIG.TREND_CONFIDENCE_THRESHOLD
  ): Promise<Observable<MarketTrend[]>> {
    try {
      const dateRange = this.parseTimeRange(timeRange);

      const response = await apiClient.post(API_ENDPOINTS.ANALYTICS.TRENDS, {
        dateRange,
        significanceThreshold,
        minDataPoints: MARKET_TREND_CONFIG.MIN_DATA_POINTS_FOR_TREND
      });

      // Filter and validate trends
      const validTrends = response.data
        .filter(isValidMarketTrend)
        .filter(trend => trend.confidence >= significanceThreshold);

      return from([validTrends]).pipe(
        map(trends => this.enrichTrendsWithCompetitorData(trends)),
        catchError(error => {
          console.error('[AnalyticsService] Market trends error:', error);
          throw error;
        })
      );
    } catch (error) {
      console.error('[AnalyticsService] getMarketTrends error:', error);
      throw error;
    }
  }

  /**
   * Retrieves analytics insights with pattern detection
   * @param metricType Type of metric to analyze
   * @param confidenceThreshold Minimum confidence level for insights
   * @returns Array of high-confidence analytics insights
   */
  public async getAnalyticsInsights(
    metricType: AnalyticsMetricType,
    confidenceThreshold: number = PATTERN_RECOGNITION_CONFIG.SIMILARITY_THRESHOLD
  ): Promise<AnalyticsInsight[]> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.ANALYTICS.AI.PREDICTIONS, {
        metricType,
        confidenceThreshold,
        patternConfig: PATTERN_RECOGNITION_CONFIG
      });

      return response.data.filter((insight: AnalyticsInsight) => 
        insight.confidence >= confidenceThreshold
      );
    } catch (error) {
      console.error('[AnalyticsService] getAnalyticsInsights error:', error);
      throw error;
    }
  }

  /**
   * Creates a real-time data stream for analytics updates
   * @private
   */
  private createRealTimeStream(
    metricType: AnalyticsMetricType,
    filter: AnalyticsFilter
  ): Observable<AnalyticsDataPoint[]> {
    return new Observable(subscriber => {
      const intervalId = setInterval(async () => {
        try {
          const response = await apiClient.post(
            API_ENDPOINTS.ANALYTICS.METRICS,
            { metricType, filter }
          );
          subscriber.next(response.data.filter(isAnalyticsDataPoint));
        } catch (error) {
          subscriber.error(error);
        }
      }, 5000); // 5-second update interval

      return () => clearInterval(intervalId);
    });
  }

  /**
   * Processes and validates analytics data
   * @private
   */
  private processAnalyticsData(data: AnalyticsDataPoint[]): AnalyticsDataPoint[] {
    return data.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp),
      value: Number(point.value.toFixed(2))
    }));
  }

  /**
   * Enriches market trends with competitor data
   * @private
   */
  private async enrichTrendsWithCompetitorData(
    trends: MarketTrend[]
  ): Promise<MarketTrend[]> {
    const competitorData = await apiClient.get(
      API_ENDPOINTS.MARKET.COMPETITORS.ANALYSIS
    );

    return trends.map(trend => ({
      ...trend,
      competitors: trend.competitors.map(competitor => ({
        ...competitor,
        ...competitorData.data[competitor]
      }))
    }));
  }

  /**
   * Parses time range string into TimeRange object
   * @private
   */
  private parseTimeRange(timeRange: string): TimeRange {
    const now = new Date();
    let start = new Date();

    switch (timeRange) {
      case ANALYTICS_TIME_RANGES.LAST_24_HOURS:
        start.setHours(start.getHours() - 24);
        return { start, end: now, granularity: 'hour' };
      case ANALYTICS_TIME_RANGES.LAST_7_DAYS:
        start.setDate(start.getDate() - 7);
        return { start, end: now, granularity: 'day' };
      case ANALYTICS_TIME_RANGES.LAST_30_DAYS:
        start.setDate(start.getDate() - 30);
        return { start, end: now, granularity: 'day' };
      default:
        throw new Error(`Invalid time range: ${timeRange}`);
    }
  }
}