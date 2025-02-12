import { injectable } from 'inversify';
import * as amqp from 'amqplib'; // ^0.10.3
import { Logger } from 'winston'; // ^3.10.0
import { connection, QUEUE_NAMES, retryStrategy } from '../../config/queue.config';
import { SendGridService } from '../../integrations/email/sendgrid.service';

/**
 * Interface for email message payload
 */
interface EmailMessage {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  categories?: string[];
  metadata?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Consumer service for processing email tasks from RabbitMQ queue
 * Handles automated email notifications, marketing campaigns, and system alerts
 */
@injectable()
export class EmailQueueConsumer {
  private channel: amqp.Channel;
  private readonly logger: Logger;
  private retryCount: Map<string, number>;
  private channelHealth: {
    isConnected: boolean;
    lastHeartbeat: Date;
    errors: number;
  };

  constructor(
    private readonly emailService: SendGridService
  ) {
    this.logger = new Logger({
      level: 'info',
      format: Logger.format.combine(
        Logger.format.timestamp(),
        Logger.format.json()
      ),
      defaultMeta: { service: 'email-consumer' }
    });

    this.retryCount = new Map();
    this.channelHealth = {
      isConnected: false,
      lastHeartbeat: new Date(),
      errors: 0
    };
  }

  /**
   * Initializes the RabbitMQ connection and sets up the consumer
   */
  public async initialize(): Promise<void> {
    try {
      // Create RabbitMQ connection with SSL options
      const conn = await amqp.connect({
        ...connection.options,
        hostname: connection.url,
        heartbeat: 60
      });

      // Handle connection events
      conn.on('error', this.handleConnectionError.bind(this));
      conn.on('close', this.handleConnectionClose.bind(this));

      // Create channel with prefetch
      this.channel = await conn.createChannel();
      await this.channel.prefetch(connection.options.prefetch);

      // Setup exchanges
      await this.channel.assertExchange(QUEUE_NAMES.EMAIL, 'direct', {
        durable: true,
        autoDelete: false
      });

      await this.channel.assertExchange(retryStrategy.deadLetterExchange, 'direct', {
        durable: true
      });

      // Setup queues with dead letter configuration
      await this.channel.assertQueue(QUEUE_NAMES.EMAIL, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': retryStrategy.deadLetterExchange,
          'x-dead-letter-routing-key': retryStrategy.deadLetterRoutingKey,
          'x-message-ttl': retryStrategy.initialInterval
        }
      });

      await this.channel.assertQueue(QUEUE_NAMES.DEAD_LETTER, {
        durable: true
      });

      // Bind queues
      await this.channel.bindQueue(QUEUE_NAMES.EMAIL, QUEUE_NAMES.EMAIL, '');
      await this.channel.bindQueue(
        QUEUE_NAMES.DEAD_LETTER,
        retryStrategy.deadLetterExchange,
        retryStrategy.deadLetterRoutingKey
      );

      // Start consuming messages
      await this.channel.consume(
        QUEUE_NAMES.EMAIL,
        this.handleMessage.bind(this),
        { noAck: false }
      );

      this.channelHealth.isConnected = true;
      this.logger.info('Email consumer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email consumer', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Handles incoming email messages from the queue
   */
  private async handleMessage(msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg) {
      return;
    }

    try {
      const emailMessage: EmailMessage = JSON.parse(msg.content.toString());
      const messageId = msg.properties.messageId || 'unknown';

      this.logger.info('Processing email message', {
        messageId,
        to: emailMessage.to
      });

      // Validate message format
      this.validateMessage(emailMessage);

      // Process the email
      await this.processMessage(emailMessage, messageId);

      // Acknowledge successful processing
      this.channel.ack(msg);

      // Clear retry count on success
      this.retryCount.delete(messageId);

      this.logger.info('Email message processed successfully', { messageId });
    } catch (error) {
      await this.handleError(error, msg);
    }
  }

  /**
   * Processes a validated email message
   */
  private async processMessage(message: EmailMessage, messageId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Get template if specified
      if (message.templateId) {
        const template = await this.emailService.getTemplate(message.templateId);
        message.html = template.content.html;
        message.text = template.content.plain;
      }

      // Send email
      await this.emailService.sendEmail({
        ...message,
        categories: [...(message.categories || []), 'sales-platform']
      });

      // Track metrics
      const processingTime = Date.now() - startTime;
      this.logger.info('Email processing metrics', {
        messageId,
        processingTime,
        success: true
      });
    } catch (error) {
      this.logger.error('Email processing failed', {
        messageId,
        error: error.message,
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Handles errors during message processing
   */
  private async handleError(error: Error, msg: amqp.ConsumeMessage): Promise<void> {
    const messageId = msg.properties.messageId || 'unknown';
    const currentRetries = this.retryCount.get(messageId) || 0;

    this.logger.error('Error processing message', {
      messageId,
      error: error.message,
      retryCount: currentRetries
    });

    if (currentRetries < retryStrategy.maxRetries) {
      // Increment retry count
      this.retryCount.set(messageId, currentRetries + 1);

      // Calculate backoff delay
      const delay = Math.min(
        retryStrategy.initialInterval * Math.pow(retryStrategy.backoffMultiplier, currentRetries),
        retryStrategy.maxInterval
      );

      // Republish with delay
      await this.channel.publish(
        QUEUE_NAMES.EMAIL,
        '',
        msg.content,
        {
          ...msg.properties,
          expiration: delay.toString()
        }
      );

      this.channel.ack(msg);
    } else {
      // Move to dead letter queue after max retries
      await this.channel.publish(
        retryStrategy.deadLetterExchange,
        retryStrategy.deadLetterRoutingKey,
        msg.content,
        {
          ...msg.properties,
          headers: {
            ...msg.properties.headers,
            'x-error': error.message,
            'x-failed-reason': 'max-retries-exceeded'
          }
        }
      );

      this.channel.ack(msg);
      this.retryCount.delete(messageId);
    }
  }

  /**
   * Validates email message format
   */
  private validateMessage(message: EmailMessage): void {
    if (!message.to || !message.from || !message.subject) {
      throw new Error('Missing required email fields');
    }

    if (!message.text && !message.html && !message.templateId) {
      throw new Error('Email must contain either text, HTML, or template ID');
    }
  }

  /**
   * Handles connection errors
   */
  private handleConnectionError(error: Error): void {
    this.channelHealth.isConnected = false;
    this.channelHealth.errors++;

    this.logger.error('RabbitMQ connection error', {
      error: error.message,
      errorCount: this.channelHealth.errors
    });
  }

  /**
   * Handles connection closure
   */
  private handleConnectionClose(): void {
    this.channelHealth.isConnected = false;
    
    this.logger.warn('RabbitMQ connection closed', {
      lastHeartbeat: this.channelHealth.lastHeartbeat
    });

    // Attempt to reconnect after delay
    setTimeout(() => {
      this.initialize().catch(error => {
        this.logger.error('Failed to reconnect', {
          error: error.message
        });
      });
    }, 5000);
  }
}