from datetime import datetime, timedelta, timezone
import json

from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import engine
from .pii import sanitize_prompt
from .settings import PROMPT_MONITORING_ENABLED, RETENTION_DAYS


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="FLYYY.AI AI Usage Monitoring Platform",
    description="AI usage monitoring and governance backend",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://flyyy-ai-monitoring.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FLYYY.AI Backend",
    }


@app.get("/api/health/database")
def database_health_check():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        value = result.scalar()

    return {
        "status": "healthy",
        "database": "connected",
        "test": value,
    }


# ============================================================
# AI ASSETS
# ============================================================

# Existing/legacy endpoint
@app.get("/api/assets")
def get_ai_assets():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    name,
                    type,
                    provider,
                    model
                FROM ai_assets
                ORDER BY created_at
            """)
        )

        assets = [
            dict(row._mapping)
            for row in result
        ]

    return {
        "count": len(assets),
        "assets": assets,
    }


# Frontend-compatible endpoint
@app.get("/api/ai-assets")
def get_ai_assets_frontend():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    name,
                    type,
                    provider,
                    model,
                    description,
                    status,
                    created_at
                FROM ai_assets
                ORDER BY created_at
            """)
        )

        assets = [
            dict(row._mapping)
            for row in result
        ]

    return assets


# ============================================================
# DASHBOARD SUMMARY
# ============================================================

@app.get("/api/dashboard/summary")
def get_dashboard_summary():

    with engine.connect() as connection:

        # ----------------------------------------------------
        # Total AI requests
        # ----------------------------------------------------

        total_requests = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM ai_activity
            """)
        ).scalar() or 0

        # ----------------------------------------------------
        # Active AI assets
        # ----------------------------------------------------

        active_assets = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM ai_assets
                WHERE status = 'active'
            """)
        ).scalar() or 0

        # ----------------------------------------------------
        # PII events
        #
        # We calculate this from ai_activity because the current
        # chat endpoint stores PII information in ai_activity.
        # ----------------------------------------------------

        pii_events = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM ai_activity
                WHERE pii_detected = TRUE
            """)
        ).scalar() or 0

        # ----------------------------------------------------
        # PII affected prompts
        # ----------------------------------------------------

        pii_affected_prompts = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM ai_activity
                WHERE pii_detected = TRUE
            """)
        ).scalar() or 0

        # ----------------------------------------------------
        # Unexpected data access events
        # ----------------------------------------------------

        unexpected_data_access_events = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM governance_alerts
                WHERE type = 'unexpected_data_access'
            """)
        ).scalar() or 0

        # ----------------------------------------------------
        # Failed executions
        # ----------------------------------------------------

        failed_executions = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM ai_activity
                WHERE status = 'failed'
            """)
        ).scalar() or 0

        # ----------------------------------------------------
        # PII by type
        #
        # pii_counts is JSONB such as:
        # {"PERSON": 1, "PHONE_NUMBER": 1}
        #
        # PostgreSQL jsonb_each_text expands the values.
        # ----------------------------------------------------

        pii_by_type_result = connection.execute(
            text("""
                SELECT
                    key AS pii_type,
                    SUM(value::int) AS total
                FROM ai_activity,
                     jsonb_each_text(pii_counts)
                WHERE pii_detected = TRUE
                GROUP BY key
                ORDER BY total DESC
            """)
        )

        pii_by_type = [
            {
                "pii_type": row.pii_type,
                "total": int(row.total or 0),
            }
            for row in pii_by_type_result
        ]

        # ----------------------------------------------------
        # Recent activity
        # ----------------------------------------------------

        recent_result = connection.execute(
            text("""
                SELECT
                    created_at
                FROM ai_activity
                ORDER BY created_at DESC
                LIMIT 10
            """)
        )

        recent_activity = [
            {
                "created_at": row.created_at
            }
            for row in recent_result
        ]

    return {
        "total_requests": int(total_requests),
        "active_assets": int(active_assets),
        "pii_events": int(pii_events),
        "pii_affected_prompts": int(pii_affected_prompts),
        "unexpected_data_access_events": int(
            unexpected_data_access_events
        ),
        "failed_executions": int(failed_executions),
        "pii_by_type": pii_by_type,
        "recent_activity": recent_activity,
    }


# ============================================================
# APPLICATION CONFIG
# ============================================================

