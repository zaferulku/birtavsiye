"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Link from "next/link";

type Topic = {
  id: string; title: string; body: string;
  user_name: string; category: string;
  votes: number; answer_count: number; created_at: string;
  product_slug?: string | null; product_title?: string | null; product_brand?: string | null; product_id?: string | null;
};

type Answer = {
  id: string; topic_id: string; user_id: string;
  user_name: string; gender: string; body: string;
  votes: number; created_at: string;
  parent_id?: string | null;
};

type PopularTopic = {
  id: string; title: string; category: string;
  votes: number; answer_count: number; created_at: string;
};

const CAT_GRADIENT: Record<string, { from: string; to: string; light: string; dot: string; text: string }> = {
  Elektronik:   { from: "from-blue-500",    to: "to-cyan-500",     light: "bg-blue-50",    dot: "bg-blue-400",    text: "text-blue-700" },
  Kozmetik:     { from: "from-pink-500",    to: "to-rose-500",     light: "bg-pink-50",    dot: "bg-pink-400",    text: "text-pink-700" },
  "Ev & Yaşam": { from: "from-emerald-500", to: "to-teal-500",     light: "bg-emerald-50", dot: "bg-emerald-400", text: "text-emerald-700" },
  "Ev & Yasam": { from: "from-emerald-500", to: "to-teal-500",     light: "bg-emerald-50", dot: "bg-emerald-400", text: "text-emerald-700" },
  Spor:         { from: "from-orange-500",  to: "to-amber-500",    light: "bg-orange-50",  dot: "bg-orange-400",  text: "text-orange-700" },
  Hediye:       { from: "from-purple-500",  to: "to-violet-500",   light: "bg-purple-50",  dot: "bg-purple-400",  text: "text-purple-700" },
  Diğer:        { from: "from-gray-400",    to: "to-slate-500",    light: "bg-gray-100",   dot: "bg-gray-400",    text: "text-gray-600" },
  Diger:        { from: "from-gray-400",    to: "to-slate-500",    light: "bg-gray-100",   dot: "bg-gray-400",    text: "text-gray-600" },
};

const DEFAULT_CAT = { from: "from-[#E8460A]", to: "to-orange-500", light: "bg-orange-50", dot: "bg-[#E8460A]", text: "text-[#E8460A]" };

const timeAgo = (date: string) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "az önce";
  if (diff < 3600) return Math.floor(diff / 60) + " dk önce";
  if (diff < 86400) return Math.floor(diff / 3600) + " sa önce";
  return Math.floor(diff / 86400) + " gün önce";
};

function Avatar({ gender, name, size = "md" }: { gender?: string; name: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const s = { xs: "w-6 h-6 text-xs", sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-base", lg: "w-12 h-12 text-lg" }[size];
  const bg = gender === "kadin"
    ? "from-pink-400 to-rose-500"
    : gender === "erkek"
    ? "from-blue-400 to-indigo-500"
    : "from-[#E8460A] to-orange-400";
  const icon = gender === "kadin" ? "♀" : gender === "erkek" ? "♂" : (name || "?")[0].toUpperCase();
  return (
    <div className={`${s} rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-white font-bold flex-shrink-0 shadow`}>
      {icon}
    </div>
  );
}

function GenderPill({ gender }: { gender?: string }) {
  if (gender === "kadin") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-pink-600 bg-pink-100 border border-pink-200 px-2 py-0.5 rounded-full">
      ♀ Kadın
    </span>
  );
  if (gender === "erkek") return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
      ♂ Erkek
    </span>
  );
  return null;
}

