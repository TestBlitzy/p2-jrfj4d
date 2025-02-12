import * as amqp from 'amqplib'; // ^0.10.0
import { logger } from 'winston'; // ^3.8.0
import { queueConfig } from '../../config/queue.config';
import { ILead } from '../../interfaces/leads.interface';

// Constants for producer configuration
const PUBLISH_TIMEOUT = 5000;
const MAX_MESSAGE_SIZE = 1048576; // 1MB
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;

/**
 * Producer class for publishing lead scoring tasks to RabbitMQ
 * Implements robust error handling, connection recovery, and message validation
 */
export class LeadScoringProducer {
    private connection: amqp.Connection;
    private channel: amqp.Channel;
    private readonly queueName: string;
    private readonly exchangeName: string;
    private retryAttempts: number;
    private isInitialized: boolean;

    /**
     * Initialize the lead scoring producer
     * @param connection - RabbitMQ connection instance
     * @param channel - RabbitMQ channel instance
     * @param maxRetries - Maximum number of retry attempts
     */
    constructor(
        connection: amqp.Connection,
        channel: amqp.Channel,
        private readonly maxRetries: number = MAX_RETRY_ATTEMPTS
    ) {
        this.connection = connection;
        this.channel = channel;
        this.queueName = queueConfig.QUEUE_NAMES.LEAD_SCORING;
        this.exchangeName = queueConfig.EXCHANGE_NAMES.LEAD_SCORING;
        this.retryAttempts = 0;
        this.isInitialized = false;

        // Set up connection error handlers
        this.connection.on('error', async (error) => {
            await this.handleError(error, 'Connection error');
        });

        this.connection.on('close', async () => {
            logger.warn('RabbitMQ connection closed');
            this.isInitialized = false;
        });

        // Set up channel error handlers
        this.channel.on('error', async (error) => {
            await this.handleError(error, 'Channel error');
        });

        this.channel.on('return', (msg) => {
            logger.warn('Message returned from queue', {
                content: msg.content.toString(),
                routingKey: msg.fields.routingKey
            });
        });
    }

    /**
     * Initialize the producer's exchange and queue bindings
     */
    public async initialize(): Promise<void> {
        try {
            // Assert exchange with durability settings
            await this.channel.assertExchange(this.exchangeName, 'direct', {
                durable: true,
                autoDelete: false
            });

            // Assert queue with dead letter configuration
            await this.channel.assertQueue(this.queueName, {
                durable: true,
                deadLetterExchange: queueConfig.EXCHANGE_NAMES.DEAD_LETTER,
                deadLetterRoutingKey: queueConfig.QUEUE_NAMES.DEAD_LETTER,
                messageTtl: queueConfig.retryStrategy.maxInterval
            });

            // Bind queue to exchange
            await this.channel.bindQueue(
                this.queueName,
                this.exchangeName,
                this.queueName
            );

            // Enable publisher confirms
            await this.channel.confirmSelect();

            // Set prefetch for better load distribution
            await this.channel.prefetch(queueConfig.connection.options.prefetch);

            this.isInitialized = true;
            logger.info('Lead scoring producer initialized successfully');
        } catch (error) {
            await this.handleError(error, 'Initialization error');
            throw error;
        }
    }

    /**
     * Publish a lead for AI scoring
     * @param lead - Lead data to be scored
     * @returns Promise<boolean> - Success status of publication
     */
    public async publishLeadForScoring(lead: ILead): Promise<boolean> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Validate lead data
            if (!this.validateLead(lead)) {
                throw new Error('Invalid lead data');
            }

            // Prepare message content
            const message = Buffer.from(JSON.stringify({
                lead,
                timestamp: new Date().toISOString(),
                attempts: 0
            }));

            // Check message size
            if (message.length > MAX_MESSAGE_SIZE) {
                throw new Error('Message size exceeds maximum limit');
            }

            // Publish with confirmation
            const published = await new Promise<boolean>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Publish confirmation timeout'));
                }, PUBLISH_TIMEOUT);

                this.channel.publish(
                    this.exchangeName,
                    this.queueName,
                    message,
                    {
                        persistent: true,
                        mandatory: true,
                        contentType: 'application/json',
                        headers: {
                            'x-retry-count': 0
                        }
                    },
                    (err) => {
                        clearTimeout(timeout);
                        if (err) {
                            reject(err);
                        } else {
                            resolve(true);
                        }
                    }
                );
            });

            if (published) {
                logger.info('Lead published for scoring', {
                    leadId: lead.id,
                    queue: this.queueName
                });
                return true;
            }

            return false;
        } catch (error) {
            await this.handleError(error, 'Publish error');
            return false;
        }
    }

    /**
     * Handle errors with retry logic and connection recovery
     * @param error - Error object
     * @param operation - Operation description
     */
    private async handleError(error: Error, operation: string): Promise<void> {
        logger.error(`${operation}: ${error.message}`, {
            error,
            retryAttempt: this.retryAttempts
        });

        if (this.retryAttempts >= this.maxRetries) {
            logger.error('Max retry attempts reached', {
                operation,
                maxRetries: this.maxRetries
            });
            throw error;
        }

        // Implement exponential backoff
        const delay = RETRY_DELAY_BASE * Math.pow(2, this.retryAttempts);
        this.retryAttempts++;

        await new Promise(resolve => setTimeout(resolve, delay));

        // Attempt recovery
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    /**
     * Validate lead data completeness
     * @param lead - Lead data to validate
     * @returns boolean - Validation result
     */
    private validateLead(lead: ILead): boolean {
        return !!(
            lead &&
            lead.id &&
            lead.email &&
            typeof lead.score === 'number' &&
            lead.metadata
        );
    }
}

export default LeadScoringProducer;