@app.get("/api/config")
def get_config():

    return {
        "prompt_monitoring_enabled": PROMPT_MONITORING_ENABLED,
        "retention_days": RETENTION_DAYS,
        "ai_provider": "demo",
        "ai_model": "demo-support-v1",
        "observability": "OpenTelemetry",
        "updated_at": None,
    }


# ============================================================
# UPDATE MONITORING CONFIG
# ============================================================

@app.put("/api/config/monitoring")
def update_monitoring_config(payload: dict = Body(...)):
    global PROMPT_MONITORING_ENABLED

    enabled = payload.get("prompt_monitoring_enabled")

    if enabled is None:
        return {
            "error": "prompt_monitoring_enabled is required"
        }

    PROMPT_MONITORING_ENABLED = bool(enabled)

    return {
        "prompt_monitoring_enabled": PROMPT_MONITORING_ENABLED,
        "retention_days": RETENTION_DAYS,
        "ai_provider": "demo",
        "ai_model": "demo-support-v1",
        "observability": "OpenTelemetry",
        "updated_at": None,
    }


# ============================================================
# UPDATE RETENTION CONFIG
# ============================================================

@app.put("/api/config/retention")
def update_retention_config(payload: dict = Body(...)):
    global RETENTION_DAYS

    days = payload.get("retention_days")

    if days is None:
        return {
            "error": "retention_days is required"
        }

    try:
        days = int(days)
    except (TypeError, ValueError):
        return {
            "error": "retention_days must be a number"
        }

    if days <= 0:
        return {
            "error": "Retention days must be greater than 0"
        }

    RETENTION_DAYS = days

    return {
        "prompt_monitoring_enabled": PROMPT_MONITORING_ENABLED,
        "retention_days": RETENTION_DAYS,
        "ai_provider": "demo",
        "ai_model": "demo-support-v1",
        "observability": "OpenTelemetry",
        "updated_at": None,
    }


# ============================================================
# PROMPT MONITORING
# ============================================================

@app.post("/api/monitoring/prompt")
def monitor_prompt(prompt: str):

    if not PROMPT_MONITORING_ENABLED:
        return {
            "monitoring_enabled": False,
            "message": "Prompt monitoring is disabled.",
        }

    sanitized = sanitize_prompt(prompt)

    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO ai_activity (
                    request_id,
                    provider,
                    model,
                    sanitized_prompt,
                    pii_detected,
                    pii_counts
                )
                VALUES (
                    gen_random_uuid()::text,
                    'demo',
                    'demo-support-v1',
                    :sanitized_prompt,
                    :pii_detected,
                    CAST(:pii_counts AS jsonb)
                )
            """),
            {
                "sanitized_prompt": sanitized["sanitized_prompt"],
                "pii_detected": bool(sanitized["pii_counts"]),
                "pii_counts": json.dumps(
                    sanitized["pii_counts"]
                ),
            },
        )

    return sanitized


# ============================================================
# SEARCH PROMPTS
# ============================================================

@app.get("/api/monitoring/search")
def search_prompts(q: str):

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    request_id,
                    provider,
                    model,
                    sanitized_prompt,
                    pii_detected,
                    pii_counts,
                    created_at
                FROM ai_activity
                WHERE sanitized_prompt ILIKE :search
                ORDER BY created_at DESC
            """),
            {
                "search": f"%{q}%"
            },
        )

        activities = [
            dict(row._mapping)
            for row in result
        ]

    return {
        "count": len(activities),
        "activities": activities,
    }
@app.get("/api/pii/events")
def get_pii_events():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    activity_id,
                    asset_id,
                    pii_type,
                    count,
                    created_at
                FROM pii_events
                ORDER BY created_at DESC
            """)
        )

        events = [
            dict(row._mapping)
            for row in result
        ]

    return events
@app.get("/api/agent-runs")
def get_agent_runs():
    """
    Return recent agent runs for the Agent Monitoring page.

    The frontend expects the related AI asset name as:
        ai_assets: { "name": "Customer Support Agent" }
    """
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    ar.id,
                    ar.run_id,
                    ar.asset_id,
                    ar.status,
                    ar.tools_invoked,
                    ar.duration_ms,
                    ar.has_unexpected_access,
                    ar.started_at,
                    ar.completed_at,
                    ar.created_at,
                    aa.name AS asset_name
                FROM agent_runs ar
                LEFT JOIN ai_assets aa
                    ON aa.id = ar.asset_id
                ORDER BY ar.created_at DESC
                LIMIT 100
            """)
        )

        runs = []
        for row in result:
            item = dict(row._mapping)
            asset_name = item.pop("asset_name", None)
            item["ai_assets"] = {"name": asset_name} if asset_name else None
            runs.append(item)

    return runs


