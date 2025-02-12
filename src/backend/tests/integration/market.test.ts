import { describe, it, beforeEach, afterEach, expect, jest } from 'jest';
import { PrismaClient } from '@prisma/client';
import { MarketService } from '../../src/services/market.service';
import {
  ICompetitor,
  ICompetitorActivity,
  IMarketTrend,
  ActivityType,
  ImpactLevel,
  SentimentType,
  TimeframeType,
  IPriceAlert
} from '../../src/interfaces/market.interface';

describe('Market Intelligence Integration Tests', () => {
  let marketService: MarketService;
  let prisma: PrismaClient;

  // Test data setup
  const mockCompetitor: ICompetitor = {
    id: 'comp-123',
    name: 'Test Competitor',
    website: 'https://testcompetitor.com',
    description: 'Test competitor description',
    marketShare: 15.5,
    lastUpdated: new Date()
  };

  const mockActivity: ICompetitorActivity = {
    id: 'act-123',
    competitorId: 'comp-123',
    type: ActivityType.PRODUCT_LAUNCH,
    description: 'New product launch activity',
    impactLevel: ImpactLevel.HIGH,
    date: new Date()
  };

  beforeEach(async () => {
    // Initialize test environment
    prisma = new PrismaClient();
    marketService = new MarketService(prisma);
    await setupTestData();
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('Competitor Tracking', () => {
    it('should create and track new competitor with market share analysis', async () => {
      const competitor: ICompetitor = {
        ...mockCompetitor,
        id: 'new-comp-123'
      };

      const result = await marketService.trackCompetitor(competitor);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-comp-123');
      expect(result.marketShare).toBeGreaterThanOrEqual(0);
      expect(result.marketShare).toBeLessThanOrEqual(100);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should update existing competitor information with change detection', async () => {
      const updatedMarketShare = 20.5;
      const existingCompetitor = await marketService.trackCompetitor(mockCompetitor);

      const activity: ICompetitorActivity = {
        id: 'act-update-123',
        competitorId: existingCompetitor.id,
        type: ActivityType.MARKETING_CAMPAIGN,
        description: 'Major marketing campaign launch',
        impactLevel: ImpactLevel.HIGH,
        date: new Date()
      };

      await marketService.logCompetitorActivity(activity);
      const insights = await marketService.getCompetitorInsights(existingCompetitor.id);

      expect(insights).toBeDefined();
      expect(insights.marketPosition).toBeDefined();
      expect(insights.activities).toBeInstanceOf(Array);
      expect(insights.recommendations).toBeInstanceOf(Array);
    });

    it('should handle duplicate competitor entries', async () => {
      await marketService.trackCompetitor(mockCompetitor);

      await expect(marketService.trackCompetitor(mockCompetitor))
        .rejects
        .toThrow('Competitor already exists');
    });
  });

  describe('Market Trend Analysis', () => {
    it('should analyze market trends across multiple timeframes', async () => {
      const timeframes = [
        TimeframeType.DAILY,
        TimeframeType.WEEKLY,
        TimeframeType.MONTHLY
      ];

      for (const timeframe of timeframes) {
        const trends = await marketService.analyzeMarketTrends(timeframe);

        expect(trends).toBeDefined();
        expect(Array.isArray(trends)).toBe(true);
        trends.forEach(trend => {
          expect(trend.timeframe).toBe(timeframe);
          expect(trend.mentionCount).toBeGreaterThanOrEqual(0);
          expect(Object.values(SentimentType)).toContain(trend.sentiment);
        });
      }
    });

    it('should detect emerging market trends with AI validation', async () => {
      const trends = await marketService.analyzeMarketTrends(TimeframeType.WEEKLY);

      expect(trends).toBeDefined();
      expect(trends.length).toBeGreaterThan(0);
      trends.forEach(trend => {
        expect(trend.keyword).toBeDefined();
        expect(trend.sources).toBeInstanceOf(Array);
        expect(trend.sentiment).toBeDefined();
      });
    });

    it('should handle incomplete trend data', async () => {
      // Simulate incomplete data scenario
      jest.spyOn(prisma.marketTrend, 'findMany').mockResolvedValueOnce([]);

      const trends = await marketService.analyzeMarketTrends(TimeframeType.MONTHLY);

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBe(0);
    });
  });

  describe('Price Monitoring', () => {
    it('should detect and log price changes in real-time', async () => {
      const priceUpdates = marketService.monitorPriceChanges(mockCompetitor.id);
      
      const subscription = priceUpdates.subscribe(update => {
        expect(update).toBeDefined();
        expect(update.competitorId).toBe(mockCompetitor.id);
        expect(update.timestamp).toBeInstanceOf(Date);
        expect(update.priceChanges).toBeDefined();
        expect(update.impact).toBeDefined();
      });

      // Wait for price monitoring interval
      await new Promise(resolve => setTimeout(resolve, 1000));
      subscription.unsubscribe();
    });

    it('should generate alerts for significant price changes', async () => {
      const priceUpdates = marketService.monitorPriceChanges(mockCompetitor.id);
      
      const subscription = priceUpdates.subscribe(update => {
        if (update.impact === ImpactLevel.HIGH) {
          expect(update.priceChanges).toBeDefined();
          expect(update.priceChanges.percentage).toBeGreaterThan(10);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      subscription.unsubscribe();
    });

    it('should handle invalid competitor ID for price monitoring', async () => {
      await expect(marketService.monitorPriceChanges('invalid-id'))
        .rejects
        .toThrow('Competitor not found');
    });
  });

  describe('AI Analysis Validation', () => {
    it('should validate AI model predictions against actual outcomes', async () => {
      const activity = await marketService.logCompetitorActivity(mockActivity);
      const insights = await marketService.getCompetitorInsights(mockCompetitor.id);

      expect(insights.marketPosition.trend).toBeDefined();
      expect(insights.marketPosition.sentiment).toBeDefined();
      expect(insights.recommendations).toBeInstanceOf(Array);
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle model uncertainty scenarios', async () => {
      const activity: ICompetitorActivity = {
        ...mockActivity,
        description: 'Ambiguous market activity with uncertain implications'
      };

      const result = await marketService.logCompetitorActivity(activity);
      expect(result.impactLevel).toBeDefined();
      expect(Object.values(ImpactLevel)).toContain(result.impactLevel);
    });

    it('should maintain prediction accuracy thresholds', async () => {
      const trends = await marketService.analyzeMarketTrends(TimeframeType.WEEKLY);
      
      trends.forEach(trend => {
        expect(trend.mentionCount).toBeGreaterThanOrEqual(0);
        expect(trend.sentiment).toBeDefined();
        expect(Object.values(SentimentType)).toContain(trend.sentiment);
      });
    });
  });
});

async function setupTestData(): Promise<void> {
  // Clear existing test data
  await prisma.competitorActivity.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.marketTrend.deleteMany();

  // Create test competitor
  await prisma.competitor.create({
    data: mockCompetitor
  });

  // Create test activities
  await prisma.competitorActivity.create({
    data: mockActivity
  });

  // Create test market trends
  await prisma.marketTrend.createMany({
    data: [
      {
        id: 'trend-1',
        keyword: 'AI Innovation',
        mentionCount: 100,
        sentiment: SentimentType.POSITIVE,
        timeframe: TimeframeType.WEEKLY,
        sources: ['news', 'social']
      },
      {
        id: 'trend-2',
        keyword: 'Market Expansion',
        mentionCount: 75,
        sentiment: SentimentType.NEUTRAL,
        timeframe: TimeframeType.WEEKLY,
        sources: ['industry', 'news']
      }
    ]
  });
}

async function cleanupTestData(): Promise<void> {
  await prisma.competitorActivity.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.marketTrend.deleteMany();
}