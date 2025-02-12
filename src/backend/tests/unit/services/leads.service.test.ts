import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'; // ^29.0.0
import { PrismaClient } from '@prisma/client'; // ^5.0.0
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { LeadService } from '../../../src/services/leads.service';
import { LeadScoringProducer } from '../../../src/queue/producers/lead-scoring.producer';
import { ILead } from '../../../src/interfaces/leads.interface';
import { LeadStatus } from '../../../src/constants/lead-status';
import { LeadScoreFactors, LeadQualificationCriteria } from '../../../src/types/leads.types';

describe('LeadService', () => {
    let leadService: LeadService;
    let mockPrismaClient: jest.Mocked<PrismaClient>;
    let mockScoringProducer: jest.Mocked<LeadScoringProducer>;
    let mockCacheClient: jest.Mocked<RedisClientType>;
    let mockLogger: jest.Mocked<Logger>;

    // Test data fixtures
    const mockLead: ILead = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Test Corp',
        title: 'Manager',
        phone: '+1234567890',
        score: 0,
        status: LeadStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
        tags: []
    };

    const mockScoreFactors: LeadScoreFactors = {
        engagement: 75,
        companyFit: 80,
        budget: 85,
        timing: 70,
        marketSegment: 90,
        technicalFit: 85
    };

    beforeEach(() => {
        // Initialize mocks
        mockPrismaClient = {
            lead: {
                create: jest.fn(),
                update: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn()
            }
        } as unknown as jest.Mocked<PrismaClient>;

        mockScoringProducer = {
            publishLeadForScoring: jest.fn()
        } as unknown as jest.Mocked<LeadScoringProducer>;

        mockCacheClient = {
            get: jest.fn(),
            setEx: jest.fn(),
            del: jest.fn()
        } as unknown as jest.Mocked<RedisClientType>;

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        } as unknown as jest.Mocked<Logger>;

        // Initialize service
        leadService = new LeadService(
            mockPrismaClient,
            mockScoringProducer,
            mockCacheClient,
            mockLogger
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createLead', () => {
        test('should create a new lead successfully', async () => {
            // Arrange
            mockPrismaClient.lead.create.mockResolvedValue(mockLead);
            mockScoringProducer.publishLeadForScoring.mockResolvedValue(true);
            mockCacheClient.setEx.mockResolvedValue('OK');

            // Act
            const result = await leadService.createLead({
                email: mockLead.email,
                firstName: mockLead.firstName,
                lastName: mockLead.lastName,
                company: mockLead.company
            });

            // Assert
            expect(result).toEqual(mockLead);
            expect(mockPrismaClient.lead.create).toHaveBeenCalledTimes(1);
            expect(mockScoringProducer.publishLeadForScoring).toHaveBeenCalledWith(mockLead);
            expect(mockCacheClient.setEx).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Lead created successfully', {
                leadId: mockLead.id,
                email: mockLead.email
            });
        });

        test('should throw error when lead creation fails', async () => {
            // Arrange
            const error = new Error('Database error');
            mockPrismaClient.lead.create.mockRejectedValue(error);

            // Act & Assert
            await expect(leadService.createLead({
                email: mockLead.email,
                firstName: mockLead.firstName,
                lastName: mockLead.lastName,
                company: mockLead.company
            })).rejects.toThrow();

            expect(mockLogger.error).toHaveBeenCalledWith('Lead creation failed', {
                error: error.message,
                leadData: expect.any(Object)
            });
        });
    });

    describe('updateLeadScore', () => {
        test('should update lead score and trigger qualification if score >= 80', async () => {
            // Arrange
            const updatedLead = { ...mockLead, score: 85 };
            mockPrismaClient.lead.update.mockResolvedValue(updatedLead);
            mockCacheClient.setEx.mockResolvedValue('OK');

            // Act
            const result = await leadService.updateLeadScore(
                mockLead.id,
                85,
                mockScoreFactors
            );

            // Assert
            expect(result).toEqual(updatedLead);
            expect(mockPrismaClient.lead.update).toHaveBeenCalledTimes(1);
            expect(mockCacheClient.setEx).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Lead score updated', {
                leadId: mockLead.id,
                score: 85,
                factors: mockScoreFactors
            });
        });

        test('should handle invalid score values', async () => {
            // Act & Assert
            await expect(leadService.updateLeadScore(
                mockLead.id,
                150, // Invalid score > 100
                mockScoreFactors
            )).rejects.toThrow();
        });
    });

    describe('qualifyLead', () => {
        test('should qualify lead successfully when criteria met', async () => {
            // Arrange
            const qualifiedLead = { 
                ...mockLead, 
                status: LeadStatus.SALES_READY,
                metadata: {
                    hasAuthority: true,
                    hasNeed: true,
                    hasTiming: true
                }
            };
            mockPrismaClient.lead.findUnique.mockResolvedValue(qualifiedLead);
            mockPrismaClient.lead.update.mockResolvedValue(qualifiedLead);
            mockCacheClient.get.mockResolvedValue(JSON.stringify(qualifiedLead));

            // Act
            const result = await leadService.qualifyLead(mockLead.id);

            // Assert
            expect(result).toBe(LeadStatus.SALES_READY);
            expect(mockPrismaClient.lead.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: mockLead.id }
                })
            );
        });

        test('should handle lead not found scenario', async () => {
            // Arrange
            mockCacheClient.get.mockResolvedValue(null);
            mockPrismaClient.lead.findUnique.mockResolvedValue(null);

            // Act & Assert
            await expect(leadService.qualifyLead('non-existent-id'))
                .rejects.toThrow('Lead not found');
        });
    });

    describe('getLeadFromCache', () => {
        test('should return cached lead if available', async () => {
            // Arrange
            mockCacheClient.get.mockResolvedValue(JSON.stringify(mockLead));

            // Act
            const result = await leadService['getLeadFromCache'](mockLead.id);

            // Assert
            expect(result).toEqual(mockLead);
            expect(mockCacheClient.get).toHaveBeenCalledWith(`lead:${mockLead.id}`);
            expect(mockPrismaClient.lead.findUnique).not.toHaveBeenCalled();
        });

        test('should fetch from database if not in cache', async () => {
            // Arrange
            mockCacheClient.get.mockResolvedValue(null);
            mockPrismaClient.lead.findUnique.mockResolvedValue(mockLead);

            // Act
            const result = await leadService['getLeadFromCache'](mockLead.id);

            // Assert
            expect(result).toEqual(mockLead);
            expect(mockPrismaClient.lead.findUnique).toHaveBeenCalledWith({
                where: { id: mockLead.id }
            });
            expect(mockCacheClient.setEx).toHaveBeenCalled();
        });
    });

    describe('evaluateQualificationCriteria', () => {
        test('should evaluate BANT criteria correctly', async () => {
            // Arrange
            const leadWithMetadata = {
                ...mockLead,
                score: 85,
                metadata: {
                    hasAuthority: true,
                    hasNeed: true,
                    hasTiming: true
                }
            };

            // Act
            const result = await leadService['evaluateQualificationCriteria'](leadWithMetadata);

            // Assert
            expect(result).toEqual({
                budgetQualified: true,
                authorityQualified: true,
                needQualified: true,
                timingQualified: true
            });
        });

        test('should handle missing metadata fields', async () => {
            // Act
            const result = await leadService['evaluateQualificationCriteria'](mockLead);

            // Assert
            expect(result).toEqual({
                budgetQualified: false,
                authorityQualified: false,
                needQualified: false,
                timingQualified: false
            });
        });
    });
});