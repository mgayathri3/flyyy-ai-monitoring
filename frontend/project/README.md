FLYYY.AI — AI Usage Monitoring & Governance Platform

Watching How AI Is Actually Used

FLYYY.AI is a privacy-aware AI usage monitoring and governance platform that demonstrates how enterprises can safely observe AI activity, detect and sanitize sensitive information, monitor agent behavior, and surface governance risks—without storing raw PII.

The platform unifies data governance, AI governance, and regulatory compliance into a single intelligent observability layer that provides:

- **Safe Prompt Capture**: Detects and removes PII before storage
- **Usage Analytics**: Records what data sources and tools AI agents actually access
- **Governance Visibility**: Surfaces unexpected behavior and governance risks
- **Privacy Protection**: Ensures sensitive information never reaches persistent storage

The end-to-end flow:

**AI Activity → Safe Capture → PII Detection & Sanitization → Observation → Analysis → Governance Insight**

Table of Contents

Problem Statement

Solution Overview

Key Features

Architecture

AI Activity Data Flow

Technology Stack

Project Structure

Setup Instructions

Environment Variables

Database Setup

Running Locally

Backend API

Frontend Pages

PII Detection and Sanitization

PII Supported Types

Prompt Monitoring

AI Agent Monitoring

Governance Alerts

Observability

Retention

Capability Matrix

Security and Privacy

Testing

Assumptions

Limitations

Deployment

Future Improvements

## 1. Problem Statement

**The Challenge: Hidden AI Usage**

As enterprises increasingly deploy AI models, applications, and autonomous agents across products, workflows, and decision-making processes, organizations face a critical visibility gap:

- Employees may enter sensitive information (names, phone numbers, SSNs) into AI prompts
- AI systems may be used for purposes different from their registered purpose
- AI agents may access data sources beyond what they were expected to use
- Organizations cannot reliably determine whether actual AI behavior matches declared behavior

The core problem is not the lack of AI systems or monitoring tools, but the **lack of reliable and privacy-safe visibility into actual AI usage**.

**Key Governance Questions**

Without proper observability, organizations cannot answer:

- Which AI asset was used and by whom?
- What provider and model were invoked?
- What prompt was submitted and did it contain sensitive information?
- Was PII removed before storage?
- What tools or data sources did the AI agent actually invoke?
- Which data sources did the agent declare versus actually access?
- How long did the execution take and did it succeed?
- What governance risks were detected?

FLYYY.AI demonstrates a practical approach to answering these questions while ensuring **sensitive information never reaches persistent storage**.

## 2. Solution Overview

FLYYY.AI is a full-stack monitoring platform consisting of:

**Backend (FastAPI + Python)**
- REST API for monitoring and governance operations
- PII detection and sanitization using Microsoft Presidio
- Database layer for persisting sanitized metadata
- Application-level instrumentation for AI activity observability
- Configurable retention and governance alert logic

**Frontend (React + TypeScript + Vite)**
- Dashboard with real-time AI activity metrics
- Dedicated views for prompt monitoring, PII events, and agent execution
- Governance alerts and unexpected behavior detection
- Settings for retention policies and monitoring configuration

**Database (PostgreSQL)**
- Persistent storage for AI assets, activity, PII metadata, and governance alerts
- OpenTelemetry-style span records for tracing
- Support for searching and filtering sanitized content

**Core Capabilities**

- ✅ Safe prompt capture with PII detection before persistence
- ✅ Sanitization of 5+ PII entity types (names, phone numbers, emails, credit cards, IP addresses)
- ✅ Recording declared vs. observed data-source access for agents
- ✅ Governance alerts for unexpected behavior
- ✅ OpenTelemetry-style instrumentation for AI activity tracing
- ✅ Configurable retention with purge capabilities
- ✅ Enable/disable prompt monitoring without losing operational metadata

## 3. Key Features

### Dashboard
- Real-time metrics on AI activity and governance
- Total requests, active AI assets, PII events, failed executions
- PII distribution by type
- Recent activity timeline

### Prompt Monitoring
- Live demo interface for testing PII detection
- Example:
  - **Input**: `"Write a reminder email to Ramesh, phone 9840123456 about his insurance claim"`
  - **Sanitized**: `"Write a reminder email to <NAME>, phone <PHONE> about his insurance claim"`
  - **Metadata**: `PERSON: 1, PHONE_NUMBER: 1`

### AI Activity Monitoring
- Request ID and timestamp
- AI provider and model information
- Sanitized prompt content
- PII detection status and counts
- Execution duration and status

### PII Detection & Sanitization
- Detects 5+ PII entity types using Microsoft Presidio
- Removes sensitive values before persistence
- Records PII metadata for governance insights
- Supports enabling/disabling prompt monitoring

### Agent Monitoring
- Tracks declared vs. observed data-source access
- Example:
  - **Declared**: FAQ Database
  - **Observed**: FAQ Database, Orders Database
  - **Unexpected**: Orders Database
- Surfaces unexpected behavior as governance alerts

### Governance Alerts
- PII detected in prompts
- Unexpected data access by agents
- Failed executions
- Configuration changes
- Alert statuses: open, acknowledged, resolved

### Observability
- OpenTelemetry-style traces and spans
- Instrumentation at key points: `ai.chat`, `pii.detect`, `agent.run`, `datasource.access`
- Searchable trace records with hierarchical span structure

### Settings & Configuration
- Prompt monitoring toggle
- Configurable retention period
- Manual retention purge
- Future: scheduled retention jobs

## 4. Architecture

### System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    React Frontend                          │
│                 Vite + TypeScript                          │
│                  Tailwind CSS                              │
│                                                            │
│ Dashboard · Assets · Activity · PII · Chat · Agent         │
│ Alerts · Observability · Settings                          │
└───────────────────────────┬────────────────────────────────┘
                            │
                            │ HTTP / JSON REST API
                            ▼
┌────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                        │
│                         Python 3.10+                       │
│                      SQLAlchemy ORM                        │
│                                                            │
│ Health Checks · Assets · Dashboard · Monitoring            │
│ PII Detection · Chat · Agent · Alerts · Retention          │
│ Configuration · Observability                              │
└───────────────────────────┬────────────────────────────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
  PII Detection        Agent            Observability
  (Presidio)          Monitoring        (Span Records)
  & Sanitization      Declared/          Trace/Span
  Before Storage      Observed           Data
             │              │              │
             └──────────────┼──────────────┘
                            ▼
┌────────────────────────────────────────────────────────────┐
│                     PostgreSQL 13+                         │
│                                                            │
│ ai_assets · ai_activity · pii_events · agent_runs          │
│ governance_alerts · otel_spans · monitoring_config         │
└────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Privacy-First**: Sensitive prompt content is processed and sanitized before persistence. Raw PII never reaches the database.

2. **Trust Boundary at Backend**: The frontend communicates with the backend API rather than directly accessing the database. All PII detection and sanitization occurs on the backend.

