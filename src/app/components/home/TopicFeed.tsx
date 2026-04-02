"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Topic = {
  id: string; title: string; body: string;
  user_name: string; category: string;
  votes: number; answer_count: number; created_at: string;
};

type Answer = {
  id: string; topic_id: string; user_name: string;
  body: string; votes: number; gender: string;
};

const CATS = ["Hepsi", "Elektronik", "Kozmetik", "Ev & Yaşam", "Spor", "Hediye", "Diğer"];

const CAT_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Elektronik:   { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",   dot: "bg-blue-400" },
  Kozmetik:     { bg: "bg-pink-50",    text: "text-pink-700",    border: "border-pink-200",   dot: "bg-pink-400" },
  "Ev & Yaşam": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",dot: "bg-emerald-400" },
  "Ev & Yasam": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",dot: "bg-emerald-400" },
  Spor:         { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200", dot: "bg-orange-400" },
  Hediye:       { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200", dot: "bg-purple-400" },
  Diğer:        { bg: "bg-gray-100",   text: "text-gray-600",    border: "border-gray-200",   dot: "bg-gray-400" },
  Diger:        { bg: "bg-gray-100",   text: "text-gray-600",    border: "border-gray-200",   dot: "bg-gray-400" },
};

const CAT_LEFT_BORDER: Record<string, string> = {
  Elektronik:   "border-l-blue-400",
  Kozmetik:     "border-l-pink-400",
  "Ev & Yaşam": "border-l-emerald-400",
  "Ev & Yasam": "border-l-emerald-400",
  Spor:         "border-l-orange-400",
  Hediye:       "border-l-purple-400",
  Diğer:        "border-l-gray-300",
  Diger:        "border-l-gray-300",
};

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-indigo-500 to-blue-600",
  "from-teal-500 to-green-500",
  "from-red-500 to-rose-600",
];
const avatarGrad = (name: string) => GRADIENTS[(name || "A").charCodeAt(0) % GRADIENTS.length];

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "şimdi";
  if (s < 3600) return Math.floor(s / 60) + "dk";
  if (s < 86400) return Math.floor(s / 3600) + "sa";
  return Math.floor(s / 86400) + "g";
};

