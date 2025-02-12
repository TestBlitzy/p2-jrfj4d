import { config } from 'dotenv'; // ^16.3.0
import { Pool } from 'pg-pool'; // ^3.6.0
import Redis from 'ioredis'; // ^5.3.0

// Initialize environment variables
config();

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Validates all required database configuration parameters
 * @returns boolean indicating if configuration is valid
 * @throws Error with detailed validation failures
 */
const validateDatabaseConfig = (): boolean => {
  const requiredPostgresVars = [
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD'
  ];

  const requiredRedisVars = [
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_SENTINEL_HOST_1',
    'REDIS_SENTINEL_PORT_1',
    'REDIS_SENTINEL_HOST_2',
    'REDIS_SENTINEL_PORT_2',
    'REDIS_SENTINEL_PASSWORD'
  ];

  const missingVars = [
    ...requiredPostgresVars,
    ...requiredRedisVars
  ].filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return true;
};

/**
 * Creates and configures a production-ready PostgreSQL connection pool
 * @returns Configured PostgreSQL Pool instance
 */
const createPostgresPool = (): Pool => {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT!, 10),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    
    // Pool configuration
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    maxUses: 7500,
    
    // Application settings
    application_name: 'sip_backend',
    statement_timeout: 30000,
    query_timeout: 5000,
    
    // SSL configuration
    ssl: {
      rejectUnauthorized: false,
      ca: process.env.POSTGRES_SSL_CA,
      key: process.env.POSTGRES_SSL_KEY,
      cert: process.env.POSTGRES_SSL_CERT
    }
  });

  // Pool event listeners for monitoring
  pool.on('connect', (client) => {
    console.info('New client connected to PostgreSQL pool');
  });

  pool.on('error', (err, client) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });

  pool.on('remove', (client) => {
    console.info('Client removed from PostgreSQL pool');
  });

  return pool;
};

/**
 * Creates and configures a Redis client with sentinel support
 * @returns Configured Redis client instance
 */
const createRedisClient = (): Redis => {
  const redisOptions: Redis.RedisOptions = {
    keyPrefix: 'sip:',
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    
    // Sentinel configuration
    sentinels: [
      {
        host: process.env.REDIS_SENTINEL_HOST_1!,
        port: parseInt(process.env.REDIS_SENTINEL_PORT_1!, 10)
      },
      {
        host: process.env.REDIS_SENTINEL_HOST_2!,
        port: parseInt(process.env.REDIS_SENTINEL_PORT_2!, 10)
      }
    ],
    sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD,
    name: 'mymaster',

    // Connection settings
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 1000, 30000);
      return delay;
    },
    
    // Health and monitoring
    healthCheckInterval: 5000,
    commandTimeout: 5000,
    keepAlive: 10000,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    }
  };

  const redis = new Redis(redisOptions);

  // Redis event listeners
  redis.on('connect', () => {
    console.info('Connected to Redis');
  });

  redis.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  redis.on('ready', () => {
    console.info('Redis client ready');
  });

  redis.on('close', () => {
    console.info('Redis connection closed');
  });

  return redis;
};

// Validate configuration before creating instances
validateDatabaseConfig();

// Export database configuration
export const databaseConfig = {
  postgres: {
    pool: createPostgresPool(),
    options: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT!, 10),
      database: process.env.POSTGRES_DB,
      // Sensitive information not exported
      ssl: {
        rejectUnauthorized: false,
        ca: process.env.POSTGRES_SSL_CA,
        key: process.env.POSTGRES_SSL_KEY,
        cert: process.env.POSTGRES_SSL_CERT
      }
    }
  },
  redis: {
    client: createRedisClient(),
    options: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT!, 10),
      keyPrefix: 'sip:',
      sentinels: [
        {
          host: process.env.REDIS_SENTINEL_HOST_1,
          port: parseInt(process.env.REDIS_SENTINEL_PORT_1!, 10)
        },
        {
          host: process.env.REDIS_SENTINEL_HOST_2,
          port: parseInt(process.env.REDIS_SENTINEL_PORT_2!, 10)
        }
      ],
      name: 'mymaster'
    }
  }
};