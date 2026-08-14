from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from sqlalchemy import text

from .database import engine
from .pii import sanitize_prompt
from .settings import PROMPT_MONITORING_ENABLED, RETENTION_DAYS


app = FastAPI(
    title="FLYYY.AI AI Usage Monitoring Platform",
    description="AI usage monitoring and governance backend",
    version="1.0.0",
)


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


@app.get("/api/assets")
def get_ai_assets():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT id, name, type, provider, model
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


@app.post("/api/monitoring/prompt")
def monitor_prompt(prompt: str):

    # Check whether prompt monitoring is enabled
    if not PROMPT_MONITORING_ENABLED:
        return {
            "monitoring_enabled": False,
            "message": "Prompt monitoring is disabled.",
        }

    # Detect and sanitize PII
    sanitized = sanitize_prompt(prompt)

    # Store ONLY the sanitized prompt
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
                "pii_counts": __import__("json").dumps(
                    sanitized["pii_counts"]
                ),
            },
        )

    return sanitized


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
            {"search": f"%{q}%"},
        )

        activities = [
            dict(row._mapping)
            for row in result
        ]

    return {
        "count": len(activities),
        "activities": activities,
    }


@app.get("/api/monitoring/activity")
def get_activity(days: int = 7):
    if days not in [1, 7, 30]:
        return {
            "error": "days must be 1, 7, or 30"
        }

    start_time = datetime.now(timezone.utc) - timedelta(days=days)

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
            {"start_time": start_time},
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


@app.get("/api/monitoring/metrics")
def get_metrics(days: int = 7):
    if days not in [1, 7, 30]:
        return {
            "error": "days must be 1, 7, or 30"
        }

    start_time = datetime.now(timezone.utc) - timedelta(days=days)

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    COUNT(*) AS total_requests,
                    COUNT(*) FILTER (WHERE pii_detected = TRUE) AS pii_requests
                FROM ai_activity
                WHERE created_at >= :start_time
            """),
            {"start_time": start_time},
        )

        row = result.fetchone()

    total_requests = row.total_requests
    pii_requests = row.pii_requests

    pii_rate = (
        round((pii_requests / total_requests) * 100, 2)
        if total_requests > 0
        else 0
    )

    return {
        "days": days,
        "total_requests": total_requests,
        "pii_requests": pii_requests,
        "pii_rate_percent": pii_rate,
    }
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
@app.get("/api/governance/alerts")
def get_governance_alerts():
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
@app.get("/api/monitoring/retention")
def get_retention():
    return {
        "retention_days": RETENTION_DAYS
    }
@app.delete("/api/monitoring/retention")
def apply_retention():
    cutoff_time = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM ai_activity
                WHERE created_at < :cutoff_time
            """),
            {"cutoff_time": cutoff_time},
        )

    return {
        "retention_days": RETENTION_DAYS,
        "deleted_records": result.rowcount,
    }