import { Activity, AlertTriangle, Boxes, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/services/api";
import type { DashboardSummary } from "@/types";
import { Badge, Card, EmptyState, ErrorState, KpiCard, PageHeader, Spinner } from "@/components/ui";
import { formatRelative } from "@/utils/format";
import type { PageKey } from "@/components/Layout";

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { data, loading, error, refetch } = useFetch<DashboardSummary>(() => api.dashboardSummary());

  if (loading) return <Spinner label="Loading overview…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return <EmptyState title="No data yet" />;

  const maxPii = Math.max(1, ...data.pii_by_type.map((p) => p.total));

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="AI usage monitoring & governance at a glance"
        action={<button onClick={refetch} className="text-sm text-sky-700 hover:text-sky-800 font-medium">Refresh</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total AI Requests" value={data.total_requests} icon={<Activity size={20} />} accent="sky" />
        <KpiCard label="Active AI Assets" value={data.active_assets} icon={<Boxes size={20} />} accent="emerald" />
        <KpiCard label="PII Events" value={data.pii_events} icon={<ShieldAlert size={20} />} accent="amber" />
        <KpiCard label="PII-Affected Prompts" value={data.pii_affected_prompts} icon={<ShieldCheck size={20} />} accent="violet" />
        <KpiCard label="Unexpected Data Access" value={data.unexpected_data_access_events} icon={<AlertTriangle size={20} />} accent="rose" />
        <KpiCard label="Failed Executions" value={data.failed_executions} icon={<XCircle size={20} />} accent="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4">PII Events by Type</h3>
          {data.pii_by_type.length === 0 ? (
            <EmptyState title="No PII events recorded" />
          ) : (
            <div className="space-y-3">
              {data.pii_by_type.map((p) => (
                <div key={p.pii_type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{p.pii_type}</span>
                    <span className="text-slate-500">{p.total}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(p.total / maxPii) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Activity (last 7 days)</h3>
          {data.recent_activity.length === 0 ? (
            <EmptyState title="No recent activity" />
          ) : (
            <div className="flex items-end gap-1 h-32">
              {Array.from({ length: 7 }).map((_, i) => {
                const dayStart = Date.now() - (6 - i) * 86400000;
                const dayLabel = new Date(dayStart).toLocaleDateString(undefined, { weekday: "short" });
                const count = data.recent_activity.filter((a) => {
                  const t = new Date(a.created_at).getTime();
                  return t >= dayStart && t < dayStart + 86400000;
                }).length;
                const maxCount = Math.max(1, ...Array.from({ length: 7 }).map((_, j) => {
                  const ds = Date.now() - (6 - j) * 86400000;
                  return data.recent_activity.filter((a) => {
                    const t = new Date(a.created_at).getTime();
                    return t >= ds && t < ds + 86400000;
                  }).length;
                }));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-sky-500 rounded-t transition-all" style={{ height: `${(count / maxCount) * 100}%`, minHeight: "4px" }} title={`${count} requests`} />
                    <span className="text-[10px] text-slate-400">{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <NavCard label="Browse AI Assets" hint="View registered chatbots & agents" onClick={() => onNavigate("assets")} />
        <NavCard label="Prompt Activity" hint="Search sanitized activity records" onClick={() => onNavigate("activity")} />
        <NavCard label="Agent Monitoring" hint="Declared vs observed data access" onClick={() => onNavigate("agent")} />
        <NavCard label="Governance Alerts" hint="Review open issues" onClick={() => onNavigate("alerts")} />
      </div>

      <Card className="mt-6 p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Badge color="blue">DEMO</Badge>
          <span>Dashboard shows demo + live-generated monitoring data. Raw PII is never stored — only sanitized prompts and PII type counts.</span>
        </div>
      </Card>
    </div>
  );
}

function NavCard({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left p-4 bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-sm transition-all">
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      <div className="text-xs text-slate-500 mt-1">{hint}</div>
    </button>
  );
}
