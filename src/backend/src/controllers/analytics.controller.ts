import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UsePipes, 
  ValidationPipe,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiQuery 
} from '@nestjs/swagger';
import { RateLimit } from '@nestjs/throttler';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

import { AnalyticsService } from '../services/analytics.service';
import { 
  IHistoricalDataAnalysis,
  IRevenueForecast,
  IPatternDetection,
  AnalyticsMetricType,
  TimeGranularity,
  PatternType
} from '../interfaces/analytics.interface';

@ApiTags('Analytics')
@Controller('analytics')
@UseInterceptors(CacheInterceptor)
@WebSocketGateway({ namespace: 'analytics' })
@RateLimit({
  ttl: 60,
  limit: 100,
  points: 1000
})
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  @WebSocketServer()
  private server: Server;

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('/historical-analysis')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Analyze historical sales data' })
  @ApiBody({ type: Object, description: 'Historical analysis parameters' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Historical analysis completed successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid analysis parameters' 
  })
  async analyzeHistoricalData(
    @Body() params: IHistoricalDataAnalysis
  ): Promise<IHistoricalDataAnalysis> {
    this.logger.log(`Starting historical analysis: ${JSON.stringify(params)}`);
    
    try {
      const results = await this.analyticsService.analyzeHistoricalData(params);
      
      // Emit real-time updates via WebSocket
      this.server.emit('historicalAnalysisComplete', {
        status: 'success',
        results
      });

      return results;
    } catch (error) {
      this.logger.error(`Historical analysis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('/revenue-forecast')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Generate revenue forecast' })
  @ApiBody({ type: Object, description: 'Revenue forecast parameters' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Revenue forecast generated successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid forecast parameters' 
  })
  async generateRevenueForecast(
    @Body() params: IRevenueForecast
  ): Promise<IRevenueForecast> {
    this.logger.log(`Starting revenue forecast: ${JSON.stringify(params)}`);
    
    try {
      const forecast = await this.analyticsService.generateRevenueForecast(params);
      
      // Emit real-time updates via WebSocket
      this.server.emit('revenueForecastComplete', {
        status: 'success',
        forecast
      });

      return forecast;
    } catch (error) {
      this.logger.error(`Revenue forecast failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('/pattern-detection')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Detect patterns in sales data' })
  @ApiBody({ type: Object, description: 'Pattern detection parameters' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Pattern detection completed successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid pattern detection parameters' 
  })
  async detectPatterns(
    @Body() params: IPatternDetection
  ): Promise<IPatternDetection> {
    this.logger.log(`Starting pattern detection: ${JSON.stringify(params)}`);
    
    try {
      const patterns = await this.analyticsService.detectPatterns(params);
      
      // Emit real-time updates via WebSocket
      this.server.emit('patternDetectionComplete', {
        status: 'success',
        patterns
      });

      return patterns;
    } catch (error) {
      this.logger.error(`Pattern detection failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('/metric-types')
  @ApiOperation({ summary: 'Get available metric types' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved metric types successfully' 
  })
  getMetricTypes(): string[] {
    return Object.values(AnalyticsMetricType);
  }

  @Get('/time-granularities')
  @ApiOperation({ summary: 'Get available time granularities' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved time granularities successfully' 
  })
  getTimeGranularities(): string[] {
    return Object.values(TimeGranularity);
  }

  @Get('/pattern-types')
  @ApiOperation({ summary: 'Get available pattern types' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Retrieved pattern types successfully' 
  })
  getPatternTypes(): string[] {
    return Object.values(PatternType);
  }
}