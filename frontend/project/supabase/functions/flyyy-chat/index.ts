// FLYYY.AI demo Customer Support AI chat endpoint.
// POST /functions/v1/flyyy-chat  { prompt: string }
//
// Pipeline: capture prompt -> PII detection -> redaction -> persist SANITIZED
// prompt only -> call demo AI provider (configurable) -> record monitoring +
// OpenTelemetry-style spans -> return sanitized prompt + AI response.
//
// Privacy: the raw prompt is NEVER persisted. Only the sanitized version is
// stored in ai_activity. PII metadata (type + count) is stored in pii_events.
// If prompt monitoring is disabled, prompt content is not stored at all; only
// non-content monitoring metadata is recorded.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------- PII detection (inlined; see README for full documentation) ----------
type PiiType = "EMAIL" | "PHONE" | "NAME" | "ADDRESS" | "SSN" | "CREDIT_CARD";
interface PiiMatch { type: PiiType; value: string; start: number; end: number; }

const NAME_LIST = ["Ramesh","Suresh","John","Jane","Robert","Emily","Michael","Sarah","David","Linda","James","Maria","Richard","Patricia","Charles","Jennifer","Thomas","Elizabeth","Daniel","Susan","Aisha","Wei","Yuki","Carlos","Priya","Amit","Kumar","Anita","Raj","Meena","Arjun","Divya"];
const PATTERNS: { type: PiiType; re: RegExp }[] = [
  { type: "EMAIL", re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { type: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "CREDIT_CARD", re: /\b(?:\d[ -]*?){13,19}\b/g },
  { type: "PHONE", re: /(?<!\d)(\+?\d[\d\s\-().]{7,}\d)(?!\d)/g },
  { type: "ADDRESS", re: /\b\d{1,6}\s+[A-Z][a-zA-Z]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court)\b\.?/g },
];