export default function TopicFeed({ compact: _compact }: { compact?: boolean }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer[]>>({});
  const [activeCat, setActiveCat] = useState("Hepsi");
  const [showForm, setShowForm] = useState(false);
  const [titleVal, setTitleVal] = useState("");
  const [bodyVal, setBodyVal] = useState("");
  const [catVal, setCatVal] = useState("Elektronik");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [newCount, setNewCount] = useState(0);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const isFirst = useRef(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: v } = await supabase.from("topic_votes")
          .select("topic_id,vote").eq("user_id", data.user.id);
        if (v) setUserVotes(Object.fromEntries(v.map(x => [x.topic_id, x.vote])));
      }
    });
    fetchTopics();
    const ch = supabase.channel("topics-rt3")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "topics" }, p => {
        if (isFirst.current) return;
        setTopics(prev => [p.new as Topic, ...prev]);
        setNewCount(c => c + 1);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "topics" }, p => {
        const u = p.new as Topic;
        setTopics(prev => prev.map(t => t.id === u.id ? { ...t, votes: u.votes, answer_count: u.answer_count } : t));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchTopics = async () => {
    const { data } = await supabase.from("topics").select("*")
      .order("created_at", { ascending: false }).limit(60);
    if (!data) return;
    setTopics(data);
    isFirst.current = false;

    // Tüm topic'lerin cevaplarını tek sorguda çek
    const ids = data.map(t => t.id);
    if (ids.length > 0) {
      const { data: ans } = await supabase.from("topic_answers")
        .select("id,topic_id,user_name,body,votes,gender")
        .in("topic_id", ids)
        .order("votes", { ascending: false });
      if (ans) {
        const grouped: Record<string, Answer[]> = {};
        ans.forEach(a => {
          if (!grouped[a.topic_id]) grouped[a.topic_id] = [];
          grouped[a.topic_id].push(a);
        });
        setAnswers(grouped);
      }
    }
  };

  const getDisplay = (u: any) =>
    u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Kullanıcı";

  const handleSubmit = async () => {
    if (!titleVal.trim() || !user) return;
    setSubmitting(true);
    await supabase.from("topics").insert({
      user_id: user.id, user_name: getDisplay(user),
      title: titleVal, body: bodyVal, category: catVal, votes: 0, answer_count: 0,
    });
    setTitleVal(""); setBodyVal(""); setShowForm(false); setSubmitting(false);
  };

  const handleVote = async (e: React.MouseEvent, t: Topic, val: 1 | -1) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { window.location.href = "/giris"; return; }
    const cur = userVotes[t.id] || 0;
    const diff = cur === val ? -val : cur === 0 ? val : val * 2;
    const nv = cur === val ? 0 : val;
    if (cur === val) await supabase.from("topic_votes").delete().eq("topic_id", t.id).eq("user_id", user.id);
    else await supabase.from("topic_votes").upsert({ topic_id: t.id, user_id: user.id, vote: val }, { onConflict: "topic_id,user_id" });
    const newTotal = (t.votes || 0) + diff;
    await supabase.from("topics").update({ votes: newTotal }).eq("id", t.id);
    setTopics(prev => prev.map(x => x.id === t.id ? { ...x, votes: newTotal } : x));
    setUserVotes(prev => ({ ...prev, [t.id]: nv }));
  };

  const normalize = (s: string) => s.replace(/ğ/g, "g").replace(/ş/g, "s").replace(/İ/g, "I").replace(/ı/g, "i");
  const filtered = topics.filter(t =>
    activeCat === "Hepsi" || t.category === activeCat || normalize(t.category) === normalize(activeCat)
  );

  // Popüler sorular: oylarına göre sıralı top 8
  const popular = [...topics].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 8);

  return (
    <div className="flex flex-col h-full bg-[#FAFAF8]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-sm text-gray-900">Sıcak Tavsiyeler</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filtered.length} soru</span>
          </div>
          <button
            onClick={() => { if (!user) { window.location.href = "/giris"; return; } setShowForm(v => !v); }}
            className="flex items-center gap-1.5 bg-[#E8460A] hover:bg-[#C93A08] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-orange-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Soru Sor
          </button>
        </div>

        {/* Kategori sekmeleri */}
        <div className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATS.map(c => {
            const style = CAT_STYLE[c];
            const isActive = activeCat === c;
            return (
              <button key={c} onClick={() => setActiveCat(c)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive ? "border-[#E8460A] text-[#E8460A]" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}>
                {style && !isActive && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Soru Formu ── */}
      {showForm && (
        <div className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">Yeni Soru</span>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
          <div className="p-3.5">
            <input type="text" value={titleVal} onChange={e => setTitleVal(e.target.value)}
              placeholder="Sorunuzu yazın... (örn: 5000₺'ye en iyi kulaklık hangisi?)"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#E8460A] mb-2.5 transition-all" />
            <textarea value={bodyVal} onChange={e => setBodyVal(e.target.value)}
              placeholder="Detay ekleyin (isteğe bağlı)" rows={2}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#E8460A] resize-none mb-2.5 transition-all text-gray-700" />
            <div className="flex gap-2">
              <select value={catVal} onChange={e => setCatVal(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#E8460A] bg-white text-gray-700">
                {CATS.filter(c => c !== "Hepsi").map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={handleSubmit} disabled={submitting || !titleVal.trim()}
                className="px-5 py-2 bg-[#E8460A] text-white text-xs font-bold rounded-xl hover:bg-[#C93A08] disabled:opacity-40 transition-all">
                {submitting ? "..." : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Yeni soru bildirimi ── */}
      {newCount > 0 && (
        <button onClick={() => setNewCount(0)}
          className="mx-4 mt-2 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          {newCount} yeni soru geldi — görmek için tıkla
        </button>
      )}

      {/* ── İçerik: Feed + Popüler Sidebar ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Ana Feed */}
        <div className="flex-1 overflow-y-auto min-w-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-3">💬</div>
              <div className="text-sm font-semibold text-gray-500 mb-1">Henüz soru yok</div>
              <div className="text-xs text-gray-400">Bu kategoride ilk soruyu sen sor!</div>
            </div>
          ) : (
            <div className="py-2 px-3 space-y-2">
              {filtered.map(t => {
                const cs = CAT_STYLE[t.category];
                const leftBorder = CAT_LEFT_BORDER[t.category] || "border-l-gray-200";
                const myVote = userVotes[t.id] || 0;
                const netVotes = t.votes || 0;
                const topAnswers = (answers[t.id] || []).slice(0, 2);

                return (
                  <Link href={"/tavsiye/" + t.id} key={t.id}>
                    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${leftBorder} hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group overflow-hidden`}>
                      <div className="p-3.5">
                        {/* Üst satır: avatar + isim + kategori + zaman */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGrad(t.user_name)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                            {(t.user_name || "?")[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-gray-700 truncate max-w-[80px]">{t.user_name}</span>
                          {cs && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cs.bg} ${cs.text} ${cs.border}`}>
                              {t.category}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-300 ml-auto flex-shrink-0">{timeAgo(t.created_at)}</span>
                        </div>

                        {/* Soru başlığı */}
                        <p className="text-sm font-semibold text-gray-800 leading-snug mb-1 group-hover:text-[#E8460A] transition-colors line-clamp-2">
                          {t.title}
                        </p>

                        {/* Body önizleme */}
                        {t.body && (
                          <p className="text-xs text-gray-400 line-clamp-1 mb-2 leading-relaxed">{t.body}</p>
                        )}

                        {/* Top 2 cevap önizlemesi */}
                        {topAnswers.length > 0 && (
                          <div className="mt-2 mb-2.5 space-y-1.5 border-t border-gray-50 pt-2">
                            {topAnswers.map(a => (
                              <div key={a.id} className="flex items-start gap-1.5">
                                <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[8px] font-bold text-white ${
                                  a.gender === "kadin" ? "bg-gradient-to-br from-pink-400 to-rose-400" : "bg-gradient-to-br from-blue-400 to-indigo-400"
                                }`}>
                                  {(a.user_name || "?")[0].toUpperCase()}
                                </div>
                                <p className="text-[11px] text-gray-500 line-clamp-1 flex-1 leading-relaxed">
                                  <span className="font-semibold text-gray-600">{a.user_name}:</span>{" "}
                                  {a.body}
                                </p>
                                {a.votes > 0 && (
                                  <span className="text-[10px] text-emerald-500 font-semibold flex-shrink-0">👍{a.votes}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Alt satır: yanıtla + oy */}
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={"/tavsiye/" + t.id}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-[#E8460A]/5 text-[#E8460A] font-semibold hover:bg-[#E8460A]/10 transition-all border border-[#E8460A]/10">
                            💬 Yanıtla
                            {t.answer_count > 0 && <span className="text-[10px] text-[#E8460A]/60">{t.answer_count}</span>}
                          </Link>

                          <div className="ml-auto flex items-center gap-1">
                            <button onClick={e => handleVote(e, t, 1)}
                              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all ${
                                myVote === 1
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-600 font-bold"
                                  : "border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-500 hover:bg-emerald-50"
                              }`}>
                              👍 <span className="font-semibold">{netVotes > 0 ? netVotes : 0}</span>
                            </button>
                            <button onClick={e => handleVote(e, t, -1)}
                              className={`flex items-center text-[11px] px-2 py-1 rounded-lg border transition-all ${
                                myVote === -1
                                  ? "bg-red-50 border-red-300 text-red-500"
                                  : "border-gray-200 text-gray-300 hover:border-red-200 hover:text-red-400 hover:bg-red-50"
                              }`}>
                              👎
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Yanıt progress bar */}
                      {t.answer_count > 0 && (
                        <div className="h-0.5 bg-gray-50">
                          <div
                            className={`h-full ${cs ? cs.dot : "bg-gray-200"} opacity-40`}
                            style={{ width: `${Math.min(t.answer_count * 10, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Popüler Sorular Sidebar ── */}
        <div className="w-[220px] flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
          <div className="px-3 pt-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔥</span>
              <span className="text-[11px] font-bold text-gray-700">Popüler Sorular</span>
            </div>
          </div>
          <div className="py-1">
            {popular.map((t, i) => {
              const cs = CAT_STYLE[t.category];
              return (
                <Link href={"/tavsiye/" + t.id} key={t.id}>
                  <div className="px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0 group">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-bold w-4 flex-shrink-0 ${i < 3 ? "text-[#E8460A]" : "text-gray-300"}`}>
                        #{i + 1}
                      </span>
                      {cs && (
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cs.dot}`} />
                      )}
                      <span className="text-[10px] text-gray-400 truncate">{t.category}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 leading-snug line-clamp-2 group-hover:text-[#E8460A] transition-colors mb-1">
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span>👍 {t.votes || 0}</span>
                      <span>💬 {t.answer_count}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