@app.get("/api/agent-runs/{run_uuid}")
def get_agent_run(run_uuid: str):
    """
    Return one agent run together with its declared, observed,
    and unexpected data sources.
    """
    with engine.connect() as connection:
        run_result = connection.execute(
            text("""
                SELECT
                    ar.id,
                    ar.run_id,
                    ar.asset_id,
                    ar.status,
                    ar.tools_invoked,
                    ar.duration_ms,
                    ar.has_unexpected_access,
                    ar.started_at,
                    ar.completed_at,
                    ar.created_at,
                    aa.name AS asset_name
                FROM agent_runs ar
                LEFT JOIN ai_assets aa
                    ON aa.id = ar.asset_id
                WHERE ar.id = CAST(:run_uuid AS uuid)
            """),
            {"run_uuid": run_uuid},
        )

        row = run_result.fetchone()

        if not row:
            return {"error": "Agent run not found"}

        run = dict(row._mapping)
        asset_name = run.pop("asset_name", None)
        run["ai_assets"] = {"name": asset_name} if asset_name else None

        ds_result = connection.execute(
            text("""
                SELECT
                    ars.access_type,
                    ds.name
                FROM agent_run_data_sources ars
                JOIN data_sources ds
                    ON ds.id = ars.data_source_id
                WHERE ars.run_id = CAST(:run_uuid AS uuid)
                ORDER BY ds.name
            """),
            {"run_uuid": run_uuid},
        )

        declared = []
        observed = []

        for ds_row in ds_result:
            if ds_row.access_type == "declared":
                declared.append(ds_row.name)
            elif ds_row.access_type == "observed":
                observed.append(ds_row.name)

    unexpected = [
        source for source in observed
        if source not in declared
    ]

    run["declared"] = declared
    run["observed"] = observed
    run["unexpected"] = unexpected
    run["has_unexpected_access"] = bool(unexpected)

    return run


