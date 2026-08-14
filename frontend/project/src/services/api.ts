// FLYYY.AI — FastAPI backend API client

import type {
  AiActivity,
  AiAsset,
  AgentRun,
  AgentRunResponse,
  AppConfig,
  ChatResponse,
  DashboardSummary,
  GovernanceAlert,
  OtelSpan,
  PiiEvent,
} from "@/types";


// ============================================================
// BACKEND URL
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


// ============================================================
// HELPERS
// ============================================================

function apiUrl(path: string): string {
  return `${API_BASE_URL}/api/${path.replace(/^\/+/, "")}`;
}


async function getJson<T>(path: string): Promise<T> {

  const response = await fetch(apiUrl(path));

  if (!response.ok) {

    const body = await response.json().catch(() => ({}));

    throw new Error(
      body?.error || `Request failed (${response.status})`
    );
  }

  return response.json() as Promise<T>;
}


async function postJson<T>(
  path: string,
  body?: unknown
): Promise<T> {

  const response = await fetch(apiUrl(path), {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body:
      body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  if (!response.ok) {

    const result = await response.json().catch(() => ({}));

    throw new Error(
      result?.error || `Request failed (${response.status})`
    );
  }

  return response.json() as Promise<T>;
}


async function putJson<T>(
  path: string,
  body?: unknown
): Promise<T> {

  const response = await fetch(apiUrl(path), {
    method: "PUT",

    headers: {
      "Content-Type": "application/json",
    },

    body:
      body !== undefined
        ? JSON.stringify(body)
        : undefined,
  });

  if (!response.ok) {

    const result = await response.json().catch(() => ({}));

    throw new Error(
      result?.error || `Request failed (${response.status})`
    );
  }

  return response.json() as Promise<T>;
}


async function deleteJson<T>(
  path: string
): Promise<T> {

  const response = await fetch(
    apiUrl(path),
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {

    const result = await response.json().catch(() => ({}));

    throw new Error(
      result?.error || `Request failed (${response.status})`
    );
  }

  return response.json() as Promise<T>;
}


// ============================================================
// API
// ============================================================

export const api = {

  // ==========================================================
  // HEALTH
  // ==========================================================

  health: () =>
    getJson<{
      status: string;
      service?: string;
    }>("health"),


  // ==========================================================
  // DASHBOARD
  // ==========================================================

  dashboardSummary: () =>
    getJson<DashboardSummary>(
      "dashboard/summary"
    ),


  // ==========================================================
  // AI ASSETS
  // ==========================================================

  aiAssets: () =>
    getJson<AiAsset[]>(
      "ai-assets"
    ),


  aiAsset: (id: string) =>
    getJson<AiAsset>(
      `ai-assets/${id}`
    ),


  // ==========================================================
  // ACTIVITY
  // ==========================================================

  activity: (
    params: Record<string, string> = {}
  ) => {

    const query =
      new URLSearchParams(params).toString();

    return getJson<AiActivity[]>(
      `activity${query ? `?${query}` : ""}`
    );
  },


  activityById: (id: string) =>
    getJson<AiActivity>(
      `activity/${id}`
    ),


  // ==========================================================
  // PII
  // ==========================================================

  piiEvents: () =>
    getJson<PiiEvent[]>(
      "pii/events"
    ),


  // ==========================================================
  // AGENT RUNS
  // ==========================================================

  agentRuns: () =>
    getJson<AgentRun[]>(
      "agent-runs"
    ),


  agentRun: (id: string) =>
    getJson<AgentRun>(
      `agent-runs/${id}`
    ),


  // ==========================================================
  // GOVERNANCE ALERTS
  // ==========================================================

  alerts: (status?: string) => {

    const query = status
      ? `?status=${encodeURIComponent(status)}`
      : "";

    return getJson<GovernanceAlert[]>(
      `governance/alerts${query}`
    );
  },


  // ==========================================================
  // OBSERVABILITY
  // ==========================================================

  spans: () =>
    getJson<OtelSpan[]>(
      "observability/spans"
    ),


  // ==========================================================
  // CONFIG
  // ==========================================================

  config: () =>
    getJson<AppConfig>(
      "config"
    ),


  updateMonitoring: (
    enabled: boolean
  ) =>
    putJson<AppConfig>(
      "config/monitoring",
      {
        prompt_monitoring_enabled:
          enabled,
      }
    ),


  updateRetention: (
    days: number
  ) =>
    putJson<AppConfig>(
      "config/retention",
      {
        retention_days:
          days,
      }
    ),


  applyRetention: () =>
    postJson<{
      retention_days: number;
      cutoff: string;
      deleted_count: number;
    }>(
      "config/retention/apply"
    ),


  // ==========================================================
  // MONITORING STATUS
  // ==========================================================

  monitoringStatus: () =>
    getJson<{
      monitoring_enabled: boolean;
    }>(
      "monitoring/status"
    ),


  setMonitoringStatus: (
    enabled: boolean
  ) =>
    postJson<{
      monitoring_enabled: boolean;
    }>(
      "monitoring/status",
      {
        enabled,
      }
    ),


  // ==========================================================
  // RETENTION
  // ==========================================================

  retention: () =>
    getJson<{
      retention_days: number;
    }>(
      "monitoring/retention"
    ),


  // ==========================================================
  // PROMPT MONITORING
  // ==========================================================

  monitorPrompt: (
    prompt: string
  ) =>
    postJson(
      "monitoring/prompt",
      {
        prompt,
      }
    ),


  // ==========================================================
  // SEARCH
  // ==========================================================

  searchPrompts: (
    query: string
  ) =>
    getJson(
      `monitoring/search?q=${encodeURIComponent(query)}`
    ),


  // ==========================================================
  // METRICS
  // ==========================================================

  metrics: (
    days: number = 7
  ) =>
    getJson(
      `monitoring/metrics?days=${days}`
    ),


  // ==========================================================
  // CHAT
  // ==========================================================

  chat: (
    prompt: string
  ) =>
    postJson<ChatResponse>(
      "chat",
      {
        prompt,
      }
    ),


  // ==========================================================
  // AGENT
  // ==========================================================

 runAgent: (
  accessOrders: boolean,
  query: string
): Promise<AgentRunResponse> =>
  postJson<AgentRunResponse>(
    "agent/run",
    {
      access_orders: accessOrders,
      query,
    }
  ),
};