/**
 * @fileoverview Integration controller for managing external service integrations
 * Implements REST API endpoints for integration lifecycle management with enhanced
 * security, monitoring, and error handling capabilities
 * @version 1.0.0
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Logger,
  HttpStatus,
  HttpException
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
  ApiBody
} from '@nestjs/swagger';
import { CircuitBreaker } from '@nestjs/circuit-breaker';
import { RateLimit } from '@nestjs/throttler';

import { IntegrationService } from '../services/integration.service';
import { 
  IIntegrationConfig,
  IIntegrationCredentials,
  IIntegrationMetadata
} from '../interfaces/integration.interface';
import { 
  IntegrationType,
  IntegrationStatus
} from '../constants/integration-types';

@Controller('integrations')
@ApiTags('integrations')
@ApiSecurity('api_key')
@UseInterceptors(RateLimit)
export class IntegrationController {
  private readonly logger = new Logger(IntegrationController.name);

  constructor(
    private readonly integrationService: IntegrationService
  ) {}

  /**
   * Creates a new integration with external service
   */
  @Post()
  @ApiOperation({ summary: 'Create new integration' })
  @ApiBody({ type: Object, description: 'Integration configuration' })
  @ApiResponse({ 
    status: HttpStatus.CREATED,
    description: 'Integration created successfully'
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid integration configuration'
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded'
  })
  @UseInterceptors(CircuitBreaker)
  async createIntegration(
    @Body() createDto: IIntegrationConfig
  ): Promise<IIntegrationMetadata> {
    try {
      this.logger.log(`Creating integration for type: ${createDto.type}`);
      
      const configured = await this.integrationService.configureIntegration(createDto);
      if (!configured) {
        throw new HttpException(
          'Failed to configure integration',
          HttpStatus.BAD_REQUEST
        );
      }

      return {
        status: IntegrationStatus.ACTIVE,
        scope: null,
        lastSyncTime: new Date(),
        errorCount: 0,
        requestCount: 0
      };
    } catch (error) {
      this.logger.error(`Integration creation failed: ${error.message}`, error.stack);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Authenticates with an external service
   */
  @Post(':type/authenticate')
  @ApiOperation({ summary: 'Authenticate integration' })
  @ApiParam({ name: 'type', enum: IntegrationType })
  @ApiBody({ type: Object, description: 'Integration credentials' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authentication successful'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication failed'
  })
  @UseInterceptors(CircuitBreaker)
  async authenticate(
    @Param('type') type: IntegrationType,
    @Body() credentials: IIntegrationCredentials
  ): Promise<{ accessToken: string }> {
    try {
      this.logger.log(`Authenticating integration: ${type}`);
      
      const accessToken = await this.integrationService.authenticate(type, credentials);
      return { accessToken };
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`, error.stack);
      throw new HttpException(
        'Authentication failed',
        error.status || HttpStatus.UNAUTHORIZED
      );
    }
  }

  /**
   * Retrieves integration health status
   */
  @Get(':type/health')
  @ApiOperation({ summary: 'Check integration health' })
  @ApiParam({ name: 'type', enum: IntegrationType })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health status retrieved successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Integration not found'
  })
  async checkHealth(
    @Param('type') type: IntegrationType
  ): Promise<IIntegrationMetadata> {
    try {
      this.logger.log(`Checking health for integration: ${type}`);
      
      await this.integrationService.validateHealth(type);
      return {
        status: IntegrationStatus.ACTIVE,
        scope: null,
        lastSyncTime: new Date(),
        errorCount: 0,
        requestCount: 0
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      throw new HttpException(
        'Health check failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Synchronizes data with external service
   */
  @Post(':type/sync')
  @ApiOperation({ summary: 'Synchronize integration data' })
  @ApiParam({ name: 'type', enum: IntegrationType })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data synchronized successfully'
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Sync operation failed'
  })
  @UseInterceptors(CircuitBreaker)
  async syncData(
    @Param('type') type: IntegrationType
  ): Promise<void> {
    try {
      this.logger.log(`Starting data sync for integration: ${type}`);
      await this.integrationService.syncData(type);
    } catch (error) {
      this.logger.error(`Data sync failed: ${error.message}`, error.stack);
      throw new HttpException(
        'Data sync failed',
        error.status || HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Deletes an integration
   */
  @Delete(':type')
  @ApiOperation({ summary: 'Delete integration' })
  @ApiParam({ name: 'type', enum: IntegrationType })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Integration deleted successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Integration not found'
  })
  async deleteIntegration(
    @Param('type') type: IntegrationType
  ): Promise<void> {
    try {
      this.logger.log(`Deleting integration: ${type}`);
      // Implementation would call service method to delete integration
    } catch (error) {
      this.logger.error(`Integration deletion failed: ${error.message}`, error.stack);
      throw new HttpException(
        'Integration deletion failed',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}