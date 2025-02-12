/**
 * @fileoverview Lead Management Service Implementation
 * @version 1.0.0
 * 
 * Implements comprehensive lead management functionality including AI-driven scoring,
 * automated qualification, and lifecycle management with enhanced validation,
 * error handling, and performance optimizations.
 */

import { PrismaClient } from '@prisma/client'; // ^5.0.0
import { RedisClientType } from 'redis'; // ^4.6.0
import { Logger } from 'winston'; // ^3.8.0
import { ILead } from '../interfaces/leads.interface';
import { LeadModel } from '../models/leads.model';
import { LeadScoringProducer } from '../queue/producers/lead-scoring.producer';
import { validateNewLead, validateLeadScore, validateLeadQualification } from '../validators/leads.validator';
import { LeadStatus } from '../constants/lead-status';
import { LeadScoreFactors, LeadQualificationCriteria } from '../types/leads.types';

// Cache configuration
const CACHE_TTL = 3600; // 1 hour
const CACHE_PREFIX = 'lead:';

/**
 * Service class implementing comprehensive lead management functionality
 */
export class LeadService {
    private leadModel: LeadModel;
    private readonly scoringProducer: LeadScoringProducer;
    private readonly cacheClient: RedisClientType;
    private readonly logger: Logger;

    /**
     * Initialize lead service with required dependencies
     */
    constructor(
        prismaClient: PrismaClient,
        scoringProducer: LeadScoringProducer,
        cacheClient: RedisClientType,
        logger: Logger
    ) {
        this.leadModel = new LeadModel(prismaClient);
        this.scoringProducer = scoringProducer;
        this.cacheClient = cacheClient;
        this.logger = logger;
    }

    /**
     * Creates a new lead with comprehensive validation and AI scoring
     * @param leadData - Initial lead data
     * @returns Promise<ILead> - Created lead record
     */
    public async createLead(leadData: Partial<ILead>): Promise<ILead> {
        try {
            // Validate lead data
            await validateNewLead(leadData);

            // Create lead record
            const createdLead = await this.leadModel.createLead(leadData);

            // Cache lead data
            await this.cacheLeadData(createdLead);

            // Queue for AI scoring
            await this.scoringProducer.publishLeadForScoring(createdLead);

            this.logger.info('Lead created successfully', {
                leadId: createdLead.id,
                email: createdLead.email
            });

            return createdLead;
        } catch (error) {
            this.logger.error('Lead creation failed', {
                error: error.message,
                leadData
            });
            throw error;
        }
    }

    /**
     * Updates lead score with enhanced validation and qualification triggers
     * @param leadId - Lead identifier
     * @param score - New lead score
     * @param scoreFactors - Detailed scoring factors
     * @returns Promise<ILead> - Updated lead record
     */
    public async updateLeadScore(
        leadId: string,
        score: number,
        scoreFactors: LeadScoreFactors
    ): Promise<ILead> {
        try {
            // Validate score data
            await validateLeadScore({ leadId, score, factors: scoreFactors });

            // Update lead score
            const updatedLead = await this.leadModel.updateLeadScore(leadId, scoreFactors);

            // Update cache
            await this.cacheLeadData(updatedLead);

            // Trigger qualification if score meets threshold
            if (score >= 80) {
                await this.qualifyLead(leadId);
            }

            this.logger.info('Lead score updated', {
                leadId,
                score,
                factors: scoreFactors
            });

            return updatedLead;
        } catch (error) {
            this.logger.error('Lead score update failed', {
                error: error.message,
                leadId,
                score
            });
            throw error;
        }
    }

    /**
     * Qualifies lead based on comprehensive criteria
     * @param leadId - Lead identifier
     * @returns Promise<LeadStatus> - Updated lead status
     */
    public async qualifyLead(leadId: string): Promise<LeadStatus> {
        try {
            // Get lead data with caching
            const lead = await this.getLeadFromCache(leadId);
            if (!lead) {
                throw new Error('Lead not found');
            }

            // Evaluate qualification criteria
            const qualificationData = await this.evaluateQualificationCriteria(lead);
            await validateLeadQualification(qualificationData);

            // Update lead status
            const newStatus = await this.leadModel.qualifyLead(leadId);

            // Update cache
            await this.cacheLeadData({ ...lead, status: newStatus });

            this.logger.info('Lead qualification completed', {
                leadId,
                status: newStatus,
                criteria: qualificationData
            });

            return newStatus;
        } catch (error) {
            this.logger.error('Lead qualification failed', {
                error: error.message,
                leadId
            });
            throw error;
        }
    }

    /**
     * Retrieves lead data with caching
     * @param leadId - Lead identifier
     * @returns Promise<ILead | null> - Lead data or null if not found
     */
    private async getLeadFromCache(leadId: string): Promise<ILead | null> {
        try {
            // Check cache first
            const cachedLead = await this.cacheClient.get(`${CACHE_PREFIX}${leadId}`);
            if (cachedLead) {
                return JSON.parse(cachedLead);
            }

            // Fetch from database if not in cache
            const lead = await this.leadModel.findById(leadId);
            if (lead) {
                await this.cacheLeadData(lead);
            }

            return lead;
        } catch (error) {
            this.logger.error('Cache retrieval failed', {
                error: error.message,
                leadId
            });
            return null;
        }
    }

    /**
     * Caches lead data with TTL
     * @param lead - Lead data to cache
     */
    private async cacheLeadData(lead: ILead): Promise<void> {
        try {
            await this.cacheClient.setEx(
                `${CACHE_PREFIX}${lead.id}`,
                CACHE_TTL,
                JSON.stringify(lead)
            );
        } catch (error) {
            this.logger.warn('Lead caching failed', {
                error: error.message,
                leadId: lead.id
            });
        }
    }

    /**
     * Evaluates comprehensive qualification criteria
     * @param lead - Lead to evaluate
     * @returns Promise<LeadQualificationCriteria> - Qualification assessment
     */
    private async evaluateQualificationCriteria(
        lead: ILead
    ): Promise<LeadQualificationCriteria> {
        return {
            budgetQualified: lead.score >= 80,
            authorityQualified: Boolean(lead.metadata?.hasAuthority),
            needQualified: Boolean(lead.metadata?.hasNeed),
            timingQualified: Boolean(lead.metadata?.hasTiming)
        };
    }
}

export default LeadService;