"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

type Decision = {
  id: number | string;
  timestamp: string;
  agent_name: string;
  agent_version: string | null;
  method: string | null;
  confidence: number | null;
  latency_ms: number | null;
  tokens_used: number | null;
  status: "success" | "partial" | "error" | "noop";
  triggered_by: "cron" | "manual" | "webhook" | "agent";
  patch_proposed: boolean;
  patch_applied_at: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  output_data: Record<string, unknown> | null;
};

type Counts = {
  last24h: number;
  pending_patches: number;
  errors_24h: number;
  by_agent: Record<string, number>;
};

const TRIGGERABLE_AGENTS = [
  "site-supervisor",
  "category-link-auditor",
  "canonical-data-manager",
  "price-intelligence",
  "product-matcher",
];

export default function AdminAgentsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authOk, setAuthOk] = useState(false);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [triggeredByFilter, setTriggeredByFilter] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [limit, setLimit] = useState(50);

  // Expanded rows (output_data view)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Trigger UI state
  const [triggering, setTriggering] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<string>("");

  // Apply patch UI state
  const [applying, setApplying] = useState<string | null>(null);

  const getAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } as const;
  }, []);

  // Auth check
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = await getAuth();
      if (!auth) { router.push("/giris"); return; }
      const res = await fetch("/api/admin/check", { headers: auth });
      if (cancelled) return;
      if (!res.ok) { router.push("/"); return; }
      setAuthOk(true);
      setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  }, [getAuth, router]);

  const loadDecisions = useCallback(async () => {
    const auth = await getAuth();
    if (!auth) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (agentFilter) params.set("agent", agentFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (triggeredByFilter) params.set("triggered_by", triggeredByFilter);
      if (pendingOnly) params.set("pending", "true");
      params.set("limit", String(limit));
      const res = await fetch(`/api/admin/agents/decisions?${params}`, { headers: auth });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Yüklenemedi"); return; }
      setDecisions(json.decisions ?? []);
      setCounts(json.counts ?? null);
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }, [getAuth, agentFilter, statusFilter, triggeredByFilter, pendingOnly, limit]);

  useEffect(() => {
    if (!authOk) return;
    loadDecisions();
  }, [authOk, loadDecisions]);

  const handleTrigger = useCallback(async (agentName: string) => {
    const auth = await getAuth();
    if (!auth) return;
    setTriggering(agentName);
    setTriggerResult("");
    try {
      const res = await fetch("/api/admin/agents/trigger", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ agent_name: agentName }),
      });
      const json = await res.json();
      if (!res.ok) { setTriggerResult(`❌ ${json.error || "Hata"}`); return; }
      const summaryText = json.summary
        ? `broken=${json.summary.broken ?? "?"} leaf=${json.summary.leaf ?? "?"} patch_proposed=${json.patch_proposed}`
        : "";
      setTriggerResult(`✅ ${agentName} çalıştı (${json.duration_ms}ms, status=${json.status}) ${summaryText}`);
      loadDecisions();
    } catch {
      setTriggerResult("❌ Bağlantı hatası");
    } finally {
      setTriggering(null);
    }
  }, [getAuth, loadDecisions]);

  const handleApplyPatch = useCallback(async (decisionId: number | string, action: "apply" | "dismiss") => {
    const auth = await getAuth();
    if (!auth) return;
    if (action === "apply" && !confirm("Bu patch'i onaylıyor musun? (patch_applied_at damgalanır)")) return;
    if (action === "dismiss" && !confirm("Bu öneriyi reddediyor musun?")) return;
    setApplying(String(decisionId));
    try {
      const res = await fetch("/api/admin/agents/decisions", {
        method: "PATCH",
        headers: auth,
        body: JSON.stringify({ id: decisionId, action }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Hata"); return; }
      loadDecisions();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setApplying(null);
    }
  }, [getAuth, loadDecisions]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const uniqueAgents = useMemo(() => {
    const set = new Set<string>();
    for (const d of decisions) set.add(d.agent_name);
    if (counts) for (const k of Object.keys(counts.by_agent)) set.add(k);
    return [...set].sort();
  }, [decisions, counts]);

  if (!authChecked) {
    return (
      <main>
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center text-gray-400">Yetki kontrol ediliyor...</div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-2xl mb-1">Agent Kararları</h1>
            <p className="text-sm text-gray-400">agent_decisions tablosu — pilot ajanların çıktıları</p>
          </div>
          <a href="/admin" className="text-xs text-gray-500 underline hover:text-[#E8460A]">← Admin paneli</a>
        </div>

        {/* Counts */}
        {counts && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Son 24 saat</div>
              <div className="text-2xl font-bold mt-1">{counts.last24h}</div>
            </div>
            <div className={`border rounded-2xl p-4 ${counts.pending_patches > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
              <div className="text-xs text-amber-700 uppercase tracking-wide">Bekleyen patch</div>
              <div className="text-2xl font-bold mt-1 text-amber-800">{counts.pending_patches}</div>
            </div>
            <div className={`border rounded-2xl p-4 ${counts.errors_24h > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
              <div className="text-xs text-red-700 uppercase tracking-wide">Hata (24s)</div>
              <div className="text-2xl font-bold mt-1 text-red-700">{counts.errors_24h}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Aktif agent</div>
              <div className="text-2xl font-bold mt-1">{Object.keys(counts.by_agent).length}</div>
            </div>
          </div>
        )}

        {/* Manual trigger panel */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-base mb-2">Manuel Tetikleyici</h2>
          <p className="text-xs text-gray-500 mb-3">Cron beklemeden agent'ı şimdi çalıştır.</p>
          <div className="flex flex-wrap gap-2">
            {TRIGGERABLE_AGENTS.map((name) => (
              <button
                key={name}
                onClick={() => handleTrigger(name)}
                disabled={triggering !== null}
                className="text-xs bg-[#E8460A] text-white rounded-lg px-3 py-2 font-semibold disabled:opacity-50 hover:bg-[#C93A08] transition-all"
              >
                {triggering === name ? `${name} çalışıyor...` : `▶ ${name}`}
              </button>
            ))}
          </div>
          {triggerResult && (
            <div className="mt-3 text-xs px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 font-mono">{triggerResult}</div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Agent</label>
              <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                <option value="">Tümü</option>
                {uniqueAgents.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                <option value="">Tümü</option>
                <option value="success">success</option>
                <option value="partial">partial</option>
                <option value="error">error</option>
                <option value="noop">noop</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Triggered By</label>
              <select value={triggeredByFilter} onChange={(e) => setTriggeredByFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                <option value="">Tümü</option>
                <option value="cron">cron</option>
                <option value="manual">manual</option>
                <option value="webhook">webhook</option>
                <option value="agent">agent</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Limit</label>
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white">
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="text-xs text-gray-700 inline-flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
                Sadece bekleyen patch
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
        )}

        {/* Decisions table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-10 text-sm text-gray-400">Yükleniyor...</div>
          ) : decisions.length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">Kayıt yok</div>
          ) : (
            decisions.map((d) => {
              const idStr = String(d.id);
              const isExpanded = expanded.has(idStr);
              const ts = new Date(d.timestamp).toLocaleString("tr-TR");
              const statusColor =
                d.status === "success" ? "bg-green-100 text-green-700" :
                d.status === "partial" ? "bg-amber-100 text-amber-700" :
                d.status === "error" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700";
              const pendingPatch = d.patch_proposed && !d.patch_applied_at;
              return (
                <div key={idStr} className={`border-b border-gray-100 last:border-0 ${pendingPatch ? "bg-amber-50/30" : ""}`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{d.agent_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColor}`}>{d.status}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {d.triggered_by}
                        </span>
                        {pendingPatch && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                            patch bekliyor
                          </span>
                        )}
                        {d.patch_applied_at && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            patch işlendi
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {ts} · {d.method ?? "?"} · conf={d.confidence?.toFixed(2) ?? "?"} · {d.latency_ms ?? "?"}ms
                        {d.tokens_used ? ` · ${d.tokens_used} tok` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {pendingPatch && (
                        <>
                          <button onClick={() => handleApplyPatch(d.id, "apply")} disabled={applying === idStr}
                            className="text-xs bg-green-600 text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-green-700 disabled:opacity-50">
                            {applying === idStr ? "..." : "Onayla"}
                          </button>
                          <button onClick={() => handleApplyPatch(d.id, "dismiss")} disabled={applying === idStr}
                            className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 font-semibold hover:bg-gray-50 disabled:opacity-50">
                            Reddet
                          </button>
                        </>
                      )}
                      <button onClick={() => toggleExpand(idStr)}
                        className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                        {isExpanded ? "Gizle" : "Detay"}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50/50">
                      <div className="text-xs text-gray-600 mb-1">output_data:</div>
                      <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(d.output_data ?? {}, null, 2)}
                      </pre>
                      {d.related_entity_type && (
                        <div className="text-xs text-gray-500 mt-2">
                          related: {d.related_entity_type}{d.related_entity_id ? ` / ${d.related_entity_id}` : ""}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center">
          Toplam {decisions.length} kayıt gösteriliyor
        </div>
      </div>
      <Footer />
    </main>
  );
}
