/**
 * @fileoverview Enhanced Prisma model class for managing external service integrations
 * Implements comprehensive security controls, performance monitoring, and error handling
 * for CRM, email, and communication tool integrations.
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client'; // v5.0.0
import Redis from 'ioredis'; // v5.3.0
import { Logger } from 'winston'; // v3.8.2
import CircuitBreaker from 'opossum'; // v6.4.0

import {
  IIntegrationConfig,
  IIntegrationCredentials,
  IIntegrationMetadata,
  IIntegrationError
} from '../interfaces/integration.interface';

import {
  IntegrationType,
  IntegrationAuthType,
  IntegrationStatus,
  IntegrationScope
} from '../constants/integration-types';

/**
 * Enhanced Integration model class for managing external service connections
 * with comprehensive security, monitoring, and error handling capabilities
 */
export class Integration {
  private readonly prisma: PrismaClient;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly logger: Logger;
  private readonly redis: Redis;

  public id: string;
  public type: IntegrationType;
  public name: string;
  public config: IIntegrationConfig;
  public credentials: IIntegrationCredentials;
  public status: IntegrationStatus;
  public lastSyncTime: Date;
  public errorCount: number;
  public requestCount: number;
  public metadata: IIntegrationMetadata;
  public createdAt: Date;
  public updatedAt: Date;

  private static readonly CIRCUIT_BREAKER_OPTIONS = {
    timeout: 3000, // 3s timeout
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30s reset
    rollingCountTimeout: 10000
  };

  private static readonly RATE_LIMIT_PREFIX = 'integration_rate_limit:';
  private static readonly TOKEN_REFRESH_BACKOFF = [1000, 2000, 4000, 8000, 16000];

  /**
   * Creates a new Integration instance with enhanced security and monitoring
   */
  constructor(
    config: IIntegrationConfig,
    credentials: IIntegrationCredentials,
    logger: Logger,
    redis: Redis
  ) {
    this.prisma = new PrismaClient();
    this.logger = logger;
    this.redis = redis;

    this.config = config;
    this.credentials = this.encryptCredentials(credentials);
    this.status = IntegrationStatus.PENDING;
    this.errorCount = 0;
    this.requestCount = 0;
    this.metadata = {
      status: IntegrationStatus.PENDING,
      scope: IntegrationScope.READ,
      lastSyncTime: new Date(),
      errorCount: 0,
      requestCount: 0
    };

    // Initialize circuit breaker for fault tolerance
    this.circuitBreaker = new CircuitBreaker(
      this.executeRequest.bind(this),
      Integration.CIRCUIT_BREAKER_OPTIONS
    );

    this.setupCircuitBreakerEvents();
  }

  /**
   * Updates integration status with comprehensive audit logging
   */
  public async updateStatus(
    status: IntegrationStatus,
    reason: string
  ): Promise<void> {
    try {
      const oldStatus = this.status;
      this.status = status;
      this.metadata.status = status;
      this.updatedAt = new Date();

      await this.prisma.integration.update({
        where: { id: this.id },
        data: {
          status,
          metadata: this.metadata,
          updatedAt: this.updatedAt
        }
      });

      this.logger.info('Integration status updated', {
        integrationId: this.id,
        oldStatus,
        newStatus: status,
        reason,
        timestamp: new Date()
      });
    } catch (error) {
      this.handleError('STATUS_UPDATE_FAILED', error);
    }
  }

  /**
   * Securely refreshes OAuth tokens with exponential backoff retry
   */
  public async refreshCredentials(): Promise<void> {
    for (let attempt = 0; attempt < Integration.TOKEN_REFRESH_BACKOFF.length; attempt++) {
      try {
        if (!this.credentials.refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await this.circuitBreaker.fire(async () => {
          // Implementation varies by integration type
          const newCredentials = await this.fetchNewCredentials();
          return newCredentials;
        });

        this.credentials = this.encryptCredentials({
          ...this.credentials,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          expiresAt: new Date(Date.now() + response.expiresIn * 1000)
        });

        await this.prisma.integration.update({
          where: { id: this.id },
          data: { credentials: this.credentials }
        });

        this.logger.info('Integration credentials refreshed', {
          integrationId: this.id,
          type: this.type,
          expiresAt: this.credentials.expiresAt
        });

        return;
      } catch (error) {
        const backoffMs = Integration.TOKEN_REFRESH_BACKOFF[attempt];
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        if (attempt === Integration.TOKEN_REFRESH_BACKOFF.length - 1) {
          this.handleError('CREDENTIAL_REFRESH_FAILED', error);
        }
      }
    }
  }

  /**
   * Performs comprehensive integration health check
   */
  public async checkHealth(): Promise<{
    healthy: boolean;
    status: IntegrationStatus;
    metrics: Record<string, any>;
  }> {
    try {
      const circuitBreakerState = this.circuitBreaker.stats;
      const rateLimitKey = `${Integration.RATE_LIMIT_PREFIX}${this.id}`;
      const currentRate = await this.redis.get(rateLimitKey);

      const metrics = {
        errorRate: (this.errorCount / (this.requestCount || 1)) * 100,
        lastSync: this.lastSyncTime,
        circuitBreakerState,
        currentRate: parseInt(currentRate || '0'),
        uptime: Date.now() - this.createdAt.getTime()
      };

      const healthy = 
        this.status === IntegrationStatus.ACTIVE &&
        metrics.errorRate < 5 &&
        !this.circuitBreaker.opened &&
        metrics.currentRate < this.config.rateLimit;

      return {
        healthy,
        status: this.status,
        metrics
      };
    } catch (error) {
      this.handleError('HEALTH_CHECK_FAILED', error);
      return {
        healthy: false,
        status: IntegrationStatus.FAILED,
        metrics: { error: error.message }
      };
    }
  }

  /**
   * Private helper methods
   */

  private async executeRequest<T>(request: () => Promise<T>): Promise<T> {
    const rateLimitKey = `${Integration.RATE_LIMIT_PREFIX}${this.id}`;
    
    try {
      const currentRequests = await this.redis.incr(rateLimitKey);
      if (currentRequests === 1) {
        await this.redis.expire(rateLimitKey, 60); // 1-minute window
      }

      if (currentRequests > this.config.rateLimit) {
        throw new Error('Rate limit exceeded');
      }

      this.requestCount++;
      return await request();
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  private encryptCredentials(
    credentials: IIntegrationCredentials
  ): IIntegrationCredentials {
    // Implementation would use proper encryption service
    // This is a placeholder for the actual encryption logic
    return {
      ...credentials,
      clientSecret: credentials.clientSecret ? '[ENCRYPTED]' : undefined,
      apiKey: credentials.apiKey ? '[ENCRYPTED]' : undefined
    };
  }

  private async fetchNewCredentials(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Implementation varies by integration type
    // This is a placeholder for the actual token refresh logic
    throw new Error('Not implemented');
  }

  private handleError(code: string, error: Error): never {
    const integrationError: IIntegrationError = {
      code,
      message: error.message,
      timestamp: new Date(),
      retryable: code === 'CREDENTIAL_REFRESH_FAILED',
      context: {
        integrationId: this.id,
        type: this.type,
        status: this.status
      }
    };

    this.logger.error('Integration error occurred', integrationError);
    throw error;
  }

  private setupCircuitBreakerEvents(): void {
    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened', {
        integrationId: this.id,
        type: this.type
      });
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-open', {
        integrationId: this.id,
        type: this.type
      });
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed', {
        integrationId: this.id,
        type: this.type
      });
    });
  }
}