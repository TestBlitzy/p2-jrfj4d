import { PrismaClient, Role, LeadStatus, LeadSource, InteractionType, TrendType } from '@prisma/client';
import { faker } from '@faker-js/faker'; // ^8.0.0
import * as bcrypt from 'bcrypt'; // ^5.0.0

// Configuration constants
const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';
const SEED_LEAD_COUNT = 100;
const SEED_INTERACTION_COUNT = 500;
const SEED_ANALYTICS_DAYS = 90;
const SALT_ROUNDS = 10;
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;

// Initialize Prisma client with connection pooling
const prisma = new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

/**
 * Generates realistic time-series data with seasonal patterns
 */
const generateTimeSeriesData = (days: number, baseValue: number, volatility: number): number[] => {
  const data: number[] = [];
  for (let i = 0; i < days; i++) {
    // Add seasonal component (30-day cycle)
    const seasonal = Math.sin((i / 30) * Math.PI * 2) * (baseValue * 0.2);
    // Add trend component
    const trend = (i / days) * (baseValue * 0.1);
    // Add random noise
    const noise = (Math.random() - 0.5) * volatility;
    data.push(baseValue + seasonal + trend + noise);
  }
  return data;
};

/**
 * Seeds user data with role-based permissions
 */
async function seedUsers(prisma: PrismaClient): Promise<void> {
  const adminSalt = await bcrypt.genSalt(SALT_ROUNDS);
  const adminHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, adminSalt);

  // Create admin user
  await prisma.user.create({
    data: {
      email: DEFAULT_ADMIN_EMAIL,
      password: adminHash,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      lastLogin: new Date()
    }
  });

  // Create test users for each role
  const roles = [Role.MANAGER, Role.ANALYST, Role.USER];
  for (const role of roles) {
    for (let i = 0; i < 3; i++) {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const password = await bcrypt.hash('Test123!', salt);
      
      await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          role,
          lastLogin: faker.date.recent(),
          isActive: true
        }
      });
    }
  }
}

/**
 * Seeds lead data with realistic patterns and progression states
 */
async function seedLeads(prisma: PrismaClient): Promise<void> {
  const users = await prisma.user.findMany();
  const sources = Object.values(LeadSource);

  for (let i = 0; i < SEED_LEAD_COUNT; i++) {
    const score = faker.number.float({ min: 0, max: 100, precision: 0.1 });
    const confidence = faker.number.float({ min: 0.1, max: 1, precision: 0.01 });
    
    await prisma.lead.create({
      data: {
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        company: faker.company.name(),
        score,
        confidence,
        status: score > 80 ? LeadStatus.SALES_READY : 
                score > 60 ? LeadStatus.QUALIFIED :
                score > 40 ? LeadStatus.NURTURING : LeadStatus.NEW,
        source: sources[Math.floor(Math.random() * sources.length)],
        lastContactDate: faker.date.recent(),
        nextFollowUp: faker.date.future(),
        metadata: {
          industry: faker.company.buzzPhrase(),
          employeeCount: faker.number.int({ min: 10, max: 10000 }),
          revenue: faker.number.float({ min: 1000000, max: 100000000 }),
          location: faker.location.country()
        },
        assignedTo: {
          connect: {
            id: users[Math.floor(Math.random() * users.length)].id
          }
        }
      }
    });
  }
}

/**
 * Seeds interaction data with temporal distribution
 */
async function seedInteractions(prisma: PrismaClient): Promise<void> {
  const leads = await prisma.lead.findMany();
  const users = await prisma.user.findMany();
  const types = Object.values(InteractionType);

  for (let i = 0; i < SEED_INTERACTION_COUNT; i++) {
    const sentiment = faker.number.float({ min: -1, max: 1, precision: 0.01 });
    
    await prisma.interaction.create({
      data: {
        type: types[Math.floor(Math.random() * types.length)],
        description: faker.lorem.paragraph(),
        sentiment,
        metadata: {
          duration: faker.number.int({ min: 60, max: 3600 }),
          platform: faker.helpers.arrayElement(['email', 'phone', 'linkedin', 'meeting']),
          outcome: faker.helpers.arrayElement(['positive', 'neutral', 'negative']),
          notes: faker.lorem.sentences(2)
        },
        lead: {
          connect: {
            id: leads[Math.floor(Math.random() * leads.length)].id
          }
        },
        user: {
          connect: {
            id: users[Math.floor(Math.random() * users.length)].id
          }
        }
      }
    });
  }
}

