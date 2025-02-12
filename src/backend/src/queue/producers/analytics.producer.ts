import { injectable } from 'inversify';
import * as amqp from 'amqplib'; // ^0.10.0
import { Logger } from 'winston'; // ^3.10.0
import { queueConfig, QUEUE_NAMES, EXCHANGE_NAMES, retryStrategy } from '../../config/queue.config';
import { 
    AnalyticsMetricType,
    HistoricalDataParams,
    RevenueForecastParams,
    PatternDetectionParams,
    DEFAULT_CONFIDENCE_THRESHOLD,
    MIN_DATA_POINTS
} from '../../types/analytics.types';

@injectable()
export class AnalyticsProducer {
    private channel: amqp.Channel;
    private connection: amqp.Connection;
    private readonly retryCount: number;
    private readonly retryInterval: number;
    private healthCheck: NodeJS.Timer;

    constructor(
        private readonly logger: Logger,
        private readonly config = queueConfig
    ) {
        this.retryCount = this.config.retryStrategy.maxRetries;
        this.retryInterval = this.config.retryStrategy.initialInterval;
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            await this.setupConnection();
            await this.setupChannel();
            this.setupHealthCheck();
            this.handleGracefulShutdown();
        } catch (error) {
            this.logger.error('Failed to initialize AnalyticsProducer:', error);
            throw error;
        }
    }

    private async setupConnection(): Promise<void> {
        try {
            this.connection = await amqp.connect({
                ...this.config.connection.options,
                hostname: this.config.connection.url
            });

            this.connection.on('error', (error) => {
                this.logger.error('RabbitMQ connection error:', error);
                this.attemptReconnect();
            });

            this.connection.on('close', () => {
                this.logger.warn('RabbitMQ connection closed');
                this.attemptReconnect();
            });
        } catch (error) {
            this.logger.error('Failed to establish RabbitMQ connection:', error);
            throw error;
        }
    }

    private async setupChannel(): Promise<void> {
        try {
            this.channel = await this.connection.createChannel();
            
            // Set channel prefetch for load balancing
            await this.channel.prefetch(this.config.connection.options.prefetch);

            // Setup exchanges
            await this.channel.assertExchange(
                EXCHANGE_NAMES.ANALYTICS,
                'direct',
                { durable: true }
            );

            await this.channel.assertExchange(
                EXCHANGE_NAMES.DEAD_LETTER,
                'direct',
                { durable: true }
            );

            // Setup queues with dead letter exchange
            await this.channel.assertQueue(QUEUE_NAMES.ANALYTICS, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': EXCHANGE_NAMES.DEAD_LETTER,
                    'x-dead-letter-routing-key': QUEUE_NAMES.DEAD_LETTER,
                    'x-message-ttl': this.config.retryStrategy.maxInterval
                }
            });

            // Bind queues to exchanges
            await this.channel.bindQueue(
                QUEUE_NAMES.ANALYTICS,
                EXCHANGE_NAMES.ANALYTICS,
                'analytics.#'
            );

            this.channel.on('error', (error) => {
                this.logger.error('Channel error:', error);
                this.setupChannel();
            });

            this.channel.on('close', () => {
                this.logger.warn('Channel closed');
                this.setupChannel();
            });
        } catch (error) {
            this.logger.error('Failed to setup channel:', error);
            throw error;
        }
    }

    public async publishHistoricalAnalysis(params: HistoricalDataParams): Promise<void> {
        try {
            this.validateHistoricalParams(params);

            const message = {
                type: 'HISTORICAL_ANALYSIS',
                data: params,
                timestamp: new Date().toISOString(),
                correlationId: crypto.randomUUID()
            };

            await this.publishWithRetry(
                EXCHANGE_NAMES.ANALYTICS,
                'analytics.historical',
                message
            );

            this.logger.info('Published historical analysis task', {
                correlationId: message.correlationId,
                metricType: params.metricType
            });
        } catch (error) {
            this.logger.error('Failed to publish historical analysis task:', error);
            throw error;
        }
    }

    public async publishRevenueForecast(params: RevenueForecastParams): Promise<void> {
        try {
            this.validateForecastParams(params);

            const message = {
                type: 'REVENUE_FORECAST',
                data: params,
                timestamp: new Date().toISOString(),
                correlationId: crypto.randomUUID()
            };

            await this.publishWithRetry(
                EXCHANGE_NAMES.ANALYTICS,
                'analytics.forecast',
                message
            );

            this.logger.info('Published revenue forecast task', {
                correlationId: message.correlationId,
                forecastPeriod: params.forecastPeriod
            });
        } catch (error) {
            this.logger.error('Failed to publish revenue forecast task:', error);
            throw error;
        }
    }

    public async publishPatternDetection(params: PatternDetectionParams): Promise<void> {
        try {
            this.validatePatternParams(params);

            const message = {
                type: 'PATTERN_DETECTION',
                data: params,
                timestamp: new Date().toISOString(),
                correlationId: crypto.randomUUID()
            };

            await this.publishWithRetry(
                EXCHANGE_NAMES.ANALYTICS,
                'analytics.pattern',
                message
            );

            this.logger.info('Published pattern detection task', {
                correlationId: message.correlationId,
                patternType: params.patternType
            });
        } catch (error) {
            this.logger.error('Failed to publish pattern detection task:', error);
            throw error;
        }
    }

    private async publishWithRetry(
        exchange: string,
        routingKey: string,
        message: any,
        attempt: number = 1
    ): Promise<void> {
        try {
            const published = this.channel.publish(
                exchange,
                routingKey,
                Buffer.from(JSON.stringify(message)),
                {
                    persistent: true,
                    messageId: message.correlationId,
                    timestamp: Date.now(),
                    headers: {
                        'x-retry-count': attempt
                    }
                }
            );

            if (!published) {
                throw new Error('Message was not published');
            }
        } catch (error) {
            if (attempt < this.retryCount) {
                const backoff = this.retryInterval * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return this.publishWithRetry(exchange, routingKey, message, attempt + 1);
            }
            throw error;
        }
    }

    private validateHistoricalParams(params: HistoricalDataParams): void {
        if (!params.startDate || !params.endDate || params.startDate >= params.endDate) {
            throw new Error('Invalid date range for historical analysis');
        }
        if (!Object.values(AnalyticsMetricType).includes(params.metricType)) {
            throw new Error('Invalid metric type for historical analysis');
        }
        if (!params.filters || !Array.isArray(params.filters)) {
            throw new Error('Invalid filters for historical analysis');
        }
    }

    private validateForecastParams(params: RevenueForecastParams): void {
        if (!params.forecastPeriod || params.forecastPeriod <= 0) {
            throw new Error('Invalid forecast period');
        }
        if (!params.modelConfig || !params.seasonalityFactors) {
            throw new Error('Missing required forecast configuration');
        }
        if (params.confidenceLevel < DEFAULT_CONFIDENCE_THRESHOLD) {
            throw new Error('Confidence level below minimum threshold');
        }
    }

    private validatePatternParams(params: PatternDetectionParams): void {
        if (!params.dataPoints || params.dataPoints.length < MIN_DATA_POINTS) {
            throw new Error('Insufficient data points for pattern detection');
        }
        if (!params.timeWindow || !params.timeWindow.start || !params.timeWindow.end) {
            throw new Error('Invalid time window for pattern detection');
        }
        if (!params.algorithmConfig || !params.algorithmConfig.algorithm) {
            throw new Error('Missing algorithm configuration');
        }
    }

    private setupHealthCheck(): void {
        this.healthCheck = setInterval(() => {
            if (this.channel && this.connection) {
                this.logger.debug('RabbitMQ connection health check: OK');
            } else {
                this.logger.warn('RabbitMQ connection health check: Failed');
                this.attemptReconnect();
            }
        }, 30000);
    }

    private async attemptReconnect(): Promise<void> {
        try {
            if (this.connection) {
                await this.connection.close();
            }
            await this.initialize();
        } catch (error) {
            this.logger.error('Failed to reconnect:', error);
            setTimeout(() => this.attemptReconnect(), this.retryInterval);
        }
    }

    private handleGracefulShutdown(): void {
        const shutdown = async () => {
            clearInterval(this.healthCheck);
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
}