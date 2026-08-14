import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Play, Terminal } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/services/api";
import type { AgentRun, AgentRunResponse } from "@/types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { formatDuration, formatRelative, statusColor } from "@/utils/format";

export function AgentPage() {
  const { data, loading, error, refetch } = useFetch<AgentRun[]>(() => api.agentRuns());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentRun | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Demo runner state
  const [accessOrders, setAccessOrders] = useState(false);
  const [query, setQuery] = useState("What is your return policy?");
  const [runResult, setRunResult] = useState<AgentRunResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  async function loadDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const d = await api.agentRun(id);
      setDetail(d);
    } catch (e) {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function runAgent() {
    setRunning(true); setRunError(null); setRunResult(null);
    try {
      const r = await api.runAgent(accessOrders, query);
      setRunResult(r);
      refetch();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <PageHeader title="Agent Monitoring" subtitle="Declared vs observed data-source access" />

      {/* Demo runner */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Terminal size={18} className="text-sky-600" />
          <h3 className="font-semibold text-slate-900">Demo Agent Runner</h3>
          <Badge color="blue">DEMO</Badge>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          The Customer Support Agent declares the <strong>FAQ Database</strong> as its data source.
          Toggle "Access Orders Database" to simulate the agent also reading the Orders Database —
          which is <strong>not declared</strong> and will be flagged as unexpected.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-500 font-medium">Query</label>
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer">
            <input type="checkbox" checked={accessOrders} onChange={(e) => setAccessOrders(e.target.checked)} className="rounded" />
            Access Orders Database
          </label>
          <button
            onClick={runAgent}
            disabled={running}
            className="px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50 flex items-center gap-2"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Run Agent
          </button>
        </div>

        {runError && <div className="mt-4 text-sm text-rose-600">{runError}</div>}
        {runResult && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-slate-900">Run {runResult.run_id}</span>
              {runResult.has_unexpected_access ? (
                <Badge color="red"><AlertTriangle size={12} className="inline mr-1" />Unexpected access</Badge>
              ) : (
                <Badge color="green"><CheckCircle2 size={12} className="inline mr-1" />No violations</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <DeclaredObserved title="Declared" items={runResult.declared} color="emerald" />
              <DeclaredObserved title="Observed" items={runResult.observed} color="sky" />
              <DeclaredObserved title="Unexpected" items={runResult.unexpected} color="rose" />
            </div>
            <div className="text-sm text-slate-700"><strong>Answer:</strong> {runResult.answer}</div>
            {runResult.orders_answer && <div className="text-sm text-slate-700 mt-1"><strong>Orders:</strong> {runResult.orders_answer}</div>}
            <div className="text-xs text-slate-500 mt-2">Tools: {runResult.tools_invoked.join(", ")} · Duration: {formatDuration(runResult.duration_ms)}</div>
          </div>
        )}
      </Card>

      {/* Runs list */}
      {loading ? <Spinner label="Loading agent runs…" /> :
       error ? <ErrorState message={error} onRetry={refetch} /> :
       !data || data.length === 0 ? <EmptyState title="No agent runs yet" hint="Use the demo runner above to generate one." /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 font-semibold text-slate-900 text-sm">Agent Runs</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {data.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => loadDetail(r.id)}
                    className={`cursor-pointer hover:bg-slate-50 ${selectedId === r.id ? "bg-sky-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{r.run_id}</div>
                      <div className="text-xs text-slate-500">{r.ai_assets?.name ?? "—"} · {formatRelative(r.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.has_unexpected_access ? <Badge color="red">Unexpected</Badge> : <Badge color="green">Clean</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-5">
            <div className="font-semibold text-slate-900 text-sm mb-3">Run Detail</div>
            {!selectedId ? <EmptyState title="Select a run to inspect" /> :
             detailLoading ? <Spinner label="Loading…" /> : !detail ? <EmptyState title="No detail" /> : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Field label="Run ID" value={detail.run_id} />
                  <Field label="Status" value={detail.status} />
                  <Field label="Duration" value={formatDuration(detail.duration_ms)} />
                  <Field label="Tools" value={detail.tools_invoked.join(", ")} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DeclaredObserved title="Declared" items={detail.declared ?? []} color="emerald" />
                  <DeclaredObserved title="Observed" items={detail.observed ?? []} color="sky" />
                  <DeclaredObserved title="Unexpected" items={detail.unexpected ?? []} color="rose" />
                </div>
                {detail.has_unexpected_access && (
                  <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <AlertTriangle size={16} className="text-rose-600 mt-0.5" />
                    <div className="text-sm text-rose-700">
                      <strong>WARNING — Unexpected data source access:</strong> {(detail.unexpected ?? []).join(", ")} was accessed but not declared.
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function DeclaredObserved({ title, items, color }: { title: string; items: string[]; color: "emerald" | "sky" | "rose" }) {
  const ring: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50",
    sky: "border-sky-200 bg-sky-50",
    rose: "border-rose-200 bg-rose-50",
  };
  return (
    <div className={`rounded-lg border p-3 ${ring[color]}`}>
      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">{title}</div>
      {items.length === 0 ? <div className="text-xs text-slate-400">—</div> : (
        <div className="space-y-1">
          {items.map((i) => <div key={i} className="text-sm text-slate-700">{i}</div>)}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-400 uppercase text-[10px] font-semibold">{label}</div>
      <div className="text-slate-700 font-medium mt-0.5">{value}</div>
    </div>
  );
}
