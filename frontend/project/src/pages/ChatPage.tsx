// Customer Support AI — live demo chat with PII detection + monitoring.
import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { api } from "@/services/api";
import type { ChatResponse } from "@/types";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatDuration } from "@/utils/format";

interface Msg {
  role: "user" | "ai";
  text: string;
  meta?: ChatResponse;
}

export function ChatPage() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Hi! I'm the Customer Support AI (demo). Ask me about returns, shipping, or order status. Try a prompt with a name and phone number to see PII detection in action." },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!input.trim() || sending) return;
    const prompt = input.trim();
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: prompt }]);
    setSending(true); setError(null);
    try {
      const r = await api.chat(prompt);
      setMsgs((m) => [...m, { role: "ai", text: r.response, meta: r }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally { setSending(false); }
  }

  return (
    <div>
      <PageHeader title="Customer Support AI" subtitle="Live demo — every prompt is monitored, PII is sanitized before storage" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-0 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                  <div>{m.text}</div>
                  {m.meta && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 text-xs space-y-1">
                      {m.meta.prompt_monitoring_enabled ? (
                        m.meta.pii_detected ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            <Badge color="amber">PII detected</Badge>
                            {Object.entries(m.meta.pii_counts).map(([t, c]) => (
                              <Badge key={t} color="purple">{t}:{c}</Badge>
                            ))}
                          </div>
                        ) : <Badge color="green">No PII</Badge>
                      ) : <Badge color="slate">Monitoring disabled</Badge>}
                      <div className="text-slate-400">
                        Sanitized: "{m.meta.sanitized_prompt ?? "—"}" · {m.meta.provider} · {formatDuration(m.meta.duration_ms)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-xl px-4 py-2.5"><Loader2 size={16} className="animate-spin text-slate-500" /></div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a customer support question…"
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button onClick={send} disabled={sending || !input.trim()} className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 flex items-center gap-1">
              <Send size={16} /> Send
            </button>
          </div>
          {error && <div className="px-4 pb-3 text-sm text-rose-600">{error}</div>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-sky-600" />
            <h3 className="font-semibold text-slate-900">Try these prompts</h3>
          </div>
          <div className="space-y-2">
            {[
              "What is the status of my order?",
              "Write a reminder email to Ramesh, phone 9840123456 about his insurance claim.",
              "Call John at 555-123-4567 regarding his delivery.",
              "Email jane@example.com about her return for 123 Main St.",
            ].map((p) => (
              <button
                key={p}
                onClick={() => setInput(p)}
                className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-4 text-xs text-slate-400">
            PII (names, phones, emails, addresses) is detected and replaced with tokens like
            <code className="mx-1 bg-slate-100 px-1 rounded">&lt;NAME&gt;</code> before the prompt is stored.
          </div>
        </Card>
      </div>
    </div>
  );
}
