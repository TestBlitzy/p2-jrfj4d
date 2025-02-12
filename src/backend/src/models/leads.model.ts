/**
 * @fileoverview Lead Model Implementation
 * @version 1.0.0
 * 
 * Implements comprehensive lead management functionality including AI-driven scoring,
 * automated qualification, and sophisticated tracking capabilities.
 */

import { PrismaClient } from '@prisma/client'; // ^5.0.0
import { ILead } from '../interfaces/leads.interface';
import { LeadStatus } from '../constants/lead-status';
import { 
    LeadScoreFactors,
    MIN_QUALIFIED_SCORE,
    LEAD_SCORE_THRESHOLD,
    LeadQualificationCriteria,
    LeadScoreHistory,
    LeadEngagementMetrics
} from '../types/leads.types';

/**
 * Core lead model implementing comprehensive lead management functionality
 */
export class LeadModel {
    private prisma: PrismaClient;
    private readonly MIN_QUALIFIED_SCORE = MIN_QUALIFIED_SCORE;
    private readonly SCORE_HISTORY_RETENTION_DAYS = 90;
    private readonly QUALIFICATION_WEIGHTS = {
        engagement: 0.3,
        companyFit: 0.2,
        budget: 0.2,
        timing: 0.15,
        intentSignals: 0.1,
        marketPresence: 0.05
    };

    constructor(prismaClient: PrismaClient) {
        this.prisma = prismaClient;
    }

    /**
     * Creates a new lead with initial scoring and tracking setup
     * @param leadData Partial lead data for creation
     * @returns Promise resolving to created lead
     */
    async createLead(leadData: Partial<ILead>): Promise<ILead> {
        try {
            // Validate required fields
            if (!leadData.email || !leadData.company) {
                throw new Error('Missing required lead fields');
            }

            // Initialize lead with default values
            const initialLead = {
                ...leadData,
                status: LeadStatus.NEW,
                score: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                metadata: leadData.metadata || {},
                tags: leadData.tags || []
            };

            // Create lead record with initial tracking data
            const createdLead = await this.prisma.lead.create({
                data: {
                    ...initialLead,
                    scoreHistory: {
                        create: {
                            score: 0,
                            timestamp: new Date()
                        }
                    },
                    qualificationAudit: {
                        create: {
                            status: LeadStatus.NEW,
                            timestamp: new Date(),
                            reason: 'Initial lead creation'
                        }
                    }
                },
                include: {
                    scoreHistory: true,
                    qualificationAudit: true
                }
            });

            // Trigger initial scoring and qualification
            await this.updateLeadScore(createdLead.id, await this.calculateInitialScoreFactors(createdLead));
            await this.qualifyLead(createdLead.id);

            return createdLead;
        } catch (error) {
            throw new Error(`Lead creation failed: ${error.message}`);
        }
    }

    /**
     * Updates lead score using AI analysis and engagement metrics
     * @param leadId Lead identifier
     * @param scoreFactors Updated scoring factors
     * @returns Promise resolving to new score
     */
    async updateLeadScore(leadId: string, scoreFactors: LeadScoreFactors): Promise<number> {
        try {
            // Validate score factors
            this.validateScoreFactors(scoreFactors);

            // Calculate weighted score
            const newScore = this.calculateWeightedScore(scoreFactors);

            // Update lead record and score history
            const updatedLead = await this.prisma.lead.update({
                where: { id: leadId },
                data: {
                    score: newScore,
                    updatedAt: new Date(),
                    scoreHistory: {
                        create: {
                            score: newScore,
                            timestamp: new Date(),
                            factors: scoreFactors
                        }
                    }
                },
                include: {
                    scoreHistory: true
                }
            });

            // Clean up old score history
            await this.cleanupScoreHistory(leadId);

            // Trigger qualification reassessment if score changed significantly
            if (Math.abs(updatedLead.score - newScore) >= 10) {
                await this.qualifyLead(leadId);
            }

            return newScore;
        } catch (error) {
            throw new Error(`Score update failed: ${error.message}`);
        }
    }