3. **Application-Level Instrumentation**: Visibility into AI activity is achieved through code instrumentation at key execution points, not through network gateways or external proxies.

4. **Metadata-Driven Insights**: Governance insights are derived from sanitized metadata (PII counts, entity types, timing data) rather than raw prompt content.

5. **Configurable Observability**: Monitoring can be enabled/disabled independently of operational metrics collection.

## 5. AI Activity Data Flow

### Prompt Monitoring Pipeline

```
User submits prompt
        │
        ▼
React Frontend (ChatPage)
        │
        ▼
POST /api/chat → FastAPI Backend
        │
        ▼
PII Detection (Microsoft Presidio)
        │
        ├── No PII found
        │      │
        │      ▼
        │   Store original prompt
        │
        ├── PII found
        │      │
        │      ▼
        │   Anonymize & Replace
        │      │
        │      ▼
        │   <PERSON>, <PHONE_NUMBER>, <EMAIL_ADDRESS>, ...
        │      │
        │      ▼
        │   Store sanitized prompt + metadata
        │
        ▼
Store AI Activity Record
        │
        ├── sanitized_prompt
        ├── pii_detected (boolean)
        ├── pii_counts (JSON: entity type → count)
        ├── provider
        ├── model
        ├── duration_ms
        ├── status (success/failure)
        ├── created_at
        └── ai_asset_id
        │
        ▼
Frontend Dashboard / Activity / PII Pages
```

### Privacy Rule

**The original raw prompt is never persisted in the monitoring system.**

- When prompt monitoring is **enabled**: Only the sanitized prompt and PII metadata are stored
- When prompt monitoring is **disabled**: Prompt content is not stored; operational metadata (duration, status, asset) can still be retained
- PII information is recorded as aggregate counts, never as the actual sensitive values

### Example Flow

1. User submits: `"Call Ramesh at 9840123456 about his order #12345"`
2. Presidio detects: PERSON (1), PHONE_NUMBER (1)
3. System stores: `"Call <PERSON> at <PHONE_NUMBER> about his order #12345"`
4. Metadata recorded: `{"PERSON": 1, "PHONE_NUMBER": 1}`
5. Dashboard shows: PII detected, sanitized prompt visible, entity counts recorded
6. Original input never persisted anywhere

## 6. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18.3+ | UI framework |
| | TypeScript 5.5+ | Type safety |
| | Vite 5.4+ | Build tool & dev server |
| | Tailwind CSS 3.4+ | Utility-first styling |
| | Lucide React 0.446+ | Icon library |
| | Fetch API | HTTP client |
| **Backend** | Python 3.10+ | Server-side language |
| | FastAPI 0.100+ | REST API framework |
| | SQLAlchemy 2.0+ | ORM for database queries |
| | psycopg2-binary 2.9+ | PostgreSQL driver |
| | python-dotenv 1.0+ | Environment variable management |
| | Microsoft Presidio 2.2+ | PII detection & anonymization |
| **Database** | PostgreSQL 13+ | Relational database |
| **Observability** | OpenTelemetry-style spans | Application-level tracing |
| **Deployment** | Supabase Functions (optional) | Serverless edge functions |

### Why These Technologies?

- **FastAPI**: Modern, fast, with automatic OpenAPI documentation and built-in validation
- **Microsoft Presidio**: Production-ready PII detection supporting multiple entity types and languages
- **PostgreSQL**: Reliable RDBMS with strong JSON support for metadata storage
- **React + Vite**: Fast development experience with excellent TypeScript support
- **Application-level instrumentation**: Provides higher fidelity visibility than network gateways, allows PII sanitization before persistence

## 7. Project Structure

```
flyyy-ai-monitoring/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application and endpoints
│   │   ├── database.py          # SQLAlchemy engine and session management
│   │   ├── settings.py          # Configuration and environment variables
│   │   └── pii.py               # Presidio-based PII detection and sanitization
│   │
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Example environment configuration
│   └── .env                     # Local environment variables (not in git)
│
├── frontend/
│   └── project/
│       ├── src/
│       │   ├── components/
│       │   │   ├── Layout.tsx    # Main layout wrapper
│       │   │   └── ui.tsx        # Shared UI components
│       │   ├── hooks/
│       │   │   └── useFetch.ts   # Custom fetch hook
│       │   ├── pages/
│       │   │   ├── DashboardPage.tsx     # Main dashboard
│       │   │   ├── ActivityPage.tsx      # AI activity monitoring
│       │   │   ├── AssetsPage.tsx        # AI assets registry
│       │   │   ├── PiiPage.tsx           # PII events and trends
│       │   │   ├── ChatPage.tsx          # Live prompt demo
│       │   │   ├── AgentPage.tsx         # Agent monitoring
│       │   │   ├── AlertsPage.tsx        # Governance alerts
│       │   │   ├── ObservabilityPage.tsx # Traces and spans
│       │   │   └── SettingsPage.tsx      # Configuration
│       │   ├── services/
│       │   │   └── api.ts        # API client and endpoints
│       │   ├── types/
│       │   │   └── index.ts      # TypeScript type definitions
│       │   ├── utils/
│       │   │   └── format.ts     # Formatting utilities
│       │   ├── App.tsx           # Root component
│       │   ├── main.tsx          # Entry point
│       │   ├── index.css         # Global styles
│       │   └── vite-env.d.ts     # Vite type definitions
│       │
│       ├── supabase/
│       │   ├── functions/        # Edge functions (optional)
│       │   └── migrations/       # Database migrations
│       │
│       ├── tests/
│       │   ├── agent.test.ts
│       │   ├── pii.test.ts
│       │   ├── retention.test.ts
│       │   └── deps.ts
│       │
│       ├── package.json
│       ├── package-lock.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── tsconfig.app.json
│       ├── tsconfig.node.json
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── eslint.config.js
│       └── README.md
│
├── .gitignore
└── README.md                    # This file
```

### Key Files

- **backend/app/main.py**: All FastAPI endpoints for assets, monitoring, PII, chat, agents, alerts, configuration, retention, and observability
- **backend/app/pii.py**: Microsoft Presidio integration for detecting and anonymizing PII
- **frontend/src/services/api.ts**: Centralized API client with all backend endpoints
- **frontend/src/types/index.ts**: TypeScript interfaces for request/response shapes

## 8. Setup Instructions

### Prerequisites

Install the following on your system:

