import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/services/api";
import type { AiActivity } from "@/types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { formatDuration, formatRelative, statusColor } from "@/utils/format";

export function ActivityPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pii, setPii] = useState("");
  const [provider, setProvider] = useState("");

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (q) p.q = q;
    if (status) p.status = status;
    if (pii) p.pii_detected = pii;
    if (provider) p.provider = provider;
    return p;
  }, [q, status, pii, provider]);

  const { data, loading, error, refetch } = useFetch<AiActivity[]>(() => api.activity(params), [JSON.stringify(params)]);

  return (
    <div>
      <PageHeader title="Prompt Activity" subtitle="Every AI interaction, sanitized before storage" />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sanitized prompt…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
          </select>
          <select value={pii} onChange={(e) => setPii(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
            <option value="">PII: any</option>
            <option value="true">PII detected</option>
            <option value="false">No PII</option>
          </select>
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Provider"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          />
        </div>
      </Card>

      {loading ? <Spinner label="Loading activity…" /> :
       error ? <ErrorState message={error} onRetry={refetch} /> :
       !data || data.length === 0 ? <EmptyState title="No activity matches your filters" /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Time</th>
                  <th className="text-left px-4 py-3 font-semibold">AI Asset</th>
                  <th className="text-left px-4 py-3 font-semibold">Provider</th>
                  <th className="text-left px-4 py-3 font-semibold">Request ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">PII</th>
                  <th className="text-left px-4 py-3 font-semibold">Duration</th>
                  <th className="text-left px-4 py-3 font-semibold">Sanitized Prompt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatRelative(a.created_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{a.ai_assets?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{a.provider}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{a.request_id}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(a.status)}>{a.status}</Badge></td>
                    <td className="px-4 py-3">
                      {a.pii_detected ? (
                        <span className="text-amber-600 text-xs font-medium">
                          {Object.entries(a.pii_counts).map(([t, c]) => `${t}:${c}`).join(" ")}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDuration(a.duration_ms)}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate" title={a.sanitized_prompt ?? ""}>
                      {a.prompt_monitoring_enabled ? (a.sanitized_prompt ?? "—") : <span className="text-slate-400 italic">monitoring disabled</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
