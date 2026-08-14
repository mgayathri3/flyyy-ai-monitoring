/*
# FLYYY.AI — AI Usage Monitoring & Governance Platform schema

## Purpose
Creates the full PostgreSQL schema for observing, analyzing, and governing AI
activity inside an organization. Single-tenant demo (no sign-in): all tables
are readable/writable by the anon + authenticated roles so the browser can talk
straight to the database.

## New tables
1. ai_assets — registered AI applications/agents (Customer Support AI, Customer Support Agent)
2. data_sources — declared/observable data sources (FAQ Database, Orders Database)
3. faq_entries — demo content for the FAQ data source
4. orders — demo content for the Orders data source
5. ai_activity — one row per AI interaction (sanitized prompt only, never raw PII)
6. pii_events — PII detection metadata per activity (type + count; never the value)
7. agent_runs — agent execution records (run id, status, duration, tools)
8. agent_run_data_sources — junction table marking each source as declared OR observed
9. governance_alerts — surfaced governance events (PII, unexpected access, failures)
10. monitoring_config — singleton config (prompt monitoring on/off)
11. retention_config — singleton config (retention days)
12. otel_spans — OpenTelemetry-style span records captured from instrumentation

## Privacy
- ai_activity.sanitized_prompt stores ONLY the redacted prompt. The raw prompt
  is never persisted anywhere in this schema.
- pii_events stores type + count only, never the detected value.

## Security
- RLS enabled on every table.
- Policies allow anon + authenticated full CRUD (intentionally shared demo data).
*/

-- ---------- AI assets ----------
CREATE TABLE IF NOT EXISTS ai_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('chatbot','agent')),
  provider text NOT NULL,
  model text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Data sources ----------
CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  source_type text NOT NULL DEFAULT 'database',
  is_declared_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Demo FAQ content ----------
CREATE TABLE IF NOT EXISTS faq_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Demo Orders content ----------
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_name text NOT NULL,
  status text NOT NULL,
  total_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- AI activity (monitoring record) ----------
CREATE TABLE IF NOT EXISTS ai_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  asset_id uuid REFERENCES ai_assets(id) ON DELETE SET NULL,
  provider text NOT NULL,
  model text NOT NULL,
  sanitized_prompt text,
  pii_detected boolean NOT NULL DEFAULT false,
  pii_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_monitoring_enabled boolean NOT NULL DEFAULT true,
  token_usage jsonb,
  tools_invoked text[] NOT NULL DEFAULT '{}',
  duration_ms integer,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','partial')),
  error_info text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_activity_asset_id ON ai_activity(asset_id);
CREATE INDEX IF NOT EXISTS idx_ai_activity_created_at ON ai_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_activity_status ON ai_activity(status);
CREATE INDEX IF NOT EXISTS idx_ai_activity_pii_detected ON ai_activity(pii_detected);

-- ---------- PII events (metadata only) ----------
CREATE TABLE IF NOT EXISTS pii_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES ai_activity(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES ai_assets(id) ON DELETE SET NULL,
  pii_type text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pii_events_activity_id ON pii_events(activity_id);
CREATE INDEX IF NOT EXISTS idx_pii_events_pii_type ON pii_events(pii_type);

-- ---------- Agent runs ----------
CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL UNIQUE,
  asset_id uuid REFERENCES ai_assets(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','partial')),
  tools_invoked text[] NOT NULL DEFAULT '{}',
  duration_ms integer,
  has_unexpected_access boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON agent_runs(created_at DESC);

-- ---------- Agent run data sources (declared vs observed) ----------
CREATE TABLE IF NOT EXISTS agent_run_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES agent_runs(id) ON DELETE CASCADE,
  data_source_id uuid REFERENCES data_sources(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('declared','observed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, data_source_id, access_type)
);
CREATE INDEX IF NOT EXISTS idx_agent_run_ds_run_id ON agent_run_data_sources(run_id);

-- ---------- Governance alerts ----------
CREATE TABLE IF NOT EXISTS governance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('pii_detected','unexpected_data_access','failed_execution','config_change')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  asset_id uuid REFERENCES ai_assets(id) ON DELETE SET NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_governance_alerts_created_at ON governance_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_alerts_status ON governance_alerts(status);

-- ---------- Monitoring config (singleton) ----------
CREATE TABLE IF NOT EXISTS monitoring_config (
  id integer PRIMARY KEY DEFAULT 1,
  prompt_monitoring_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO monitoring_config (id, prompt_monitoring_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- ---------- Retention config (singleton) ----------
CREATE TABLE IF NOT EXISTS retention_config (
  id integer PRIMARY KEY DEFAULT 1,
  retention_days integer NOT NULL DEFAULT 30 CHECK (retention_days > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO retention_config (id, retention_days)
VALUES (1, 30)
ON CONFLICT (id) DO NOTHING;

-- ---------- OpenTelemetry-style spans ----------
CREATE TABLE IF NOT EXISTS otel_spans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id text NOT NULL,
  span_id text NOT NULL,
  parent_span_id text,
  activity_id uuid REFERENCES ai_activity(id) ON DELETE CASCADE,
  agent_run_id uuid REFERENCES agent_runs(id) ON DELETE CASCADE,
  span_name text NOT NULL,
  span_kind text NOT NULL DEFAULT 'internal' CHECK (span_kind IN ('internal','client','server','producer','consumer')),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  status_code text NOT NULL DEFAULT 'unset' CHECK (status_code IN ('unset','ok','error')),
  status_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otel_spans_trace_id ON otel_spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_otel_spans_activity_id ON otel_spans(activity_id);

-- ============================================================
-- Row Level Security — single-tenant demo, anon + authenticated
-- ============================================================
ALTER TABLE ai_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE pii_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE otel_spans ENABLE ROW LEVEL SECURITY;

-- Helper: apply full CRUD policies for anon+authenticated to a table
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ai_assets','data_sources','faq_entries','orders','ai_activity','pii_events','agent_runs','agent_run_data_sources','governance_alerts','monitoring_config','retention_config','otel_spans']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_select_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true);', 'anon_select_'||t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_insert_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true);', 'anon_insert_'||t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_update_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', 'anon_update_'||t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_delete_'||t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true);', 'anon_delete_'||t, t);
  END LOOP;
END $$;