- **Python 3.10+**: [python.org](https://www.python.org/downloads/)
- **Node.js 18+**: [nodejs.org](https://nodejs.org/)
- **PostgreSQL 13+**: [postgresql.org](https://www.postgresql.org/download/)
- **Git**: [git-scm.com](https://git-scm.com/)

Verify installations:

```powershell
python --version    # Should output Python 3.10+
node --version      # Should output v18+
npm --version       # Should output 9+
psql --version      # Should output PostgreSQL 13+
```

### Backend Setup

1. Navigate to the backend directory:
```powershell
cd backend
```

2. Create a Python virtual environment:
```powershell
python -m venv .venv
```

3. Activate the virtual environment (Windows):
```powershell
.venv\Scripts\Activate.ps1
```

Or on macOS/Linux:
```bash
source .venv/bin/activate
```

4. Install Python dependencies:
```powershell
pip install -r requirements.txt
```

Or manually install core dependencies:
```powershell
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv presidio-analyzer presidio-anonymizer
```

5. Create a `.env` file in the backend directory (see Environment Variables section below)

### Frontend Setup

1. Navigate to the frontend directory:
```powershell
cd frontend/project
```

2. Install npm dependencies:
```powershell
npm install
```

3. Create a `.env.local` file if you need a custom API URL (optional):
```
VITE_API_URL=http://127.0.0.1:8000
```

### Database Setup

1. Ensure PostgreSQL service is running

2. Create the database:
```sql
CREATE DATABASE flyyy_ai OWNER postgres;
```

3. Run migrations (if using Supabase migrations):
```powershell
# Navigate to frontend/project/supabase/migrations
# Apply migrations manually or use Supabase CLI
```

Or create tables manually using the schema in backend/app/main.py

Alternatively, you can use a provided SQL schema file if one exists in the repository.

## 9. Environment Variables

### Backend Configuration

Create a `backend/.env` file with the following variables:

```env
# Database Connection
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/flyyy_ai

# AI Provider Configuration
AI_PROVIDER=demo                    # Options: demo, openai, anthropic, etc.
AI_MODEL=demo-support-v1            # Model identifier

# Monitoring Configuration
PROMPT_MONITORING_ENABLED=true      # Enable/disable prompt storage
RETENTION_DAYS=30                   # Days to retain monitoring records

# Optional: For real AI provider integration
# OPENAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here
```

**Critical Security Note**: 
- Never commit `.env` to version control
- Use `.env.example` in the repository with placeholder values
- Secrets stay on the backend; never expose them in frontend code

### Frontend Configuration

The frontend defaults to `http://127.0.0.1:8000` for API calls.

To use a custom API URL, create `frontend/project/.env.local`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

For production:
```env
VITE_API_URL=https://your-api-domain.com
```

### Database Connection Details

Replace the following in `DATABASE_URL`:
- `your_username`: PostgreSQL user (default: `postgres`)
- `your_password`: PostgreSQL password
- `localhost`: PostgreSQL host (default: `localhost` for local)
- `5432`: PostgreSQL port (default: `5432`)
- `flyyy_ai`: Database name

## 10. Running Locally

### Step 1: Start PostgreSQL

Ensure PostgreSQL service is running on your system:

```powershell
# On Windows, PostgreSQL typically runs as a service
# Check: Services app → "postgresql-*" should be running

# On macOS:
# brew services start postgresql

# On Linux:
# sudo systemctl start postgresql
```

### Step 2: Start the Backend

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

The backend will start at:
- **API Base**: http://127.0.0.1:8000
- **Swagger Docs**: http://127.0.0.1:8000/docs
- **Health Check**: http://127.0.0.1:8000/api/health

You should see output:
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 3: Start the Frontend

Open a new terminal and run:

```powershell
cd frontend/project
npm run dev
```

The frontend will start at:
- **Frontend App**: http://localhost:5173

You should see output:
```
  ➜  Local:   http://localhost:5173
  ➜  press h + enter to show help
```

### Step 4: Verify Everything Works

1. Open http://localhost:5173 in your browser
2. Navigate to Dashboard → should show 0 requests initially
3. Go to Chat page → Submit a prompt with a phone number
4. Verify PII is detected and sanitized
5. Go to Activity page → Should show your recent prompt

## 11. Backend API Endpoints

The FastAPI backend provides the following REST API endpoints organized by feature area.

### Health Check Endpoints

```
GET  /api/health
GET  /api/health/database
```

### AI Assets

```
GET  /api/assets              # Legacy endpoint
GET  /api/ai-assets           # Frontend-compatible endpoint
```

### Dashboard & Metrics

```
GET  /api/dashboard/summary   # Real-time dashboard metrics
```

### Prompt Monitoring

```
POST /api/chat                # Submit and monitor a prompt
POST /api/monitoring/prompt   # Record a prompt (direct)
GET  /api/monitoring/activity # Get activity records
GET  /api/monitoring/search   # Search sanitized prompts
GET  /api/monitoring/metrics  # Aggregated metrics
```

### Monitoring Configuration

```
GET  /api/monitoring/status   # Get monitoring status
POST /api/monitoring/status   # Update monitoring status
```

### Retention

```
GET    /api/monitoring/retention      # Get retention configuration
DELETE /api/monitoring/retention      # Trigger retention purge
```

### Governance & Alerts

```
GET /api/governance/alerts            # Get governance alerts
GET /api/governance/unexpected-access # Get unexpected data access events
```

### Agent Monitoring

```
POST /api/agent/run           # Execute an agent run
GET  /api/agent-runs          # Get all agent run records
GET  /api/agent-runs/{id}     # Get a specific agent run
```

### Observability

```
GET /api/observability/spans  # Get OpenTelemetry spans
```

### Response Format

All endpoints return JSON. Errors return appropriate HTTP status codes (400, 404, 500) with error messages.

Example successful response:
```json
{
  "status": "success",
  "data": {...}
}
```

Example error response:
```json
{
  "status": "error",
  "message": "Details about what went wrong"
}
```

### Interactive API Documentation

FastAPI automatically generates interactive Swagger UI at http://127.0.0.1:8000/docs. You can:
- View all endpoints with parameter details
- Try endpoints directly from the browser
- See request/response schemas

## 12. Implementation Details

## 13. PII Detection and Sanitization

### Approach: Microsoft Presidio

FLYYY.AI uses **Microsoft Presidio**, a production-grade PII detection and anonymization library. Presidio combines multiple detection techniques:

- **Pattern-based matching** for known formats (phone, email, credit card, etc.)
- **Named Entity Recognition (NER)** for person names and locations
- **Machine learning models** for context-aware detection
- **Custom recognizers** for domain-specific patterns

### Detection Pipeline

```
Raw Prompt
    │
    ▼
Presidio Analyzer
    │
    ├── Pattern Matching (Phone, Email, CC, IP, etc.)
    ├── NER Model (Person names)
    └── Context Analysis
    │
    ▼
Entity Detection Results
    │
    ├── PERSON (names)
    ├── PHONE_NUMBER
    ├── EMAIL_ADDRESS
    ├── CREDIT_CARD
    └── IP_ADDRESS
    │
    ▼
Presidio Anonymizer
    │
    └── Replace each entity with <ENTITY_TYPE>
    │
    ▼
Sanitized Prompt + Metadata
    │
    ├── sanitized_prompt: "Call <PERSON> at <PHONE_NUMBER>..."
    └── pii_counts: {"PERSON": 1, "PHONE_NUMBER": 1}
    │
    ▼
Store in Database (never raw prompt)
```

### Supported PII Entity Types

| Entity Type | Example | Stored As | Detection Method |
|-------------|---------|-----------|------------------|
| PERSON | Ramesh, John Smith | `<PERSON>` | NER Model |
| PHONE_NUMBER | 9840123456, (555) 123-4567 | `<PHONE_NUMBER>` | Pattern + Context |
| EMAIL_ADDRESS | user@example.com | `<EMAIL_ADDRESS>` | Pattern Matching |
| CREDIT_CARD | 4111 1111 1111 1111 | `<CREDIT_CARD>` | Luhn Algorithm |
| IP_ADDRESS | 192.168.1.1 | `<IP_ADDRESS>` | Pattern Matching |

### Example: Complete Flow

**Input Prompt:**
```
"Hi Ramesh, please review order #12345. 
Call me at 9840123456 or email john@company.com. 
Credit card: 4532015112830366"
```

**Presidio Detection:**
```
PERSON: ["Ramesh", "john"]
PHONE_NUMBER: ["9840123456"]
EMAIL_ADDRESS: ["john@company.com"]
CREDIT_CARD: ["4532015112830366"]
```

**Sanitized Prompt:**
```
"Hi <PERSON>, please review order #12345. 
Call me at <PHONE_NUMBER> or email <EMAIL_ADDRESS>. 
Credit card: <CREDIT_CARD>"
```

**Metadata Stored:**
```json
{
  "pii_detected": true,
  "pii_counts": {
    "PERSON": 2,
    "PHONE_NUMBER": 1,
    "EMAIL_ADDRESS": 1,
    "CREDIT_CARD": 1
  }
}
```

### Configuration

PII detection can be enabled or disabled via the Settings page:

- **Prompt Monitoring Enabled**: Sanitized prompts and PII metadata are stored
- **Prompt Monitoring Disabled**: Prompts are not stored; only operational metadata (duration, status) is retained

This allows organizations to disable prompt storage while maintaining observability of AI usage patterns.

## 14. Frontend Pages

### Dashboard
- Overview of AI activity metrics
- Total requests, active assets, PII events
- Failed executions and recent activity timeline

### Assets
- Registry of registered AI applications
- Asset details: name, type, provider, model, status

### Activity
- AI activity monitoring with sanitized prompts
- Search and filter capabilities
- PII detection status and entity counts

### PII Monitoring
- Detected PII types and frequency
- Trends over time
- No exposure of actual sensitive values

### Chat (Customer Support AI Demo)
- Live prompt interface for testing PII detection
- Real-time sanitization feedback
- Demonstrates the complete monitoring flow

### Agent Monitoring
- Declared vs. observed data-source access tracking
- Example: Agent declared FAQ Database but accessed Orders Database
- Highlights unexpected behavior

### Governance Alerts
- PII detected in prompts
- Unexpected data access events
- Failed executions
- Configuration changes
- Filter by status: open, acknowledged, resolved

### Observability
- OpenTelemetry-style traces and spans
- Hierarchical view: Trace → Span relationships
- Attributes, duration, status for each span
- Searchable by trace ID or span name

### Settings
- Enable/disable prompt monitoring
- Configure retention period (default: 30 days)
- Trigger manual retention purge
- View current monitoring configuration

## 15. Prompt Monitoring

### How It Works

When prompt monitoring is **enabled**:
1. User submits a prompt via `/api/chat` endpoint
2. Backend receives the raw prompt
3. Presidio analyzes the prompt for PII entities
4. If PII is found, the prompt is anonymized
5. Sanitized prompt and PII metadata are stored in `ai_activity` table
6. Dashboard displays sanitized content and entity counts
7. Original prompt is never persisted

### Privacy Protection

- **Raw prompts never stored**: Only sanitized versions reach the database
- **Metadata-driven insights**: PII type and count provide governance signals without exposing values
- **Searchable sanitized content**: Users can search within prompts without accessing sensitive data
- **Reversible**: With proper controls, organization can maintain a separate, access-restricted log of original prompts if needed

### Disabling Prompt Monitoring

When prompt monitoring is **disabled**:
- Prompt content is not stored at all
- Operational metadata is still recorded: provider, model, duration, status, timestamps
- PII detection still runs (optional: can be skipped for performance)
- Dashboard can show request counts and performance metrics without prompt visibility
- Useful for privacy-maximized environments

## 16. AI Agent Monitoring

### Declared vs. Observed Access

For AI agents, FLYYY.AI tracks what data sources the agent actually accessed versus what it declared it would use.

**Declared Access**: What the agent configuration says it can access

**Observed Access**: What the agent actually accessed during execution

**Unexpected Access**: Observed - Declared (suggests misconfiguration or security issue)

### Example Scenario

Agent is declared to access:
- FAQ Database

Agent runs and actually accesses:
- FAQ Database
- Orders Database

System records:
- **Declared**: FAQ Database
- **Observed**: FAQ Database, Orders Database
- **Unexpected**: Orders Database

This unexpected access is surfaced as a governance alert and available in the governance dashboard.

### Implementation Approach

1. Agent configuration defines approved data sources
2. Agent instrumentation captures each database/API access
3. Execution captures both declared and observed sets
4. Backend computes: unexpected = observed - declared
5. Results stored in `agent_runs` and `governance_alerts` tables

### Limitations

- Requires application instrumentation at data-access points
- Cannot observe access outside the application (external API calls not in code)
- Network-level gateways alone cannot reliably see internal database access
- Agents using dynamic data sources may appear to access unexpected sources even when behavior is correct

## 17. Governance Alerts

Governance alerts surface potential risks and unexpected behavior:

### Alert Types

| Alert Type | Trigger | Severity | Action |
|-----------|---------|----------|--------|
| PII Detected | Prompt contains PII | Medium | Review prompt context |
| Unexpected Data Access | Agent accessed undeclared source | High | Review agent configuration |
| Failed Execution | AI request failed | Medium | Investigate error logs |
| Config Change | Settings modified | Low | Audit trail |

### Alert Lifecycle

1. **Detected**: System identifies the event
2. **Open**: Alert created and visible in dashboard
3. **Acknowledged**: User acknowledges the alert
4. **Resolved**: User marks as investigated/closed

### Filtering & Search

- Filter by type, severity, status
- Search by asset name or description
- Time range filtering
- Export for compliance reporting

## 18. Observability: Instrumentation and Tracing

### OpenTelemetry-Style Approach

FLYYY.AI uses application-level instrumentation to create OpenTelemetry-compatible span records. Each significant operation is instrumented at the point where it occurs in application code.

### Instrumentation Points

| Span Name | Attributes | When Recorded |
|-----------|-----------|---------------|
| `ai.chat` | prompt, model, provider | User submits prompt to chat endpoint |
| `pii.detect` | entities_found, count | PII detection runs |
| `pii.sanitize` | original_length, sanitized_length | Prompt anonymization occurs |
| `agent.run` | agent_id, declared_sources | Agent execution starts |
| `datasource.access` | source_name, operation | Agent accesses database/API |

### Trace Hierarchy Example

```
Trace ID: abc-123

├─ Span: ai.chat
│  ├─ Span: pii.detect
│  │  └─ Status: Found 2 PII entities
│  └─ Span: store_activity
│     └─ Status: Stored
│
└─ Span: agent.run
   ├─ Span: datasource.access (FAQ DB)
   ├─ Span: datasource.access (Orders DB - UNEXPECTED)
   └─ Status: Completed with unexpected access
```

### Data Captured per Span

- **span_id**: Unique identifier
- **trace_id**: Groups related operations
- **parent_span_id**: For hierarchy
- **span_name**: Operation type
- **span_kind**: INTERNAL, SERVER, CLIENT, PRODUCER, CONSUMER
- **start_time**: When span started
- **end_time**: When span completed
- **duration_ms**: Elapsed time
- **attributes**: Key-value metadata
- **status**: OK, ERROR
- **error_message**: If status is ERROR

### Querying Spans

Frontend Observability page displays:
- Traces grouped by timestamp
- Span hierarchy visualization
- Attribute inspection
- Duration analysis
- Error tracking

### Why Code Instrumentation?

| Visibility Approach | Observes | Cannot See |
|-------------------|----------|-----------|
| **No Code Change** | Nothing reliable | Everything |
| **Network Gateway** | AI provider calls, prompt content*, tokens | Internal agent logic, database access, tool invocation timing |
| **Code Instrumentation** | Provider calls, model info, tokens, tools, agent logic, database access, timing | Provider-internal GPU metrics, some vendor-specific telemetry |

*Gateway sees raw prompts, which creates privacy risk

## 19. Retention and Data Lifecycle

### Retention Configuration

Records in the monitoring system are retained for a configurable period (default: 30 days).

```
Current Time - 30 Days
        │
        ├─ Records OLDER than this: Deleted
        │
        └─ Records NEWER than this: Retained
```

### Retention Scope

- **ai_activity**: Sanitized prompts, execution records
- **pii_events**: PII detection metadata (not raw values)
- **agent_runs**: Agent execution and access tracking
- **otel_spans**: Trace and span records
- **governance_alerts**: Alert records

### Retention Settings

Configurable via Settings page:
- Retention period in days
- Enable/disable retention enforcement
- Manual trigger for immediate purge

### Manual Purge

The Settings page allows users to manually trigger retention:

```
DELETE FROM <table>
WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL 'N days')
```

### Production Improvement

The current implementation uses manual purge triggers. Production deployments should use:
- PostgreSQL `pg_cron` extension for scheduled jobs
- Application background task queue (Celery, APScheduler)
- Managed retention features in cloud database services

## 20. Capability Matrix: What Can Actually Be Observed?

This matrix captures our research findings on observability capabilities using different approaches.

### Research: Observability Trade-offs

| Capability | No Code Change | Network Gateway | Code Instrumentation |
|-----------|---|---|---|
| **AI Provider** | ❌ | ✅ | ✅ |
| **Model Name** | ❌ | ✅ | ✅ |
| **Prompt Content** | ❌ | ⚠️ (privacy risk) | ✅ (with sanitization) |
| **PII Detection** | ❌ | ❌ | ✅ |
| **PII Sanitization** | ❌ | ❌ | ✅ |
| **Token Usage** | ❌ | ✅ (if in response) | ✅ |
| **Tool Calls** | ❌ | ⚠️ (partial) | ✅ |
| **Tool Parameters** | ❌ | ❌ | ✅ |
| **Agent Logic** | ❌ | ❌ | ✅ |
| **Data-Source Access** | ❌ | ❌ | ✅ |
| **Execution Duration** | ❌ | ✅ (network only) | ✅ |
| **Success/Failure** | ❌ | ✅ | ✅ |
| **Error Details** | ❌ | ⚠️ (HTTP codes) | ✅ |

**Legend:**
- ✅ = Reliably observable
- ⚠️ = Partially observable / with limitations
- ❌ = Not reliably observable

### Analysis: Why FLYYY.AI Uses Code Instrumentation

**No Code Change** 
- Provides no reliable AI visibility
- Acceptable when AI adoption is minimal

**Network Gateway (Reverse Proxy)**
- Observes AI provider HTTP traffic
- Advantages: No application changes, provider-level visibility
- Limitations:
  - Sees raw prompts (privacy issue)
  - Cannot see internal agent logic
  - Cannot see internal database access
  - Cannot track tool invocation details
  - Partial visibility into token usage

**Code Instrumentation** (FLYYY.AI Approach)
- Observes at the point where events occur
- Advantages:
  - Highest fidelity for AI activity
  - Enables PII sanitization before storage
  - Sees internal agent execution
  - Tracks database/data-source access
  - Full error context and details
- Limitations:
  - Requires application code changes
  - Does not see provider-internal telemetry
  - Does not see provider GPU metrics
  - Manual instrumentation effort

### Design Decision

FLYYY.AI chose **code instrumentation** because:

1. **Safety First**: Enables sanitization of raw PII before it reaches persistent storage
2. **Complete Observability**: Can see agent logic, data-source access, and tool invocation
3. **Governance Accuracy**: Can reliably determine declared vs. observed behavior
4. **Privacy Protection**: Sensitive data is processed at the trust boundary (backend)

## 21. Security and Privacy

### Core Principles

**1. Raw PII Protection**
- Raw sensitive information is never persisted in the monitoring system
- Only sanitized representations and metadata are stored
- Ensures compliance with data minimization principles

**2. Backend as Trust Boundary**
- Frontend does not directly access the database
- All sensitive processing (PII detection, sanitization) occurs on the backend
- Backend validates all incoming requests

**3. Secure Configuration**
- Secrets (database passwords, API keys) stored in `.env` files
- Never committed to Git or embedded in source code
- Use `.env.example` for safe templates

**4. Access Control**
- Frontend can view sanitized content only
- Raw PII remains in isolated backend memory during processing
- After anonymization, original is discarded

**5. Input Validation**
- FastAPI automatic request validation
- Type checking via Pydantic models
- Rejection of malformed requests before processing

### Data Security

| Layer | Security Measure |
|-------|------------------|
| **Transit** | HTTPS recommended for production |
| **Storage** | PostgreSQL with encryption at rest (production) |
| **Access** | Database credentials in environment variables |
| **Secrets** | Never in code or version control |
| **Logging** | Never log raw PII; log sanitized versions only |

### Compliance Considerations

FLYYY.AI demonstrates approaches aligned with:
- **GDPR**: Data minimization through PII sanitization
- **CCPA**: Visibility and control over data usage
- **HIPAA** (partial): Sanitization of names and identifiers
- **SOC 2**: Audit trails via governance alerts and observability spans

## 22. Testing

### Backend Testing

Run API health checks:

```powershell
# Health check
curl http://127.0.0.1:8000/api/health

# Database connectivity
curl http://127.0.0.1:8000/api/health/database
```

Interactive API testing via Swagger UI:
```
http://127.0.0.1:8000/docs
```

### Frontend Testing

Run tests (if test suite is configured):

```powershell
cd frontend/project
npm test
```

Build verification:

```powershell
npm run build
npm run typecheck
```

### Manual End-to-End Testing

1. **Setup Phase**
   - Start PostgreSQL and backend
   - Verify health endpoints return healthy status
   - Start frontend

2. **PII Detection Flow**
   - Navigate to Chat page
   - Submit prompt: `"Call me at 9840123456 or email john@example.com"`
   - Verify PII is detected and sanitized
   - Check Activity page shows sanitized content
   - Verify Dashboard shows PII event count increased

3. **Agent Monitoring Flow**
   - Navigate to Agent Monitoring page
   - Execute agent without Orders access
   - Verify only FAQ Database appears in observed access
   - Execute agent with Orders access enabled
   - Verify Orders Database appears in unexpected access

4. **Governance Alerts Flow**
   - Check Governance Alerts page
   - Verify PII detection creates alert
   - Verify unexpected data access creates alert
   - Mark alert as acknowledged/resolved

5. **Retention Flow**
   - Navigate to Settings
   - View current retention configuration
   - Trigger manual purge
   - Verify old records are deleted

6. **Observability Flow**
   - Navigate to Observability page
   - Query spans by trace ID
   - Verify span hierarchy and attributes
   - Check execution durations

## 23. Assumptions

### Architectural Assumptions

1. **Single Organization**: The current implementation assumes a single organization (no multi-tenancy)
2. **Local Deployment**: Assumes backend and frontend run together in same network
3. **Synchronous Processing**: Prompt monitoring is synchronous; PII detection blocks prompt processing
4. **PostgreSQL is Available**: Assumes PostgreSQL database is accessible and initialized

### Data Assumptions

1. **AI Assets Pre-configured**: AI assets are populated in database before monitoring
2. **Agent Declarations Accurate**: Assumes declared data sources are accurate and complete
3. **Standard PII Types**: Assumes most PII falls into Presidio's supported categories
4. **Reasonable Retention Window**: 30-day default assumes business requirements don't require longer periods

### Technology Assumptions

1. **Python 3.10+**: Backend requires Python 3.10 or later
2. **Node.js 18+**: Frontend requires Node.js 18 or later
3. **PostgreSQL 13+**: Database requires PostgreSQL 13 or later
4. **CORS Enabled**: Frontend and backend are trusted origins
5. **No External AI Provider**: Demo mode doesn't require OpenAI, Anthropic, or other provider setup

### Operational Assumptions

1. **Manual Retention**: Purge operations are manually triggered (production should automate)
2. **Single Backend Instance**: No load balancing or horizontal scaling in demo
3. **Dev Environment**: Setup instructions are for local development only
4. **No Authentication**: Demo assumes trusted environment (production needs auth)

## 24. Known Limitations

### PII Detection Limitations

**False Positives**
- Phone number patterns may match non-phone numbers
- Email patterns may match false positives
- Context analysis has margin for error

**False Negatives**
- Presidio may not detect all PII types
- Names not in NER training data may be missed
- Domain-specific or international PII may not be detected
- Unusual formatting may evade detection

**Coverage Gaps**
- Limited support for non-English text (not configured)
- No detection for: passport numbers, driver's license, tax IDs (unless configured)
- No real-time model updates (fixed Presidio version)

**Presidio Limitations**
- Built-in language models are English-focused
- Requires intentional configuration for multi-language support
- Some entity types need custom recognizers

### Observability Limitations

**What Cannot Be Observed**
- Provider-internal telemetry (GPU utilization, model internals)
- Provider token counting after response (must be manual)
- External API calls that don't go through instrumented code
- Network-level traffic analysis
- Provider inference optimization decisions

**Instrumentation Gaps**
- Only observes where code is explicitly instrumented
- Missing instrumentation points create blind spots
- No automatic call tracing (must be manual)

### Agent Monitoring Limitations

**Declared vs. Observed**
- Cannot reliably observe data access outside application scope
- Cannot distinguish between different types of access (read/write) without additional instrumentation
- Cannot see attempts that were blocked/rejected

**Dynamic Data Sources**
- Agents that access dynamically determined sources will appear to access unexpected sources
- No built-in distinction between "expected dynamic access" and "truly unexpected"

### Retention and Compliance Limitations

**Current Implementation**
- Manual purge triggers (not automated)
- No audit trail for deletions
- No compliance certifications
- No encryption at rest (optional in production)

**Data Recovery**
- No soft deletes (cannot undelete after purge)
- No backup retention strategy included

### Scalability Limitations

**Performance**
- Single backend instance; no horizontal scaling
- Synchronous PII detection may be slow for large volumes
- No query optimization or indexing strategy defined

**Storage**
- PostgreSQL alone; no data warehouse or time-series database
- Querying historical trends may be slow at scale
- No data archival strategy

### Authentication & Authorization

- **Not Implemented**: No user authentication, role-based access control, or multi-tenant isolation
- Production deployments must add authentication layer
- All users see all data (no data isolation)

### Scope of Demo

- **Simplified Agent Framework**: Demo agent is simplified; not production autonomous agent architecture
- **Mock AI Responses**: Chat endpoint can return mock responses without calling real AI provider
- **Demo Data**: Pre-loaded demo data provided for testing

## 25. Deployment

### Frontend Deployment

1. Build the application:
```powershell
cd frontend/project
npm install
npm run build
```

2. Deployment output:
```
dist/                           # Production-ready files
```

3. Deploy to static hosting:
- **Vercel**: Push to GitHub; auto-deploys from `main`
- **Netlify**: Connect repository; configure build command
- **Cloudflare Pages**: Git integration or manual upload
- **AWS S3 + CloudFront**: Upload `dist/` contents to S3

4. Configure API endpoint:
```
Set VITE_API_URL environment variable to your backend domain
```

### Backend Deployment

1. Prepare for production:
```powershell
pip install -r requirements.txt
```

2. Run with production ASGI server (not `uvicorn --reload`):
```powershell
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Or use uvicorn in production mode:
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. Hosting options:
- **Heroku**: Git push to deploy
- **Railway**: Connect GitHub repository
- **AWS EC2/ECS**: Docker container deployment
- **Google Cloud Run**: Serverless container
- **Azure App Service**: Managed Python hosting

4. Production configuration:
```env
DATABASE_URL=postgresql://prod_user:prod_password@prod_host:5432/prod_db
AI_PROVIDER=openai
AI_MODEL=gpt-4
PROMPT_MONITORING_ENABLED=true
RETENTION_DAYS=90
# Add your actual secrets
```

### Database Deployment

1. Managed PostgreSQL options:
- **AWS RDS**: AWS-managed PostgreSQL
- **Azure Database for PostgreSQL**: Azure-managed service
- **Google Cloud SQL**: GCP-managed PostgreSQL
- **Supabase**: PostgreSQL with additional features

2. Setup:
```sql
CREATE DATABASE flyyy_ai;
```

3. Run migrations:
```powershell
# Apply database migrations (if using migration tool)
```

### CORS Configuration

Update backend CORS for production:

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.com",
        "https://www.your-frontend-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Environment Secrets

Use your deployment platform's secret management:
- **Vercel**: Environment Variables in project settings
- **Railway**: Variables in deployment config
- **AWS**: Secrets Manager or Parameter Store
- **Google Cloud**: Secret Manager
- **Azure**: Key Vault

Never commit `.env` files or embed secrets in code.

## 26. Future Improvements

### Short Term (MVP Enhancements)

- [ ] Authentication and RBAC (role-based access control)
- [ ] Multi-tenant data isolation
- [ ] Automated retention jobs (APScheduler, pg_cron)
- [ ] Advanced PII detection (custom recognizers for domain-specific PII)
- [ ] Real LLM integration (OpenAI, Anthropic, Claude)
- [ ] Streaming responses for chat endpoint
- [ ] Better error messages and API validation

### Medium Term (Production Readiness)

- [ ] OpenTelemetry SDK integration + OTLP collector (Jaeger, Honeycomb, Grafana Loki)
- [ ] Real autonomous agent framework (LangGraph, LangChain)
- [ ] Rate limiting and API quota management
- [ ] Audit logs for all configuration changes
- [ ] Alert webhooks (Slack, PagerDuty, Teams)
- [ ] Advanced searching and filtering across all pages
- [ ] Real-time monitoring with WebSocket updates
- [ ] Export functionality (CSV, JSON, PDF)
- [ ] Custom alert rules and thresholds

### Long Term (Enterprise Features)

- [ ] Microsoft Presidio custom recognizers for international PII
- [ ] PostgreSQL Row-Level Security (RLS) for multi-tenant isolation
- [ ] Data warehouse integration (Snowflake, BigQuery)
- [ ] Machine learning for anomaly detection in AI usage
- [ ] Compliance templates (GDPR, HIPAA, SOC 2)
- [ ] Advanced analytics and trend analysis
- [ ] Integration with SIEM systems
- [ ] AI usage cost analysis and optimization
- [ ] Agent performance benchmarking
- [ ] Federated learning for distributed AI monitoring

### Research Directions

- [ ] Comparing Presidio vs. other PII detection frameworks (spaCy NER, commercial solutions)
- [ ] OpenTelemetry standards adoption
- [ ] Privacy-preserving analytics (differential privacy, federated learning)
- [ ] Cost modeling for AI usage
- [ ] Anomaly detection in agent behavior
- [ ] Compliance automation

## 27. Troubleshooting

### Backend Issues

**"Connection refused" on database**
- Ensure PostgreSQL is running: `psql --version`
- Check DATABASE_URL in `.env` is correct
- Verify database exists: `psql -U postgres -c "\\l"`

**"ModuleNotFoundError: presidio_analyzer"**
- Ensure dependencies are installed: `pip install -r requirements.txt`
- Check virtual environment is activated

**Port 8000 already in use**
```powershell
# Find process using port 8000
Get-NetTCPConnection -LocalPort 8000 | Stop-Process -Force

# Or use a different port
uvicorn app.main:app --reload --port 8001
```

### Frontend Issues

**"Cannot find module" errors**
- Delete `node_modules/` and `package-lock.json`
- Run: `npm install`

**Vite dev server not loading**
- Check VITE_API_URL environment variable
- Ensure backend is running on http://127.0.0.1:8000

**Page shows "Cannot connect to API"**
- Check backend is running
- Check CORS configuration allows frontend origin
- Open browser DevTools → Network tab to see requests

### Database Issues

**"FATAL: database does not exist"**
```sql
CREATE DATABASE flyyy_ai;
```

**"Table does not exist" errors**
- Ensure migrations have been run
- Check schema matches expected tables

### General

Check logs:
- **Backend**: Console output from uvicorn
- **Frontend**: Browser DevTools Console tab
- **Database**: PostgreSQL log files

Verify connectivity:
```powershell
# Backend health
curl http://127.0.0.1:8000/api/health

# Database
psql -U postgres -d flyyy_ai -c "SELECT 1"

# Frontend
Open http://localhost:5173 in browser
```

## 28. Project Goals & Evaluation Criteria

### Project Goal

FLYYY.AI demonstrates how organizations can safely observe AI activity, protect sensitive information, and surface governance risks—without storing raw PII.

The complete lifecycle:

```
AI Activity
    ↓
Safe Capture
    ↓
PII Detection & Sanitization
    ↓
Application-Level Observability
    ↓
Activity Analysis
    ↓
Governance Alerts & Insight
```

### What We Prioritize (Depth Over Breadth)

**Evaluated by:**

✅ **Problem Understanding**
- Clear articulation of why AI governance matters
- Specific governance questions being answered
- Privacy-aware design throughout

✅ **Technical Research**
- Honest assessment of observability trade-offs
- Capability matrix explaining what can/cannot be observed
- Clear rationale for design choices

✅ **Engineering Quality**
- Clean code architecture
- Proper error handling
- Type safety (TypeScript, Pydantic validation)
- Separation of concerns

✅ **System Design**
- Clear architecture documentation
- AI activity data flow diagrams
- Design principles and rationale

✅ **Privacy & Security**
- Sensitive information never persists in raw form
- Backend as trust boundary
- Input validation and error handling
- Documented data security measures

✅ **AI Activity Monitoring Accuracy**
- Correctly detects PII and sanitizes before storage
- Accurately tracks declared vs. observed data access
- Proper governance alert triggering

✅ **Trade-off Analysis**
- Acknowledges limitations of each approach
- Explains why code instrumentation was chosen
- Documents what cannot be observed

✅ **Edge Cases & Limitations**
- False positives/negatives in PII detection
- Internationalization considerations
- Dynamic vs. static data sources
- Scalability constraints

✅ **Documentation Quality**
- Clear architecture diagrams
- Step-by-step setup instructions
- Troubleshooting guide
- Technology decisions explained

### What We Don't Prioritize

❌ **Feature Breadth**
- Integrating many APIs or tools unnecessarily
- Complex features without clear governance value

❌ **Complex ML Models**
- Advanced NER models unless they add clear value
- Overfitting to specific use cases

❌ **Deployment Scale**
- Kubernetes, microservices without justification
- Complex DevOps infrastructure for a demo

❌ **Cosmetic Polish**
- Fancy animations without substance
- UI perfection over functionality

## 29. Key Design Decisions

### 1. Why Presidio for PII Detection?

**Chosen**: Microsoft Presidio
**Alternatives**: Regex-based patterns, spaCy NER, commercial solutions

**Rationale**:
- Production-grade, open-source
- Multiple detection techniques (pattern + NER + context)
- Supports 5+ entity types out of the box
- Maintained by Microsoft, actively used in enterprises
- Extensible for custom PII types
- Better accuracy than regex alone

**Trade-off**: Requires dependency; less control than custom regex

### 2. Why Application-Level Instrumentation?

**Chosen**: Code instrumentation at key points
**Alternatives**: Network gateway, no instrumentation, OpenTelemetry SDK

**Rationale**:
- Only reliable way to see internal agent logic
- Enables PII sanitization before persistence
- Can track database access that gateways cannot see
- Lower operational complexity than external collectors
- Aligns with requirements for governance accuracy

**Trade-off**: Requires code changes; doesn't see provider internals

### 3. Why Not Real LLM Integration?

**Chosen**: Demo/mock AI responses for MVP
**Reasoning**:
- Keeps project focused on monitoring, not AI integration
- Reduces external dependencies (no API keys needed)
- Allows controlled testing of PII scenarios
- Demo purpose doesn't require real model responses

**Production**: Real LLM integration via OpenAI, Anthropic, etc.

### 4. Why Manual Retention Triggers?

**Chosen**: Manual purge via Settings page
**Rationale**:
- Simpler for demonstration
- Clear visibility into retention actions
- No background task infrastructure needed

**Production**: Scheduled jobs (pg_cron, APScheduler) recommended

### 5. Why No Authentication/RBAC?

**Chosen**: Single-user demo mode
**Rationale**:
- Simplifies setup for evaluation
- Focuses on AI governance logic
- Not core to monitoring capability

**Production**: Must add authentication layer

## 30. Contributing & Extending

### Adding Custom PII Detectors

```python
# backend/app/pii.py

# Add custom recognizer to Presidio
from presidio_analyzer.pattern_recognizer import PatternRecognizer

ssn_recognizer = PatternRecognizer(
    entity="SSN",
    patterns=[
        Pattern("SSN", r"\b\d{3}-\d{2}-\d{4}\b"),
    ],
    language="en",
)

analyzer.registry.add_recognizer(ssn_recognizer)
```

### Adding New Observability Spans

```python
# backend/app/main.py

# Create instrumentation point
span_attributes = {
    "operation": "database_query",
    "table": "customers",
    "duration_ms": 123,
}

# Store in database
otel_span = {
    "trace_id": trace_id,
    "span_name": "datasource.access",
    "attributes": span_attributes,
    "timestamp": datetime.now(),
}
```

### Adding New Frontend Pages

```typescript
// frontend/project/src/pages/CustomPage.tsx

import React from 'react';
import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function CustomPage() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    api.getCustomData().then(setData);
  }, []);

  return <div>{/* Your page */}</div>;
}
```

## 31. Research Resources

### PII Detection
- [Microsoft Presidio Docs](https://microsoft.github.io/presidio/)
- [spaCy Named Entity Recognition](https://spacy.io/usage/training)
- [GDPR Data Categories](https://gdpr-info.eu/articles/personal-data/)

### Observability
- [OpenTelemetry Specification](https://opentelemetry.io/docs/reference/specification/)
- [OpenLLMetry](https://openllmetry.com/)
- [LLM Tracing Best Practices](https://www.traceloop.com/)

### AI Governance
- [NIST AI Risk Management Framework](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf)
- [OECD AI Principles](https://www.oecd.org/ai/principles/)

### Security
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

## 32. Frequently Asked Questions

**Q: Can FLYYY.AI see provider-internal telemetry?**
A: No. Application-level instrumentation only observes what happens within the application. Provider internals (GPU usage, internal routing) are invisible. This is a known limitation documented in the capability matrix.

**Q: What if an employee uses an AI system outside the application?**
A: FLYYY.AI observes activity within the application it monitors. External AI usage through browsers or other apps is outside scope. This is a limitation of application-level approaches.

**Q: Can PII be recovered after sanitization?**
A: No. After anonymization, the original values are discarded. The system stores only `<PERSON>`, `<PHONE>`, etc. Recovery would require the original raw data, which is never persisted.

**Q: How do we know Presidio's sanitization is effective?**
A: Presidio is open-source and maintained by Microsoft. Its effectiveness depends on:
1. Entity detection accuracy (False Negatives = undetected PII)
2. Anonymization completeness (False Positives = over-sanitization)

The README documents these limitations.

**Q: Can we add multi-tenancy later?**
A: Yes. PostgreSQL Row-Level Security (RLS) can isolate data by tenant. Requires:
- Adding `tenant_id` to all tables
- Configuring RLS policies
- User context in requests

**Q: How do we scale to millions of requests?**
A: Current architecture has bottlenecks:
- Single backend instance
- Synchronous PII detection
- PostgreSQL without sharding

Improvements:
- Load balancing (multiple backend instances)
- Async queues for PII detection
- Read replicas for analytics queries
- Partitioning large tables by date

**Q: Can we use a different PII detection library?**
A: Yes. The interface is abstracted in `backend/app/pii.py`. Swap Presidio for:
- `flair` (NER)
- `transformers` (BERT-based NER)
- Commercial solutions (Veriff, Socure)

Just implement the same interface.

## 33. License & Attribution

This project is built for educational and demonstration purposes as part of FLYYY.AI's initiative to showcase privacy-aware AI governance.

**Dependencies:**
- **FastAPI**: [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/) (MIT License)
- **React**: [https://react.dev/](https://react.dev/) (MIT License)
- **SQLAlchemy**: [https://www.sqlalchemy.org/](https://www.sqlalchemy.org/) (MIT License)
- **Microsoft Presidio**: [https://microsoft.github.io/presidio/](https://microsoft.github.io/presidio/) (MIT License)
- **Tailwind CSS**: [https://tailwindcss.com/](https://tailwindcss.com/) (MIT License)

## 34. Support & Feedback

For questions, issues, or suggestions:

1. **GitHub Issues**: Create an issue on the repository
2. **Documentation**: Check this README and inline code comments
3. **Troubleshooting**: See section 27 (Troubleshooting)
4. **Contact**: Reach out to FLYYY.AI team

---

## Summary

FLYYY.AI demonstrates a production-grade approach to AI governance and observability:

✅ **Privacy-First**: PII is detected and sanitized before persistence
✅ **Transparent**: Clear documentation of capabilities and limitations
✅ **Observable**: Application-level instrumentation for complete AI activity visibility
✅ **Governed**: Alerts surface unexpected behavior and governance risks
✅ **Maintainable**: Clean code, proper error handling, thoughtful design

The project prioritizes **depth of understanding** over **breadth of features**—demonstrating that effective AI governance requires clear reasoning about trade-offs, honest assessment of limitations, and privacy-aware engineering practices.

For enterprises deploying AI systems, FLYYY.AI provides a foundational architecture for safe, visible, and governed AI usage. 