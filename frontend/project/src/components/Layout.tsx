// FLYYY.AI application shell — sidebar navigation + main content area.
import { Activity, AlertTriangle, Boxes, Eye, LayoutDashboard, MessageSquare, Settings, ShieldCheck, Terminal } from "lucide-react";

export type PageKey =
  | "dashboard" | "chat" | "assets" | "activity" | "pii"
  | "agent" | "alerts" | "observability" | "settings";

const NAV: { key: PageKey; label: string; icon: React.ReactNode; group: string }[] = [
  { key: "dashboard", label: "Overview", icon: <LayoutDashboard size={18} />, group: "Monitor" },
  { key: "chat", label: "Customer Support AI", icon: <MessageSquare size={18} />, group: "Monitor" },
  { key: "assets", label: "AI Assets", icon: <Boxes size={18} />, group: "Monitor" },
  { key: "activity", label: "Activity", icon: <Activity size={18} />, group: "Monitor" },
  { key: "pii", label: "PII & Privacy", icon: <ShieldCheck size={18} />, group: "Governance" },
  { key: "agent", label: "Agent Monitoring", icon: <Terminal size={18} />, group: "Governance" },
  { key: "alerts", label: "Governance Alerts", icon: <AlertTriangle size={18} />, group: "Governance" },
  { key: "observability", label: "Observability", icon: <Eye size={18} />, group: "System" },
  { key: "settings", label: "Settings", icon: <Settings size={18} />, group: "System" },
];

export function Layout({
  current, onNavigate, children, monitoringEnabled,
}: {
  current: PageKey;
  onNavigate: (p: PageKey) => void;
  children: React.ReactNode;
  monitoringEnabled: boolean;
}) {
  const groups = [...new Set(NAV.map((n) => n.group))];
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 left-0 z-20 hidden md:flex">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-sm">F</div>
            <div>
              <div className="text-white font-semibold text-sm leading-tight">FLYYY.AI</div>
              <div className="text-slate-500 text-[10px]">AI Governance</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {groups.map((g) => (
            <div key={g}>
              <div className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">{g}</div>
              {NAV.filter((n) => n.group === g).map((n) => (
                <button
                  key={n.key}
                  onClick={() => onNavigate(n.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                    current === n.key ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {n.icon}
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-800 text-[11px]">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${monitoringEnabled ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="text-slate-400">
              Prompt monitoring {monitoringEnabled ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-xs">F</div>
          <span className="font-semibold text-sm">FLYYY.AI</span>
        </div>
        <select
          value={current}
          onChange={(e) => onNavigate(e.target.value as PageKey)}
          className="bg-slate-800 text-white text-sm rounded-md px-2 py-1 border border-slate-700"
        >
          {NAV.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
        </select>
      </div>

      {/* Main */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
