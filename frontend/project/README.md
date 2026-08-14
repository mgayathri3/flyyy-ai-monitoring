FLYYY.AI — AI Usage Monitoring & Governance Platform

Watching How AI Is Actually Used

FLYYY.AI is a privacy-aware AI usage monitoring and governance platform built to demonstrate how organizations can safely observe AI activity, detect and sanitize PII, monitor agent behavior, and surface governance risks.

The platform covers the complete flow:

AI Activity → Safe Capture → PII Protection → Observation → Analysis → Governance Insight

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

1. Problem Statement

Organizations may know which AI applications are approved but still lack visibility into how those systems are actually being used.

Important governance questions include:

Which AI asset was used?

Which provider and model were used?

What prompt was submitted?

Did the prompt contain PII?

Was PII removed before persistence?

What tools were invoked?

What data sources did an AI agent actually access?

What data sources was the agent expected to access?

Did observed behavior differ from declared behavior?

How long did the execution take?

Did the execution succeed or fail?

What governance risks were detected?

FLYYY.AI demonstrates a practical approach to answering these questions while avoiding storage of raw PII.

2. Solution Overview

The platform contains a React frontend and a Python/FastAPI backend connected to PostgreSQL.

The backend provides APIs for:

AI asset monitoring

Dashboard metrics

Prompt monitoring

PII detection and sanitization

Activity history

Agent execution monitoring

Governance alerts

Configuration

Retention

Observability

The frontend presents these capabilities through a dashboard with dedicated pages for each monitoring area.

3. Key Features

Dashboard

Provides an overview of AI activity including:

Total requests

Active AI assets

PII events

PII-affected prompts

Unexpected data-access events

Failed executions

PII distribution by type

Recent activity

Customer Support AI

A live demo interface where users can submit prompts.

Example:

Write a reminder email to Ramesh, phone 9840123456 about his insurance claim.

The system detects PII and returns a sanitized representation such as:

Write a reminder email to <NAME>, phone <PHONE> about his insurance claim.

AI Activity Monitoring

Displays:

Request ID

AI provider

Model

Sanitized prompt

PII detection status

PII counts

Duration

Status

Creation time

PII Monitoring

Displays PII events and aggregated PII information without exposing the original sensitive values.

Agent Monitoring

Demonstrates declared versus observed data-source access.

Example:

Declared:
  FAQ Database

Observed:
  FAQ Database
  Orders Database

Unexpected:
  Orders Database

Governance Alerts

Surfaces:

PII detected

Unexpected data access

Failed execution

Configuration changes

Observability

Displays OpenTelemetry-style traces and spans generated at important instrumentation points.

Settings

Provides controls for:

Prompt monitoring

Retention period

Retention purge

4. Architecture

┌────────────────────────────────────────────────────────────┐
│                    React Frontend                          │
│                 Vite + TypeScript                         │
│                                                            │
│ Dashboard · Assets · Activity · PII · Chat · Agent         │
│ Alerts · Observability · Settings                          │
└───────────────────────────┬────────────────────────────────┘
                            │
                            │ HTTP / JSON
                            ▼
┌────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                        │
│                         Python                             │
│                                                            │
│ Health · Dashboard · Assets · Activity · PII               │
│ Chat · Agent · Alerts · Config · Retention · Observability │
└───────────────────────────┬────────────────────────────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
      PII Detection   Agent Monitoring  Observability
      & Sanitization  Declared/Observed  Trace/Span Data
             │              │              │
             └──────────────┼──────────────┘
                            ▼
┌────────────────────────────────────────────────────────────┐
│                     PostgreSQL                             │
│                                                            │
│ ai_assets · ai_activity · pii_events · agent_runs          │
│ governance_alerts · otel_spans · configuration              │
│ data sources / demo data                                   │
└────────────────────────────────────────────────────────────┘

Design principle

Sensitive prompt content is processed before persistence.

The backend is the trust boundary. The frontend does not directly access the database.

5. AI Activity Data Flow

User enters prompt
        │
        ▼
React Frontend
        │
        ▼
FastAPI /api/chat or /api/monitoring/prompt
        │
        ▼
PII Detection
        │
        ├── PII found
        │      │
        │      ▼
        │   Sanitize
        │      │
        │      ▼
        │   <NAME>, <PHONE>, <EMAIL>, ...
        │
        ▼
AI / Demo Processing
        │
        ▼
Store monitoring metadata
        │
        ├── sanitized prompt
        ├── PII counts
        ├── provider
        ├── model
        ├── duration
        ├── status
        └── token usage when available
        │
        ▼
Dashboard / Activity / PII / Alerts

Privacy rule

The original raw prompt should never be persisted as the monitoring record.

Only the sanitized prompt and PII metadata are stored when prompt monitoring is enabled.

