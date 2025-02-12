import { injectable } from 'inversify';
import * as amqp from 'amqplib'; // ^0.10.3
import { Logger } from 'winston'; // ^3.10.0
import { queueConfig } from '../../config/queue.config';

// Interface for email message structure
interface EmailMessage {
    to: string | string[];
    subject: string;
    body: string;
    template?: string;
    metadata?: Record<string, any>;
    priority?: number;
    campaignId?: string;
}

// Interface for publish options
interface PublishOptions {
    priority?: number;
    expiration?: number;
    headers?: Record<string, any>;
    persistent?: boolean;
    correlationId?: string;
}

// Interface for retry context
interface RetryContext {
    attempt: number;
    lastError?: Error;
    timestamp: number;
}

/**
 * Advanced producer service for publishing email tasks to RabbitMQ queue
 * with support for multiple providers, priority queuing, and comprehensive error handling
 */
@injectable()
export class EmailQueueProducer {
    private channel: amqp.Channel | null = null;
    private connection: amqp.Connection | null = null;
    private readonly exchangeName = queueConfig.EXCHANGE_NAMES.EMAIL;
    private readonly queueName = queueConfig.QUEUE_NAMES.EMAIL;
    private readonly dlxExchange = queueConfig.EXCHANGE_NAMES.DEAD_LETTER;
    private readonly dlqName = queueConfig.QUEUE_NAMES.DEAD_LETTER;
    private isInitialized = false;

    constructor(
        private readonly logger: Logger,
        private readonly connectionManager: any,
        private readonly metricsCollector: any
    ) {
        this.logger.info('EmailQueueProducer: Initializing service');
    }

    /**
     * Initializes the RabbitMQ connection and configures channels with advanced features
     */
    public async initialize(): Promise<void> {
        try {
            if (this.isInitialized) {
                return;
            }

            // Establish connection with retry mechanism
            this.connection = await this.connectionManager.connect(queueConfig.connection);
            
            // Create and configure channel
            this.channel = await this.connection.createChannel();
            await this.channel.prefetch(queueConfig.connection.options.prefetch);

            // Setup dead letter exchange
            await this.channel.assertExchange(this.dlxExchange, 'direct', {
                durable: true
            });

            await this.channel.assertQueue(this.dlqName, {
                durable: true
            });

            await this.channel.bindQueue(this.dlqName, this.dlxExchange, this.dlqName);

            // Setup main email exchange and queue
            await this.channel.assertExchange(this.exchangeName, 'direct', {
                durable: true
            });

            await this.channel.assertQueue(this.queueName, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': this.dlxExchange,
                    'x-dead-letter-routing-key': this.dlqName,
                    'x-max-priority': 10
                }
            });

            await this.channel.bindQueue(this.queueName, this.exchangeName, this.queueName);

            // Setup channel event listeners
            this.channel.on('error', this.handleChannelError.bind(this));
            this.channel.on('close', this.handleChannelClose.bind(this));

            // Setup connection recovery handlers
            this.connection.on('error', this.handleConnectionError.bind(this));
            this.connection.on('close', this.handleConnectionClose.bind(this));