@app.post("/api/agent/run")
def run_agent(payload: dict = Body(default={})):
    """
    Demo Customer Support Agent.

    The agent declares the FAQ Database as its allowed source.
    If access_orders=true, the demo also reads the Orders Database.
    That access is intentionally unexpected and is recorded as a
    governance alert.
    """
    access_orders = bool(payload.get("access_orders", False))
    user_query = payload.get(
        "query",
        "What is your return policy?"
    )

    if not isinstance(user_query, str) or not user_query.strip():
        user_query = "What is your return policy?"

    started_at = datetime.now(timezone.utc)

    # ------------------------------------------------------------
    # Get demo asset + data-source IDs
    # ------------------------------------------------------------
    with engine.connect() as connection:
        asset_row = connection.execute(
            text("""
                SELECT id
                FROM ai_assets
                WHERE name = 'Customer Support Agent'
                LIMIT 1
            """)
        ).fetchone()

        faq_row = connection.execute(
            text("""
                SELECT id
                FROM data_sources
                WHERE name = 'FAQ Database'
                LIMIT 1
            """)
        ).fetchone()

        orders_row = connection.execute(
            text("""
                SELECT id
                FROM data_sources
                WHERE name = 'Orders Database'
                LIMIT 1
            """)
        ).fetchone()

    if not asset_row:
        return {"error": "Customer Support Agent asset not found"}

    if not faq_row:
        return {"error": "FAQ Database data source not found"}

    agent_asset_id = str(asset_row.id)
    faq_source_id = str(faq_row.id)
    orders_source_id = str(orders_row.id) if orders_row else None

    # ------------------------------------------------------------
    # Simulate FAQ tool
    # ------------------------------------------------------------
    lower_query = user_query.lower()

    if "return" in lower_query:
        answer = (
            "You can return any item within 30 days of purchase "
            "for a full refund. (DEMO FAQ)"
        )
    elif "shipping" in lower_query or "delivery" in lower_query:
        answer = (
            "Standard shipping takes 3-5 business days. "
            "(DEMO FAQ)"
        )
    elif "international" in lower_query:
        answer = (
            "Yes, we ship to over 40 countries. (DEMO FAQ)"
        )
    else:
        answer = (
            "Based on our FAQ, please contact customer support "
            "for more details. (DEMO)"
        )

    # ------------------------------------------------------------
    # Simulate optional Orders Database access
    # ------------------------------------------------------------
    orders_answer = None

    if access_orders:
        with engine.connect() as connection:
            order_row = connection.execute(
                text("""
                    SELECT order_number, status
                    FROM orders
                    ORDER BY created_at
                    LIMIT 1
                """)
            ).fetchone()

        if order_row:
            orders_answer = (
                f"Order {order_row.order_number} "
                f"is {order_row.status}."
            )

    # ------------------------------------------------------------
    # Declared vs observed sources
    # ------------------------------------------------------------
    declared = ["FAQ Database"]
    observed = ["FAQ Database"]

    if access_orders and orders_source_id:
        observed.append("Orders Database")

    unexpected = [
        source
        for source in observed
        if source not in declared
    ]

    has_unexpected = bool(unexpected)

    tools = ["faq_search"]
    if access_orders:
        tools.append("orders_query")

    completed_at = datetime.now(timezone.utc)
    duration_ms = max(
        1,
        int(
            (completed_at - started_at).total_seconds() * 1000
        )
    )

    run_id = (
        f"RUN-{int(completed_at.timestamp() * 1000)}"
    )
    trace_id = f"tr-{run_id}"

    # PostgreSQL text[] literal.
    tools_array = (
        "{" + ",".join(tools) + "}"
    )

    # ------------------------------------------------------------
    # Persist run + data-source observations
    # ------------------------------------------------------------
    with engine.begin() as connection:
        run_insert = connection.execute(
            text("""
                INSERT INTO agent_runs (
                    run_id,
                    asset_id,
                    status,
                    tools_invoked,
                    duration_ms,
                    has_unexpected_access,
                    started_at,
                    completed_at
                )
                VALUES (
                    :run_id,
                    CAST(:asset_id AS uuid),
                    'success',
                    CAST(:tools_invoked AS text[]),
                    :duration_ms,
                    :has_unexpected_access,
                    :started_at,
                    :completed_at
                )
                RETURNING id
            """),
            {
                "run_id": run_id,
                "asset_id": agent_asset_id,
                "tools_invoked": tools_array,
                "duration_ms": duration_ms,
                "has_unexpected_access": has_unexpected,
                "started_at": started_at,
                "completed_at": completed_at,
            },
        )

        run_db_id = run_insert.scalar()

        # FAQ is always declared and observed.
        connection.execute(
            text("""
                INSERT INTO agent_run_data_sources (
                    run_id,
                    data_source_id,
                    access_type
                )
                VALUES
                    (
                        :run_id,
                        CAST(:faq_source_id AS uuid),
                        'declared'
                    ),
                    (
                        :run_id,
                        CAST(:faq_source_id AS uuid),
                        'observed'
                    )
                ON CONFLICT DO NOTHING
            """),
            {
                "run_id": run_db_id,
                "faq_source_id": faq_source_id,
            },
        )

        # Orders is observed only when the toggle is enabled.
        if access_orders and orders_source_id:
            connection.execute(
                text("""
                    INSERT INTO agent_run_data_sources (
                        run_id,
                        data_source_id,
                        access_type
                    )
                    VALUES (
                        :run_id,
                        CAST(:orders_source_id AS uuid),
                        'observed'
                    )
                    ON CONFLICT DO NOTHING
                """),
                {
                    "run_id": run_db_id,
                    "orders_source_id": orders_source_id,
                },
            )

        # --------------------------------------------------------
        # Governance alert for unexpected access
        # --------------------------------------------------------
        if has_unexpected:
            connection.execute(
                text("""
                    INSERT INTO governance_alerts (
                        alert_id,
                        type,
                        severity,
                        asset_id,
                        description,
                        status,
                        related_id
                    )
                    VALUES (
                        :alert_id,
                        'unexpected_data_access',
                        'high',
                        CAST(:asset_id AS uuid),
                        :description,
                        'open',
                        :run_id
                    )
                """),
                {
                    "alert_id": f"ALR-{int(completed_at.timestamp() * 1000)}",
                    "asset_id": agent_asset_id,
                    "description": (
                        "Unexpected data source access: "
                        "Orders Database was accessed but not "
                        f"declared for {run_id}."
                    ),
                    "run_id": run_db_id,
                },
            )

        # --------------------------------------------------------
        # OpenTelemetry-style spans
        # --------------------------------------------------------
        connection.execute(
            text("""
                INSERT INTO otel_spans (
                    trace_id,
                    span_id,
                    agent_run_id,
                    span_name,
                    span_kind,
                    attributes,
                    start_time,
                    end_time,
                    status_code
                )
                VALUES (
                    :trace_id,
                    :span_id,
                    :run_id,
                    'agent.run',
                    'internal',
                    CAST(:attributes AS jsonb),
                    :start_time,
                    :end_time,
                    'ok'
                )
            """),
            {
                "trace_id": trace_id,
                "span_id": f"{trace_id}-a",
                "run_id": run_db_id,
                "attributes": json.dumps({
                    "run_id": run_id,
                    "asset": "Customer Support Agent",
                }),
                "start_time": started_at,
                "end_time": completed_at,
            },
        )

        connection.execute(
            text("""
                INSERT INTO otel_spans (
                    trace_id,
                    span_id,
                    parent_span_id,
                    agent_run_id,
                    span_name,
                    span_kind,
                    attributes,
                    start_time,
                    end_time,
                    status_code
                )
                VALUES (
                    :trace_id,
                    :span_id,
                    :parent_span_id,
                    :run_id,
                    'datasource.access',
                    'internal',
                    CAST(:attributes AS jsonb),
                    :start_time,
                    :end_time,
                    'ok'
                )
            """),
            {
                "trace_id": trace_id,
                "span_id": f"{trace_id}-b",
                "parent_span_id": f"{trace_id}-a",
                "run_id": run_db_id,
                "attributes": json.dumps({
                    "source": "FAQ Database",
                    "access_type": "observed",
                }),
                "start_time": started_at,
                "end_time": completed_at,
            },
        )

        if access_orders and orders_source_id:
            connection.execute(
                text("""
                    INSERT INTO otel_spans (
                        trace_id,
                        span_id,
                        parent_span_id,
                        agent_run_id,
                        span_name,
                        span_kind,
                        attributes,
                        start_time,
                        end_time,
                        status_code
                    )
                    VALUES (
                        :trace_id,
                        :span_id,
                        :parent_span_id,
                        :run_id,
                        'datasource.access',
                        'internal',
                        CAST(:attributes AS jsonb),
                        :start_time,
                        :end_time,
                        'ok'
                    )
                """),
                {
                    "trace_id": trace_id,
                    "span_id": f"{trace_id}-c",
                    "parent_span_id": f"{trace_id}-a",
                    "run_id": run_db_id,
                    "attributes": json.dumps({
                        "source": "Orders Database",
                        "access_type": "observed",
                        "unexpected": True,
                    }),
                    "start_time": started_at,
                    "end_time": completed_at,
                },
            )

    return {
        "run_id": run_id,
        "trace_id": trace_id,
        "query": user_query,
        "answer": answer,
        "orders_answer": orders_answer,
        "tools_invoked": tools,
        "duration_ms": duration_ms,
        "status": "success",
        "declared": declared,
        "observed": observed,
        "unexpected": unexpected,
        "has_unexpected_access": has_unexpected,
    }
