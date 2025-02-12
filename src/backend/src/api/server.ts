/**
 * @fileoverview Main server entry point that initializes and starts the Express application
 * Implements comprehensive error handling, health monitoring, and high availability
 * @version 1.0.0
 */

import http from 'http';
import { config } from 'dotenv';
import app from './app';
import { databaseConfig } from '../config/database.config';
import { ErrorCodes } from '../constants/error-codes';
import { logger } from './middleware/logging.middleware';

// Load environment variables
config();

// Global constants
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000', 10);
const HEALTH_CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10);

/**
 * Initializes and starts the HTTP server with comprehensive error handling
 * @returns {http.Server} Running HTTP server instance
 */
async function startServer(): Promise<http.Server> {
    try {
        // Create HTTP server with timeout handling
        const server = http.createServer(app);
        server.timeout = 30000; // 30 second timeout
        server.keepAliveTimeout = 65000; // Slightly higher than ALB idle timeout
        server.headersTimeout = 66000; // Slightly higher than keepAliveTimeout

        // Setup health monitoring
        setupHealthCheck(server);

        // Start listening
        server.listen(PORT, () => {
            logger.info('Server started successfully', {
                port: PORT,
                environment: NODE_ENV,
                timestamp: new Date().toISOString()
            });
        });

        // Handle server errors
        server.on('error', (error: NodeJS.ErrnoException) => {
            logger.error('Server error occurred', {
                error: error.message,
                code: error.code,
                timestamp: new Date().toISOString()
            });

            if (error.code === 'EADDRINUSE') {
                logger.error('Port is already in use', { port: PORT });
                process.exit(1);
            }
        });

        // Setup graceful shutdown
        setupGracefulShutdown(server);

        return server;
    } catch (error) {
        logger.error('Failed to start server', {
            error: error.message,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

/**
 * Sets up comprehensive health monitoring for the server
 * @param {http.Server} server - HTTP server instance
 */
function setupHealthCheck(server: http.Server): void {
    let isHealthy = true;

    // Add health check endpoint
    app.get('/health', async (req, res) => {
        try {
            // Check database connections
            const dbStatus = await checkDatabaseConnections();
            
            // Check Redis connection
            const redisStatus = await checkRedisConnection();

            // Check system metrics
            const systemMetrics = {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            };

            if (!dbStatus.healthy || !redisStatus.healthy) {
                isHealthy = false;
                res.status(503).json({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    details: {
                        database: dbStatus,
                        redis: redisStatus,
                        system: systemMetrics
                    }
                });
                return;
            }

            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version,
                details: {
                    database: dbStatus,
                    redis: redisStatus,
                    system: systemMetrics
                }
            });
        } catch (error) {
            logger.error('Health check failed', { error });
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    });

    // Periodic health checks
    setInterval(async () => {
        try {
            const dbStatus = await checkDatabaseConnections();
            const redisStatus = await checkRedisConnection();
            isHealthy = dbStatus.healthy && redisStatus.healthy;

            if (!isHealthy) {
                logger.error('Health check failed', {
                    database: dbStatus,
                    redis: redisStatus
                });
            }
        } catch (error) {
            logger.error('Health check error', { error });
            isHealthy = false;
        }
    }, HEALTH_CHECK_INTERVAL);
}

/**
 * Checks database connection health
 * @returns {Promise<{healthy: boolean, details?: string}>}
 */
async function checkDatabaseConnections(): Promise<{ healthy: boolean; details?: string }> {
    try {
        const client = await databaseConfig.postgres.pool.connect();
        await client.query('SELECT 1');
        client.release();
        return { healthy: true };
    } catch (error) {
        return { 
            healthy: false,
            details: error.message
        };
    }
}

/**
 * Checks Redis connection health
 * @returns {Promise<{healthy: boolean, details?: string}>}
 */
async function checkRedisConnection(): Promise<{ healthy: boolean; details?: string }> {
    try {
        await databaseConfig.redis.client.ping();
        return { healthy: true };
    } catch (error) {
        return {
            healthy: false,
            details: error.message
        };
    }
}

/**
 * Sets up graceful shutdown handling
 * @param {http.Server} server - HTTP server instance
 */
function setupGracefulShutdown(server: http.Server): void {
    // Handle process termination signals
    ['SIGTERM', 'SIGINT'].forEach(signal => {
        process.on(signal, async () => {
            logger.info(`${signal} received, starting graceful shutdown`);
            await handleShutdown(server);
        });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
        logger.error('Uncaught exception', {
            error: error.message,
            stack: error.stack
        });
        await handleShutdown(server);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
        logger.error('Unhandled promise rejection', {
            reason,
            promise
        });
        await handleShutdown(server);
    });
}

/**
 * Handles graceful server shutdown
 * @param {http.Server} server - HTTP server instance
 */
async function handleShutdown(server: http.Server): Promise<void> {
    try {
        // Stop accepting new connections
        server.close(async () => {
            logger.info('Server stopped accepting new connections');

            try {
                // Close database connections
                await databaseConfig.postgres.pool.end();
                logger.info('Database connections closed');

                // Close Redis connections
                await databaseConfig.redis.client.quit();
                logger.info('Redis connections closed');

                // Exit process
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown', { error });
                process.exit(1);
            }
        });

        // Force shutdown after timeout
        setTimeout(() => {
            logger.error('Shutdown timeout exceeded, forcing exit');
            process.exit(1);
        }, SHUTDOWN_TIMEOUT);

    } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
    }
}

// Start server and export for testing
const server = startServer();
export default server;