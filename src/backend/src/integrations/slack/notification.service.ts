/**
 * @fileoverview Slack notification service for sending system notifications
 * Implements rate limiting, retries, and Block Kit message formatting
 * @version 1.0.0
 */

import { injectable, singleton } from 'tsyringe'; // v4.3.0
import { WebClient, LogLevel, Block, KnownBlock } from '@slack/web-api'; // v6.8.1
import { RateLimiter } from 'limiter'; // v2.1.0
import { IntegrationType } from '../../constants/integration-types';
import { IIntegrationConfig } from '../../interfaces/integration.interface';
import { getIntegrationConfig } from '../../config/integration.config';

// Constants for service configuration
const DEFAULT_CHANNEL = 'sales-notifications';
const MAX_RETRIES = 3;
const RATE_LIMIT = 1; // 1 message per second per Slack API limits
const RATE_WINDOW = 1000; // 1 second window

/**
 * Message data validation decorator
 */
function validateMessageData(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function(...args: any[]) {
        const messageData = args[0];
        if (!messageData?.title || !messageData?.content) {
            throw new Error('Message must contain title and content');
        }
        return originalMethod.apply(this, args);
    };
    return descriptor;
}

@injectable()
@singleton()
export class SlackNotificationService {
    private readonly slackClient: WebClient;
    private readonly rateLimiter: RateLimiter;
    private readonly defaultChannel: string;
    private readonly channelCache: Map<string, boolean>;

    constructor() {
        // Get Slack integration configuration
        const config: IIntegrationConfig = getIntegrationConfig(IntegrationType.SLACK);

        // Initialize Slack client with retry configuration
        this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN, {
            logLevel: LogLevel.ERROR,
            retryConfig: {
                retries: MAX_RETRIES,
                minTimeout: 1000,
                maxTimeout: 5000
            }
        });

        // Initialize rate limiter
        this.rateLimiter = new RateLimiter({
            tokensPerInterval: RATE_LIMIT,
            interval: RATE_WINDOW
        });

        this.defaultChannel = DEFAULT_CHANNEL;
        this.channelCache = new Map<string, boolean>();

        // Validate default channel on initialization
        this.validateChannel(this.defaultChannel).catch(error => {
            console.error(`Failed to validate default channel: ${error.message}`);
        });
    }

    /**
     * Formats notification message using Slack's Block Kit
     * @param messageData Message content and metadata
     * @returns Formatted Slack message blocks
     */
    @validateMessageData
    private formatMessage(messageData: {
        title: string;
        content: string;
        priority?: 'high' | 'medium' | 'low';
        metadata?: Record<string, unknown>;
    }): (Block | KnownBlock)[] {
        const priorityEmoji = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };

        const blocks: (Block | KnownBlock)[] = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `${priorityEmoji[messageData.priority || 'low']} ${messageData.title}`,
                    emoji: true
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: messageData.content
                }
            }
        ];

        // Add metadata fields if provided
        if (messageData.metadata && Object.keys(messageData.metadata).length > 0) {
            blocks.push({
                type: 'context',
                elements: Object.entries(messageData.metadata).map(([key, value]) => ({
                    type: 'mrkdwn',
                    text: `*${key}:* ${value}`
                }))
            });
        }

        // Add timestamp and system identifier
        blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `*System:* Sales & Intelligence Platform | *Time:* ${new Date().toISOString()}`
                }
            ]
        });

        return blocks;
    }

    /**
     * Sends a notification to a Slack channel with rate limiting and retries
     * @param notification Notification content and metadata
     * @param channel Target Slack channel (optional)
     * @returns Success status of notification delivery
     */
    public async sendNotification(
        notification: {
            title: string;
            content: string;
            priority?: 'high' | 'medium' | 'low';
            metadata?: Record<string, unknown>;
        },
        channel?: string
    ): Promise<boolean> {
        try {
            // Check rate limit
            await this.rateLimiter.removeTokens(1);

            // Validate target channel
            const targetChannel = channel || this.defaultChannel;
            const isValidChannel = await this.validateChannel(targetChannel);

            if (!isValidChannel) {
                throw new Error(`Invalid or inaccessible Slack channel: ${targetChannel}`);
            }

            // Format message using Block Kit
            const messageBlocks = this.formatMessage(notification);

            // Send message to Slack
            const result = await this.slackClient.chat.postMessage({
                channel: targetChannel,
                blocks: messageBlocks,
                text: notification.title // Fallback text
            });

            return result.ok;
        } catch (error) {
            console.error('Failed to send Slack notification:', error);
            // Clear channel cache on permission errors
            if (error.message.includes('not_in_channel') || error.message.includes('channel_not_found')) {
                this.channelCache.delete(channel || this.defaultChannel);
            }
            return false;
        }
    }

    /**
     * Validates if a Slack channel exists and is accessible
     * @param channelName Channel to validate
     * @returns Channel validity status
     */
    public async validateChannel(channelName: string): Promise<boolean> {
        // Check cache first
        if (this.channelCache.has(channelName)) {
            return this.channelCache.get(channelName)!;
        }

        try {
            // List all channels accessible to the bot
            const result = await this.slackClient.conversations.list({
                types: 'public_channel,private_channel'
            });

            const isValid = result.channels?.some(
                channel => channel.name === channelName.replace('#', '')
            ) || false;

            // Cache the result
            this.channelCache.set(channelName, isValid);

            return isValid;
        } catch (error) {
            console.error('Failed to validate Slack channel:', error);
            return false;
        }
    }
}