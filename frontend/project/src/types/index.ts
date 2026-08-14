// FLYYY.AI — shared TypeScript types matching backend responses.

export interface AiAsset {
  id: string;
  name: string;
  type: "chatbot" | "agent";
  provider: string;
  model: string;
  description: string | null;
  status: "active" | "inactive";
  created_at: string;
}

export interface AiActivity {
  id: string;
  request_id: string;
  asset_id: string | null;
  provider: string;
  model: string;
  sanitized_prompt: string | null;
  pii_detected: boolean;
  pii_counts: Record<string, number>;
  prompt_monitoring_enabled: boolean;
  token_usage: Record<string, number> | null;
  tools_invoked: string[];
  duration_ms: number | null;
  status: "success" | "failed" | "partial";
  error_info: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  ai_assets?: { name: string } | null;
}

export interface PiiEvent {
  id: string;
  activity_id: string;
  asset_id: string | null;
  pii_type: string;
  count: number;
  created_at: string;
  ai_assets?: { name: string } | null;
  ai_activity?: { request_id: string; sanitized_prompt: string | null } | null;
}

export interface AgentRun {
  id: string;
  run_id: string;
  asset_id: string | null;
  status: "success" | "failed" | "partial";
  tools_invoked: string[];
  duration_ms: number | null;
  has_unexpected_access: boolean;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  ai_assets?: { name: string } | null;
  declared?: string[];
  observed?: string[];
  unexpected?: string[];
}

export interface GovernanceAlert {
  id: string;
  alert_id: string;
  type: "pii_detected" | "unexpected_data_access" | "failed_execution" | "config_change";
  severity: "low" | "medium" | "high" | "critical";
  asset_id: string | null;
  description: string;
  status: "open" | "acknowledged" | "resolved";
  related_id: string | null;
  created_at: string;
  resolved_at: string | null;
  ai_assets?: { name: string } | null;
}

export interface OtelSpan {
  id: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  activity_id: string | null;
  agent_run_id: string | null;
  span_name: string;
  span_kind: string;
  attributes: Record<string, unknown>;
  start_time: string;
  end_time: string | null;
  status_code: "unset" | "ok" | "error";
  status_message: string | null;
}

export interface DashboardSummary {
  total_requests: number;
  active_assets: number;
  pii_events: number;
  pii_affected_prompts: number;
  unexpected_data_access_events: number;
  failed_executions: number;
  pii_by_type: { pii_type: string; total: number }[];
  recent_activity: { created_at: string }[];
}

export interface AppConfig {
  prompt_monitoring_enabled: boolean;
  retention_days: number;
  ai_provider: string;
  ai_model: string;
  observability: string;
  updated_at: string | null;
}

export interface ChatResponse {
  request_id: string;
  sanitized_prompt: string | null;
  prompt_monitoring_enabled: boolean;
  pii_detected: boolean;
  pii_counts: Record<string, number>;
  response: string;
  provider: string;
  model: string;
  token_usage: Record<string, number> | null;
  duration_ms: number;
  status: string;
  trace_id: string;
}

export interface AgentRunResponse {
  run_id: string;
  trace_id: string;
  query: string;
  answer: string;
  orders_answer: string | null;
  tools_invoked: string[];
  duration_ms: number;
  status: string;
  declared: string[];
  observed: string[];
  unexpected: string[];
  has_unexpected_access: boolean;
}