# ============================================================
# OBSERVABILITY
# ============================================================

@app.get("/api/observability/spans")
def get_observability_spans():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    trace_id,
                    span_id,
                    parent_span_id,
                    activity_id,
                    agent_run_id,
                    span_name,
                    span_kind,
                    attributes,
                    start_time,
                    end_time,
                    status_code,
                    status_message
                FROM otel_spans
                ORDER BY start_time DESC
            """)
        )

        spans = [
            dict(row._mapping)
            for row in result
        ]

    return spans


# ============================================================
# ACTIVITY
# ============================================================

@app.get("/api/monitoring/activity")
def get_activity(days: int = 7):

    if days not in [1, 7, 30]:
        return {
            "error": "days must be 1, 7, or 30"
        }

    start_time = (
        datetime.now(timezone.utc)
        - timedelta(days=days)
    )

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    request_id,
                    provider,
                    model,
                    sanitized_prompt,
                    pii_detected,
                    pii_counts,
                    created_at
                FROM ai_activity
                WHERE created_at >= :start_time
                ORDER BY created_at DESC
            """),
            {
                "start_time": start_time
            },
        )

        activities = [
            dict(row._mapping)
            for row in result
        ]

    return {
        "days": days,
        "count": len(activities),
        "activities": activities,
    }


