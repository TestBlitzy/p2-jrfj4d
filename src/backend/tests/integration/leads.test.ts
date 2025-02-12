import { describe, it, beforeEach, afterEach, expect, jest } from 'jest';
import { PrismaClient } from '@prisma/client';
import supertest from 'supertest';
import { faker } from '@faker-js/faker';
import { LeadService } from '../../src/services/leads.service';
import { LeadStatus } from '../../src/constants/lead-status';
import type { ILead } from '../../src/interfaces/leads.interface';
import type { LeadScoreFactors, LeadQualificationCriteria } from '../../src/types/leads.types';

describe('Lead Management Integration Tests', () => {
    let prisma: PrismaClient;
    let leadService: LeadService;
    let testLead: ILead;

    // Performance measurement
    const PERFORMANCE_THRESHOLD = 100; // 100ms SLA requirement

    beforeAll(async () => {
        // Initialize test database connection
        prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.TEST_DATABASE_URL
                }
            }
        });

        // Initialize lead service with test dependencies
        leadService = new LeadService(
            prisma,
            {} as any, // Mock scoring producer
            {} as any, // Mock cache client
            {} as any  // Mock logger
        );
    });

    beforeEach(async () => {
        // Clean test database and generate test data
        await prisma.lead.deleteMany();
        
        // Generate test lead data
        testLead = {
            id: faker.string.uuid(),
            email: faker.internet.email(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            company: faker.company.name(),
            title: faker.person.jobTitle(),
            phone: faker.phone.number('+1##########'),
            score: 0,
            status: LeadStatus.NEW,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {},
            tags: []
        };
    });

    afterEach(async () => {
        // Clean up test data
        await prisma.lead.deleteMany();
    });

    afterAll(async () => {
        // Close database connection
        await prisma.$disconnect();
    });

    describe('Lead Creation and Validation', () => {
        it('should create lead with valid data within performance SLA', async () => {
            const startTime = Date.now();

            const createdLead = await leadService.createLead(testLead);

            const executionTime = Date.now() - startTime;
            expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD);
            
            expect(createdLead).toMatchObject({
                email: testLead.email,
                status: LeadStatus.NEW,
                score: 0
            });
        });

        it('should enforce required field validations', async () => {
            const invalidLead = { ...testLead, email: undefined };
            await expect(leadService.createLead(invalidLead as any))
                .rejects
                .toThrow('Missing required lead fields');
        });

        it('should prevent duplicate email addresses', async () => {
            await leadService.createLead(testLead);
            await expect(leadService.createLead(testLead))
                .rejects
                .toThrow('Duplicate email address');
        });

        it('should validate email format', async () => {
            const invalidEmail = { ...testLead, email: 'invalid-email' };
            await expect(leadService.createLead(invalidEmail))
                .rejects
                .toThrow('Invalid email format');
        });

        it('should validate phone number format', async () => {
            const invalidPhone = { ...testLead, phone: '123' };
            await expect(leadService.createLead(invalidPhone))
                .rejects
                .toThrow('Invalid phone number format');
        });

        it('should handle concurrent lead creation', async () => {
            const leads = Array(5).fill(null).map(() => ({
                ...testLead,
                email: faker.internet.email()
            }));

            const results = await Promise.all(
                leads.map(lead => leadService.createLead(lead))
            );

            expect(results).toHaveLength(5);
            expect(new Set(results.map(r => r.id))).toHaveLength(5);
        });
    });

    describe('AI Scoring System', () => {
        let createdLead: ILead;

        beforeEach(async () => {
            createdLead = await leadService.createLead(testLead);
        });

        it('should calculate accurate initial score', async () => {
            const scoreFactors: LeadScoreFactors = {
                engagement: 75,
                companyFit: 80,
                budget: 90,
                timing: 85,
                marketSegment: 70,
                technicalFit: 85
            };

            const startTime = Date.now();
            const updatedLead = await leadService.updateLeadScore(
                createdLead.id,
                scoreFactors
            );
            const executionTime = Date.now() - startTime;

            expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD);
            expect(updatedLead.score).toBeGreaterThan(0);
            expect(updatedLead.score).toBeLessThanOrEqual(100);
        });

        it('should maintain score history', async () => {
            const scoreFactors: LeadScoreFactors = {
                engagement: 60,
                companyFit: 70,
                budget: 80,
                timing: 75,
                marketSegment: 65,
                technicalFit: 70
            };

            await leadService.updateLeadScore(createdLead.id, scoreFactors);
            const lead = await prisma.lead.findUnique({
                where: { id: createdLead.id },
                include: { scoreHistory: true }
            });

            expect(lead?.scoreHistory).toBeDefined();
            expect(lead?.scoreHistory.length).toBeGreaterThan(0);
        });

        it('should handle concurrent score updates', async () => {
            const updates = Array(3).fill(null).map((_, i) => ({
                engagement: 60 + i * 10,
                companyFit: 70,
                budget: 80,
                timing: 75,
                marketSegment: 65,
                technicalFit: 70
            }));

            const results = await Promise.all(
                updates.map(factors => 
                    leadService.updateLeadScore(createdLead.id, factors)
                )
            );

            expect(results).toHaveLength(3);
            expect(new Set(results.map(r => r.score))).toHaveLength(3);
        });
    });

    describe('Lead Qualification Process', () => {
        let qualifiedLead: ILead;

        beforeEach(async () => {
            qualifiedLead = await leadService.createLead({
                ...testLead,
                score: 85,
                metadata: {
                    hasAuthority: true,
                    hasNeed: true,
                    hasTiming: true
                }
            });
        });

        it('should qualify leads based on BANT criteria', async () => {
            const startTime = Date.now();
            const status = await leadService.qualifyLead(qualifiedLead.id);
            const executionTime = Date.now() - startTime;

            expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD);
            expect(status).toBe(LeadStatus.SALES_READY);
        });

        it('should validate qualification transitions', async () => {
            const unqualifiedLead = await leadService.createLead({
                ...testLead,
                score: 50
            });

            const status = await leadService.qualifyLead(unqualifiedLead.id);
            expect(status).toBe(LeadStatus.QUALIFYING);
        });

        it('should maintain qualification history', async () => {
            await leadService.qualifyLead(qualifiedLead.id);
            
            const lead = await prisma.lead.findUnique({
                where: { id: qualifiedLead.id },
                include: { qualificationAudit: true }
            });

            expect(lead?.qualificationAudit).toBeDefined();
            expect(lead?.qualificationAudit.length).toBeGreaterThan(0);
        });

        it('should enforce business rules for qualification', async () => {
            const partiallyQualifiedLead = await leadService.createLead({
                ...testLead,
                score: 85,
                metadata: {
                    hasAuthority: true,
                    hasNeed: false,
                    hasTiming: true
                }
            });

            const status = await leadService.qualifyLead(partiallyQualifiedLead.id);
            expect(status).not.toBe(LeadStatus.SALES_READY);
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle bulk lead creation within SLA', async () => {
            const leads = Array(10).fill(null).map(() => ({
                ...testLead,
                email: faker.internet.email()
            }));

            const startTime = Date.now();
            await Promise.all(leads.map(lead => leadService.createLead(lead)));
            const executionTime = Date.now() - startTime;

            expect(executionTime / leads.length).toBeLessThan(PERFORMANCE_THRESHOLD);
        });

        it('should maintain performance under concurrent qualification', async () => {
            const leads = await Promise.all(
                Array(5).fill(null).map(() => 
                    leadService.createLead({
                        ...testLead,
                        email: faker.internet.email(),
                        score: 85,
                        metadata: {
                            hasAuthority: true,
                            hasNeed: true,
                            hasTiming: true
                        }
                    })
                )
            );

            const startTime = Date.now();
            await Promise.all(leads.map(lead => leadService.qualifyLead(lead.id)));
            const executionTime = Date.now() - startTime;

            expect(executionTime / leads.length).toBeLessThan(PERFORMANCE_THRESHOLD);
        });
    });
});