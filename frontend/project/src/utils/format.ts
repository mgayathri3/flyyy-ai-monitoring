// Small utility helpers for the FLYYY.AI frontend.

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function severityColor(sev: string): "green" | "amber" | "red" | "slate" {
  if (sev === "critical" || sev === "high") return "red";
  if (sev === "medium") return "amber";
  if (sev === "low") return "slate";
  return "slate";
}

export function statusColor(status: string): "green" | "red" | "amber" | "slate" {
  if (status === "success") return "green";
  if (status === "failed") return "red";
  if (status === "partial") return "amber";
  return "slate";
}
