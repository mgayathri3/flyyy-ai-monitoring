import { useMemo } from "react";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/services/api";
import type { PiiEvent } from "@/types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { formatRelative } from "@/utils/format";

export function PiiPage() {
  const { data, loading, error, refetch } = useFetch<PiiEvent[]>(() => api.piiEvents());

  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    (data ?? []).forEach((e) => { m[e.pii_type] = (m[e.pii_type] ?? 0) + e.count; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const byAsset = useMemo(() => {
    const m: Record<string, number> = {};
    (data ?? []).forEach((e) => { const name = e.ai_assets?.name ?? "Unknown"; m[name] = (m[name] ?? 0) + e.count; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const maxType = Math.max(1, ...byType.map(([, c]) => c));

  if (loading) return <Spinner label="Loading PII events…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader title="PII & Privacy" subtitle="Detected sensitive data — type and count only, never the value" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4">PII Events by Type</h3>
          {byType.length === 0 ? <EmptyState title="No PII detected yet" /> : (
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 uppercase">
                <tr><th className="text-left py-2">Type</th><th className="text-right py-2">Count</th></tr>
              </thead>
              <tbody>
                {byType.map(([t, c]) => (
                  <tr key={t} className="border-t border-slate-100">
                    <td className="py-2 font-medium text-slate-700">{t}</td>
                    <td className="py-2 text-right text-slate-600">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4">PII Distribution</h3>
          {byType.length === 0 ? <EmptyState title="No data" /> : (
            <div className="space-y-3">
              {byType.map(([t, c]) => (
                <div key={t}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{t}</span>
                    <span className="text-slate-500">{c}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(c / maxType) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4">AI Assets with Most PII</h3>
          {byAsset.length === 0 ? <EmptyState title="No data" /> : (
            <div className="space-y-3">
              {byAsset.map(([name, c]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{name}</span>
                  <Badge color="amber">{c}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Recent Sanitized Prompts</h3>
          <p className="text-xs text-slate-500 mt-0.5">Original sensitive values are never stored or shown.</p>
        </div>
        {!data || data.length === 0 ? <EmptyState title="No PII events recorded" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Time</th>
                  <th className="text-left px-4 py-3 font-semibold">AI Asset</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Count</th>
                  <th className="text-left px-4 py-3 font-semibold">Sanitized Prompt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatRelative(e.created_at)}</td>
                    <td className="px-4 py-3 text-slate-700">{e.ai_assets?.name ?? "—"}</td>
                    <td className="px-4 py-3"><Badge color="purple">{e.pii_type}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{e.count}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-md truncate" title={e.ai_activity?.sanitized_prompt ?? ""}>
                      {e.ai_activity?.sanitized_prompt ?? <span className="text-slate-400 italic">monitoring disabled</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
