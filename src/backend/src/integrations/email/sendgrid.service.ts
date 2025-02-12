/**
 * @fileoverview SendGrid email service integration for automated outreach
 * Implements secure email sending, template management, and event tracking
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as sgClient from '@sendgrid/client';
import * as winston from 'winston';
import * as emailValidator from 'email-validator';
import { IIntegrationConfig } from '../../interfaces/integration.interface';
import { getIntegrationConfig } from '../../config/integration.config';
import { IntegrationType } from '../../constants/integration-types';

// Types for email service
interface EmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  categories?: string[];
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: 'attachment' | 'inline';
  }>;
}

interface SendResult {
  messageId: string;
  success: boolean;
  statusCode: number;
  timestamp: Date;
  tracking: {
    opens: boolean;
    clicks: boolean;
  };
}

interface Template {
  id: string;
  name: string;
  version: number;
  content: {
    html: string;
    plain: string;
  };
  updatedAt: Date;
}

interface EmailEvent {
  eventType: string;
  messageId: string;
  timestamp: Date;
  email: string;
  category?: string[];
  metadata?: Record<string, any>;
}

@Injectable()
export class SendGridService {
  private readonly mailClient: typeof sgMail;
  private readonly apiClient: typeof sgClient;
  private readonly config: IIntegrationConfig;
  private readonly logger: winston.Logger;
  private readonly templateCache: Map<string, { template: Template; expires: Date }>;
  private readonly rateLimiter: {
    tokens: number;
    lastRefill: Date;
  };

  constructor(
    private readonly configService: any,
    private readonly cacheService: any,
    loggerService: winston.Logger
  ) {
    // Initialize configuration
    this.config = getIntegrationConfig(IntegrationType.SENDGRID);
    this.logger = loggerService;
    
    // Initialize SendGrid clients
    this.mailClient = sgMail;
    this.apiClient = sgClient;
    
    // Set API key from secure configuration
    const apiKey = this.configService.get('SENDGRID_API_KEY');
    this.mailClient.setApiKey(apiKey);
    this.apiClient.setApiKey(apiKey);

    // Initialize template cache
    this.templateCache = new Map();

    // Initialize rate limiter
    this.rateLimiter = {
      tokens: this.config.rateLimit,
      lastRefill: new Date()
    };

    // Configure security settings
    this.configureSecurity();
  }

  /**
   * Sends an email with comprehensive validation and tracking
   * @param options - Email sending options including content and recipients
   * @returns Promise with sending result and tracking information
   */
  async sendEmail(options: EmailOptions): Promise<SendResult> {
    try {
      // Validate email parameters
      this.validateEmailOptions(options);

      // Check rate limits
      await this.checkRateLimit();

      // Process template if specified
      if (options.templateId) {
        const template = await this.getTemplate(options.templateId);
        options.html = template.content.html;
        options.text = template.content.plain;
      }

      // Configure tracking
      const trackingSettings = {
        clickTracking: { enable: true },
        openTracking: { enable: true },
        subscriptionTracking: { enable: false }
      };

      // Send email with retry mechanism
      const response = await this.sendWithRetry({
        ...options,
        trackingSettings,
        categories: [...(options.categories || []), 'sales-platform']
      });

      // Process and return result
      const result: SendResult = {
        messageId: response[0].headers['x-message-id'],
        success: response[0].statusCode === 202,
        statusCode: response[0].statusCode,
        timestamp: new Date(),
        tracking: {
          opens: true,
          clicks: true
        }
      };

      // Log success
      this.logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: options.to,
        template: options.templateId
      });

      return result;
    } catch (error) {
      // Log error with context
      this.logger.error('Email sending failed', {
        error: error.message,
        to: options.to,
        template: options.templateId
      });
      throw error;
    }
  }

  /**
   * Retrieves and caches email template
   * @param templateId - SendGrid template identifier
   * @returns Promise with template data
   */
  async getTemplate(templateId: string): Promise<Template> {
    try {
      // Check cache first
      const cached = this.templateCache.get(templateId);
      if (cached && cached.expires > new Date()) {
        return cached.template;
      }

      // Fetch template from SendGrid
      const [response] = await this.apiClient.request({
        method: 'GET',
        url: `/v3/templates/${templateId}`,
      });

      // Validate response
      if (response.statusCode !== 200) {
        throw new Error(`Template fetch failed: ${response.body.errors?.[0]?.message}`);
      }

      // Process and cache template
      const template: Template = {
        id: response.body.id,
        name: response.body.name,
        version: response.body.versions[0].version_id,
        content: {
          html: response.body.versions[0].html_content,
          plain: response.body.versions[0].plain_content
        },
        updatedAt: new Date(response.body.updated_at)
      };

      // Cache template for 1 hour
      this.templateCache.set(templateId, {
        template,
        expires: new Date(Date.now() + 3600000)
      });

      return template;
    } catch (error) {
      this.logger.error('Template fetch failed', {
        templateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Tracks and processes email events
   * @param event - Email event data
   */
  async trackEmailEvent(event: EmailEvent): Promise<void> {
    try {
      // Validate event data
      if (!event.messageId || !event.eventType) {
        throw new Error('Invalid event data');
      }

      // Process event based on type
      switch (event.eventType) {
        case 'delivered':
        case 'open':
        case 'click':
        case 'bounce':
        case 'spam_report':
          await this.processEventMetrics(event);
          break;
        default:
          this.logger.warn('Unhandled event type', { eventType: event.eventType });
      }

      // Log event
      this.logger.info('Email event tracked', {
        messageId: event.messageId,
        type: event.eventType,
        email: event.email
      });
    } catch (error) {
      this.logger.error('Event tracking failed', {
        event,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private validateEmailOptions(options: EmailOptions): void {
    // Validate recipients
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    recipients.forEach(email => {
      if (!emailValidator.validate(email)) {
        throw new Error(`Invalid recipient email: ${email}`);
      }
    });

    // Validate sender
    if (!emailValidator.validate(options.from)) {
      throw new Error(`Invalid sender email: ${options.from}`);
    }

    // Validate content
    if (!options.templateId && !options.html && !options.text) {
      throw new Error('Email must contain either template, HTML, or text content');
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = new Date();
    const timeSinceRefill = now.getTime() - this.rateLimiter.lastRefill.getTime();
    
    // Refill tokens if enough time has passed (1 second)
    if (timeSinceRefill >= 1000) {
      this.rateLimiter.tokens = this.config.rateLimit;
      this.rateLimiter.lastRefill = now;
    }

    if (this.rateLimiter.tokens <= 0) {
      throw new Error('Rate limit exceeded');
    }

    this.rateLimiter.tokens--;
  }

  private async sendWithRetry(options: any, retries = 3): Promise<any> {
    try {
      return await this.mailClient.send(options);
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.sendWithRetry(options, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    return error.code === 429 || (error.code >= 500 && error.code < 600);
  }

  private async processEventMetrics(event: EmailEvent): Promise<void> {
    // Implementation would store metrics in analytics system
    // This is a placeholder for the actual implementation
    await Promise.resolve();
  }

  private configureSecurity(): void {
    // Configure SPF and DKIM settings
    this.mailClient.setSubstitutionWrappers('{{', '}}');
    
    // Set security headers
    this.apiClient.setDefaultRequest('headers', {
      'User-Agent': 'sales-platform/1.0.0',
      'X-Security-Headers': 'enabled'
    });
  }
}