When prompt monitoring is disabled, prompt content is not stored while operational metadata can still be retained.

6. Technology Stack

Layer

Technology

Purpose

Frontend

React.js

User interface

Language

TypeScript

Frontend type safety

Build Tool

Vite

Frontend development/build

Styling

Tailwind CSS

UI styling

Backend

Python

Server-side implementation

API Framework

FastAPI

REST API

Database

PostgreSQL

Persistent relational storage

ORM/DB Access

SQLAlchemy

Database connectivity/query execution

API Client

Fetch API

Frontend/backend communication

Icons

lucide-react

UI icons

Observability

OpenTelemetry-style spans

AI activity tracing

PII Detection

Python sanitization logic

Detection and redaction

The implementation intentionally uses a lightweight application-level instrumentation approach rather than claiming network-level visibility that the application cannot reliably provide.

7. Project Structure

flyyy-ai-monitoring/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── pii.py
│   │   └── settings.py
│   │
│   └── .env
│
├── frontend/
│   └── project/
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── pages/
│       │   │   ├── ActivityPage.tsx
│       │   │   ├── AgentPage.tsx
│       │   │   ├── AlertsPage.tsx
│       │   │   ├── AssetsPage.tsx
│       │   │   ├── ChatPage.tsx
│       │   │   ├── DashboardPage.tsx
│       │   │   ├── ObservabilityPage.tsx
│       │   │   ├── PiiPage.tsx
│       │   │   └── SettingsPage.tsx
│       │   ├── services/
│       │   │   └── api.ts
│       │   ├── types/
│       │   │   └── index.ts
│       │   └── utils/
│       │
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── README.md
│
├── .gitignore
└── README.md

8. Setup Instructions

Prerequisites

Install:

Python 3.10+

Node.js 18+

npm

PostgreSQL

Verify:

python --version
node --version
npm --version
psql --version

Backend setup

From the repository root:

cd backend
python -m venv .venv

Activate the virtual environment on Windows:

.venv\Scripts\Activate.ps1

Install dependencies:

pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv

If the project contains a backend requirements file, use:

pip install -r requirements.txt

Frontend setup

Open another terminal:

cd frontend/project
npm install

9. Environment Variables

Backend

Create:

backend/.env

Example:

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/flyyy_ai

PROMPT_MONITORING_ENABLED=true
RETENTION_DAYS=30

AI_PROVIDER=demo
AI_MODEL=demo-support-v1

Use your actual PostgreSQL username, password, host, port, and database name.

Do not commit secrets to GitHub.

Frontend

The frontend API client uses:

VITE_API_URL

If it is not provided, the application defaults to:

http://127.0.0.1:8000

Example:

VITE_API_URL=http://127.0.0.1:8000

10. Database Setup

Create the PostgreSQL database:

CREATE DATABASE flyyy_ai;

The backend uses SQLAlchemy to connect to PostgreSQL.

The application expects monitoring-related tables such as:

ai_assets
ai_activity
pii_events
agent_runs
governance_alerts
otel_spans
monitoring_config / application configuration

The exact schema should match the SQL used by backend/app/main.py and the project's database setup.

Important

The backend should be started only after PostgreSQL is running and the required tables exist.

11. Running Locally

Start PostgreSQL

Make sure the PostgreSQL service is running.

Start backend

From the repository root:

cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

Backend:

http://127.0.0.1:8000

FastAPI Swagger documentation:

http://127.0.0.1:8000/docs

Health check:

http://127.0.0.1:8000/api/health

Start frontend

In another terminal:

cd frontend/project
npm run dev

Frontend:

http://localhost:5173

The frontend API client communicates with the FastAPI server at:

http://127.0.0.1:8000/api

12. Backend API

The current frontend communicates with the FastAPI backend using the following API groups.

Health

GET /api/health
GET /api/health/database

Dashboard

GET /api/dashboard/summary

AI Assets

GET /api/assets

Prompt Monitoring

POST /api/monitoring/prompt
GET  /api/monitoring/search
GET  /api/monitoring/activity
GET  /api/monitoring/metrics

Monitoring Status

GET  /api/monitoring/status
POST /api/monitoring/status

Retention

GET    /api/monitoring/retention
DELETE /api/monitoring/retention

Governance

GET /api/governance/alerts
GET /api/governance/unexpected-access

Chat

POST /api/chat

The chat endpoint powers the Customer Support AI page.

Agent

POST /api/agent/run
GET  /api/agent-runs
GET  /api/agent-runs/{id}

Configuration

The frontend configuration page uses configuration endpoints exposed by the backend.

Observability

GET /api/observability/spans

The exact request/response shape is defined in frontend/project/src/services/api.ts and frontend/project/src/types/index.ts.

13. Frontend Pages