# ============================================================
# FRONTEND-COMPATIBLE ACTIVITY
# ============================================================

@app.get("/api/activity")
def get_activity_frontend(days: int = 7):

    if days not in [1, 7, 30]:
        days = 7

    start_time = (
        datetime.now(timezone.utc)
        - timedelta(days=days)
    )

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    request_id,
                    asset_id,
                    provider,
                    model,
                    sanitized_prompt,
                    pii_detected,
                    pii_counts,
                    prompt_monitoring_enabled,
                    token_usage,
                    tools_invoked,
                    duration_ms,
                    status,
                    error_info,
                    started_at,
                    completed_at,
                    created_at
                FROM ai_activity
                WHERE created_at >= :start_time
                ORDER BY created_at DESC
            """),
            {
                "start_time": start_time
            },
        )

        activities = [
            dict(row._mapping)
            for row in result
        ]

    return activities


# ============================================================
# METRICS
# ============================================================

@app.get("/api/monitoring/metrics")
def get_metrics(days: int = 7):

    if days not in [1, 7, 30]:
        return {
            "error": "days must be 1, 7, or 30"
        }

    start_time = (
        datetime.now(timezone.utc)
        - timedelta(days=days)
    )

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    COUNT(*) AS total_requests,
                    COUNT(*) FILTER (
                        WHERE pii_detected = TRUE
                    ) AS pii_requests
                FROM ai_activity
                WHERE created_at >= :start_time
            """),
            {
                "start_time": start_time
            },
        )

        row = result.fetchone()

    total_requests = row.total_requests
    pii_requests = row.pii_requests

    pii_rate = (
        round(
            (pii_requests / total_requests) * 100,
            2
        )
        if total_requests > 0
        else 0
    )

    return {
        "days": days,
        "total_requests": total_requests,
        "pii_requests": pii_requests,
        "pii_rate_percent": pii_rate,
    }


# ============================================================
# MONITORING STATUS
# ============================================================

@app.get("/api/monitoring/status")
def get_monitoring_status():

    return {
        "monitoring_enabled": PROMPT_MONITORING_ENABLED
    }


@app.post("/api/monitoring/status")
def set_monitoring_status(enabled: bool):

    global PROMPT_MONITORING_ENABLED

    PROMPT_MONITORING_ENABLED = enabled

    return {
        "monitoring_enabled": PROMPT_MONITORING_ENABLED
    }


# ============================================================
# GOVERNANCE ALERTS
# ============================================================

# ============================================================
# GOVERNANCE ALERTS
# ============================================================

@app.get("/api/governance/alerts")
def get_governance_alerts(status: str | None = None):

    with engine.connect() as connection:

        if status:
            result = connection.execute(
                text("""
                    SELECT
                        id,
                        alert_id,
                        type,
                        severity,
                        asset_id,
                        description,
                        status,
                        related_id,
                        created_at,
                        resolved_at
                    FROM governance_alerts
                    WHERE status = :status
                    ORDER BY created_at DESC
                """),
                {
                    "status": status
                }
            )
        else:
            result = connection.execute(
                text("""
                    SELECT
                        id,
                        alert_id,
                        type,
                        severity,
                        asset_id,
                        description,
                        status,
                        related_id,
                        created_at,
                        resolved_at
                    FROM governance_alerts
                    ORDER BY created_at DESC
                """)
            )

        alerts = [
            dict(row._mapping)
            for row in result
        ]

    return alerts


# ============================================================
# UNEXPECTED DATA ACCESS
# ============================================================

@app.get("/api/governance/unexpected-access")
def get_unexpected_access():

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    alert_id,
                    type,
                    severity,
                    asset_id
                FROM governance_alerts
                WHERE type = 'unexpected_data_access'
                ORDER BY alert_id
            """)
        )

        alerts = [
            dict(row._mapping)
            for row in result
        ]

    return {
        "count": len(alerts),
        "alerts": alerts,
    }


# ============================================================
# RETENTION
# ============================================================

@app.get("/api/monitoring/retention")
def get_retention():

    return {
        "retention_days": RETENTION_DAYS
    }


@app.delete("/api/monitoring/retention")
def apply_retention():

    cutoff_time = (
        datetime.now(timezone.utc)
        - timedelta(days=RETENTION_DAYS)
    )

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM ai_activity
                WHERE created_at < :cutoff_time
            """),
            {
                "cutoff_time": cutoff_time
            },
        )

    return {
        "retention_days": RETENTION_DAYS,
        "deleted_records": result.rowcount,
    }


