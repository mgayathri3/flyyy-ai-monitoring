import { useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { api } from "@/services/api";
import type { AppConfig } from "@/types";
import { Badge, Card, PageHeader } from "@/components/ui";

export function SettingsPage({ config, onConfigChange }: { config: AppConfig | null; onConfigChange: (c: AppConfig) => void }) {
  const [monitoring, setMonitoring] = useState<boolean | null>(null);
  const [retention, setRetention] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [applyingRetention, setApplyingRetention] = useState(false);
  const [retentionResult, setRetentionResult] = useState<string | null>(null);

  const monVal = monitoring ?? config?.prompt_monitoring_enabled ?? true;
  const retVal = retention ?? config?.retention_days ?? 30;

  async function saveMonitoring(enabled: boolean) {
    setSaving(true); setMsg(null);
    try {
      const c = await api.updateMonitoring(enabled);
      setMonitoring(enabled);
      onConfigChange({ ...config!, ...c });
      setMsg(`Prompt monitoring ${enabled ? "enabled" : "disabled"}.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to update");
    } finally { setSaving(false); }
  }

  async function saveRetention(days: number) {
    setSaving(true); setMsg(null);
    try {
      const c = await api.updateRetention(days);
      setRetention(days);
      onConfigChange({ ...config!, ...c });
      setMsg(`Retention set to ${days} days.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to update");
    } finally { setSaving(false); }
  }

  async function applyRetention() {
    setApplyingRetention(true); setRetentionResult(null);
    try {
      const r = await api.applyRetention();
      setRetentionResult(`Deleted ${r.deleted_count} records older than ${r.retention_days} days (cutoff ${new Date(r.cutoff).toLocaleString()}).`);
    } catch (e) {
      setRetentionResult(e instanceof Error ? e.message : "Failed to apply");
    } finally { setApplyingRetention(false); }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Monitoring configuration and retention" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prompt monitoring */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Prompt Monitoring</h3>
            <Badge color={monVal ? "green" : "amber"}>{monVal ? "ON" : "OFF"}</Badge>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            When enabled, sanitized prompt content is stored. When disabled, prompt content is
            <strong> never stored</strong> — only non-content monitoring metadata (provider, model,
            duration, status, PII counts) is recorded.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => saveMonitoring(true)}
              disabled={saving || monVal}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
            >Enable</button>
            <button
              onClick={() => saveMonitoring(false)}
              disabled={saving || !monVal}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40"
            >Disable</button>
          </div>
        </Card>

        {/* Retention */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Retention Period</h3>
          <p className="text-sm text-slate-600 mb-4">
            Monitoring records older than this many days can be purged. Common values: 7, 30, 90 days.
          </p>
          <div className="flex gap-2 items-center mb-3">
            <input
              type="number"
              min={1}
              value={retVal}
              onChange={(e) => setRetention(Number(e.target.value))}
              className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            <span className="text-sm text-slate-500">days</span>
            <button
              onClick={() => saveRetention(retVal)}
              disabled={saving || retVal === (config?.retention_days ?? 30)}
              className="ml-auto px-3 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 flex items-center gap-1"
            ><Save size={14} /> Save</button>
          </div>
          <button
            onClick={applyRetention}
            disabled={applyingRetention}
            className="text-sm text-rose-600 hover:text-rose-700 flex items-center gap-1"
          >
            {applyingRetention ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Purge records older than {retVal} days now
          </button>
          {retentionResult && <div className="mt-2 text-xs text-slate-600">{retentionResult}</div>}
        </Card>

        {/* Provider info */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-3">AI Provider</h3>
          <div className="space-y-2 text-sm">
            <Row label="Provider" value={config?.ai_provider ?? "demo"} />
            <Row label="Model" value={config?.ai_model ?? "demo-support-v1"} />
            <Row label="API key" value="•••••• (server-side, never exposed to browser)" />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Configured through backend environment variables (AI_PROVIDER, AI_MODEL, AI_API_KEY). The
            browser never sees API keys.
          </p>
        </Card>

        {/* Observability */}
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Observability</h3>
          <Row label="Status" value="Active" />
          <Row label="Method" value="Code instrumentation (edge functions)" />
          <Row label="Storage" value="otel_spans table" />
          <p className="text-xs text-slate-400 mt-3">{config?.observability}</p>
        </Card>
      </div>

      {msg && (
        <div className="mt-4 p-3 bg-sky-50 border border-sky-200 rounded-lg text-sm text-sky-700">{msg}</div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  );
}
