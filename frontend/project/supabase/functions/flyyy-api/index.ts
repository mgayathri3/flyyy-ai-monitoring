// FLYYY.AI API edge function — all read endpoints + config updates + retention.
// Uses Hono-style routing via URL pathname matching (no extra dep).
//
// Routes:
//   GET  /health
//   GET  /dashboard/summary
//   GET  /ai-assets
//   GET  /ai-assets/:id
//   GET  /activity
//   GET  /activity/:id
//   GET  /pii/events
//   GET  /agent-runs
//   GET  /agent-runs/:id
//   GET  /governance/alerts
//   GET  /config
//   PUT  /config/monitoring      { prompt_monitoring_enabled: boolean }
//   PUT  /config/retention        { retention_days: integer }
//   POST /config/retention/apply  (deletes records older than retention period)

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function sb() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  const u = new URL(req.url);
  const path = u.pathname.replace(/^\/(?:functions\/v1\/)?flyyy-api\/?/, "").replace(/^\/+|\/+$/g, "");
  const segments = path.split("/").filter(Boolean);
  const method = req.method;

  try {
    const client = sb();

    // GET /health
    if (method === "GET" && segments[0] === "health") {
      return json({ status: "ok", service: "flyyy-api", time: new Date().toISOString() });
    }

    // GET /dashboard/summary
    if (method === "GET" && segments[0] === "dashboard" && segments[1] === "summary") {
      const [{ count: totalRequests }, { count: activeAssets }, { count: piiEvents }, { count: piiPrompts }, { count: unexpectedRuns }, { count: failedExecs }] = await Promise.all([
        client.from("ai_activity").select("*", { count: "exact", head: true }),
        client.from("ai_assets").select("*", { count: "exact", head: true }).eq("status", "active"),
        client.from("pii_events").select("*", { count: "exact", head: true }),
        client.from("ai_activity").select("*", { count: "exact", head: true }).eq("pii_detected", true),
        client.from("agent_runs").select("*", { count: "exact", head: true }).eq("has_unexpected_access", true),
        client.from("ai_activity").select("*", { count: "exact", head: true }).eq("status", "failed"),
      ]);
      // PII by type
      const { data: piiByType } = await client.rpc("pii_counts_by_type");
      // recent activity trend (last 7 days counts)
      const { data: recent } = await client.from("ai_activity").select("created_at").gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()).order("created_at", { ascending: true });
      return json({
        total_requests: totalRequests ?? 0,
        active_assets: activeAssets ?? 0,
        pii_events: piiEvents ?? 0,
        pii_affected_prompts: piiPrompts ?? 0,
        unexpected_data_access_events: unexpectedRuns ?? 0,
        failed_executions: failedExecs ?? 0,
        pii_by_type: piiByType ?? [],
        recent_activity: recent ?? [],
      });
    }

    // GET /ai-assets
    if (method === "GET" && segments[0] === "ai-assets" && !segments[1]) {
      const { data, error } = await client.from("ai_assets").select("*").order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }
    // GET /ai-assets/:id
    if (method === "GET" && segments[0] === "ai-assets" && segments[1]) {
      const { data, error } = await client.from("ai_assets").select("*").eq("id", segments[1]).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "not found" }, 404);
      return json(data);
    }

    // GET /activity  (filters via query: asset_id, status, pii_detected, provider, model, from, to, q)
    if (method === "GET" && segments[0] === "activity" && !segments[1]) {
      let q = client.from("ai_activity").select("*, ai_assets!inner(name)").order("created_at", { ascending: false }).limit(200);
      const asset_id = u.searchParams.get("asset_id"); if (asset_id) q = q.eq("asset_id", asset_id);
      const status = u.searchParams.get("status"); if (status) q = q.eq("status", status);
      const pii = u.searchParams.get("pii_detected"); if (pii !== null) q = q.eq("pii_detected", pii === "true");
      const provider = u.searchParams.get("provider"); if (provider) q = q.eq("provider", provider);
      const model = u.searchParams.get("model"); if (model) q = q.eq("model", model);
      const from = u.searchParams.get("from"); if (from) q = q.gte("created_at", from);
      const to = u.searchParams.get("to"); if (to) q = q.lte("created_at", to);
      const search = u.searchParams.get("q"); if (search) q = q.ilike("sanitized_prompt", `%${search}%`);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }
    // GET /activity/:id
    if (method === "GET" && segments[0] === "activity" && segments[1]) {
      const { data, error } = await client.from("ai_activity").select("*, ai_assets(name)").eq("id", segments[1]).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "not found" }, 404);
      return json(data);
    }

    // GET /pii/events
    if (method === "GET" && segments[0] === "pii" && segments[1] === "events") {
      const { data, error } = await client.from("pii_events").select("*, ai_assets(name), ai_activity(request_id, sanitized_prompt)").order("created_at", { ascending: false }).limit(200);
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // GET /agent-runs
    if (method === "GET" && segments[0] === "agent-runs" && !segments[1]) {
      const { data, error } = await client.from("agent_runs").select("*, ai_assets(name)").order("created_at", { ascending: false }).limit(100);
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }
    // GET /agent-runs/:id  (with declared/observed data sources)
    if (method === "GET" && segments[0] === "agent-runs" && segments[1]) {
      const { data: run, error } = await client.from("agent_runs").select("*, ai_assets(name)").eq("id", segments[1]).maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!run) return json({ error: "not found" }, 404);
      const { data: dsRows } = await client.from("agent_run_data_sources").select("access_type, data_sources(id, name)").eq("run_id", run.id);
      const declared = (dsRows ?? []).filter((r: any) => r.access_type === "declared").map((r: any) => r.data_sources?.name).filter(Boolean);
      const observed = (dsRows ?? []).filter((r: any) => r.access_type === "observed").map((r: any) => r.data_sources?.name).filter(Boolean);
      const unexpected = observed.filter((n: string) => !declared.includes(n));
      return json({ ...run, declared, observed, unexpected, has_unexpected_access: unexpected.length > 0 });
    }

    // GET /governance/alerts
    if (method === "GET" && segments[0] === "governance" && segments[1] === "alerts") {
      let q = client.from("governance_alerts").select("*, ai_assets(name)").order("created_at", { ascending: false }).limit(200);
      const status = u.searchParams.get("status"); if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // GET /config
    if (method === "GET" && segments[0] === "config") {
      const { data: mc } = await client.from("monitoring_config").select("*").eq("id", 1).maybeSingle();
      const { data: rc } = await client.from("retention_config").select("*").eq("id", 1).maybeSingle();
      return json({
        prompt_monitoring_enabled: mc?.prompt_monitoring_enabled ?? true,
        retention_days: rc?.retention_days ?? 30,
        ai_provider: Deno.env.get("AI_PROVIDER") ?? "demo",
        ai_model: Deno.env.get("AI_MODEL") ?? "demo-support-v1",
        observability: "open-telemetry-style spans stored in otel_spans table",
        updated_at: mc?.updated_at ?? null,
      });
    }

    // PUT /config/monitoring
    if (method === "PUT" && segments[0] === "config" && segments[1] === "monitoring") {
      const body = await req.json();
      if (typeof body?.prompt_monitoring_enabled !== "boolean") return json({ error: "prompt_monitoring_enabled (boolean) required" }, 400);
      const { error } = await client.from("monitoring_config").update({ prompt_monitoring_enabled: body.prompt_monitoring_enabled, updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) return json({ error: error.message }, 500);
      await client.from("governance_alerts").insert({
        alert_id: `ALR-CFG-${Date.now()}`,
        type: "config_change",
        severity: "low",
        description: `Prompt monitoring ${body.prompt_monitoring_enabled ? "enabled" : "disabled"}.`,
        status: "open",
      });
      return json({ prompt_monitoring_enabled: body.prompt_monitoring_enabled });
    }

    // PUT /config/retention
    if (method === "PUT" && segments[0] === "config" && segments[1] === "retention") {
      const body = await req.json();
      const days = Number(body?.retention_days);
      if (!Number.isInteger(days) || days <= 0) return json({ error: "retention_days must be a positive integer" }, 400);
      const { error } = await client.from("retention_config").update({ retention_days: days, updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) return json({ error: error.message }, 500);
      return json({ retention_days: days });
    }

    // POST /config/retention/apply — delete records older than retention period
    if (method === "POST" && segments[0] === "config" && segments[1] === "retention" && segments[2] === "apply") {
      const { data: rc } = await client.from("retention_config").select("retention_days").eq("id", 1).maybeSingle();
      const days = rc?.retention_days ?? 30;
      const cutoff = new Date(Date.now() - days * 864e5).toISOString();
      const { data: deleted, error } = await client.from("ai_activity").delete().lt("created_at", cutoff).select("id");
      if (error) return json({ error: error.message }, 500);
      return json({ retention_days: days, cutoff, deleted_count: deleted?.length ?? 0 });
    }

    // GET /observability/spans
    if (method === "GET" && segments[0] === "observability" && segments[1] === "spans") {
      const { data, error } = await client.from("otel_spans").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    return json({ error: "not found", path }, 404);
  } catch (err) {
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