    /**
     * Evaluates lead qualification using comprehensive criteria
     * @param leadId Lead identifier
     * @returns Promise resolving to updated status
     */
    async qualifyLead(leadId: string): Promise<LeadStatus> {
        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                    scoreHistory: true,
                    qualificationAudit: true
                }
            });

            if (!lead) {
                throw new Error('Lead not found');
            }

            // Evaluate BANT criteria
            const qualificationCriteria = await this.evaluateQualificationCriteria(lead);
            const newStatus = this.determineQualificationStatus(lead.score, qualificationCriteria);

            // Update lead status and audit trail
            const updatedLead = await this.prisma.lead.update({
                where: { id: leadId },
                data: {
                    status: newStatus,
                    updatedAt: new Date(),
                    qualificationAudit: {
                        create: {
                            status: newStatus,
                            timestamp: new Date(),
                            criteria: qualificationCriteria,
                            reason: this.generateQualificationReason(newStatus, lead.status)
                        }
                    }
                }
            });

            return updatedLead.status;
        } catch (error) {
            throw new Error(`Qualification failed: ${error.message}`);
        }
    }

    /**
     * Calculates engagement score using multiple interaction metrics
     * @param leadId Lead identifier
     * @returns Promise resolving to engagement score
     */
    async calculateEngagementScore(leadId: string): Promise<number> {
        try {
            const engagementMetrics = await this.prisma.leadEngagement.findMany({
                where: { leadId },
                orderBy: { timestamp: 'desc' },
                take: 100
            });

            const weightedScore = this.calculateEngagementWeightedScore(engagementMetrics);
            const temporalScore = this.applyTemporalDecay(weightedScore, engagementMetrics);

            return Math.min(100, Math.max(0, temporalScore));
        } catch (error) {
            throw new Error(`Engagement calculation failed: ${error.message}`);
        }
    }

    /**
     * Private helper methods
     */

    private validateScoreFactors(factors: LeadScoreFactors): void {
        const requiredFactors = ['engagement', 'companyFit', 'budget', 'timing', 'intentSignals', 'marketPresence'];
        for (const factor of requiredFactors) {
            if (typeof factors[factor] !== 'number' || factors[factor] < 0 || factors[factor] > 100) {
                throw new Error(`Invalid score factor: ${factor}`);
            }
        }
    }

    private calculateWeightedScore(factors: LeadScoreFactors): number {
        return Object.entries(this.QUALIFICATION_WEIGHTS)
            .reduce((score, [factor, weight]) => {
                return score + (factors[factor] * weight);
            }, 0);
    }

    private async cleanupScoreHistory(leadId: string): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.SCORE_HISTORY_RETENTION_DAYS);

        await this.prisma.leadScoreHistory.deleteMany({
            where: {
                leadId,
                timestamp: {
                    lt: cutoffDate
                }
            }
        });
    }

    private async evaluateQualificationCriteria(lead: ILead): Promise<LeadQualificationCriteria> {
        return {
            budgetQualified: lead.score >= this.MIN_QUALIFIED_SCORE,
            authorityQualified: Boolean(lead.metadata.hasAuthority),
            needQualified: Boolean(lead.metadata.hasNeed),
            timingQualified: Boolean(lead.metadata.hasTiming)
        };
    }

    private determineQualificationStatus(
        score: number,
        criteria: LeadQualificationCriteria
    ): LeadStatus {
        if (score >= this.MIN_QUALIFIED_SCORE && 
            Object.values(criteria).every(Boolean)) {
            return LeadStatus.SALES_READY;
        } else if (score >= LEAD_SCORE_THRESHOLD) {
            return LeadStatus.QUALIFIED;
        } else {
            return LeadStatus.QUALIFYING;
        }
    }

    private generateQualificationReason(newStatus: LeadStatus, oldStatus: LeadStatus): string {
        if (newStatus === oldStatus) {
            return 'Status reaffirmed after evaluation';
        }
        return `Status changed from ${oldStatus} to ${newStatus} based on qualification criteria`;
    }

    private async calculateInitialScoreFactors(lead: ILead): Promise<LeadScoreFactors> {
        return {
            engagement: 0,
            companyFit: await this.evaluateCompanyFit(lead.company),
            budget: 0,
            timing: 0,
            intentSignals: 0,
            marketPresence: await this.evaluateMarketPresence(lead.company)
        };
    }

    private async evaluateCompanyFit(company: string): Promise<number> {
        // Implementation would include ideal customer profile matching
        return 50; // Default middle score until full implementation
    }

    private async evaluateMarketPresence(company: string): Promise<number> {
        // Implementation would include market analysis
        return 50; // Default middle score until full implementation
    }

    private calculateEngagementWeightedScore(metrics: LeadEngagementMetrics[]): number {
        // Implementation would weight different types of engagement
        return metrics.length > 0 ? 50 : 0; // Simplified implementation
    }

    private applyTemporalDecay(score: number, metrics: LeadEngagementMetrics[]): number {
        // Implementation would apply time-based decay to engagement scores
        return score; // Simplified implementation
    }
}