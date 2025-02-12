import * as amqp from 'amqplib'; // ^0.10.0
import { Logger } from 'winston'; // ^3.8.0
import { PythonShell } from 'python-shell'; // ^5.0.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { Counter, Histogram } from 'prom-client'; // ^14.0.0
import { injectable } from 'tsyringe'; // ^4.0.0

import { queueConfig } from '../../config/queue.config';
import { ILead } from '../../interfaces/leads.interface';
import { LeadService } from '../../services/leads.service';
import { LeadStatus } from '../../constants/lead-status';

// Constants for consumer configuration
const PROCESSING_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const CIRCUIT_BREAKER_OPTIONS = {
    timeout: 10000, // 10 seconds
    errorThresholdPercentage: 50,
    resetTimeout: 30000 // 30 seconds
};

@injectable()
export class LeadScoringConsumer {
    private connection: amqp.Connection;
    private channel: amqp.Channel;
    private readonly queueName: string;
    private readonly exchangeName: string;
    private readonly aiPredictor: CircuitBreaker;
    private retryAttempts: number;
    private isInitialized: boolean;

    // Metrics
    private readonly processingDuration: Histogram;
    private readonly messageProcessed: Counter;
    private readonly processingErrors: Counter;

    constructor(
        connection: amqp.Connection,
        channel: amqp.Channel,
        private readonly leadService: LeadService,
        private readonly logger: Logger
    ) {
        this.connection = connection;
        this.channel = channel;
        this.queueName = queueConfig.QUEUE_NAMES.LEAD_SCORING;
        this.exchangeName = queueConfig.EXCHANGE_NAMES.LEAD_SCORING;
        this.retryAttempts = 0;
        this.isInitialized = false;

        // Initialize metrics
        this.processingDuration = new Histogram({
            name: 'lead_scoring_processing_duration',
            help: 'Duration of lead scoring processing',
            labelNames: ['status']
        });

        this.messageProcessed = new Counter({
            name: 'lead_scoring_messages_processed',
            help: 'Number of lead scoring messages processed',
            labelNames: ['status']
        });

        this.processingErrors = new Counter({
            name: 'lead_scoring_processing_errors',
            help: 'Number of lead scoring processing errors',
            labelNames: ['type']
        });

        // Initialize circuit breaker for AI predictions
        this.aiPredictor = new CircuitBreaker(this.predictScore.bind(this), CIRCUIT_BREAKER_OPTIONS);
        this.setupCircuitBreakerEvents();
    }

    /**
     * Initialize the consumer with queue assertions and bindings
     */
    public async initialize(): Promise<void> {
        try {
            // Assert exchange
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

            // Set prefetch for better load distribution
            await this.channel.prefetch(queueConfig.connection.options.prefetch);

            // Start consuming messages
            await this.channel.consume(
                this.queueName,
                this.handleMessage.bind(this),
                { noAck: false }
            );

            this.isInitialized = true;
            this.logger.info('Lead scoring consumer initialized successfully');
        } catch (error) {
            await this.handleError(error, 'Initialization error');
            throw error;
        }
    }

    /**
     * Handle incoming messages with comprehensive error handling
     */
    private async handleMessage(message: amqp.Message | null): Promise<void> {
        if (!message) {
            return;
        }

        const timer = this.processingDuration.startTimer();

        try {
            const content = JSON.parse(message.content.toString());
            const lead: ILead = content.lead;
            const attempts = content.attempts || 0;

            // Validate message content
            if (!this.validateMessage(lead)) {
                throw new Error('Invalid message format');
            }

            // Process lead scoring with circuit breaker
            const score = await this.aiPredictor.fire(lead);
            
            // Update lead score in database
            await this.leadService.updateLeadScore(lead.id, score, {
                engagement: score * 0.3,
                companyFit: score * 0.2,
                budget: score * 0.2,
                timing: score * 0.15,
                intentSignals: score * 0.1,
                marketPresence: score * 0.05
            });

            // Acknowledge message
            this.channel.ack(message);
            
            // Update metrics
            timer({ status: 'success' });
            this.messageProcessed.inc({ status: 'success' });

            this.logger.info('Lead scoring processed successfully', {
                leadId: lead.id,
                score
            });
        } catch (error) {
            timer({ status: 'error' });
            this.messageProcessed.inc({ status: 'error' });
            await this.handleProcessingError(error, message);
        }
    }

    /**
     * Predict lead score using AI model
     */
    private async predictScore(lead: ILead): Promise<number> {
        return new Promise((resolve, reject) => {
            PythonShell.run('lead_scoring_model.py', {
                mode: 'json',
                args: [JSON.stringify(lead)]
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else if (results && results[0]) {
                    resolve(results[0].score);
                } else {
                    reject(new Error('Invalid model response'));
                }
            });
        });
    }

    /**
     * Handle processing errors with retry logic
     */
    private async handleProcessingError(error: Error, message: amqp.Message): Promise<void> {
        const content = JSON.parse(message.content.toString());
        const attempts = (content.attempts || 0) + 1;

        this.logger.error('Lead scoring processing error', {
            error: error.message,
            attempts
        });

        this.processingErrors.inc({ type: error.name });

        if (attempts <= MAX_RETRY_ATTEMPTS) {
            // Retry with exponential backoff
            const delay = Math.pow(2, attempts) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));

            // Republish with incremented attempt count
            const retryContent = { ...content, attempts };
            this.channel.publish(
                this.exchangeName,
                this.queueName,
                Buffer.from(JSON.stringify(retryContent)),
                {
                    persistent: true,
                    headers: { 'x-retry-count': attempts }
                }
            );

            this.channel.ack(message);
        } else {
            // Send to dead letter queue
            this.channel.reject(message, false);
            this.logger.error('Message moved to dead letter queue', {
                attempts,
                error: error.message
            });
        }
    }

    /**
     * Set up circuit breaker event handlers
     */
    private setupCircuitBreakerEvents(): void {
        this.aiPredictor.on('open', () => {
            this.logger.warn('Circuit breaker opened - AI predictor service may be unavailable');
        });

        this.aiPredictor.on('halfOpen', () => {
            this.logger.info('Circuit breaker half-open - attempting to recover');
        });

        this.aiPredictor.on('close', () => {
            this.logger.info('Circuit breaker closed - AI predictor service recovered');
        });
    }

    /**
     * Validate message content
     */
    private validateMessage(lead: ILead): boolean {
        return !!(
            lead &&
            lead.id &&
            lead.email &&
            lead.metadata &&
            typeof lead.score === 'number'
        );
    }

    /**
     * Handle errors with connection recovery
     */
    private async handleError(error: Error, operation: string): Promise<void> {
        this.logger.error(`${operation}: ${error.message}`, {
            error,
            retryAttempt: this.retryAttempts
        });

        if (this.retryAttempts >= MAX_RETRY_ATTEMPTS) {
            throw error;
        }

        this.retryAttempts++;
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryAttempts));

        if (!this.isInitialized) {
            await this.initialize();
        }
    }
}

export default LeadScoringConsumer;