# ============================================================
# FRONTEND RETENTION APPLY
# ============================================================

@app.post("/api/config/retention/apply")
def apply_retention_frontend():

    cutoff_time = (
        datetime.now(timezone.utc)
        - timedelta(days=RETENTION_DAYS)
    )

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM ai_activity
                WHERE created_at < :cutoff_time
            """),
            {
                "cutoff_time": cutoff_time
            },
        )

    return {
        "retention_days": RETENTION_DAYS,
        "cutoff": cutoff_time.isoformat(),
        "deleted_count": result.rowcount,
    }


# ============================================================
# CUSTOMER SUPPORT CHAT
# ============================================================

@app.post("/api/chat")
def chat(prompt: str = Body(..., embed=True)):

    request_id = (
        f"chat-{datetime.now(timezone.utc).timestamp()}"
    )

    # --------------------------------------------------------
    # Check monitoring
    # --------------------------------------------------------

    if not PROMPT_MONITORING_ENABLED:

        return {
            "request_id": request_id,
            "sanitized_prompt": prompt,
            "prompt_monitoring_enabled": False,
            "pii_detected": False,
            "pii_counts": {},
            "response": (
                "Customer Support AI is available. "
                "Please ask about returns, shipping, "
                "or order status."
            ),
            "provider": "demo",
            "model": "demo-support-v1",
            "token_usage": None,
            "duration_ms": 0,
            "status": "success",
            "trace_id": request_id,
        }

    # --------------------------------------------------------
    # Detect and sanitize PII
    # --------------------------------------------------------

    sanitized = sanitize_prompt(prompt)

    sanitized_prompt = sanitized["sanitized_prompt"]
    pii_counts = sanitized["pii_counts"]
    pii_detected = bool(pii_counts)

    # --------------------------------------------------------
    # Store sanitized prompt ONLY
    # --------------------------------------------------------

    with engine.begin() as connection:

        connection.execute(
            text("""
                INSERT INTO ai_activity (
                    request_id,
                    provider,
                    model,
                    sanitized_prompt,
                    pii_detected,
                    pii_counts,
                    status
                )
                VALUES (
                    :request_id,
                    'demo',
                    'demo-support-v1',
                    :sanitized_prompt,
                    :pii_detected,
                    CAST(:pii_counts AS jsonb),
                    'success'
                )
            """),
            {
                "request_id": request_id,
                "sanitized_prompt": sanitized_prompt,
                "pii_detected": pii_detected,
                "pii_counts": json.dumps(pii_counts),
            },
        )

    # --------------------------------------------------------
    # Demo AI response
    # --------------------------------------------------------

    lower_prompt = prompt.lower()

    if "return" in lower_prompt:

        response = (
            "Sure! I can help with returns. "
            "Please provide your order number and "
            "I can guide you through the return process."
        )

    elif (
        "shipping" in lower_prompt
        or "delivery" in lower_prompt
    ):

        response = (
            "I can help with shipping and delivery. "
            "Please provide your order number to check "
            "the latest delivery information."
        )

    elif (
        "order" in lower_prompt
        or "status" in lower_prompt
    ):

        response = (
            "I can help you check your order status. "
            "Please provide your order number."
        )

    elif (
        "insurance" in lower_prompt
        or "claim" in lower_prompt
    ):

        response = (
            "I can help with general information about "
            "insurance claims. Please provide your claim "
            "reference number."
        )

    else:

        response = (
            "Thanks for contacting Customer Support AI. "
            "I can help with returns, shipping, delivery, "
            "and order status."
        )

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "request_id": request_id,
        "sanitized_prompt": sanitized_prompt,
        "prompt_monitoring_enabled": True,
        "pii_detected": pii_detected,
        "pii_counts": pii_counts,
        "response": response,
        "provider": "demo",
        "model": "demo-support-v1",
        "token_usage": None,
        "duration_ms": 0,
        "status": "success",
        "trace_id": request_id,
    }