Dashboard

Provides the overall monitoring summary.

Assets

Shows registered AI applications/agents.

Activity

Shows AI activity and sanitized prompt information.

PII

Shows detected PII types and counts.

Customer Support AI

Provides a live prompt interface for demonstrating PII detection.

Agent Monitoring

Allows the user to run the demo agent and compare:

Declared
Observed
Unexpected

Governance Alerts

Shows governance events and allows filtering by status.

Observability

Groups spans by trace and displays:

Trace ID

Span ID

Parent span

Span name

Span kind

Attributes

Status

Settings

Controls monitoring and retention configuration.

14. PII Detection and Sanitization

The monitoring pipeline follows:

Raw Prompt
   ↓
PII Detection
   ↓
Identify sensitive values
   ↓
Replace values with tokens
   ↓
Persist sanitized content only

Example:

Input:
"Call Ramesh at 9840123456 about his order."

Stored:
"Call <NAME> at <PHONE> about his order."

The PII metadata records the type and count rather than the original value.

Example:

{
  "PHONE": 1,
  "NAME": 1
}

15. PII Supported Types

The implementation supports the PII patterns implemented in backend/app/pii.py.

Typical supported categories include:

Type

Example

Stored

NAME

Ramesh

<NAME>

PHONE

9840123456

<PHONE>

EMAIL

jane@example.com

<EMAIL>

ADDRESS

123 Main St

<ADDRESS>

SSN

123-45-6789

<SSN>

CREDIT CARD

4111 1111 1111 1111

<CREDIT_CARD>

The exact patterns are implementation-dependent and should be reviewed in backend/app/pii.py.

16. Prompt Monitoring

Prompt monitoring can be enabled or disabled.

Enabled

The backend can store:

Sanitized prompt

PII detection status

PII counts

Provider

Model

Duration

Status

Token usage where available

Disabled

Prompt content is not stored.

Operational metadata can still be captured so that monitoring does not become completely blind when prompt-content storage is disabled.

The frontend exposes the monitoring state through the Settings page.

17. AI Agent Monitoring

The Agent Monitoring page demonstrates a governance scenario.

The demo agent declares:

FAQ Database

A normal execution observes:

FAQ Database

A test execution can also access:

Orders Database

The backend calculates:

unexpected = observed - declared

Example:

Declared:
  FAQ Database

Observed:
  FAQ Database
  Orders Database

Unexpected:
  Orders Database

The unexpected access is surfaced as a governance event.

This demonstrates why application-level instrumentation is important: a gateway observing only external AI-provider traffic cannot reliably see internal application data-source access.

18. Governance Alerts

The platform supports governance alert categories such as:

PII Detected
Unexpected Data Access
Failed Execution
Config Change

Alerts contain information such as:

Alert ID

Type

Severity

Related AI asset

Description

Status

Creation time

Resolution time where applicable

Alert statuses include:

open
acknowledged
resolved

19. Observability

FLYYY.AI uses an application-level, OpenTelemetry-style instrumentation model.

Important execution points can produce spans such as:

ai.chat
pii.detect
agent.run
datasource.access

A span can contain:

trace_id

span_id

parent_span_id

span_name

span_kind

attributes

start time

end time

status

Example:

Trace
 ├── ai.chat
 │    └── pii.detect
 │
 └── datasource.access

Why code instrumentation?

Code instrumentation can observe events that happen inside the application, including:

AI provider calls

model information

token usage

tool invocation

agent execution

database/data-source access

A simple network gateway cannot reliably observe all internal application behavior.

Important limitation

This project demonstrates OpenTelemetry-style instrumentation and persistence. It does not claim to provide provider-internal telemetry, GPU metrics, or network-level visibility that is unavailable from the application.

A production deployment could export spans through the OpenTelemetry SDK to an OTLP collector such as Jaeger, Honeycomb, or another compatible backend.

20. Retention

The platform supports configurable retention.

The retention configuration controls how long monitoring records are kept.

The retention workflow is:

Current time
     ↓
Current time - retention period
     ↓
Delete records older than cutoff

The Settings page exposes the retention configuration and purge operation.

Production improvement

The current demo uses an explicit purge action. A production system should use a scheduled background job or managed database scheduler.

21. Capability Matrix

The project evaluates AI observability at three levels.

Capability

No Code Change

Gateway

Code Instrumentation

AI provider

Not reliably observable

Observable

Observable

Model

Not reliably observable

Observable

Observable

Prompt

Not observable

Observable, but raw prompt privacy risk

Observable with sanitization

Token usage

Not observable

Usually observable from response

Observable

Tool calls

Not reliably observable

Partially observable

Observable at call site

Agent execution

Not reliably observable

Not reliably observable

Observable

Data-source access

Not observable

Not reliably observable

