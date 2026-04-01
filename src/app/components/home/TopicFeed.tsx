"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Topic = {
  id: string; title: string; body: string;
  user_name: string; category: string;
  votes: number; answer_count: number; created_at: string;
};

const CATS = ["Hepsi", "Elektronik", "Kozmetik", "Ev & Yasam", "Spor", "Hediye", "Diger"];

const CAT_STYLE: Record<string, { dot: string; badge: string }> = {
  Elektronik:    { dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-600" },
  Kozmetik:      { dot: "bg-pink-400",   badge: "bg-pink-50 text-pink-600" },
  "Ev & Yasam":  { dot: "bg-emerald-400",badge: "bg-emerald-50 text-emerald-600" },
  Spor:          { dot: "bg-orange-400", badge: "bg-orange-50 text-orange-600" },
  Hediye:        { dot: "bg-purple-400", badge: "bg-purple-50 text-purple-600" },
  Diger:         { dot: "bg-gray-300",   badge: "bg-gray-50 text-gray-500" },
};

const timeAgo = (date: string) => {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "az önce";
  if (s < 3600) return Math.floor(s / 60) + " dk";
  if (s < 86400) return Math.floor(s / 3600) + " sa";
  return Math.floor(s / 86400) + " gün";
};

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-500",
];
const avatarColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export default function TopicFeed({ compact = false }: { compact?: boolean }) {
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
    const ch = supabase.channel("topics-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "topics" }, (p) => {
        if (isFirst.current) return;
        setTopics(prev => [p.new as Topic, ...prev]);
        setNewCount(c => c + 1);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "topics" }, (p) => {
        const u = p.new as Topic;
        setTopics(prev => prev.map(t => t.id === u.id ? { ...t, answer_count: u.answer_count, votes: u.votes } : t));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchTopics = async () => {
    const { data } = await supabase.from("topics").select("*")
      .order("created_at", { ascending: false }).limit(40);
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
    setTitleVal(""); setBodyVal(""); setShowForm(false);
    setSubmitting(false);
  };

  const handleVote = async (e: React.MouseEvent, t: Topic, val: 1 | -1) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { window.location.href = "/giris"; return; }
    const cur = userVotes[t.id] || 0;
    let diff = 0, nv = 0;
    if (cur === val) {
      diff = -val; nv = 0;
      await supabase.from("topic_votes").delete().eq("topic_id", t.id).eq("user_id", user.id);
    } else {
      diff = cur === 0 ? val : val * 2; nv = val;
      await supabase.from("topic_votes").upsert({ topic_id: t.id, user_id: user.id, vote: val }, { onConflict: "topic_id,user_id" });
    }
    const newTotal = (t.votes || 0) + diff;
    await supabase.from("topics").update({ votes: newTotal }).eq("id", t.id);
    setTopics(prev => prev.map(x => x.id === t.id ? { ...x, votes: newTotal } : x));
    setUserVotes(prev => ({ ...prev, [t.id]: nv }));
  };

  const filtered = topics
    .filter(t => activeCat === "Hepsi" || t.category === activeCat);

  const trendTopics = [...topics].sort((a, b) => b.votes - a.votes).slice(0, 5);

  return (
    <div className={compact ? "flex flex-col" : "flex gap-6"}>

      {/* ANA FEED */}
      <div className="flex-1 min-w-0">

        {/* Kategori filtreleri */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setActiveCat(c)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCat === c
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}>
              {c !== "Hepsi" && CAT_STYLE[c] && (
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CAT_STYLE[c].dot}`} />
              )}
              {c}
            </button>
          ))}
        </div>

        {/* Yeni bildirim */}
        {newCount > 0 && (
          <button onClick={() => { setNewCount(0); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="w-full mb-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2">
            ↑ {newCount} yeni tavsiye
          </button>
        )}

        {/* Soru sor CTA */}
        {!showForm ? (
          <button
            onClick={() => { if (!user) { window.location.href = "/giris"; return; } setShowForm(true); }}
            className="w-full flex items-center gap-3 mb-3 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs text-gray-400 hover:border-[#E8460A] hover:text-[#E8460A] transition-all group">
            <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-[#E8460A]/10 flex items-center justify-center flex-shrink-0 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </div>
            <span>{user ? "Tavsiye ister misin? Buraya yaz..." : "Soru sormak için giriş yap →"}</span>
          </button>
        ) : (
          <div className="mb-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-800">Soru Sor</span>
              <button onClick={() => setShowForm(false)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">×</button>
            </div>
            <input type="text" value={titleVal} onChange={e => setTitleVal(e.target.value)}
              placeholder="Sorunuzu yazın... (örn: 5000 TL'ye en iyi telefon hangisi?)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8460A] mb-2 transition-all" />
            <textarea value={bodyVal} onChange={e => setBodyVal(e.target.value)}
              placeholder="Detay ekleyin (isteğe bağlı)"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#E8460A] mb-2 resize-none transition-all text-gray-700" />
            <div className="flex gap-2">
              <select value={catVal} onChange={e => setCatVal(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#E8460A] bg-white">
                {CATS.filter(c => c !== "Hepsi").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={handleSubmit} disabled={submitting || !titleVal.trim()}
                className="px-5 py-2 bg-[#E8460A] text-white text-xs font-bold rounded-xl hover:bg-[#C93A08] disabled:opacity-40 transition-all">
                {submitting ? "..." : "Gönder"}
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <div className="text-3xl mb-2">💬</div>
              <div className="text-xs text-gray-400">Henüz soru yok — ilk soruyu sen sor!</div>
            </div>
          ) : filtered.map(t => {
            const myVote = userVotes[t.id] || 0;
            const cs = CAT_STYLE[t.category];
            return (
              <Link href={"/tavsiye/" + t.id} key={t.id}>
                <div className="bg-white rounded-2xl border border-gray-100 p-3.5 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(t.user_name || "A")} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                      {(t.user_name || "A")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Meta */}
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">{t.user_name}</span>
                        {cs && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cs.badge}`}>
                            {t.category}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-300 ml-auto">{timeAgo(t.created_at)}</span>
                      </div>
                      {/* Başlık */}
                      <div className="text-sm font-semibold text-gray-800 leading-snug mb-1 group-hover:text-[#E8460A] transition-colors line-clamp-2">{t.title}</div>
                      {t.body && <div className="text-xs text-gray-400 line-clamp-1 mb-2">{t.body}</div>}
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                          {t.answer_count}
                        </span>
                        <button onClick={e => handleVote(e, t, 1)}
                          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                            myVote === 1 ? "bg-emerald-50 border-emerald-200 text-emerald-600 font-semibold" : "border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-500"
                          }`}>
                          <svg className="w-3 h-3" fill={myVote === 1 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" /></svg>
                          {t.votes > 0 ? t.votes : 0}
                        </button>
                        <button onClick={e => handleVote(e, t, -1)}
                          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                            myVote === -1 ? "bg-red-50 border-red-200 text-red-500 font-semibold" : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400"
                          }`}>
                          <svg className="w-3 h-3" fill={myVote === -1 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54m.023-8.25H16.48a4.5 4.5 0 01-1.423-.23l-3.114-1.04a4.5 4.5 0 00-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 002.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* SIDEBAR — sadece tam görünümde */}
      {!compact && (
        <div className="w-52 flex-shrink-0 hidden lg:flex flex-col gap-4">
          {/* Trend */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
              <span className="font-bold text-xs text-gray-700">Trend</span>
            </div>
            <div className="p-2">
              {trendTopics.length === 0
                ? <div className="text-xs text-gray-300 text-center py-4">Henüz yok</div>
                : trendTopics.map((t, i) => (
                  <Link href={"/tavsiye/" + t.id} key={t.id}>
                    <div className="flex items-start gap-2 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors group">
                      <span className={`text-xs font-black flex-shrink-0 w-4 ${i === 0 ? "text-[#E8460A]" : i === 1 ? "text-orange-300" : "text-gray-200"}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 line-clamp-2 group-hover:text-gray-900 leading-snug transition-colors">{t.title}</div>
                        <div className="text-[10px] text-gray-300 mt-0.5">{t.votes} oy</div>
                      </div>
                    </div>
                  </Link>
                ))
              }
            </div>
          </div>

          {/* En Aktif */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
              <span className="font-bold text-xs text-gray-700">En Aktif</span>
            </div>
            <div className="p-2">
              {[...topics].sort((a, b) => b.answer_count - a.answer_count).slice(0, 5).length === 0
                ? <div className="text-xs text-gray-300 text-center py-4">Henüz yok</div>
                : [...topics].sort((a, b) => b.answer_count - a.answer_count).slice(0, 5).map(t => (
                  <Link href={"/tavsiye/" + t.id} key={t.id}>
                    <div className="flex items-start gap-2 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarColor(t.user_name || "A")} flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0`}>
                        {(t.user_name || "A")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 line-clamp-2 group-hover:text-gray-900 leading-snug transition-colors">{t.title}</div>
                        <div className="text-[10px] text-gray-300 mt-0.5">{t.answer_count} cevap</div>
                      </div>
                    </div>
                  </Link>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
