import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/services/api";
import type { GovernanceAlert } from "@/types";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatRelative, severityColor } from "@/utils/format";

const TYPE_LABEL: Record<string, string> = {
  pii_detected: "PII Detected",
  unexpected_data_access: "Unexpected Data Access",
  failed_execution: "Failed Execution",
  config_change: "Config Change",
};

type AlertFilter = "" | "open" | "acknowledged" | "resolved";

export function AlertsPage() {
  const [filter, setFilter] = useState<AlertFilter>("");

  // Fetch ALL alerts once.
  const { data, loading, error, refetch } =
    useFetch<GovernanceAlert[]>(() => api.alerts());

  // Filter on the frontend.
  const filteredAlerts = useMemo(() => {
    if (!data) return [];

    if (filter === "") {
      return data;
    }

    return data.filter(
      (alert) => alert.status?.toLowerCase() === filter
    );
  }, [data, filter]);

  return (
    <div>
      <PageHeader
        title="Governance Alerts"
        subtitle="Surfaced governance events across AI activity"
      />

      {/* FILTER BUTTONS */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "", label: "All" },
          { value: "open", label: "Open" },
          { value: "acknowledged", label: "Acknowledged" },
          { value: "resolved", label: "Resolved" },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() =>
              setFilter(item.value as AlertFilter)
            }
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filter === item.value
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* LOADING */}
      {loading ? (
        <Spinner label="Loading alerts…" />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={refetch}
        />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title={
            filter === ""
              ? "No governance alerts"
              : `No ${filter} alerts`
          }
          hint={
            filter !== ""
              ? `There are currently no alerts with ${filter} status.`
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((a) => (
            <Card
              key={a.id}
              className="p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">

                  {/* ALERT HEADER */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge color={severityColor(a.severity)}>
                      {a.severity}
                    </Badge>

                    <Badge color="slate">
                      {TYPE_LABEL[a.type] ?? a.type}
                    </Badge>

                    <span className="text-xs text-slate-400">
                      {a.alert_id}
                    </span>
                  </div>

                  {/* DESCRIPTION */}
                  <p className="text-sm text-slate-700">
                    {a.description}
                  </p>

                  {/* META */}
                  <div className="text-xs text-slate-400 mt-1">
                    {a.ai_assets?.name ?? "—"} ·{" "}
                    {formatRelative(a.created_at)}
                  </div>
                </div>

                {/* STATUS */}
                <Badge
                  color={
                    a.status === "open"
                      ? "amber"
                      : a.status === "resolved"
                      ? "green"
                      : "slate"
                  }
                >
                  {a.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}