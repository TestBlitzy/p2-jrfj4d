/**
 * Market Intelligence Controller
 * Handles market intelligence functionality including competitor tracking,
 * market trend analysis, and price monitoring with AI-powered insights
 * 
 * @version 1.0.0
 * Dependencies:
 * - @nestjs/common@10.0.0
 * - @nestjs/swagger@7.0.0
 * - @nestjs/passport@10.0.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RoleGuard } from '../guards/role.guard';
import { CacheInterceptor, LoggingInterceptor } from '../interceptors';
import { MarketService } from '../services/market.service';
import {
  validateCompetitor,
  validateCompetitorActivity,
  validateMarketTrend,
  validatePriceAlert
} from '../validators/market.validator';
import {
  ICompetitor,
  ICompetitorActivity,
  IMarketTrend,
  IPriceAlert,
  ActivityType,
  ImpactLevel,
  TimeframeType
} from '../interfaces/market.interface';
import { ErrorCodes, ErrorMessages } from '../constants/error-codes';

@Controller('market')
@ApiTags('Market Intelligence')
@UseGuards(AuthGuard('jwt'), RoleGuard)
@UseInterceptors(CacheInterceptor, LoggingInterceptor)
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post('competitors')
  @ApiOperation({ summary: 'Track new competitor' })
  @ApiResponse({ status: 201, description: 'Competitor tracked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid competitor data' })
  @ApiBody({ type: 'ICompetitor' })
  async trackCompetitor(@Body() competitor: ICompetitor): Promise<ICompetitor> {
    try {
      const isValid = await validateCompetitor(competitor);
      if (!isValid) {
        throw new HttpException(
          'Invalid competitor data',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.marketService.trackCompetitor(competitor);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to track competitor',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('activities')
  @ApiOperation({ summary: 'Log competitor activity' })
  @ApiResponse({ status: 201, description: 'Activity logged successfully' })
  @ApiBody({ type: 'ICompetitorActivity' })
  async logCompetitorActivity(
    @Body() activity: ICompetitorActivity
  ): Promise<ICompetitorActivity> {
    try {
      const isValid = await validateCompetitorActivity(activity);
      if (!isValid) {
        throw new HttpException(
          'Invalid activity data',
          HttpStatus.BAD_REQUEST
        );
      }

      return await this.marketService.logCompetitorActivity(activity);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to log activity',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('trends')
  @ApiOperation({ summary: 'Analyze market trends' })
  @ApiQuery({ name: 'timeframe', enum: TimeframeType })
  @ApiResponse({ status: 200, description: 'Market trends analyzed successfully' })
  async analyzeMarketTrends(
    @Query('timeframe') timeframe: TimeframeType
  ): Promise<IMarketTrend[]> {
    try {
      return await this.marketService.analyzeMarketTrends(timeframe);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to analyze market trends',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('competitors/:id/insights')
  @ApiOperation({ summary: 'Get competitor insights' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Competitor insights retrieved successfully' })
  async getCompetitorInsights(@Param('id') competitorId: string): Promise<Object> {
    try {
      return await this.marketService.getCompetitorInsights(competitorId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get competitor insights',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('price-monitoring/:id')
  @ApiOperation({ summary: 'Monitor competitor price changes' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Price monitoring initiated successfully' })
  async monitorPriceChanges(@Param('id') competitorId: string): Promise<Object> {
    try {
      const priceUpdates = this.marketService.monitorPriceChanges(competitorId);
      return { message: 'Price monitoring initiated', updates: priceUpdates };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to initiate price monitoring',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create price alert' })
  @ApiResponse({ status: 201, description: 'Price alert created successfully' })
  @ApiBody({ type: 'IPriceAlert' })
  async createPriceAlert(@Body() alert: IPriceAlert): Promise<IPriceAlert> {
    try {
      const isValid = await validatePriceAlert(alert);
      if (!isValid) {
        throw new HttpException(
          'Invalid price alert configuration',
          HttpStatus.BAD_REQUEST
        );
      }

      // Implementation would be added when price alert service is available
      throw new HttpException(
        'Price alert creation not implemented',
        HttpStatus.NOT_IMPLEMENTED
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create price alert',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('competitors/:id/activities')
  @ApiOperation({ summary: 'Get competitor activities' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiQuery({ name: 'type', enum: ActivityType, required: false })
  @ApiQuery({ name: 'impact', enum: ImpactLevel, required: false })
  @ApiResponse({ status: 200, description: 'Competitor activities retrieved successfully' })
  async getCompetitorActivities(
    @Param('id') competitorId: string,
    @Query('type') type?: ActivityType,
    @Query('impact') impact?: ImpactLevel
  ): Promise<ICompetitorActivity[]> {
    try {
      // Implementation would be added when activity filtering service is available
      throw new HttpException(
        'Activity retrieval not implemented',
        HttpStatus.NOT_IMPLEMENTED
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve competitor activities',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}