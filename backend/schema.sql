-- ============================================================
-- FLYYY.AI Database Schema
-- PostgreSQL 13+
-- ============================================================

-- ============================================================
-- AI ASSETS
-- ============================================================
-- Represents registered AI applications and agents

CREATE TABLE IF NOT EXISTS ai_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,        -- 'chatbot', 'agent', 'workflow', etc.
    provider VARCHAR(100),              -- 'openai', 'anthropic', 'demo', etc.
    model VARCHAR(100),                 -- specific model identifier
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'deprecated'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AI ACTIVITY
-- ============================================================
-- Records of AI system usage with sanitized prompts and PII metadata

CREATE TABLE IF NOT EXISTS ai_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT UNIQUE NOT NULL,
    asset_id UUID REFERENCES ai_assets(id),
    provider VARCHAR(100),              -- AI provider used
    model VARCHAR(100),                 -- model name
    sanitized_prompt TEXT,              -- SANITIZED prompt (never raw)
    pii_detected BOOLEAN DEFAULT FALSE, -- whether PII was found
    pii_counts JSONB,                   -- {"PERSON": 1, "PHONE_NUMBER": 1, ...}
    prompt_monitoring_enabled BOOLEAN DEFAULT TRUE,
    token_usage INTEGER,
    tools_invoked TEXT[],               -- array of tools called
    duration_ms INTEGER,                -- execution time in milliseconds
    status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed', 'timeout'
    error_info TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_activity_asset_id ON ai_activity(asset_id);
CREATE INDEX IF NOT EXISTS idx_ai_activity_pii_detected ON ai_activity(pii_detected);
CREATE INDEX IF NOT EXISTS idx_ai_activity_created_at ON ai_activity(created_at);

-- ============================================================
-- PII EVENTS
-- ============================================================
-- Aggregated PII detection events for governance insights

CREATE TABLE IF NOT EXISTS pii_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES ai_activity(id),
    asset_id UUID REFERENCES ai_assets(id),
    pii_type VARCHAR(100),              -- 'PERSON', 'PHONE_NUMBER', etc.
    count INTEGER DEFAULT 1,            -- how many instances detected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pii_events_pii_type ON pii_events(pii_type);
CREATE INDEX IF NOT EXISTS idx_pii_events_created_at ON pii_events(created_at);

-- ============================================================
-- DATA SOURCES
-- ============================================================
-- Registers databases, APIs, and data sources that agents can access

CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,  -- 'FAQ Database', 'Orders Database', etc.
    type VARCHAR(100),                  -- 'database', 'api', 'file_system', etc.
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AGENT RUNS
-- ============================================================
-- Records of individual agent executions

CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT UNIQUE NOT NULL,        -- human-readable run ID
    asset_id UUID REFERENCES ai_assets(id),
    status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed', 'timeout'
    tools_invoked TEXT[],               -- array of tools used
    duration_ms INTEGER,                -- execution time in milliseconds
    has_unexpected_access BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_asset_id ON agent_runs(asset_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_has_unexpected ON agent_runs(has_unexpected_access);

-- ============================================================
-- AGENT RUN DATA SOURCES
-- ============================================================
-- Maps which data sources were declared vs. actually accessed during a run

CREATE TABLE IF NOT EXISTS agent_run_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    data_source_id UUID NOT NULL REFERENCES data_sources(id),
    access_type VARCHAR(50) NOT NULL,  -- 'declared' or 'observed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(run_id, data_source_id, access_type)
);

-- ============================================================
-- GOVERNANCE ALERTS
-- ============================================================
-- Surfaces governance risks and unexpected behavior

CREATE TABLE IF NOT EXISTS governance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id TEXT UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,        -- 'pii_detected', 'unexpected_data_access', 'failed_execution', 'config_change'
    severity VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    asset_id UUID REFERENCES ai_assets(id),
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'acknowledged', 'resolved'
    related_id UUID,                   -- reference to related record (activity_id or run_id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_governance_alerts_type ON governance_alerts(type);
CREATE INDEX IF NOT EXISTS idx_governance_alerts_status ON governance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_governance_alerts_asset_id ON governance_alerts(asset_id);

-- ============================================================
-- OTEL SPANS (OpenTelemetry-style)
-- ============================================================
-- Distributed tracing for AI activity observability

CREATE TABLE IF NOT EXISTS otel_spans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id TEXT NOT NULL,             -- groups related spans
    span_id TEXT NOT NULL,
    parent_span_id TEXT,                -- for hierarchy
    activity_id UUID REFERENCES ai_activity(id),
    agent_run_id UUID REFERENCES agent_runs(id),
    span_name VARCHAR(255) NOT NULL,   -- 'ai.chat', 'pii.detect', 'agent.run', 'datasource.access'
    span_kind VARCHAR(50),              -- 'INTERNAL', 'SERVER', 'CLIENT'
    attributes JSONB,                  -- structured metadata
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_ms INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time))::integer * 1000
    ) STORED,
    status_code VARCHAR(50) DEFAULT 'ok', -- 'ok', 'error'
    status_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otel_spans_trace_id ON otel_spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_otel_spans_span_id ON otel_spans(span_id);
CREATE INDEX IF NOT EXISTS idx_otel_spans_activity_id ON otel_spans(activity_id);
CREATE INDEX IF NOT EXISTS idx_otel_spans_start_time ON otel_spans(start_time);

-- ============================================================
-- ORDERS (Demo data for agent)
-- ============================================================
-- Sample orders table used by demo agent

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    customer_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MONITORING CONFIG
-- ============================================================
-- Application-level configuration

CREATE TABLE IF NOT EXISTS monitoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Retention queries
CREATE INDEX IF NOT EXISTS idx_ai_activity_created_desc ON ai_activity(created_at DESC);

-- Dashboard queries
CREATE INDEX IF NOT EXISTS idx_ai_activity_status ON ai_activity(status);
CREATE INDEX IF NOT EXISTS idx_governance_alerts_created_at ON governance_alerts(created_at DESC);

-- Search queries
CREATE INDEX IF NOT EXISTS idx_ai_activity_sanitized_prompt ON ai_activity USING GIN(to_tsvector('english', sanitized_prompt));

-- ============================================================
-- CONSTRAINTS & TRIGGERS
-- ============================================================

-- Automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_assets_updated_at
BEFORE UPDATE ON ai_assets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- EXTENSIONS
-- ============================================================
-- Required for full functionality

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- for text search

-- ============================================================
-- END OF SCHEMA
-- ============================================================
