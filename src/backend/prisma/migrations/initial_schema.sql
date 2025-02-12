-- Initial database schema migration for Sales & Intelligence Platform
-- PostgreSQL 15.0+

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create enum types
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'ANALYST', 'USER');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUALIFIED', 'CONTACTED', 'CONVERTED', 'LOST', 'ON_HOLD');
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'CAMPAIGN', 'SOCIAL', 'OTHER');
CREATE TYPE "InteractionType" AS ENUM ('EMAIL', 'CALL', 'MEETING', 'SOCIAL', 'OTHER');
CREATE TYPE "TrendType" AS ENUM ('INDUSTRY', 'COMPETITOR', 'TECHNOLOGY', 'REGULATORY');

-- Create users table with security features
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "users_password_check" CHECK (char_length(password) >= 8)
);

-- Create leads table with scoring and analytics
CREATE TABLE "leads" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "company" VARCHAR(255) NOT NULL,
    "score" DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    "confidence" DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL,
    "lastContactDate" TIMESTAMP WITH TIME ZONE,
    "nextFollowUp" TIMESTAMP WITH TIME ZONE,
    "metadata" JSONB,
    "userId" UUID NOT NULL REFERENCES "users"(id),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP WITH TIME ZONE
) PARTITION BY RANGE (created_at);

-- Create interactions table with temporal features
CREATE TABLE "interactions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "leadId" UUID NOT NULL REFERENCES "leads"(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "users"(id),
    "type" "InteractionType" NOT NULL,
    "description" TEXT NOT NULL,
    "sentiment" DECIMAL(4,2) CHECK (sentiment >= -1 AND sentiment <= 1),
    "metadata" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create analytics table with materialized views support
CREATE TABLE "analytics" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "leadId" UUID NOT NULL REFERENCES "leads"(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "users"(id),
    "metricType" VARCHAR(50) NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    "metadata" JSONB,
    "analysisDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create competitors table with market intelligence features
CREATE TABLE "competitors" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "website" VARCHAR(255),
    "strength" DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (strength >= 0 AND strength <= 100),
    "threat" DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (threat >= 0 AND threat <= 100),
    "metadata" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create market trends table with time-series optimization
CREATE TABLE "market_trends" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "type" "TrendType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "impact" DECIMAL(5,2) NOT NULL CHECK (impact >= 0 AND impact <= 100),
    "confidence" DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    "metadata" JSONB,
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for leads and competitors
CREATE TABLE "lead_competitors" (
    "leadId" UUID NOT NULL REFERENCES "leads"(id) ON DELETE CASCADE,
    "competitorId" UUID NOT NULL REFERENCES "competitors"(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("leadId", "competitorId")
);

-- Create junction table for market trends and competitors
CREATE TABLE "competitor_market_trends" (
    "competitorId" UUID NOT NULL REFERENCES "competitors"(id) ON DELETE CASCADE,
    "marketTrendId" UUID NOT NULL REFERENCES "market_trends"(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("competitorId", "marketTrendId")
);

-- Create optimized indexes
CREATE INDEX CONCURRENTLY "idx_users_email" ON "users" USING btree(email);
CREATE INDEX CONCURRENTLY "idx_users_role" ON "users" USING btree(role, "isActive");
CREATE INDEX CONCURRENTLY "idx_leads_score" ON "leads" USING btree(score, status);
CREATE INDEX CONCURRENTLY "idx_leads_company" ON "leads" USING hash(company);
CREATE INDEX CONCURRENTLY "idx_interactions_lead" ON "interactions" USING btree("leadId", type);
CREATE INDEX CONCURRENTLY "idx_interactions_timestamp" ON "interactions" USING brin("createdAt");
CREATE INDEX CONCURRENTLY "idx_analytics_metric" ON "analytics" USING btree("metricType", "analysisDate");
CREATE INDEX CONCURRENTLY "idx_market_trends_type" ON "market_trends" USING btree(type, "startDate");
CREATE INDEX CONCURRENTLY "idx_market_trends_search" ON "market_trends" USING gin(to_tsvector('english', title || ' ' || description));

-- Create partitions for leads table
CREATE TABLE "leads_current" PARTITION OF "leads"
    FOR VALUES FROM (CURRENT_DATE - INTERVAL '30 days') TO (MAXVALUE);
CREATE TABLE "leads_history" PARTITION OF "leads"
    FOR VALUES FROM (MINVALUE) TO (CURRENT_DATE - INTERVAL '30 days');

-- Create materialized view for lead analytics
CREATE MATERIALIZED VIEW "lead_analytics_summary" AS
SELECT 
    l.id AS lead_id,
    l.score,
    l.status,
    COUNT(i.id) AS interaction_count,
    AVG(i.sentiment) AS avg_sentiment,
    MAX(i.created_at) AS last_interaction,
    COUNT(DISTINCT a.id) AS analytics_count
FROM "leads" l
LEFT JOIN "interactions" i ON l.id = i.lead_id
LEFT JOIN "analytics" a ON l.id = a.lead_id
GROUP BY l.id, l.score, l.status
WITH DATA;

-- Create indexes on materialized view
CREATE UNIQUE INDEX "idx_lead_analytics_summary_id" ON "lead_analytics_summary" (lead_id);
CREATE INDEX "idx_lead_analytics_summary_score" ON "lead_analytics_summary" (score DESC);

-- Set up row-level security
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "users_isolation" ON "users"
    USING (role = 'ADMIN' OR id = current_user_id());

CREATE POLICY "leads_access" ON "leads"
    USING (
        EXISTS (
            SELECT 1 FROM "users"
            WHERE id = current_user_id()
            AND (role IN ('ADMIN', 'MANAGER') OR id = "userId")
        )
    );

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER audit_users_update
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_leads_update
    BEFORE UPDATE ON "leads"
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_func();

-- Create maintenance function for materialized view refresh
CREATE OR REPLACE FUNCTION refresh_lead_analytics_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY "lead_analytics_summary";
END;
$$ LANGUAGE plpgsql;