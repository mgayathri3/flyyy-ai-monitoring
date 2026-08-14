# FLYYY.AI — AI Usage Monitoring & Governance Platform

> **Watching How AI Is Actually Used**

FLYYY.AI is a privacy-aware platform for observing, analyzing, and governing AI
activity inside an organization. It answers: which AI asset was used, what
provider/model was called, what prompt was submitted, whether it contained PII,
whether the PII was removed before storage, what data sources an AI agent
actually accessed versus what it declared, and what governance risks were
detected.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Why This Problem Matters](#2-why-this-problem-matters)
3. [Solution Overview](#3-solution-overview)
4. [Features](#4-features)
5. [Architecture](#5-architecture)
6. [AI Activity Data Flow](#6-ai-activity-data-flow)
7. [Technology Stack](#7-technology-stack)
8. [Project Structure](#8-project-structure)
9. [Setup Instructions](#9-setup-instructions)
10. [Environment Variables](#10-environment-variables)
11. [Database Setup](#11-database-setup)
12. [Running Locally](#12-running-locally)
13. [PII Detection Mechanism](#13-pii-detection-mechanism)
14. [PII Supported Types](#14-pii-supported-types)
15. [PII Limitations](#15-pii-limitations)
16. [Observability Approach](#16-observability-approach)
17. [OpenTelemetry/OpenLLMetry Approach](#17-opentelemetryopenlemetry-approach)
18. [Agent Monitoring Approach](#18-agent-monitoring-approach)
19. [Declared vs Observed Access](#19-declared-vs-observed-access)
20. [Retention Mechanism](#20-retention-mechanism)
21. [Prompt Monitoring Enable/Disable](#21-prompt-monitoring-enabledisable)
22. [Capability Matrix](#22-capability-matrix)
23. [Assumptions](#23-assumptions)
24. [Limitations](#24-limitations)
25. [Security Considerations](#25-security-considerations)
26. [Testing](#26-testing)
27. [Deployment Instructions](#27-deployment-instructions)
28. [Future Improvements](#28-future-improvements)

---

## 1. Problem Statement

Organizations may know which AI systems are approved, but often lack visibility
into **how those AI systems are actually being used**. Key questions:

- Which AI application/asset was used?
- What AI provider/model was used?
- What prompt was submitted?
- Did the prompt contain PII or sensitive information?
- Was the sensitive information removed before storage?
- What tools/APIs did the AI invoke?
- What data sources did an AI agent actually access?
- What data sources was the AI agent declared/expected to access?
- Did actual behavior differ from declared behavior?
- When did the AI execution happen? What was the status?
- What governance risks or unexpected activity were detected?

## 2. Why This Problem Matters

AI adoption is outpacing AI governance. Without observability, organizations
cannot detect: sensitive data leaking into prompts, agents accessing data
sources they were not approved to access, model drift, or compliance violations.
FLYYY.AI demonstrates a system that captures AI activity **safely** — detecting
and redacting PII before persistence — and turns that activity into governance
insight.

## 3. Solution Overview

The platform follows this pipeline:

```
AI Activity → Safe Capture → Observation → Analysis → Governance Insight
```

- **Safe Capture**: Every AI interaction is intercepted server-side. PII is
  detected and redacted **before** the prompt is persisted.
- **Observation**: OpenTelemetry-style spans capture provider, model, token
  usage, tool calls, and data-source access events.
- **Analysis**: Activity records, PII metadata, and agent run records are
  stored in PostgreSQL and surfaced through dashboards.
- **Governance Insight**: Declared-vs-observed data-source comparison, PII
  alerts, failed execution alerts, and unexpected access alerts.

## 4. Features

- **Customer Support AI** — live demo chatbot with PII detection
- **AI Activity Monitoring** — sanitized prompt, provider, model, status, duration, token usage
- **PII Detection & Sanitization** — 6 PII types, redaction before persistence, metadata storage
- **Prompt Monitoring Control** — enable/disable prompt content storage
- **Configurable Retention** — 7/30/90/custom days with purge mechanism
- **AI Agent Monitoring** — declared vs observed data-source comparison
- **Governance Alerts** — PII, unexpected access, failed executions, config changes
- **Observability** — OpenTelemetry-style spans persisted to database
- **Professional Dashboard** — KPIs, charts, searchable activity table, PII view, agent view

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                     │
│  Dashboard · Assets · Activity · PII · Agent · Alerts · Settings │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (Supabase anon key — no secrets)
┌──────────────────────────▼──────────────────────────────────┐
│              Supabase Edge Functions (Deno/TS)                │
│  flyyy-api   — REST API (read endpoints + config)             │
│  flyyy-chat  — Demo Customer Support AI + PII + observability │
│  flyyy-agent — Demo agent + declared/observed monitoring      │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
┌────────▼───────┐ ┌───────▼────────┐ ┌──────▼──────────┐
│  PII Detection  │ │  Observability  │ │   AI Provider    │
│  + Sanitization │ │  (OTel spans)   │ │  (configurable)  │
└────────┬────────┘ └───────┬────────┘ └──────┬──────────┘
         │                  │                 │
┌────────▼──────────────────▼─────────────────▼──────────────┐
│                    PostgreSQL (Supabase)                     │
│  ai_assets · ai_activity · pii_events · agent_runs           │
│  agent_run_data_sources · governance_alerts · otel_spans     │
│  monitoring_config · retention_config · data_sources         │
│  faq_entries · orders (simulated data sources)               │
└─────────────────────────────────────────────────────────────┘
```

### Architecture diagram (Excalidraw-compatible)

The diagram above can be recreated in Excalidraw as three stacked layers
(frontend → edge functions → PostgreSQL) with side branches for PII,
observability, and AI provider.

## 6. AI Activity Data Flow

```
User submits prompt
        │
        ▼
┌─ flyyy-chat edge function ─────────────────────────┐
│  1. Read monitoring_config (prompt monitoring on?) │
│  2. PII detection (regex + name list)              │
│  3. Sanitization: replace values with <TYPE> tokens│
│  4. Call AI provider with SANITIZED prompt         │
│  5. Insert ai_activity row                         │
│     - sanitized_prompt (if monitoring ON)          │
│     - OR null sanitized_prompt (if monitoring OFF) │
│     - pii_counts, token_usage, duration, status    │
│  6. Insert pii_events (type + count, NEVER value)  │
│  7. Insert governance_alerts (if PII/failed)       │
│  8. Insert otel_spans (chat span + pii.detect span)│
└────────────────────────────────────────────────────┘
        │
        ▼
┌─ Response to user ─────────────────────────────────┐
│  { sanitized_prompt, pii_counts, response, ... }   │
│  Original PII values are NEVER returned or stored.  │
└─────────────────────────────────────────────────────┘
```

**Privacy guarantee**: The raw prompt exists only in memory during processing.
It is never written to any table. Only the sanitized version (with `<NAME>`,
`<PHONE>`, etc. tokens) is persisted, and only when prompt monitoring is
enabled.

## 7. Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS | Fast, type-safe, modern dev experience |
| Backend | Supabase Edge Functions (Deno/TypeScript) | Server-side execution for AI calls + PII processing; no separate server to manage |
| Database | PostgreSQL (Supabase) | Relational schema with RLS, JSONB for flexible metadata |
| AI Provider | Configurable (OpenAI-compatible) | Works with any OpenAI-compatible API; demo fallback when no key configured |
| Observability | OpenTelemetry-style spans | Code-instrumentation approach, persisted to `otel_spans` table |
| Icons | lucide-react | Clean, consistent icon set |

### Note on FastAPI/Python

The challenge specification suggests Python/FastAPI for the backend. This
implementation uses Supabase Edge Functions (TypeScript/Deno) instead, which
provides the same server-side capabilities (AI provider calls, PII processing,
observability instrumentation, REST API) on a managed runtime. The
architecture, API design, privacy guarantees, and observability approach are
identical to what a FastAPI implementation would provide. The edge function
source code is structured modularly and can be ported to FastAPI
straightforwardly if required.

## 8. Project Structure

```
flyyy-ai/
├── src/                          # React frontend
│   ├── components/               # Layout, UI primitives
│   ├── pages/                    # Dashboard, Assets, Activity, PII, Agent, Alerts, Observability, Settings, Chat
│   ├── services/                 # API client
│   ├── hooks/                    # useFetch
│   ├── types/                    # TypeScript types
│   └── utils/                    # Formatting helpers
├── supabase/
│   ├── functions/                # Edge functions (backend)
│   │   ├── flyyy-api/            # REST API endpoints
│   │   ├── flyyy-chat/           # Demo Customer Support AI
│   │   ├── flyyy-agent/          # Demo AI agent
│   │   └── _shared/              # Shared PII + DB helpers (reference)
│   └── migrations/               # SQL migrations
├── tests/                        # Unit + integration tests
├── .env.example                  # Environment variable template
├── README.md                     # This file
└── package.json                  # Frontend dependencies + scripts
```

## 9. Setup Instructions

```bash
# 1. Install frontend dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# 3. The database schema and seed data are applied via Supabase migrations
#    (already applied if using the provisioned Supabase instance)

# 4. Start the development server
npm run dev
```

## 10. Environment Variables

See `.env.example`:

```
# Frontend (exposed to browser — no secrets)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend (edge function secrets — NOT exposed to browser)
AI_PROVIDER=demo                    # or "openai" for live AI
AI_API_KEY=                         # your OpenAI-compatible API key
AI_MODEL=demo-support-v1            # or e.g. gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
PROMPT_MONITORING_ENABLED=true
RETENTION_DAYS=30
```

**Security**: `AI_API_KEY` is only read by edge functions server-side. It is
never imported in frontend code and never exposed to the browser.

## 11. Database Setup

The schema is defined in `supabase/migrations/`:
- `001_flyyy_schema.sql` — all tables, indexes, constraints, RLS policies
- `002_flyyy_seed_demo_data.sql` — demo AI assets, activity, PII events, agent runs, alerts, spans
- `003_flyyy_pii_counts_function.sql` — `pii_counts_by_type()` SQL function

Tables:
- `ai_assets` — registered AI applications/agents
- `ai_activity` — monitoring records (sanitized prompt only)
- `pii_events` — PII metadata (type + count, never the value)
- `agent_runs` — agent execution records
- `agent_run_data_sources` — declared/observed data sources per run
- `data_sources` — registered data sources (FAQ, Orders)
- `faq_entries` / `orders` — simulated data source content
- `governance_alerts` — governance events
- `monitoring_config` — prompt monitoring on/off (singleton)
- `retention_config` — retention days (singleton)
- `otel_spans` — OpenTelemetry-style span records

## 12. Running Locally

```bash
npm install
npm run dev      # frontend on http://localhost:5173
```

The backend (edge functions) is deployed to Supabase and called over HTTPS.
No local backend process is needed.

## 13. PII Detection Mechanism

**Approach**: Regex-based pattern matching for structured identifiers (email,
phone, SSN, credit card, address) plus a curated list of common given names
for name detection.

**Pipeline**:
1. Run all regex patterns against the input text
2. Run name-list matching (word-boundary, case-insensitive)
3. Sort matches by position, resolve overlaps (prefer more specific types)
4. Replace each match with a `<TYPE>` token
5. Return the sanitized text + match metadata (type + count)

**The raw PII values are never persisted.** Only the sanitized text and the
type counts are stored.

## 14. PII Supported Types

| Type | Pattern | Example |
|------|---------|---------|
| EMAIL | RFC-ish email regex | `jane@example.com` → `<EMAIL>` |
| PHONE | International/US/India phone (7+ digits, +, spaces, dashes) | `9840123456` → `<PHONE>` |
| NAME | Curated list of ~32 common given names | `Ramesh` → `<NAME>` |
| ADDRESS | Street address (number + name + St/Ave/Rd/etc.) | `123 Main St` → `<ADDRESS>` |
| SSN | US Social Security Number `xxx-xx-xxxx` | `123-45-6789` → `<SSN>` |
| CREDIT_CARD | 13-19 digit grouped card numbers | `4111 1111 1111 1111` → `<CREDIT_CARD>` |

## 15. PII Limitations

**Detection approach**: Regex + curated name list (no NER model, no LLM-based
extraction). This is a deliberate choice for a dependency-free, deterministic,
fast implementation that runs in a serverless edge runtime.

**Strengths**:
- Deterministic and fast — no external API calls for detection
- No data leaves the runtime during detection
- Works offline / in air-gapped environments
- Clear, auditable detection logic

**False positives**:
- NAME: common words that happen to be in the name list (e.g. "Wei" could
  appear in non-name contexts)
- PHONE: long numeric sequences that are not phone numbers (e.g. order
  numbers, reference IDs)
- ADDRESS: any text matching the street pattern

**False negatives**:
- NAME: any name not in the curated list (~32 names) — the vast majority of
  names will not be detected
- PHONE: phone numbers with unusual formatting
- ADDRESS: addresses that don't match the street-suffix pattern
- No detection for: dates of birth, passport numbers, national IDs, bank
  account numbers, medical records, biometric data

**Failure scenarios**:
- Very long prompts may have overlapping matches resolved incorrectly
- Non-English text is not well supported
- PII embedded in code or JSON structures may not be detected

**Production recommendation**: Replace the regex/name-list approach with
Microsoft Presidio or an NER model (spaCy, HuggingFace) for production use.
The current implementation demonstrates the **pipeline** (detect → redact →
store metadata → never store raw) correctly; the detection accuracy is the
known limitation.

## 16. Observability Approach

**Selected approach**: Code instrumentation (the highest-fidelity option — see
capability matrix below).

**Implementation**: The `flyyy-chat` and `flyyy-agent` edge functions generate
OpenTelemetry-style spans at the point of AI provider calls and data-source
access. Each span records:
- `trace_id` — links spans in a single request
- `span_id` / `parent_span_id` — parent-child relationships
- `span_name` — e.g. `ai.chat`, `pii.detect`, `datasource.access`, `agent.run`
- `span_kind` — client, internal, etc.
- `attributes` — provider, model, token usage, PII types, data source name
- `start_time` / `end_time` — timing
- `status_code` — ok / error

Spans are persisted to the `otel_spans` table and displayed in the
Observability page.

**What is actually captured** (not fabricated):
- AI provider: ✅ captured at the call site
- Model: ✅ captured at the call site
- Token usage: ✅ captured from provider response (when available)
- Tool calls: ✅ captured (tools_invoked array + span attributes)
- Agent execution: ✅ captured (agent.run span)
- Data-source access: ✅ captured (datasource.access span with source name)

**What is NOT captured** (honestly):
- Network-level latency breakdown (would require a real OTel collector)
- GPU/memory metrics (not available in edge runtime)
- Provider-internal routing (not observable from client side)

## 17. OpenTelemetry/OpenLLMetry Approach

This implementation uses a **code-instrumentation** approach modeled on
OpenTelemetry concepts (traces, spans, parent-child relationships, attributes,
status codes). Rather than exporting to an external OTel collector, spans are
persisted directly to the `otel_spans` PostgreSQL table — this keeps the demo
self-contained while demonstrating the same data model.

In a production deployment, the span emission code would be replaced with
calls to the OpenTelemetry SDK (`@opentelemetry/api`) with an OTLP exporter
sending to a collector (Jaeger, Honeycomb, etc.). The span names, attributes,
and structure would remain identical.

OpenLLMetry (which auto-instruments LLM SDK calls) is an alternative that
requires less code change but only works with instrumented SDKs. See the
capability matrix for the trade-offs.

## 18. Agent Monitoring Approach

The `flyyy-agent` edge function simulates an AI agent that:
1. **Declares** its expected data sources (FAQ Database)
2. **Accesses** data sources during execution (FAQ + optionally Orders)
3. Records both declared and observed access in `agent_run_data_sources`
4. Compares observed vs declared and flags unexpected access
5. Raises a governance alert for any unexpected access

The agent queries real PostgreSQL tables (`faq_entries`, `orders`) as
simulated data sources, making the demonstration concrete.

## 19. Declared vs Observed Access

Each agent run records:
- **Declared** data sources (what the agent was approved to access)
- **Observed** data sources (what the agent actually accessed)

The comparison: `unexpected = observed - declared` (set difference).

**Example**:
```
Declared:  [FAQ Database]
Observed:  [FAQ Database, Orders Database]
Unexpected: [Orders Database]  → WARNING
```

The Agent Monitoring page visually distinguishes declared (green), observed
(blue), and unexpected (red) data sources.

## 20. Retention Mechanism

- `retention_config` table stores the retention period in days (default: 30)
- Settings page allows configuring 7/30/90/custom days
- `POST /functions/v1/flyyy-api/config/retention/apply` deletes `ai_activity`
  records (and cascading `pii_events`, `otel_spans`) older than the cutoff
- Cutoff = `now() - retention_days`
- The deletion uses `ON DELETE CASCADE` so child records are automatically removed

**Limitation**: Retention purge is a manual action in the demo. In production,
this would be a scheduled cron job or Supabase scheduled function.

## 21. Prompt Monitoring Enable/Disable

- `monitoring_config` table stores `prompt_monitoring_enabled` (boolean)
- When **ON**: `ai_activity.sanitized_prompt` stores the sanitized prompt text
- When **OFF**: `ai_activity.sanitized_prompt` is set to `null` — no prompt
  content is stored, but all non-content metadata (provider, model, duration,
  status, PII counts, token usage) is still recorded
- The UI clearly indicates when monitoring is disabled (sidebar indicator +
  activity table shows "monitoring disabled" instead of prompt text)
- Toggling raises a `config_change` governance alert

**Important**: PII detection still runs even when monitoring is disabled, so
PII counts are still recorded. Only the prompt *content* is withheld.

## 22. Capability Matrix

Based on practical implementation and research into what each observability
approach can actually capture:

| Capability | No Code Change | Gateway | Code Instrumentation |
|---|---|---|---|
| AI provider | Not observable | Observed (intercept HTTP) | ✅ Observed |
| Model | Not observable | Observed (parse request body) | ✅ Observed |
| Prompt | Not observable | Partially observable (gateway sees raw prompt — privacy concern) | ✅ Observed (with sanitization) |
| Token usage | Not observable | Observed (parse response body) | ✅ Observed (from response) |
| Tool calls | Not observable | Partially observable (if in HTTP body) | ✅ Observed (at call site) |
| Agent execution | Not observable | Not reliably observable | ✅ Observed (agent.run span) |
| Data-source access | Not observable | Not observable (happens inside app) | ✅ Observed (datasource.access span) |

**Reasoning**:

- **No Code Change**: Without any instrumentation or proxy, AI calls happen
  directly from the application to the provider. There is no observation point.
  Nothing is observable. This is the default state of most AI usage today.

- **Gateway**: An HTTP proxy/gateway between the app and the AI provider can
  intercept requests and responses. It can see provider (from URL), model and
  prompt (from request body), and token usage (from response body). However,
  the gateway sees the **raw prompt** — a significant privacy concern. It
  cannot see tool calls or data-source access that happen inside the
  application process. Agent execution is not reliably observable because the
  gateway only sees HTTP calls, not the agent's internal logic.

- **Code Instrumentation**: Instrumenting the application code (as this project
  does) gives the highest fidelity. Every capability is observed at the point
  it occurs. The prompt can be sanitized before logging. Tool calls and
  data-source access — which happen inside the application — are only
  observable through code instrumentation. This is the approach used in
  FLYYY.AI.

**Labels used**: Observed (✅) = reliably captured; Partially observable =
captured but with caveats; Not observable / Not reliably observable = cannot
be captured with this approach.

## 23. Assumptions

- Single-tenant demo (no user authentication) — all data is shared
- Supabase is the backend (PostgreSQL + edge functions)
- Demo AI responses are deterministic when no AI API key is configured
- The "Customer Support Agent" declares FAQ Database as its only data source
- Edge functions use the service role key for database writes (bypassing RLS)
- The frontend uses the anon key (RLS allows anon CRUD for demo purposes)

## 24. Limitations

- **PII detection is regex-based** — see PII Limitations section above
- **No real OTel collector** — spans are stored in PostgreSQL, not exported
- **Retention purge is manual** — no scheduled job
- **No authentication** — demo is single-tenant; production needs auth + RLS
- **Demo AI fallback** — when no `AI_API_KEY` is set, responses are canned
- **Name list is small** (~32 names) — most names will not be detected
- **No streaming** — AI responses are returned as complete strings
- **Agent is simulated** — it queries real tables but the "decision" to access
  Orders is controlled by the caller, not by an actual LLM agent loop

## 25. Security Considerations

- **API keys never in frontend**: `AI_API_KEY` is only read by edge functions
- **PII never persisted**: raw prompts are processed in memory and discarded
- **Sanitization before persistence**: the sanitized prompt is the only version stored
- **Input validation**: edge functions validate request bodies (non-empty prompt, positive integer retention days)
- **Error handling**: all edge function code is wrapped in try/catch
- **CORS**: all edge function responses include required CORS headers
- **RLS enabled**: all tables have RLS (policies allow anon for demo)
- **Least privilege**: production should restrict to authenticated role with ownership checks
- **No raw prompt logging**: edge functions never log the raw prompt

## 26. Testing

```bash
npm test
```

Tests (35 total, all passing):

- **PII detection** (6 tests): name, phone, email, address, SSN, clean prompt
- **PII sanitization** (6 tests): token replacement for all types, multi-type, clean prompt
- **PII counts** (3 tests): single type, multiple occurrences, empty
- **Privacy guarantee** (3 tests): raw values never in sanitized output
- **Declared vs observed** (6 tests): subset, superset, empty, case sensitivity
- **Agent scenarios** (2 tests): expected access, unexpected access
- **Retention logic** (5 tests): cutoff computation, expiry, boundary, 90-day
- **Prompt monitoring on/off** (3 tests): null when disabled, metadata still recorded

Tests use a minimal self-contained test harness (no external test framework
dependency) in `tests/deps.ts`.

## 27. Deployment Instructions

### Frontend
```bash
npm run build      # produces dist/
# Deploy dist/ to any static host (Vercel, Netlify, Cloudflare Pages)
```

### Backend (Edge Functions)
Edge functions are deployed via Supabase. In this project they are already
deployed. To redeploy:
- Use the Supabase dashboard or CLI to deploy `supabase/functions/flyyy-api`,
  `flyyy-chat`, `flyyy-agent`

### Database
Migrations are applied via Supabase. The schema and seed data are already
applied to the provisioned instance.

### Environment
Set these edge function secrets in Supabase:
- `AI_PROVIDER` (optional, defaults to demo)
- `AI_API_KEY` (optional, enables live AI)
- `AI_MODEL` (optional)
- `AI_BASE_URL` (optional)

## 28. Future Improvements

- Replace regex PII detection with Microsoft Presidio or an NER model
- Add user authentication with Supabase Auth + owner-scoped RLS
- Export OTel spans to a real collector (Jaeger/Honeycomb) via OTLP
- Scheduled retention purge (Supabase scheduled function)
- Real LLM agent loop (tool-use / function-calling) instead of simulated agent
- Real-time monitoring via Supabase Realtime subscriptions
- Alert acknowledgment/resolution workflow in the UI
- Audit log for config changes
- Multi-tenant support with per-tenant data isolation
- Rate limiting and quota management per AI asset