export default function TavsiyeDetay() {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [popular, setPopular] = useState<PopularTopic[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userGender, setUserGender] = useState("");
  const [userName, setUserName] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const mainReplyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchAll();
    fetchPopular();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      const n = data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split("@")[0] || "Kullanıcı";
      setUserName(n);
      const { data: profile } = await supabase.from("profiles").select("gender").eq("id", data.user.id).maybeSingle();
      setUserGender(profile?.gender || "");
      const { data: votes } = await supabase.from("topic_answer_votes").select("answer_id, vote").eq("user_id", data.user.id);
      if (votes) setUserVotes(Object.fromEntries(votes.map(v => [v.answer_id, v.vote])));
    });

    const channel = supabase.channel(`answers-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "topic_answers", filter: `topic_id=eq.${id}` }, (payload) => {
        setAnswers(prev => prev.find(a => a.id === payload.new.id) ? prev : [...prev, payload.new as Answer]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchAll = async () => {
    const { data: t } = await supabase.from("topics").select("*").eq("id", id).maybeSingle();
    setTopic(t);
    const { data: a } = await supabase.from("topic_answers").select("*").eq("topic_id", id).order("created_at", { ascending: true });
    setAnswers(a || []);
  };

  const fetchPopular = async () => {
    const { data } = await supabase.from("topics").select("id,title,category,votes,answer_count,created_at")
      .order("votes", { ascending: false }).limit(10);
    if (data) setPopular(data);
  };

  const handleAnswer = async () => {
    if (!answerText.trim() || !user) return;
    setLoading(true);
    await supabase.from("topic_answers").insert({ topic_id: id, user_id: user.id, user_name: userName, gender: userGender, body: answerText, votes: 0, parent_id: null });
    await supabase.from("topics").update({ answer_count: (topic?.answer_count || 0) + 1 }).eq("id", id);
    setAnswerText(""); setLoading(false);
    await fetchAll();
  };

  const handleReply = async (parentId: string) => {
    const text = replyTexts[parentId];
    if (!text?.trim() || !user) return;
    setReplyLoading(prev => ({ ...prev, [parentId]: true }));
    await supabase.from("topic_answers").insert({ topic_id: id, user_id: user.id, user_name: userName, gender: userGender, body: text, votes: 0, parent_id: parentId });
    await supabase.from("topics").update({ answer_count: (topic?.answer_count || 0) + 1 }).eq("id", id);
    setReplyTexts(prev => ({ ...prev, [parentId]: "" }));
    setReplyOpen(prev => ({ ...prev, [parentId]: false }));
    setReplyLoading(prev => ({ ...prev, [parentId]: false }));
    await fetchAll();
  };

  const handleVote = async (answer: Answer, voteValue: 1 | -1) => {
    if (!user) return;
    const cur = userVotes[answer.id] || 0;
    const voteDiff = cur === voteValue ? -voteValue : cur === 0 ? voteValue : voteValue * 2;
    const newVote = cur === voteValue ? 0 : voteValue;
    if (cur === voteValue) await supabase.from("topic_answer_votes").delete().eq("answer_id", answer.id).eq("user_id", user.id);
    else await supabase.from("topic_answer_votes").upsert({ answer_id: answer.id, user_id: user.id, vote: voteValue }, { onConflict: "answer_id,user_id" });
    const newTotal = (answer.votes || 0) + voteDiff;
    await supabase.from("topic_answers").update({ votes: newTotal }).eq("id", answer.id);
    setAnswers(prev => prev.map(a => a.id === answer.id ? { ...a, votes: newTotal } : a));
    setUserVotes(prev => ({ ...prev, [answer.id]: newVote }));
  };

  const topLevel = answers.filter(a => !a.parent_id);
  const repliesOf = (pid: string) => answers.filter(a => a.parent_id === pid);
  const bestAnswer = topLevel.length > 0 ? topLevel.reduce((best, a) => a.votes > best.votes ? a : best, topLevel[0]) : null;

  const cat = topic ? (CAT_GRADIENT[topic.category] || DEFAULT_CAT) : DEFAULT_CAT;

  if (!topic) return (
    <main className="min-h-screen bg-[#F2F2F0]">
      <Header />
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-[#E8460A] animate-spin" />
          <span className="text-sm">Yükleniyor...</span>
        </div>
      </div>
      <Footer />
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F2F2F0]">
      <Header />

      {/* ── Banner ── */}
      <div className="bg-gradient-to-br from-[#E8460A] to-orange-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 rounded-full bg-black/10" />

        <div className="max-w-[1100px] mx-auto px-4 pt-5 pb-0 relative z-10">
          <Link href="/tavsiyeler" className="inline-flex items-center gap-1 text-white/60 hover:text-white text-xs mb-5 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Sıcak Tavsiyeler
          </Link>

          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold text-white/60 bg-white/10 border border-white/20 px-2.5 py-1 rounded-full uppercase tracking-wide">
                {topic.category}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight mb-3" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
              {topic.title}
            </h1>
            {topic.body && (
              <p className="text-sm text-white/75 leading-relaxed mb-4">{topic.body}</p>
            )}
          </div>

          {/* Stats bar — sayfanın altına yapışık */}
          <div className="flex items-center gap-4 bg-black/20 -mx-4 px-4 py-3 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                {(topic.user_name || "?")[0].toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-white">{topic.user_name}</span>
            </div>
            <span className="text-white/40">·</span>
            <span className="text-xs text-white/60">{timeAgo(topic.created_at)}</span>
            <div className="ml-auto flex items-center gap-4">
              <span className="text-sm font-bold text-white/90">👍 {topic.votes || 0}</span>
              <span className="text-sm font-bold text-white bg-white/20 px-3 py-1 rounded-full">
                💬 {answers.length} yanıt
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 py-5 flex gap-5 items-start">

        {/* ── Ana İçerik ── */}
        <div className="flex-1 min-w-0">

          {/* ── Bağlı Ürün ── */}
          {topic.product_slug && (
            <Link href={"/urun/" + topic.product_slug}>
              <div className="flex items-center gap-3 bg-white border border-orange-200 rounded-2xl px-4 py-3 mb-4 shadow-sm hover:shadow-md hover:border-orange-300 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">📦</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-0.5">Bağlı Ürün</p>
                  <p className="text-sm font-bold text-gray-800 truncate group-hover:text-[#E8460A] transition-colors">
                    {topic.product_brand} {topic.product_title}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-[#E8460A] flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          )}

          {/* ── Öne Çıkan 2 Yanıt ── */}
          {topLevel.length > 0 && (() => {
            const top2 = [...topLevel].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 2);
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-xs font-black text-gray-700">⭐ Öne Çıkan Yanıtlar</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{topLevel.length} yanıtın en iyileri</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {top2.map(a => (
                    <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                      <Avatar gender={a.gender} name={a.user_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-gray-800">{a.user_name}</span>
                          <GenderPill gender={a.gender} />
                          {a.votes > 0 && <span className="ml-auto text-[11px] text-emerald-600 font-bold">👍 {a.votes}</span>}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{a.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Yanıt Yaz ── */}
          {user ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                <Avatar gender={userGender} name={userName} size="sm" />
                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-900">{userName}</span>
                  <div className="mt-0.5"><GenderPill gender={userGender} /></div>
                </div>
                <span className="text-[11px] text-gray-400">Tavsiyeni paylaş</span>
              </div>
              <div className="px-4 pb-4 pt-3">
                <textarea
                  ref={mainReplyRef}
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  placeholder="Deneyimini paylaş, tavsiyeni ver..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8460A] focus:ring-2 focus:ring-[#E8460A]/10 resize-none transition-all placeholder:text-gray-300"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] text-gray-300">{answerText.length > 0 ? answerText.length + " karakter" : ""}</span>
                  <button
                    onClick={handleAnswer}
                    disabled={loading || !answerText.trim()}
                    className="px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 bg-gradient-to-r from-[#E8460A] to-orange-400 text-white disabled:opacity-30 hover:shadow-lg hover:shadow-orange-200 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-none">
                    {loading
                      ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Gönderiliyor</>
                      : <>💬 Yanıtla</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/giris">
              <div className={`bg-gradient-to-r ${cat.from} ${cat.to} rounded-2xl p-5 text-center text-white font-bold hover:shadow-lg transition-all cursor-pointer mb-5 text-sm`}>
                Yanıt vermek için giriş yap →
              </div>
            </Link>
          )}

          {/* ── Yanıtlar ── */}
          {topLevel.length > 0 && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <span className="text-sm font-black text-gray-700">{topLevel.length} Yanıt</span>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400">en eskiden yeniye</span>
            </div>
          )}

          {topLevel.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center shadow-sm">
              <div className="text-5xl mb-3">💬</div>
              <div className="text-sm font-bold text-gray-600 mb-1">Henüz yanıt yok</div>
              <div className="text-xs text-gray-400">İlk tavsiyeyi veren sen ol!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {topLevel.map((a, idx) => {
                const myVote = userVotes[a.id] || 0;
                const nested = repliesOf(a.id);
                const isOpen = replyOpen[a.id] || false;
                const isBest = bestAnswer?.id === a.id && (bestAnswer?.votes || 0) > 0;
                const genderBorder = a.gender === "kadin" ? "border-l-pink-400" : a.gender === "erkek" ? "border-l-blue-400" : "border-l-gray-200";
                const dividerColor = "border-gray-100";

                return (
                  <div key={a.id}>
                    <div className={`rounded-2xl border border-gray-100 border-l-4 ${genderBorder} bg-white shadow-sm overflow-hidden`}>

                      {isBest && (
                        <div className="bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-1.5 flex items-center gap-2">
                          <span className="text-xs font-black text-amber-900">⭐ En Çok Beğenilen Yanıt</span>
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar + sıra no */}
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <Avatar gender={a.gender} name={a.user_name} size="md" />
                            <span className="text-[9px] font-bold text-gray-300">#{idx + 1}</span>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* İsim + cinsiyet + zaman */}
                            <div className="flex items-center gap-2 flex-wrap mb-2.5">
                              <span className="text-sm font-black text-gray-900">{a.user_name}</span>
                              <GenderPill gender={a.gender} />
                              <span className="text-[11px] text-gray-400 ml-auto">{timeAgo(a.created_at)}</span>
                            </div>
                            {/* Yanıt metni */}
                            <p className="text-[15px] text-gray-800 leading-relaxed">{a.body}</p>
                          </div>
                        </div>

                        {/* Aksiyonlar */}
                        <div className={`flex items-center gap-2 mt-3 pt-3 border-t ${dividerColor}`}>
                          <button onClick={() => handleVote(a, 1)} disabled={!user}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                              myVote === 1
                                ? "bg-emerald-500 text-white shadow"
                                : "bg-white/60 border border-gray-200 text-gray-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600"
                            }`}>
                            👍 {a.votes > 0 ? a.votes : 0}
                          </button>
                          <button onClick={() => handleVote(a, -1)} disabled={!user}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                              myVote === -1
                                ? "bg-red-500 text-white shadow"
                                : "bg-white/60 border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500"
                            }`}>
                            👎 {a.votes < 0 ? Math.abs(a.votes) : 0}
                          </button>

                          {user && (
                            <button
                              onClick={() => setReplyOpen(prev => ({ ...prev, [a.id]: !isOpen }))}
                              className="ml-auto text-xs text-gray-400 hover:text-[#E8460A] font-semibold transition-colors">
                              {isOpen ? "Vazgeç" : "💬 Yanıtla"}
                              {nested.length > 0 && !isOpen && (
                                <span className="ml-1 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{nested.length}</span>
                              )}
                            </button>
                          )}
                          {!user && nested.length > 0 && (
                            <span className="ml-auto text-[11px] text-gray-400">{nested.length} yanıt</span>
                          )}
                        </div>
                      </div>

                      {/* İnline yanıt kutusu */}
                      {isOpen && user && (
                        <div className={`border-t ${dividerColor} bg-white/50 px-4 py-3`}>
                          <div className="flex items-start gap-2">
                            <Avatar gender={userGender} name={userName} size="xs" />
                            <div className="flex-1">
                              <textarea
                                value={replyTexts[a.id] || ""}
                                onChange={e => setReplyTexts(prev => ({ ...prev, [a.id]: e.target.value }))}
                                placeholder={`${a.user_name}'e yanıt ver...`}
                                rows={2}
                                autoFocus
                                className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] focus:ring-2 focus:ring-[#E8460A]/10 resize-none transition-all"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setReplyOpen(prev => ({ ...prev, [a.id]: false }))}
                                  className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 bg-white transition-colors">
                                  Vazgeç
                                </button>
                                <button onClick={() => handleReply(a.id)}
                                  disabled={replyLoading[a.id] || !replyTexts[a.id]?.trim()}
                                  className="text-xs text-white bg-[#E8460A] hover:bg-[#C93A08] px-4 py-1.5 rounded-lg font-bold disabled:opacity-40 transition-all">
                                  {replyLoading[a.id] ? "..." : "Gönder"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Nested replies */}
                    {nested.length > 0 && (
                      <div className="ml-10 mt-1.5 space-y-1.5">
                        {nested.map(r => {
                          const rv = userVotes[r.id] || 0;
                          const rBorder = r.gender === "kadin" ? "border-l-pink-300" : r.gender === "erkek" ? "border-l-blue-300" : "border-l-gray-200";
                          return (
                            <div key={r.id} className={`rounded-xl border border-gray-100 border-l-4 ${rBorder} bg-white p-3`}>
                              <div className="flex items-start gap-2.5">
                                <Avatar gender={r.gender} name={r.user_name} size="xs" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                    <span className="text-xs font-black text-gray-800">{r.user_name}</span>
                                    <GenderPill gender={r.gender} />
                                    <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(r.created_at)}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed mb-2">{r.body}</p>
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => handleVote(r, 1)} disabled={!user}
                                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold border transition-all ${rv === 1 ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600"}`}>
                                      👍 {r.votes > 0 ? r.votes : 0}
                                    </button>
                                    <button onClick={() => handleVote(r, -1)} disabled={!user}
                                      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold border transition-all ${rv === -1 ? "bg-red-500 border-red-500 text-white" : "bg-white border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500"}`}>
                                      👎 {r.votes < 0 ? Math.abs(r.votes) : 0}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!user && topLevel.length > 0 && (
            <Link href="/giris">
              <div className="mt-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 text-center hover:border-[#E8460A]/40 hover:bg-orange-50 transition-all cursor-pointer">
                <div className="text-sm font-bold text-gray-600 mb-1">Sen de tavsiyeni paylaş</div>
                <div className="text-xs text-[#E8460A] font-semibold">Giriş yap →</div>
              </div>
            </Link>
          )}
        </div>

        {/* ── Sağ Sidebar ── */}
        <div className="w-72 flex-shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm sticky top-20">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="text-base">🔥</span>
              <span className="font-bold text-sm text-gray-900">Popüler Sorular</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[calc(100vh-160px)] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {popular.map((t, i) => {
                const pc = CAT_GRADIENT[t.category] || DEFAULT_CAT;
                const isActive = t.id === id;
                return (
                  <Link href={"/tavsiye/" + t.id} key={t.id}>
                    <div className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group ${isActive ? "bg-orange-50" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-black w-5 flex-shrink-0 ${i < 3 ? "text-[#E8460A]" : "text-gray-300"}`}>
                          #{i + 1}
                        </span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pc.dot}`} />
                        <span className="text-[10px] text-gray-400 truncate flex-1">{t.category}</span>
                      </div>
                      <p className={`text-xs font-semibold line-clamp-2 leading-snug group-hover:text-[#E8460A] transition-colors mb-1.5 pl-7 ${isActive ? "text-[#E8460A]" : "text-gray-700"}`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-3 pl-7 text-[10px] text-gray-400">
                        <span>👍 {t.votes || 0}</span>
                        <span>💬 {t.answer_count}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <Link href="/tavsiyeler" className="text-xs text-[#E8460A] font-semibold hover:underline">
                Tümünü gör →
              </Link>
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </main>
  );
}
