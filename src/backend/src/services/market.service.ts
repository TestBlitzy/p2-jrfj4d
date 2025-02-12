/**
 * Market Intelligence Service Implementation
 * Provides comprehensive market analysis, competitor tracking, and trend detection
 * @version 1.0.0
 * Dependencies:
 * - @nestjs/common@10.0.0
 * - rxjs@7.8.0
 */

import { Injectable } from '@nestjs/common';
import { Observable, Subject, interval } from 'rxjs';
import { map, filter, catchError } from 'rxjs/operators';

import {
  CompetitorModel,
  MarketTrendModel,
  CompetitorActivityModel
} from '../models/market.model';

import {
  ICompetitor,
  ICompetitorActivity,
  IMarketTrend,
  IPriceAlert,
  ActivityType,
  ImpactLevel,
  SentimentType,
  TimeframeType
} from '../interfaces/market.interface';

import { MarketIntelligenceAnalyzer } from '../ai/market-intelligence/analyzer';

@Injectable()
export class MarketService {
  private readonly priceUpdateSubject = new Subject<any>();
  private readonly monitoringIntervals: Map<string, any> = new Map();

  constructor(
    private readonly competitorModel: CompetitorModel,
    private readonly marketTrendModel: MarketTrendModel,
    private readonly activityModel: CompetitorActivityModel,
    private readonly analyzer: MarketIntelligenceAnalyzer
  ) {}

  /**
   * Track and analyze competitor information with AI-powered insights
   * @param competitor Competitor information to track
   * @returns Enhanced competitor data with market analysis
   */
  async trackCompetitor(competitor: ICompetitor): Promise<ICompetitor> {
    try {
      // Validate competitor data
      if (!competitor.name || !competitor.website) {
        throw new Error('Invalid competitor data: name and website are required');
      }

      // Check for existing competitor
      const existing = await this.competitorModel.findById(competitor.id);
      if (existing) {
        throw new Error('Competitor already exists');
      }

      // Create competitor record with validation
      const trackedCompetitor = await this.competitorModel.create({
        ...competitor,
        lastUpdated: new Date()
      });

      // Analyze market position
      const marketAnalysis = await this.analyzer.analyze_competitor_activity({
        id: trackedCompetitor.id,
        competitorId: trackedCompetitor.id,
        type: ActivityType.PRODUCT_LAUNCH,
        description: `Initial tracking of ${competitor.name}`,
        impactLevel: ImpactLevel.MEDIUM,
        date: new Date()
      });

      // Update competitor with analysis results
      return this.competitorModel.update(trackedCompetitor.id, {
        marketShare: marketAnalysis.market_implications.marketShare
      });
    } catch (error) {
      throw new Error(`Failed to track competitor: ${error.message}`);
    }
  }

  /**
   * Log and analyze competitor activities with impact assessment
   * @param activity Competitor activity details
   * @returns Processed activity with impact analysis
   */
  async logCompetitorActivity(activity: ICompetitorActivity): Promise<ICompetitorActivity> {
    try {
      // Validate activity data
      if (!activity.competitorId || !activity.type) {
        throw new Error('Invalid activity data: competitorId and type are required');
      }

      // Analyze activity impact using AI
      const analysisResults = await this.analyzer.analyze_competitor_activity(activity);

      // Log activity with impact analysis
      const loggedActivity = await this.activityModel.create({
        ...activity,
        impactLevel: analysisResults.impact_level,
        date: new Date()
      });

      // Update competitor status based on activity impact
      await this.competitorModel.update(activity.competitorId, {
        lastUpdated: new Date()
      });

      return loggedActivity;
    } catch (error) {
      throw new Error(`Failed to log competitor activity: ${error.message}`);
    }
  }

  /**
   * Analyze market trends with AI-powered predictions
   * @param timeframe Analysis timeframe
   * @returns Analyzed trends with predictions
   */
  async analyzeMarketTrends(timeframe: TimeframeType): Promise<IMarketTrend[]> {
    try {
      // Validate timeframe
      if (!Object.values(TimeframeType).includes(timeframe)) {
        throw new Error('Invalid timeframe specified');
      }

      // Get historical trend data
      const trends = await this.marketTrendModel.analyzeTrends(timeframe, {
        minMentionCount: 10,
        includeSentiment: true,
        sourceTypes: ['news', 'social', 'industry']
      });

      // Perform AI-powered trend analysis
      const analyzedTrends = await this.analyzer.detect_market_trends(
        trends,
        timeframe,
        30 // 30-day forecast horizon
      );

      // Transform and return results
      return analyzedTrends.map(analysis => ({
        id: analysis.trend_id,
        keyword: analysis.keyword,
        mentionCount: analysis.significance_score * 100,
        sentiment: this.mapSentimentScore(analysis.forecast_values[0]),
        timeframe: timeframe,
        sources: analysis.related_patterns
      }));
    } catch (error) {
      throw new Error(`Failed to analyze market trends: ${error.message}`);
    }
  }

