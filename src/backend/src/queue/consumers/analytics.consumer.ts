import { injectable } from 'inversify';
import * as amqp from 'amqplib'; // ^0.10.0
import { Logger } from 'winston'; // ^3.10.0
import { trace, context, SpanStatusCode } from '@opentelemetry/api'; // ^1.4.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { Counter, Histogram } from 'prom-client'; // ^14.0.0

import { queueConfig } from '../../config/queue.config';
import { AnalyticsService } from '../../services/analytics.service';
import { 
  IHistoricalDataAnalysis, 
  IRevenueForecast, 
  IPatternDetection 
} from '../../interfaces/analytics.interface';

@injectable()
export class AnalyticsConsumer {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly logger: Logger;
  private readonly tracer = trace.getTracer('analytics-consumer');
  private readonly circuitBreaker: CircuitBreaker;
  
  // Prometheus metrics
  private readonly processingDuration: Histogram;
  private readonly messageProcessed: Counter;
  private readonly processingErrors: Counter;

  constructor(
    private readonly analyticsService: AnalyticsService
  ) {
    this.initializeMetrics();
    this.setupCircuitBreaker();
    this.logger = new Logger({
      level: process.env.LOG_LEVEL || 'info',
      defaultMeta: { service: 'analytics-consumer' }
    });
  }

  private initializeMetrics(): void {
    this.processingDuration = new Histogram({
      name: 'analytics_message_processing_duration',
      help: 'Duration of analytics message processing in seconds',
      labelNames: ['message_type']
    });

    this.messageProcessed = new Counter({
      name: 'analytics_messages_processed_total',
      help: 'Total number of analytics messages processed',
      labelNames: ['message_type', 'status']
    });

    this.processingErrors = new Counter({
      name: 'analytics_processing_errors_total',
      help: 'Total number of analytics processing errors',
      labelNames: ['error_type']
    });
  }

  private setupCircuitBreaker(): void {
    this.circuitBreaker = new CircuitBreaker(
      async (handler: Function, message: any) => await handler(message),
      {
        timeout: 30000, // 30 seconds
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        rollingCountTimeout: 10000
      }
    );

    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened - analytics processing suspended');
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-open - testing analytics processing');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed - analytics processing resumed');
    });
  }

  public async start(): Promise<void> {
    try {
      this.connection = await amqp.connect(queueConfig.connection.url, queueConfig.connection.options);
      this.channel = await this.connection.createChannel();

      // Setup dead letter exchange
      await this.channel.assertExchange(queueConfig.retryStrategy.deadLetterExchange, 'direct', { durable: true });
      await this.channel.assertQueue(queueConfig.QUEUE_NAMES.DEAD_LETTER, { durable: true });

      // Setup main queue with DLX
      await this.channel.assertQueue(queueConfig.QUEUE_NAMES.ANALYTICS, {
        durable: true,
        deadLetterExchange: queueConfig.retryStrategy.deadLetterExchange,
        deadLetterRoutingKey: queueConfig.retryStrategy.deadLetterRoutingKey
      });

      await this.channel.prefetch(queueConfig.connection.options.prefetch);

      await this.channel.consume(
        queueConfig.QUEUE_NAMES.ANALYTICS,
        this.handleMessage.bind(this),
        { noAck: false }
      );

      this.logger.info('Analytics consumer started successfully');
    } catch (error) {
      this.logger.error('Failed to start analytics consumer', { error });
      this.processingErrors.inc({ error_type: 'startup_error' });
      throw error;
    }
  }

  private async handleMessage(message: amqp.ConsumeMessage | null): Promise<void> {
    if (!message) return;

    const startTime = Date.now();
    const messageType = this.getMessageType(message);
    const correlationId = message.properties.correlationId || 'unknown';

    const span = this.tracer.startSpan('process_analytics_message');
    const ctx = trace.setSpan(context.active(), span);

    try {
      const content = JSON.parse(message.content.toString());

      await context.with(ctx, async () => {
        await this.circuitBreaker.fire(this.processMessage.bind(this), content);
      });

      this.messageProcessed.inc({ message_type: messageType, status: 'success' });
      this.processingDuration.observe(
        { message_type: messageType },
        (Date.now() - startTime) / 1000
      );

      await this.channel.ack(message);
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      this.handleProcessingError(error, message, messageType, span);
    } finally {
      span.end();
    }
  }

  private async processMessage(content: any): Promise<void> {
    switch (content.type) {
      case 'HISTORICAL_ANALYSIS':
        await this.analyticsService.analyzeHistoricalData(content.data as IHistoricalDataAnalysis);
        break;
      case 'REVENUE_FORECAST':
        await this.analyticsService.generateRevenueForecast(content.data as IRevenueForecast);
        break;
      case 'PATTERN_DETECTION':
        await this.analyticsService.detectPatterns(content.data as IPatternDetection);
        break;
      default:
        throw new Error(`Unknown message type: ${content.type}`);
    }
  }

  private async handleProcessingError(
    error: any,
    message: amqp.ConsumeMessage,
    messageType: string,
    span: any
  ): Promise<void> {
    this.logger.error('Error processing analytics message', {
      error,
      messageType,
      correlationId: message.properties.correlationId
    });

    this.processingErrors.inc({ error_type: error.name || 'unknown' });
    this.messageProcessed.inc({ message_type: messageType, status: 'error' });

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });

    const retryCount = (message.properties.headers['x-retry-count'] || 0) + 1;

    if (retryCount <= queueConfig.retryStrategy.maxRetries) {
      await this.scheduleRetry(message, retryCount);
    } else {
      await this.handleMaxRetriesExceeded(message);
    }
  }

  private async scheduleRetry(message: amqp.ConsumeMessage, retryCount: number): Promise<void> {
    const delay = this.calculateRetryDelay(retryCount);
    
    await this.channel.publish(
      '',
      queueConfig.QUEUE_NAMES.ANALYTICS,
      message.content,
      {
        ...message.properties,
        headers: {
          ...message.properties.headers,
          'x-retry-count': retryCount
        },
        expiration: delay.toString()
      }
    );

    await this.channel.ack(message);
  }

  private async handleMaxRetriesExceeded(message: amqp.ConsumeMessage): Promise<void> {
    await this.channel.publish(
      queueConfig.retryStrategy.deadLetterExchange,
      queueConfig.retryStrategy.deadLetterRoutingKey,
      message.content,
      message.properties
    );

    await this.channel.ack(message);
  }

  private calculateRetryDelay(retryCount: number): number {
    return Math.min(
      queueConfig.retryStrategy.initialInterval * Math.pow(queueConfig.retryStrategy.backoffMultiplier, retryCount - 1),
      queueConfig.retryStrategy.maxInterval
    );
  }

  private getMessageType(message: amqp.ConsumeMessage): string {
    try {
      const content = JSON.parse(message.content.toString());
      return content.type || 'unknown';
    } catch {
      return 'invalid';
    }
  }

  public async handleShutdown(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.info('Analytics consumer shutdown completed');
    } catch (error) {
      this.logger.error('Error during analytics consumer shutdown', { error });
      throw error;
    }
  }
}