            this.isInitialized = true;
            this.logger.info('EmailQueueProducer: Successfully initialized');
        } catch (error) {
            this.logger.error('EmailQueueProducer: Initialization failed', { error });
            throw error;
        }
    }

    /**
     * Publishes email message with enhanced delivery guarantees
     */
    public async publishEmail(message: EmailMessage, options: PublishOptions = {}): Promise<void> {
        try {
            if (!this.isInitialized || !this.channel) {
                await this.initialize();
            }

            // Validate message schema
            this.validateEmailMessage(message);

            // Enrich message with metadata
            const enrichedMessage = this.enrichMessage(message);
            const correlationId = options.correlationId || this.generateCorrelationId();

            // Prepare publish options with defaults
            const publishOptions: amqp.Options.Publish = {
                persistent: options.persistent ?? true,
                priority: options.priority ?? 0,
                correlationId,
                headers: {
                    ...options.headers,
                    timestamp: new Date().toISOString(),
                    messageType: 'email'
                }
            };

            if (options.expiration) {
                publishOptions.expiration = options.expiration.toString();
            }

            // Publish with confirmation
            const published = this.channel.publish(
                this.exchangeName,
                this.queueName,
                Buffer.from(JSON.stringify(enrichedMessage)),
                publishOptions
            );

            if (!published) {
                // Handle backpressure
                await new Promise(resolve => this.channel!.once('drain', resolve));
            }

            // Update metrics
            this.metricsCollector.incrementMessageCount('email_published');
            this.logger.info('EmailQueueProducer: Message published successfully', {
                correlationId,
                messageId: enrichedMessage.metadata?.messageId
            });
        } catch (error) {
            await this.handleError(error, message, { attempt: 1, timestamp: Date.now() });
        }
    }

    /**
     * Comprehensive error handling with recovery mechanisms
     */
    private async handleError(error: Error, message: EmailMessage, context: RetryContext): Promise<void> {
        this.logger.error('EmailQueueProducer: Error publishing message', {
            error,
            messageId: message.metadata?.messageId,
            attempt: context.attempt
        });

        this.metricsCollector.incrementErrorCount('email_publish_error');

        if (context.attempt < queueConfig.retryStrategy.maxRetries) {
            const nextAttempt = context.attempt + 1;
            const delay = this.calculateRetryDelay(nextAttempt);

            this.logger.info('EmailQueueProducer: Retrying message publish', {
                attempt: nextAttempt,
                delay
            });

            await new Promise(resolve => setTimeout(resolve, delay));
            await this.publishEmail(message, {
                priority: message.priority,
                correlationId: message.metadata?.correlationId
            });
        } else {
            // Route to dead letter queue
            await this.publishToDLQ(message, error);
        }
    }

    private validateEmailMessage(message: EmailMessage): void {
        if (!message.to || !message.subject || !message.body) {
            throw new Error('Invalid email message: missing required fields');
        }
    }

    private enrichMessage(message: EmailMessage): EmailMessage {
        return {
            ...message,
            metadata: {
                ...message.metadata,
                messageId: this.generateMessageId(),
                timestamp: new Date().toISOString(),
                correlationId: message.metadata?.correlationId || this.generateCorrelationId()
            }
        };
    }

    private async publishToDLQ(message: EmailMessage, error: Error): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel not initialized');
        }

        const dlqMessage = {
            originalMessage: message,
            error: {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            }
        };

        await this.channel.publish(
            this.dlxExchange,
            this.dlqName,
            Buffer.from(JSON.stringify(dlqMessage)),
            {
                persistent: true,
                headers: {
                    'x-error-type': error.name,
                    'x-original-exchange': this.exchangeName,
                    'x-original-routing-key': this.queueName
                }
            }
        );

        this.logger.warn('EmailQueueProducer: Message moved to DLQ', {
            messageId: message.metadata?.messageId,
            error: error.message
        });
    }

    private calculateRetryDelay(attempt: number): number {
        const { initialInterval, maxInterval, backoffMultiplier } = queueConfig.retryStrategy;
        const delay = initialInterval * Math.pow(backoffMultiplier, attempt - 1);
        return Math.min(delay, maxInterval);
    }

    private generateMessageId(): string {
        return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateCorrelationId(): string {
        return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private async handleChannelError(error: Error): Promise<void> {
        this.logger.error('EmailQueueProducer: Channel error', { error });
        this.metricsCollector.incrementErrorCount('channel_error');
    }

    private async handleChannelClose(): Promise<void> {
        this.logger.warn('EmailQueueProducer: Channel closed');
        this.isInitialized = false;
        await this.initialize();
    }

    private async handleConnectionError(error: Error): Promise<void> {
        this.logger.error('EmailQueueProducer: Connection error', { error });
        this.metricsCollector.incrementErrorCount('connection_error');
    }

    private async handleConnectionClose(): Promise<void> {
        this.logger.warn('EmailQueueProducer: Connection closed');
        this.isInitialized = false;
        await this.initialize();
    }
}