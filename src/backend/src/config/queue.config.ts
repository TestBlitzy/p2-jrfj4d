import { config } from 'dotenv'; // ^16.3.0

// Load environment variables
config();

// Validate required environment variables
if (!process.env.RABBITMQ_URL || !process.env.RABBITMQ_USERNAME || !process.env.RABBITMQ_PASSWORD) {
    throw new Error('Missing required RabbitMQ environment variables');
}

/**
 * Queue names for different message processing channels
 */
export const QUEUE_NAMES = {
    ANALYTICS: 'analytics_queue',
    LEAD_SCORING: 'lead_scoring_queue',
    EMAIL: 'email_queue',
    DEAD_LETTER: 'dlq'
} as const;

/**
 * Exchange names for message routing
 */
export const EXCHANGE_NAMES = {
    ANALYTICS: 'analytics_exchange',
    LEAD_SCORING: 'lead_scoring_exchange',
    EMAIL: 'email_exchange',
    DEAD_LETTER: 'dlx'
} as const;

/**
 * RabbitMQ connection configuration with security settings
 */
export const connection = {
    url: process.env.RABBITMQ_URL,
    options: {
        username: process.env.RABBITMQ_USERNAME,
        password: process.env.RABBITMQ_PASSWORD,
        // Heartbeat interval in seconds for connection health monitoring
        heartbeat: 60,
        // Maximum number of unacknowledged messages
        prefetch: 10,
        // Ensure messages persist through broker restarts
        persistent: true,
        // Ensure queues survive broker restarts
        durable: true,
        // Require explicit message acknowledgment
        noAck: false,
        ssl: {
            enabled: true,
            verify: true,
            rejectUnauthorized: true
        }
    }
} as const;

/**
 * Retry strategy configuration with exponential backoff
 */
export const retryStrategy = {
    // Maximum number of retry attempts
    maxRetries: 5,
    // Initial retry interval in milliseconds (1 minute)
    initialInterval: 60000,
    // Maximum retry interval in milliseconds (5 minutes)
    maxInterval: 300000,
    // Multiplier for exponential backoff
    backoffMultiplier: 2,
    // Dead letter exchange for failed messages
    deadLetterExchange: EXCHANGE_NAMES.DEAD_LETTER,
    // Dead letter routing key
    deadLetterRoutingKey: QUEUE_NAMES.DEAD_LETTER
} as const;

/**
 * Queue configuration interface for type safety
 */
interface QueueConfig {
    connection: typeof connection;
    QUEUE_NAMES: typeof QUEUE_NAMES;
    EXCHANGE_NAMES: typeof EXCHANGE_NAMES;
    retryStrategy: typeof retryStrategy;
}

/**
 * Retrieves the queue configuration with validation
 * @returns {QueueConfig} Validated queue configuration object
 */
export function getQueueConfig(): QueueConfig {
    // Validate SSL configuration based on environment
    const sslEnabled = process.env.NODE_ENV === 'production';
    const validatedConnection = {
        ...connection,
        options: {
            ...connection.options,
            ssl: {
                ...connection.options.ssl,
                enabled: sslEnabled
            }
        }
    };

    return {
        connection: validatedConnection,
        QUEUE_NAMES,
        EXCHANGE_NAMES,
        retryStrategy
    };
}

// Export default configuration object
export const queueConfig = getQueueConfig();