  /**
   * Get comprehensive competitor insights with AI analysis
   * @param competitorId Competitor identifier
   * @returns Detailed competitor insights
   */
  async getCompetitorInsights(competitorId: string): Promise<Object> {
    try {
      // Validate competitor existence
      const competitor = await this.competitorModel.findById(competitorId);
      if (!competitor) {
        throw new Error('Competitor not found');
      }

      // Get recent activities
      const activities = await this.activityModel.findByCompetitorId(competitorId);

      // Analyze activities and market position
      const activityAnalysis = await Promise.all(
        activities.map(activity => 
          this.analyzer.analyze_competitor_activity(activity)
        )
      );

      // Compile comprehensive insights
      return {
        competitor,
        marketPosition: {
          share: competitor.marketShare,
          trend: this.calculateMarketShareTrend(activityAnalysis),
          sentiment: this.calculateOverallSentiment(activityAnalysis)
        },
        activities: activityAnalysis.map(analysis => ({
          type: analysis.activity_id,
          impact: analysis.impact_level,
          insights: analysis.strategic_insights
        })),
        recommendations: this.generateStrategicRecommendations(activityAnalysis)
      };
    } catch (error) {
      throw new Error(`Failed to get competitor insights: ${error.message}`);
    }
  }

  /**
   * Monitor competitor price changes in real-time
   * @param competitorId Competitor identifier
   * @returns Observable of price updates
   */
  monitorPriceChanges(competitorId: string): Observable<Object> {
    // Setup price monitoring interval
    const monitoringInterval = interval(300000) // 5-minute intervals
      .pipe(
        map(async () => {
          const competitor = await this.competitorModel.findById(competitorId);
          if (!competitor) {
            throw new Error('Competitor not found');
          }

          // Analyze price changes
          const priceAnalysis = await this.analyzer.analyze_competitor_activity({
            id: `price_${Date.now()}`,
            competitorId: competitorId,
            type: ActivityType.PRICE_CHANGE,
            description: 'Price monitoring check',
            impactLevel: ImpactLevel.LOW,
            date: new Date()
          });

          return {
            competitorId,
            timestamp: new Date(),
            priceChanges: priceAnalysis.market_implications.priceChanges,
            impact: priceAnalysis.impact_level
          };
        }),
        filter(update => update !== null),
        catchError(error => {
          throw new Error(`Price monitoring error: ${error.message}`);
        })
      );

    // Store monitoring interval
    this.monitoringIntervals.set(competitorId, monitoringInterval);

    return this.priceUpdateSubject.asObservable();
  }

  private mapSentimentScore(score: number): SentimentType {
    if (score > 0.3) return SentimentType.POSITIVE;
    if (score < -0.3) return SentimentType.NEGATIVE;
    return SentimentType.NEUTRAL;
  }

  private calculateMarketShareTrend(analyses: any[]): string {
    const recentImpacts = analyses
      .slice(-3)
      .map(a => a.impact_level);
    
    const highImpacts = recentImpacts
      .filter(impact => impact === ImpactLevel.HIGH)
      .length;
    
    return highImpacts >= 2 ? 'increasing' : 'stable';
  }

  private calculateOverallSentiment(analyses: any[]): SentimentType {
    const avgSentiment = analyses.reduce(
      (acc, curr) => acc + curr.sentiment, 0
    ) / analyses.length;
    
    return this.mapSentimentScore(avgSentiment);
  }

  private generateStrategicRecommendations(analyses: any[]): string[] {
    const recommendations = new Set<string>();
    
    analyses.forEach(analysis => {
      if (analysis.impact_level === ImpactLevel.HIGH) {
        recommendations.add('Immediate strategic response required');
      }
      if (analysis.anomaly_detected) {
        recommendations.add('Investigate unusual market activity');
      }
      analysis.strategic_insights.forEach((insight: string) => 
        recommendations.add(insight)
      );
    });

    return Array.from(recommendations);
  }
}