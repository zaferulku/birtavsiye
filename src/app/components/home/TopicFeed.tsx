"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Topic = {
  id: string; title: string; body: string;
  user_name: string; category: string;
  votes: number; answer_count: number; created_at: string;
};

const CATS = ["Hepsi", "Elektronik", "Kozmetik", "Ev & Yaşam", "Spor", "Hediye", "Diğer"];

const CAT: Record<string, { bg: string; text: string; dot: string }> = {
  Elektronik:    { bg: "bg-blue-50",    text: "text-blue-600",    dot: "bg-blue-400" },
  Kozmetik:      { bg: "bg-pink-50",    text: "text-pink-600",    dot: "bg-pink-400" },
  "Ev & Yaşam":  { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
  "Ev & Yasam":  { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
  Spor:          { bg: "bg-orange-50",  text: "text-orange-600",  dot: "bg-orange-400" },
  Hediye:        { bg: "bg-purple-50",  text: "text-purple-600",  dot: "bg-purple-400" },
  Diğer:         { bg: "bg-gray-50",    text: "text-gray-500",    dot: "bg-gray-300" },
  Diger:         { bg: "bg-gray-50",    text: "text-gray-500",    dot: "bg-gray-300" },
};

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-indigo-500 to-blue-600",
];
const grad = (name: string) => AVATAR_GRADIENTS[(name || "A").charCodeAt(0) % AVATAR_GRADIENTS.length];

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "şimdi";
  if (s < 3600) return Math.floor(s / 60) + "dk";
  if (s < 86400) return Math.floor(s / 3600) + "sa";
  return Math.floor(s / 86400) + "g";
};

export default function TopicFeed({ compact: _compact }: { compact?: boolean }) {
  const [topics, setTopics] = useState<Topic[]>([]);
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
    const ch = supabase.channel("topics-rt2")
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
      .order("created_at", { ascending: false }).limit(50);
    if (data) { setTopics(data); isFirst.current = false; }
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
    let diff = cur === val ? -val : cur === 0 ? val : val * 2;
    let nv = cur === val ? 0 : val;
    if (cur === val) await supabase.from("topic_votes").delete().eq("topic_id", t.id).eq("user_id", user.id);
    else await supabase.from("topic_votes").upsert({ topic_id: t.id, user_id: user.id, vote: val }, { onConflict: "topic_id,user_id" });
    const newTotal = (t.votes || 0) + diff;
    await supabase.from("topics").update({ votes: newTotal }).eq("id", t.id);
    setTopics(prev => prev.map(x => x.id === t.id ? { ...x, votes: newTotal } : x));
    setUserVotes(prev => ({ ...prev, [t.id]: nv }));
  };

  const filtered = topics.filter(t => activeCat === "Hepsi" || t.category === activeCat || t.category === activeCat.replace("ş", "s").replace("ğ", "g").replace("İ", "I"));

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-900">Bana Bir Tavsiye</span>
            <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-600">Canlı</span>
            </div>
          </div>
          <button
            onClick={() => { if (!user) { window.location.href = "/giris"; return; } setShowForm(v => !v); }}
            className="flex items-center gap-1.5 bg-[#E8460A] text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-[#C93A08] transition-all">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Soru Sor
          </button>
        </div>

        {/* Kategori filtreleri */}
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                activeCat === c ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}>
              {CAT[c] && activeCat !== c && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${CAT[c].dot}`} />}
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Soru formu */}
      {showForm && (
        <div className="mx-4 mt-3 bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm">
          <input type="text" value={titleVal} onChange={e => setTitleVal(e.target.value)}
            placeholder="Ne sormak istiyorsunuz? (örn: 5000₺'ye en iyi kulaklık hangisi?)"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#E8460A] mb-2 transition-all" />
          <textarea value={bodyVal} onChange={e => setBodyVal(e.target.value)}
            placeholder="Detay ekleyin (isteğe bağlı)" rows={2}
            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#E8460A] resize-none mb-2 transition-all text-gray-700" />
          <div className="flex gap-2">
            <select value={catVal} onChange={e => setCatVal(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#E8460A] bg-white">
              {CATS.filter(c => c !== "Hepsi").map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={handleSubmit} disabled={submitting || !titleVal.trim()}
              className="px-4 py-2 bg-[#E8460A] text-white text-xs font-bold rounded-xl hover:bg-[#C93A08] disabled:opacity-40 transition-all">
              {submitting ? "..." : "Gönder"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl">İptal</button>
          </div>
        </div>
      )}

      {/* Yeni bildirim */}
      {newCount > 0 && (
        <button onClick={() => setNewCount(0)}
          className="mx-4 mt-2 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          {newCount} yeni tavsiye
        </button>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-300">Henüz soru yok</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(t => {
              const cs = CAT[t.category];
              const myVote = userVotes[t.id] || 0;
              return (
                <Link href={"/tavsiye/" + t.id} key={t.id}>
                  <div className="px-4 py-3.5 hover:bg-white transition-colors cursor-pointer group">
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad(t.user_name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5`}>
                        {(t.user_name || "?")[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Meta satırı */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-gray-700 truncate max-w-[90px]">{t.user_name}</span>
                          {cs && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${cs.bg} ${cs.text}`}>
                              {t.category}
                            </span>
                          )}
                          <span className="text-[10px] text-gray-300 ml-auto flex-shrink-0">{timeAgo(t.created_at)}</span>
                        </div>

                        {/* Başlık */}
                        <p className="text-sm font-semibold text-gray-800 leading-snug mb-1 group-hover:text-[#E8460A] transition-colors line-clamp-2">{t.title}</p>

                        {/* Body */}
                        {t.body && <p className="text-xs text-gray-400 line-clamp-1 mb-2">{t.body}</p>}

                        {/* Actions */}
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                            {t.answer_count}
                          </span>
                          <button onClick={e => handleVote(e, t, 1)}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                              myVote === 1 ? "bg-emerald-50 border-emerald-300 text-emerald-600 font-semibold" : "border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-500"
                            }`}>
                            ↑ {t.votes > 0 ? t.votes : 0}
                          </button>
                          <button onClick={e => handleVote(e, t, -1)}
                            className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                              myVote === -1 ? "bg-red-50 border-red-300 text-red-500" : "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400"
                            }`}>
                            ↓
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
