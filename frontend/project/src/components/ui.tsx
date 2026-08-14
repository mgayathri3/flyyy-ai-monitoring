// Small shared UI primitives for FLYYY.AI dashboard.

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type BadgeColor = "green" | "red" | "amber" | "blue" | "slate" | "purple";
const badgeColors: Record<BadgeColor, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  purple: "bg-violet-50 text-violet-700 border-violet-200",
};

export function Badge({ color = "slate", children }: { color?: BadgeColor; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${badgeColors[color]}`}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-slate-400">
      <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-sky-600 rounded-full mr-3" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-rose-600 mb-2 text-sm font-medium">Something went wrong</div>
      <div className="text-slate-500 text-sm mb-4 max-w-md">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-slate-400 text-sm font-medium">{title}</div>
      {hint && <div className="text-slate-400 text-xs mt-1">{hint}</div>}
    </div>
  );
}

export function KpiCard({ label, value, icon, accent = "sky" }: {
  label: string; value: number | string; icon: React.ReactNode; accent?: "sky" | "rose" | "amber" | "emerald" | "violet";
}) {
  const accents: Record<string, string> = {
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">{label}</div>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accents[accent]}`}>{icon}</div>
      </div>
    </Card>
  );
}