function detectPii(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [];
  for (const { type, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (type === "CREDIT_CARD" && m[0].replace(/\D/g, "").length < 13) continue;
      matches.push({ type, value: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  for (const name of NAME_LIST) {
    const re = new RegExp(`\\b${name}\\b`, "gi");
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({ type: "NAME", value: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const result: PiiMatch[] = [];
  let lastEnd = -1;
  for (const m of matches) { if (m.start >= lastEnd) { result.push(m); lastEnd = m.end; } }
  return result;
}

function sanitize(text: string): { sanitized: string; matches: PiiMatch[] } {
  const matches = detectPii(text);
  let out = ""; let cursor = 0;
  for (const m of matches) { out += text.slice(cursor, m.start); out += `<${m.type}>`; cursor = m.end; }
  out += text.slice(cursor);
  return { sanitized: out, matches };
}

function piiCounts(matches: PiiMatch[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const m of matches) c[m.type] = (c[m.type] ?? 0) + 1;
  return c;
}

// ---------- Demo AI provider abstraction ----------
// Configurable via env: AI_PROVIDER, AI_API_KEY, AI_MODEL, AI_BASE_URL.
// Supports OpenAI-compatible chat completions. Falls back to a deterministic
// demo response when no key is configured (clearly labeled in output).
async function callAi(prompt: string): Promise<{ response: string; tokens: Record<string, number> | null; provider: string; model: string }> {
  const provider = Deno.env.get("AI_PROVIDER") ?? "demo";
  const model = Deno.env.get("AI_MODEL") ?? "demo-support-v1";
  const apiKey = Deno.env.get("AI_API_KEY");
  const baseUrl = Deno.env.get("AI_BASE_URL") ?? "https://api.openai.com/v1";

  if (apiKey && provider !== "demo") {
    const start = performance.now();
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful customer support assistant. Answer concisely." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI provider error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const tokens = data.usage ?? null;
    return { response: data.choices?.[0]?.message?.content ?? "(no response)", tokens, provider, model };
  }

  // Demo fallback (no API key) — deterministic canned responses
  const p = prompt.toLowerCase();
  let response = "Thank you for contacting Customer Support. ";
  if (p.includes("return")) response += "You can return items within 30 days for a full refund.";
  else if (p.includes("shipping")) response += "Standard shipping takes 3-5 business days.";
  else if (p.includes("status") || p.includes("order")) response += "Your order is being processed and will ship soon.";
  else if (p.includes("reminder") || p.includes("email")) response += "Here is a draft reminder email (demo): 'Dear customer, this is a friendly reminder regarding your account. Please reach out if you need help.'";
  else response += "How can I help you today? (demo response — set AI_API_KEY for live AI)";
  return { response, tokens: { prompt_tokens: prompt.length, completion_tokens: response.length, total_tokens: prompt.length + response.length, demo: true }, provider, model };
}

// ---------- Main handler ----------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const rawPrompt: string | undefined = body?.prompt;
    if (!rawPrompt || typeof rawPrompt !== "string" || rawPrompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "prompt is required and must be a non-empty string" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Read monitoring config
    const { data: cfg } = await sb.from("monitoring_config").select("prompt_monitoring_enabled").eq("id", 1).maybeSingle();
    const promptMonitoringEnabled = cfg?.prompt_monitoring_enabled ?? true;

    // PII detection + sanitization (always runs; redaction used for AI call too)
    const { sanitized, matches } = sanitize(rawPrompt);
    const counts = piiCounts(matches);
    const piiDetected = matches.length > 0;

    const requestId = `REQ-${Date.now()}`;
    const traceId = `tr-${requestId}`;
    const startMs = performance.now();

    // Call AI with the SANITIZED prompt (so PII never leaves our boundary for inference)
    let aiResult;
    let status: "success" | "failed" = "success";
    let errorInfo: string | null = null;
    try {
      aiResult = await callAi(sanitized);
    } catch (e) {
      aiResult = { response: "", tokens: null, provider: Deno.env.get("AI_PROVIDER") ?? "demo", model: Deno.env.get("AI_MODEL") ?? "demo-support-v1" };
      status = "failed";
      errorInfo = String(e.message ?? e);
    }
    const durationMs = Math.round(performance.now() - startMs);

    // Persist monitoring record — NEVER the raw prompt
    const { data: asset } = await sb.from("ai_assets").select("id").eq("name", "Customer Support AI").maybeSingle();
    const assetId = asset?.id ?? null;

    const { data: activityRow } = await sb.from("ai_activity").insert({
      request_id: requestId,
      asset_id: assetId,
      provider: aiResult.provider,
      model: aiResult.model,
      sanitized_prompt: promptMonitoringEnabled ? sanitized : null,
      pii_detected: piiDetected,
      pii_counts: counts,
      prompt_monitoring_enabled: promptMonitoringEnabled,
      token_usage: aiResult.tokens,
      tools_invoked: [],
      duration_ms: durationMs,
      status,
      error_info: errorInfo,
      started_at: new Date(Date.now() - durationMs).toISOString(),
      completed_at: new Date().toISOString(),
    }).select("id").maybeSingle();

    const activityId = activityRow?.id ?? null;

    // PII metadata rows (type + count only, never the value)
    if (piiDetected && activityId) {
      const rows = Object.entries(counts).map(([pii_type, count]) => ({ activity_id: activityId, asset_id: assetId, pii_type, count }));
      await sb.from("pii_events").insert(rows);
      // governance alert
      await sb.from("governance_alerts").insert({
        alert_id: `ALR-${Date.now()}`,
        type: "pii_detected",
        severity: piiDetected ? "medium" : "low",
        asset_id: assetId,
        description: `PII detected in prompt to Customer Support AI (${Object.keys(counts).join(", ")}).`,
        status: "open",
        related_id: activityId,
      });
    }
    if (status === "failed" && activityId) {
      await sb.from("governance_alerts").insert({
        alert_id: `ALR-F-${Date.now()}`,
        type: "failed_execution",
        severity: "high",
        asset_id: assetId,
        description: `AI execution failed: ${errorInfo}`,
        status: "open",
        related_id: activityId,
      });
    }

    // OpenTelemetry-style spans (stored representation of instrumentation)
    if (activityId) {
      await sb.from("otel_spans").insert([
        { trace_id: traceId, span_id: `sp-${requestId}-a`, activity_id: activityId, span_name: "ai.chat", span_kind: "client", attributes: { provider: aiResult.provider, model: aiResult.model, operation: "chat.completion", token_usage: aiResult.tokens }, start_time: new Date(Date.now() - durationMs).toISOString(), end_time: new Date().toISOString(), status_code: status === "success" ? "ok" : "error", status_message: errorInfo },
        { trace_id: traceId, span_id: `sp-${requestId}-b`, parent_span_id: `sp-${requestId}-a`, activity_id: activityId, span_name: "pii.detect", span_kind: "internal", attributes: { pii_detected: piiDetected, types: Object.keys(counts) }, start_time: new Date(Date.now() - durationMs - 20).toISOString(), end_time: new Date(Date.now() - durationMs).toISOString(), status_code: "ok" },
      ]);
    }

    return new Response(JSON.stringify({
      request_id: requestId,
      sanitized_prompt: promptMonitoringEnabled ? sanitized : null,
      prompt_monitoring_enabled: promptMonitoringEnabled,
      pii_detected: piiDetected,
      pii_counts: counts,
      response: aiResult.response,
      provider: aiResult.provider,
      model: aiResult.model,
      token_usage: aiResult.tokens,
      duration_ms: durationMs,
      status,
      trace_id: traceId,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
