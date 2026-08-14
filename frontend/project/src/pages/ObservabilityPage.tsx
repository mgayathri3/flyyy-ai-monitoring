import { useMemo } from "react";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/services/api";
import type { OtelSpan } from "@/types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { formatRelative } from "@/utils/format";

export function ObservabilityPage() {
  const { data, loading, error, refetch } = useFetch<OtelSpan[]>(() => api.spans());

  const traces = useMemo(() => {
    const m: Record<string, OtelSpan[]> = {};
    (data ?? []).forEach((s) => { (m[s.trace_id] ??= []).push(s); });
    return Object.entries(m).sort((a, b) => new Date(b[1][0].start_time).getTime() - new Date(a[1][0].start_time).getTime());
  }, [data]);

  return (
    <div>
      <PageHeader title="Observability" subtitle="OpenTelemetry-style spans captured from instrumentation" />

      <Card className="p-4 mb-6 bg-slate-50">
        <div className="text-sm text-slate-600">
          <strong className="text-slate-800">Approach:</strong> Spans are generated at the point of AI
          provider calls and data-source access inside the edge functions, then persisted to the
          <code className="text-xs bg-white px-1 py-0.5 rounded mx-1 border border-slate-200">otel_spans</code>
          table. This is code-instrumentation-level observability (not a no-code gateway). See the
          capability matrix in the README for what each instrumentation level can and cannot capture.
        </div>
      </Card>

      {loading ? <Spinner label="Loading spans…" /> :
       error ? <ErrorState message={error} onRetry={refetch} /> :
       !data || data.length === 0 ? <EmptyState title="No spans captured yet" /> : (
        <div className="space-y-4">
          {traces.map(([traceId, spans]) => (
            <Card key={traceId} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-slate-900">Trace {traceId}</div>
                <span className="text-xs text-slate-400">{formatRelative(spans[0].start_time)}</span>
              </div>
              <div className="space-y-2">
                {spans.map((s) => (
                  <div key={s.span_id} className="flex items-center gap-3 text-sm">
                    <Badge color={s.status_code === "ok" ? "green" : s.status_code === "error" ? "red" : "slate"}>
                      {s.span_kind}
                    </Badge>
                    <span className="font-medium text-slate-800">{s.span_name}</span>
                    <span className="text-xs text-slate-400 flex-1 truncate">
                      {Object.entries(s.attributes).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ")}
                    </span>
                    {s.parent_span_id && <span className="text-[10px] text-slate-400">↳ parent</span>}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
