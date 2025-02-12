import { Test, TestingModule } from '@nestjs/testing';
import { MarketService } from '../../src/services/market.service';
import {
  ICompetitor,
  ICompetitorActivity,
  IMarketTrend,
  ActivityType,
  ImpactLevel,
  SentimentType,
  TimeframeType
} from '../../src/interfaces/market.interface';
import { CompetitorModel, MarketTrendModel } from '../../src/models/market.model';
import { MarketIntelligenceAnalyzer } from '../../src/ai/market-intelligence/analyzer';

describe('MarketService', () => {
  let marketService: MarketService;
  let mockCompetitorModel: jest.Mocked<CompetitorModel>;
  let mockMarketTrendModel: jest.Mocked<MarketTrendModel>;
  let mockActivityModel: jest.Mocked<any>;
  let mockAnalyzer: jest.Mocked<MarketIntelligenceAnalyzer>;

  const mockCompetitor: ICompetitor = {
    id: 'comp-123',
    name: 'Test Competitor',
    website: 'https://test.com',
    description: 'Test competitor description',
    marketShare: 15.5,
    lastUpdated: new Date()
  };

  const mockActivity: ICompetitorActivity = {
    id: 'act-123',
    competitorId: 'comp-123',
    type: ActivityType.PRODUCT_LAUNCH,
    description: 'New product launch',
    impactLevel: ImpactLevel.HIGH,
    date: new Date()
  };

  const mockMarketTrend: IMarketTrend = {
    id: 'trend-123',
    keyword: 'AI Sales',
    mentionCount: 1500,
    sentiment: SentimentType.POSITIVE,
    timeframe: TimeframeType.WEEKLY,
    sources: ['news', 'social']
  };

  beforeEach(async () => {
    mockCompetitorModel = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn()
    } as any;

    mockMarketTrendModel = {
      analyzeTrends: jest.fn(),
      trackActivity: jest.fn()
    } as any;

    mockActivityModel = {
      create: jest.fn(),
      findByCompetitorId: jest.fn()
    };

    mockAnalyzer = {
      analyze_competitor_activity: jest.fn(),
      detect_market_trends: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketService,
        {
          provide: CompetitorModel,
          useValue: mockCompetitorModel
        },
        {
          provide: MarketTrendModel,
          useValue: mockMarketTrendModel
        },
        {
          provide: 'CompetitorActivityModel',
          useValue: mockActivityModel
        },
        {
          provide: MarketIntelligenceAnalyzer,
          useValue: mockAnalyzer
        }
      ]
    }).compile();

    marketService = module.get<MarketService>(MarketService);
  });

  describe('trackCompetitor', () => {
    it('should successfully track a new competitor', async () => {
      mockCompetitorModel.findById.mockResolvedValue(null);
      mockCompetitorModel.create.mockResolvedValue(mockCompetitor);
      mockAnalyzer.analyze_competitor_activity.mockResolvedValue({
        market_implications: { marketShare: 15.5 }
      });

      const result = await marketService.trackCompetitor(mockCompetitor);

      expect(result).toEqual(mockCompetitor);
      expect(mockCompetitorModel.create).toHaveBeenCalledWith({
        ...mockCompetitor,
        lastUpdated: expect.any(Date)
      });
    });

    it('should throw error for duplicate competitor', async () => {
      mockCompetitorModel.findById.mockResolvedValue(mockCompetitor);

      await expect(marketService.trackCompetitor(mockCompetitor))
        .rejects
        .toThrow('Competitor already exists');
    });

    it('should throw error for invalid competitor data', async () => {
      const invalidCompetitor = { ...mockCompetitor, name: '', website: '' };

      await expect(marketService.trackCompetitor(invalidCompetitor))
        .rejects
        .toThrow('Invalid competitor data: name and website are required');
    });
  });

  describe('logCompetitorActivity', () => {
    it('should successfully log competitor activity', async () => {
      mockActivityModel.create.mockResolvedValue(mockActivity);
      mockAnalyzer.analyze_competitor_activity.mockResolvedValue({
        impact_level: ImpactLevel.HIGH
      });

      const result = await marketService.logCompetitorActivity(mockActivity);

      expect(result).toEqual(mockActivity);
      expect(mockActivityModel.create).toHaveBeenCalledWith({
        ...mockActivity,
        impactLevel: ImpactLevel.HIGH,
        date: expect.any(Date)
      });
    });

    it('should throw error for invalid activity data', async () => {
      const invalidActivity = { ...mockActivity, competitorId: '', type: undefined };

      await expect(marketService.logCompetitorActivity(invalidActivity))
        .rejects
        .toThrow('Invalid activity data: competitorId and type are required');
    });
  });

  describe('analyzeMarketTrends', () => {
    it('should successfully analyze market trends', async () => {
      mockMarketTrendModel.analyzeTrends.mockResolvedValue([mockMarketTrend]);
      mockAnalyzer.detect_market_trends.mockResolvedValue([{
        trend_id: 'trend-123',
        keyword: 'AI Sales',
        significance_score: 0.85,
        forecast_values: [0.75],
        related_patterns: ['pattern1', 'pattern2']
      }]);

      const result = await marketService.analyzeMarketTrends(TimeframeType.WEEKLY);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'trend-123',
        keyword: 'AI Sales',
        mentionCount: 85,
        timeframe: TimeframeType.WEEKLY
      });
    });

    it('should throw error for invalid timeframe', async () => {
      await expect(marketService.analyzeMarketTrends('INVALID' as TimeframeType))
        .rejects
        .toThrow('Invalid timeframe specified');
    });
  });

  describe('getCompetitorInsights', () => {
    it('should return comprehensive competitor insights', async () => {
      mockCompetitorModel.findById.mockResolvedValue(mockCompetitor);
      mockActivityModel.findByCompetitorId.mockResolvedValue([mockActivity]);
      mockAnalyzer.analyze_competitor_activity.mockResolvedValue({
        activity_id: 'act-123',
        impact_level: ImpactLevel.HIGH,
        strategic_insights: ['Insight 1']
      });

      const result = await marketService.getCompetitorInsights('comp-123');

      expect(result).toMatchObject({
        competitor: mockCompetitor,
        marketPosition: expect.any(Object),
        activities: expect.any(Array),
        recommendations: expect.any(Array)
      });
    });

    it('should throw error for non-existent competitor', async () => {
      mockCompetitorModel.findById.mockResolvedValue(null);

      await expect(marketService.getCompetitorInsights('invalid-id'))
        .rejects
        .toThrow('Competitor not found');
    });
  });

  describe('monitorPriceChanges', () => {
    it('should setup price monitoring subscription', (done) => {
      mockCompetitorModel.findById.mockResolvedValue(mockCompetitor);
      mockAnalyzer.analyze_competitor_activity.mockResolvedValue({
        market_implications: {
          priceChanges: [{ amount: 10, percentage: 5 }]
        },
        impact_level: ImpactLevel.MEDIUM
      });

      const subscription = marketService.monitorPriceChanges('comp-123')
        .subscribe({
          next: (update) => {
            expect(update).toMatchObject({
              competitorId: 'comp-123',
              timestamp: expect.any(Date),
              priceChanges: expect.any(Array)
            });
            done();
          }
        });

      // Cleanup subscription after test
      subscription.unsubscribe();
    });

    it('should throw error for invalid competitor ID', async () => {
      mockCompetitorModel.findById.mockResolvedValue(null);

      const subscription = marketService.monitorPriceChanges('invalid-id')
        .subscribe({
          error: (error) => {
            expect(error.message).toContain('Competitor not found');
          }
        });

      subscription.unsubscribe();
    });
  });
});