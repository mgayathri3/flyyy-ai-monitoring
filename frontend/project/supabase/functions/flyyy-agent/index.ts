// FLYYY.AI demo AI agent endpoint.
// POST /functions/v1/flyyy-agent  { access_orders: boolean }
//
// Demonstrates declared-vs-observed data-source monitoring.
// The Customer Support Agent DECLARES the FAQ Database. The caller chooses
// whether the run also accesses the Orders Database (access_orders).
// Observed access events are recorded and compared against declared sources.
// Unexpected access (Orders Database) is flagged and raises a governance alert.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const accessOrders: boolean = Boolean(body?.access_orders);
    const userQuery: string = typeof body?.query === "string" ? body.query : "What is your return policy?";

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: agentAsset } = await sb.from("ai_assets").select("id").eq("name", "Customer Support Agent").maybeSingle();
    const { data: faqDs } = await sb.from("data_sources").select("id").eq("name", "FAQ Database").maybeSingle();
    const { data: ordersDs } = await sb.from("data_sources").select("id").eq("name", "Orders Database").maybeSingle();
    const agentId = agentAsset?.id ?? null;
    const faqId = faqDs?.id ?? null;
    const ordersId = ordersDs?.id ?? null;

    const startMs = performance.now();
    const runId = `RUN-${Math.floor(4000 + Math.random() * 5000)}`;
    const traceId = `tr-${runId}`;
    const tools: string[] = ["faq_search"];
    if (accessOrders) tools.push("orders_query");

    // Simulate agent retrieval from FAQ
    const { data: faqMatch } = await sb.from("faq_entries").select("question,answer").ilike("question", `%${userQuery.split(" ").slice(0, 2).join(" ")}%`).limit(1).maybeSingle();
    const answer = faqMatch?.answer ?? "Based on our FAQ: please contact support for details. (demo)";

    let ordersAnswer: string | null = null;
    if (accessOrders) {
      const { data: orderRow } = await sb.from("orders").select("order_number,status").limit(1).maybeSingle();
      ordersAnswer = orderRow ? `Order ${orderRow.order_number} is ${orderRow.status}.` : null;
    }

    const durationMs = Math.round(performance.now() - startMs);
    const observed = [faqId];
    if (accessOrders) observed.push(ordersId);
    const declared = [faqId];
    const unexpected = observed.filter((id) => id && !declared.includes(id));
    const hasUnexpected = unexpected.length > 0;

    // Persist agent run
    const { data: runRow } = await sb.from("agent_runs").insert({
      run_id: runId,
      asset_id: agentId,
      status: "success",
      tools_invoked: tools,
      duration_ms: durationMs,
      has_unexpected_access: hasUnexpected,
      started_at: new Date(Date.now() - durationMs).toISOString(),
      completed_at: new Date().toISOString(),
    }).select("id").maybeSingle();
    const runUuid = runRow?.id ?? null;

    // Declared data sources
    const dsRows: { run_id: string; data_source_id: string; access_type: "declared" | "observed" }[] = [];
    for (const id of declared) if (id) dsRows.push({ run_id: runUuid, data_source_id: id, access_type: "declared" });
    for (const id of observed) if (id) dsRows.push({ run_id: runUuid, data_source_id: id, access_type: "observed" });
    if (runUuid) await sb.from("agent_run_data_sources").insert(dsRows);

    // Governance alert for unexpected access
    if (hasUnexpected && runUuid) {
      const { data: u } = await sb.from("data_sources").select("name").in("id", unexpected.filter(Boolean)).maybeSingle();
      await sb.from("governance_alerts").insert({
        alert_id: `ALR-${Date.now()}`,
        type: "unexpected_data_access",
        severity: "high",
        asset_id: agentId,
        description: `Unexpected data source access: Orders Database was accessed but not declared for ${runId}.`,
        status: "open",
        related_id: runUuid,
      });
    }

    // OTEL spans
    if (runUuid) {
      const spans: Record<string, unknown>[] = [
        { trace_id: traceId, span_id: `${traceId}-a`, agent_run_id: runUuid, span_name: "agent.run", span_kind: "internal", attributes: { run_id: runId, asset: "Customer Support Agent" }, start_time: new Date(Date.now() - durationMs).toISOString(), end_time: new Date().toISOString(), status_code: "ok" },
        { trace_id: traceId, span_id: `${traceId}-b`, parent_span_id: `${traceId}-a`, agent_run_id: runUuid, span_name: "datasource.access", span_kind: "internal", attributes: { source: "FAQ Database", access_type: "observed" }, start_time: new Date(Date.now() - durationMs - 10).toISOString(), end_time: new Date(Date.now() - durationMs + 5).toISOString(), status_code: "ok" },
      ];
      if (accessOrders) {
        spans.push({ trace_id: traceId, span_id: `${traceId}-c`, parent_span_id: `${traceId}-a`, agent_run_id: runUuid, span_name: "datasource.access", span_kind: "internal", attributes: { source: "Orders Database", access_type: "observed", unexpected: true }, start_time: new Date(Date.now() - durationMs + 6).toISOString(), end_time: new Date().toISOString(), status_code: "ok" });
      }
      await sb.from("otel_spans").insert(spans);
    }

    const { data: declaredNames } = await sb.from("data_sources").select("name").in("id", declared.filter(Boolean));
    const { data: observedNames } = await sb.from("data_sources").select("name").in("id", observed.filter(Boolean));

    return new Response(JSON.stringify({
      run_id: runId,
      trace_id: traceId,
      query: userQuery,
      answer,
      orders_answer: ordersAnswer,
      tools_invoked: tools,
      duration_ms: durationMs,
      status: "success",
      declared: (declaredNames ?? []).map((r: { name: string }) => r.name),
      observed: (observedNames ?? []).map((r: { name: string }) => r.name),
      unexpected: hasUnexpected ? ["Orders Database"] : [],
      has_unexpected_access: hasUnexpected,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
