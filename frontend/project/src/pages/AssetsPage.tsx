import { useFetch } from "@/hooks/useFetch";
import { api } from "@/services/api";
import type { AiAsset } from "@/types";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui";
import { formatRelative, statusColor } from "@/utils/format";

export function AssetsPage() {
  const { data, loading, error, refetch } = useFetch<AiAsset[]>(() => api.aiAssets());

  if (loading) return <Spinner label="Loading AI assets…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data || data.length === 0) return (<><PageHeader title="AI Assets" subtitle="Registered chatbots and agents" /><EmptyState title="No AI assets registered" /></>);

  return (
    <div>
      <PageHeader title="AI Assets" subtitle="Registered chatbots and agents under governance" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900">{a.name}</h3>
                <div className="text-xs text-slate-500 mt-0.5">{a.type === "chatbot" ? "Chatbot" : "Agent"}</div>
              </div>
              <Badge color={statusColor(a.status)}>{a.status}</Badge>
            </div>
            <p className="text-sm text-slate-600 mb-4">{a.description ?? "—"}</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label="Provider" value={a.provider} />
              <Field label="Model" value={a.model} />
              <Field label="Asset ID" value={a.id.slice(0, 8) + "…"} />
              <Field label="Created" value={formatRelative(a.created_at)} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-400 uppercase tracking-wide text-[10px] font-semibold">{label}</div>
      <div className="text-slate-700 font-medium mt-0.5 truncate">{value}</div>
    </div>
  );
}