Observable inside application

No Code Change

Without instrumentation or a proxy, there is no reliable observation point.

Gateway

A gateway can observe HTTP traffic between the application and AI provider.

Advantages:

Provider visibility

Model visibility

Prompt visibility

Token usage when present in the response

Limitations:

Raw prompt may pass through the gateway

Internal tool calls may not be visible

Internal database/data-source access is not visible

Agent decisions are not reliably visible

Code Instrumentation

Application instrumentation provides the highest fidelity for this use case because events are captured where they actually occur.

It also allows PII sanitization before persistence.

22. Security and Privacy

The project follows several privacy principles.

Raw PII is not intended to be persisted

Prompt processing should sanitize sensitive values before the monitoring record is written.

Secrets stay on the backend

Database credentials and AI provider keys must never be placed in frontend source code.

No secrets in Git

Do not commit:

.env
database passwords
API keys
provider secrets

Use .env.example for safe configuration templates.

Backend as trust boundary

The frontend communicates with the backend API rather than directly writing sensitive monitoring records.

Input validation

The FastAPI backend validates request parameters and should reject invalid requests.

Error handling

Backend database/API operations should return meaningful HTTP errors instead of exposing sensitive internal information.

23. Testing

Run the frontend tests if the project test suite is configured:

cd frontend/project
npm test

Build the frontend to catch TypeScript/build issues:

npm run build

Run the backend and verify:

GET /api/health
GET /api/health/database

Then verify the main application flows:

Open Dashboard

Open Assets

Open Activity

Submit a prompt containing a phone number/email

Verify PII is detected

Verify sanitized text is displayed

Open PII page

Open Agent Monitoring

Run the agent without Orders access

Run it with Orders access enabled

Verify unexpected access is flagged

Open Governance Alerts

Open Observability

Open Settings

Toggle prompt monitoring

Test retention configuration

24. Assumptions

The application is currently a demonstration/prototype.

PostgreSQL is the primary relational database.

The frontend and backend run as separate local processes during development.

The backend is the main API and persistence boundary.

The agent monitoring workflow is designed to demonstrate declared-vs-observed access.

Demo AI responses may be deterministic when no external AI provider is configured.

Authentication and multi-tenancy are outside the current demo scope.

25. Limitations

PII detection

Regex/rule-based detection can have:

False positives

False negatives

Limited coverage of names

Limited support for unusual formats

Limited support for multilingual PII

A production system could use Microsoft Presidio, an NER model, or another dedicated PII detection framework.

Observability

The current implementation does not provide:

Provider-internal telemetry

GPU/memory metrics

Network packet-level visibility

Internal provider routing information

A full external OpenTelemetry collector pipeline

Agent

The demo agent is intended to demonstrate governance monitoring rather than a production autonomous agent architecture.

Authentication

Authentication and multi-tenant isolation are not the focus of the current prototype.

Retention

The purge operation is manually triggered rather than scheduled.

26. Deployment

Frontend

Build the React application:

cd frontend/project
npm install
npm run build

The production files are generated in:

dist/

The frontend can be deployed to a static hosting service such as Vercel, Netlify, Cloudflare Pages, or an equivalent platform.

Set:

VITE_API_URL=https://your-backend-domain

Backend

The FastAPI backend can be deployed using a Python-compatible hosting platform.

Production example:

uvicorn app.main:app --host 0.0.0.0 --port 8000

For production, use a managed PostgreSQL database and configure environment variables securely.

Do not expose database passwords or API keys in source code.

CORS

The backend should allow the deployed frontend origin.

For local development:

http://localhost:5173

For production, replace the development origin with the actual frontend domain.

27. Future Improvements

Potential production improvements include:

Microsoft Presidio or NER-based PII detection

Authentication and role-based access control

Multi-tenant data isolation

PostgreSQL Row-Level Security

Real OpenTelemetry SDK + OTLP collector

Jaeger/Honeycomb/Grafana integration

Scheduled retention jobs

Real LLM agent tool-calling

Streaming AI responses

Rate limiting

Audit logs for configuration changes

Real-time monitoring

Alert acknowledgement and resolution workflow

Better PII coverage for international identifiers

Automated CI/CD

Docker-based deployment

Production health/readiness checks

Structured application logging

Project Goal

FLYYY.AI is designed to demonstrate the complete governance lifecycle:

AI Activity
     ↓
Safe Capture
     ↓
PII Detection & Sanitization
     ↓
AI / Agent Execution
     ↓
Application-Level Observability
     ↓
Activity & Governance Analysis
     ↓
Alerts and Governance Insight

The key design principle is:

Observe AI activity without unnecessarily retaining sensitive information.

The project prioritizes privacy-aware monitoring, explainable governance signals, application-level observability, and clear documentation of technical limitations. 