/**
 * Seeds analytics data for AI model training
 */
async function seedAnalytics(prisma: PrismaClient): Promise<void> {
  const leads = await prisma.lead.findMany();
  const users = await prisma.user.findMany();

  // Generate time-series data for each lead
  for (const lead of leads) {
    const revenueData = generateTimeSeriesData(SEED_ANALYTICS_DAYS, 10000, 1000);
    const engagementData = generateTimeSeriesData(SEED_ANALYTICS_DAYS, 50, 10);

    for (let day = 0; day < SEED_ANALYTICS_DAYS; day++) {
      await prisma.analytics.create({
        data: {
          metricType: 'revenue_forecast',
          value: revenueData[day],
          confidence: faker.number.float({ min: 0.6, max: 0.95 }),
          metadata: {
            factors: {
              market_condition: faker.number.float({ min: -1, max: 1 }),
              seasonal_impact: faker.number.float({ min: -0.5, max: 0.5 }),
              competitor_pressure: faker.number.float({ min: 0, max: 1 })
            }
          },
          analysisDate: faker.date.recent(SEED_ANALYTICS_DAYS),
          lead: { connect: { id: lead.id } },
          user: { connect: { id: users[Math.floor(Math.random() * users.length)].id } }
        }
      });

      await prisma.analytics.create({
        data: {
          metricType: 'engagement_score',
          value: engagementData[day],
          confidence: faker.number.float({ min: 0.7, max: 0.98 }),
          metadata: {
            touchpoints: faker.number.int({ min: 1, max: 10 }),
            response_time: faker.number.int({ min: 60, max: 86400 }),
            sentiment_avg: faker.number.float({ min: -1, max: 1 })
          },
          analysisDate: faker.date.recent(SEED_ANALYTICS_DAYS),
          lead: { connect: { id: lead.id } },
          user: { connect: { id: users[Math.floor(Math.random() * users.length)].id } }
        }
      });
    }
  }
}

/**
 * Seeds competitor and market trend data
 */
async function seedMarketIntelligence(prisma: PrismaClient): Promise<void> {
  // Create competitors
  const competitors = await Promise.all(
    Array(10).fill(0).map(async () => {
      return prisma.competitor.create({
        data: {
          name: faker.company.name(),
          website: faker.internet.url(),
          strength: faker.number.float({ min: 0, max: 1 }),
          threat: faker.number.float({ min: 0, max: 1 }),
          metadata: {
            marketShare: faker.number.float({ min: 0.01, max: 0.3 }),
            productCategories: Array(3).fill(0).map(() => faker.commerce.product()),
            lastFundingAmount: faker.number.int({ min: 1000000, max: 100000000 })
          }
        }
      });
    })
  );

  // Create market trends
  const trendTypes = Object.values(TrendType);
  for (let i = 0; i < 20; i++) {
    await prisma.marketTrend.create({
      data: {
        type: trendTypes[Math.floor(Math.random() * trendTypes.length)],
        title: faker.company.catchPhrase(),
        description: faker.lorem.paragraph(),
        impact: faker.number.float({ min: -1, max: 1 }),
        confidence: faker.number.float({ min: 0.3, max: 0.9 }),
        startDate: faker.date.past(),
        endDate: faker.date.future(),
        metadata: {
          sources: Array(3).fill(0).map(() => faker.internet.url()),
          keywords: Array(5).fill(0).map(() => faker.company.buzzNoun()),
          sentiment: faker.number.float({ min: -1, max: 1 })
        },
        competitors: {
          connect: competitors
            .slice(0, faker.number.int({ min: 1, max: 3 }))
            .map(c => ({ id: c.id }))
        }
      }
    });
  }
}

/**
 * Main seeding function with transaction support
 */
async function main() {
  console.log('Starting database seed...');

  try {
    // Begin transaction
    await prisma.$transaction(async (tx) => {
      // Clean existing data
      await tx.marketTrend.deleteMany();
      await tx.competitor.deleteMany();
      await tx.analytics.deleteMany();
      await tx.interaction.deleteMany();
      await tx.lead.deleteMany();
      await tx.user.deleteMany();

      // Seed data
      await seedUsers(tx);
      await seedLeads(tx);
      await seedInteractions(tx);
      await seedAnalytics(tx);
      await seedMarketIntelligence(tx);
    }, {
      maxWait: 15000,
      timeout: 60000
    });

    console.log('Database seed completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default main;