"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Link from "next/link";
import { GenderSymbol } from "../../components/ui/GenderIcon";

type Topic = {
  id: string; title: string; body: string;
  user_id?: string | null; user_name: string; category: string;
  votes: number; answer_count: number; created_at: string;
  product_slug?: string | null; product_title?: string | null; product_brand?: string | null; product_id?: string | null;
  author_gender?: string | null;
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
  const px = { xs: 14, sm: 18, md: 22, lg: 28 }[size];
  const s = { xs: "w-6 h-6", sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" }[size];
  const bg = gender === "kadin"
    ? "from-pink-400 to-rose-500"
    : gender === "erkek"
    ? "from-blue-400 to-indigo-500"
    : "from-[#E8460A] to-orange-400";
  return (
    <div className={`${s} rounded-full bg-gradient-to-br ${bg} flex items-center justify-center font-bold flex-shrink-0 shadow`}>
      {gender === "kadin" || gender === "erkek"
        ? <GenderSymbol gender={gender} size={px} white />
        : <span className="text-white">{(name || "?")[0].toUpperCase()}</span>
      }
    </div>
  );
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
  const [topicVote, setTopicVote] = useState<number>(0);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [top2Ids, setTop2Ids] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const mainReplyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchAll();
    fetchPopular();
    supabase.auth.getSession().then(async ({ data: sdata }) => {
      const session = sdata.session;
      if (!session?.user || !session.access_token) return;
      setUser(session.user);
      const auth = { Authorization: `Bearer ${session.access_token}` };
      const [pRes, vRes, tvRes] = await Promise.all([
        fetch("/api/me/profile", { headers: auth }).then(r => r.json()).catch(() => null),
        fetch("/api/me/answer-votes", { headers: auth }).then(r => r.json()).catch(() => null),
        fetch(`/api/me/topic-vote?topic_id=${id}`, { headers: auth }).then(r => r.json()).catch(() => null),
      ]);
      const profile = pRes?.profile;
      setUserGender(profile?.gender || "");
      const n = profile?.username || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Kullanıcı";
      setUserName(n);
      const votes = vRes?.votes as { answer_id: string; vote: number }[] | undefined;
      if (votes) setUserVotes(Object.fromEntries(votes.map(v => [v.answer_id, v.vote])));
      if (typeof tvRes?.vote === "number") setTopicVote(tvRes.vote);
    });

    const channel = supabase.channel(`answers-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "topic_answers", filter: `topic_id=eq.${id}` }, (payload) => {
        setAnswers(prev => prev.find(a => a.id === payload.new.id) ? prev : [...prev, payload.new as Answer]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchAll = async () => {
    const tRes = await fetch(`/api/public/topics/${id}`).then(r => r.json()).catch(() => null);
    if (tRes?.topic) setTopic(tRes.topic as Topic);
    const aRes = await fetch(`/api/public/topic-answers?topic_id=${id}`).then(r => r.json()).catch(() => null);
    const ans = (aRes?.answers as Answer[] | undefined) || [];
    const sorted = [...ans].sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime());
    setAnswers(sorted);
    const topLevel = sorted.filter(x => !x.parent_id);
    const sorted2 = [...topLevel].sort((x, y) => (y.votes || 0) - (x.votes || 0)).slice(0, 2);
    setTop2Ids(sorted2.map(x => x.id));
  };

  const fetchPopular = async () => {
    const res = await fetch("/api/public/topics?popular=1&limit=10").then(r => r.json()).catch(() => null);
    if (Array.isArray(res?.topics)) setPopular(res.topics as PopularTopic[]);
  };

  const getAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } as const;
  };

  const handleAnswer = async () => {
    if (!answerText.trim() || !user) return;
    setLoading(true);
    const auth = await getAuth();
    if (auth) {
      await fetch("/api/topic-answers", {
        method: "POST", headers: auth,
        body: JSON.stringify({ topic_id: id, user_name: userName, gender: userGender, body: answerText }),
      });
    }
    setAnswerText(""); setLoading(false);
    await fetchAll();
  };

  const handleEdit = async (answerId: string) => {
    if (!editText.trim()) return;
    setEditLoading(true);
    const auth = await getAuth();
    if (auth) {
      await fetch(`/api/topic-answers/${answerId}`, {
        method: "PATCH", headers: auth,
        body: JSON.stringify({ body: editText }),
      });
    }
    setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, body: editText } : a));
    setEditingId(null);
    setEditText("");
    setEditLoading(false);
  };

  const handleDelete = async (answerId: string, parentId?: string | null) => {
    if (!confirm("Bu yorumu silmek istediğine emin misin?")) return;
    const auth = await getAuth();
    if (auth) {
      await fetch(`/api/topic-answers/${answerId}`, { method: "DELETE", headers: auth });
    }
    setAnswers(prev => prev.filter(a => a.id !== answerId));
    const newCount = Math.max((topic?.answer_count || 1) - 1, 0);
    setTopic(prev => prev ? { ...prev, answer_count: newCount } : prev);
    if (!parentId) setEditingId(null);
  };

  const handleReply = async (parentId: string) => {
    const text = replyTexts[parentId];
    if (!text?.trim() || !user) return;
    setReplyLoading(prev => ({ ...prev, [parentId]: true }));
    const auth = await getAuth();
    if (auth) {
      await fetch("/api/topic-answers", {
        method: "POST", headers: auth,
        body: JSON.stringify({ topic_id: id, user_name: userName, gender: userGender, body: text, parent_id: parentId }),
      });
    }
    setReplyTexts(prev => ({ ...prev, [parentId]: "" }));
    setReplyOpen(prev => ({ ...prev, [parentId]: false }));
    setReplyLoading(prev => ({ ...prev, [parentId]: false }));
    await fetchAll();
  };

  const handleTopicVote = async (voteValue: 1 | -1) => {
    if (!user || !topic) { window.location.href = "/giris"; return; }
    const cur = topicVote;
    const diff = cur === voteValue ? -voteValue : cur === 0 ? voteValue : voteValue * 2;
    const nv = cur === voteValue ? 0 : voteValue;
    const auth = await getAuth();
    if (!auth) return;
    if (cur === voteValue) {
      await fetch(`/api/topic-votes?topic_id=${id}`, { method: "DELETE", headers: auth });
    } else {
      await fetch("/api/topic-votes", { method: "POST", headers: auth, body: JSON.stringify({ topic_id: id, vote: nv }) });
    }
    const newTotal = (topic.votes || 0) + diff;
    setTopic(prev => prev ? { ...prev, votes: newTotal } : prev);
    setTopicVote(nv);
  };

  const handleVote = async (answer: Answer, voteValue: 1 | -1) => {
    if (!user) return;
    const cur = userVotes[answer.id] || 0;
    const voteDiff = cur === voteValue ? -voteValue : cur === 0 ? voteValue : voteValue * 2;
    const newVote = cur === voteValue ? 0 : voteValue;
    const auth = await getAuth();
    if (!auth) return;
    if (cur === voteValue) {
      await fetch(`/api/topic-answer-votes?answer_id=${answer.id}`, { method: "DELETE", headers: auth });
    } else {
      await fetch("/api/topic-answer-votes", { method: "POST", headers: auth, body: JSON.stringify({ answer_id: answer.id, vote: voteValue }) });
    }
    const newTotal = (answer.votes || 0) + voteDiff;
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

      <div className="max-w-[1100px] mx-auto px-3 md:px-4 pt-4 md:pt-5 pb-8 flex flex-col md:flex-row gap-5 items-start">

        {/* ── Ana İçerik ── */}
        <div className="flex-1 min-w-0">

          {/* Breadcrumb */}
          <Link href="/tavsiyeler" className="inline-flex items-center gap-1 text-gray-400 hover:text-[#E8460A] text-xs mb-4 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Tavsiyeler
          </Link>

          {/* ── Soru Kartı ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
            <div className={`h-1 w-full bg-gradient-to-r ${cat.from} ${cat.to}`} />
            <div className="p-5">

              {/* Kategori + bağlı ürün + zaman — tek satır */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cat.light} ${cat.text} border border-current/20 uppercase tracking-wide flex-shrink-0`}>
                  {topic.category}
                </span>
                {topic.product_slug && (() => {
                  const fullLabel = `${topic.product_brand || ""} ${topic.product_title || ""}`.trim();
                  const words = fullLabel.split(" ");
                  const shortLabel = words.slice(0, 3).join(" ");
                  const isTruncated = words.length > 3;
                  return (
                    <Link href={"/urun/" + topic.product_slug} className="relative group/tooltip flex-shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-[10px] font-semibold text-orange-700 hover:bg-orange-100 transition-colors">
                        <span>📦</span>
                        <span>{shortLabel}{isTruncated ? "…" : ""}</span>
                      </span>
                      {isTruncated && (
                        <span className="pointer-events-none absolute left-0 top-full mt-1 z-50 whitespace-nowrap bg-gray-900 text-white text-[11px] px-2.5 py-1.5 opacity-0 group-hover/tooltip:opacity-100 transition-opacity" style={{ borderRadius: 4 }}>
                          {fullLabel}
                        </span>
                      )}
                    </Link>
                  );
                })()}
                <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0">{timeAgo(topic.created_at)}</span>
              </div>

              {/* Soru başlığı */}
              <h1 className="text-xl font-black text-gray-900 leading-snug mb-2">
                {topic.title}
              </h1>

              {/* Soru soran — başlığın hemen altında */}
              <div className="flex items-center gap-2 mb-3">
                <Avatar gender={topic.author_gender || undefined} name={topic.user_name} size="xs" />
                <span className="text-xs font-semibold text-gray-600">{topic.user_name}</span>
                <span className="text-[10px] text-gray-400">· Soru soran</span>
              </div>

              {/* Body */}
              {topic.body && (
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{topic.body}</p>
              )}

              {/* Alt: istatistikler + yanıtla butonu */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <button onClick={() => handleTopicVote(1)}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all ${
                      topicVote === 1 ? "bg-stone-100 border-stone-300 text-stone-600" : "bg-white border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600"
                    }`}>
                    👍 <span>{topic.votes > 0 ? topic.votes : 0}</span>
                  </button>
                  <button onClick={() => handleTopicVote(-1)}
                    className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all ${
                      topicVote === -1 ? "bg-stone-100 border-stone-300 text-stone-600" : "bg-white border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500"
                    }`}>
                    👎
                  </button>
                  <span className="flex items-center gap-1 text-xs text-gray-400">💬 <span className="font-semibold">{answers.length} yanıt</span></span>
                </div>
                <button
                  onClick={() => mainReplyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  className="ml-auto flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-[#E8460A] text-white rounded-xl hover:bg-[#C93A08] transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  Yanıtla
                </button>
              </div>
            </div>
          </div>

          {/* ── Yanıt Yaz ── */}
          {user ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100">
                <Avatar gender={userGender} name={userName} size="sm" />
                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-900">{userName}</span>
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
                      : <>💬 Gönder</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/giris">
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-4 text-center hover:border-[#E8460A]/40 hover:bg-orange-50 transition-all cursor-pointer mb-4">
                <span className="text-sm font-bold text-gray-500">Yanıt vermek için <span className="text-[#E8460A]">giriş yap →</span></span>
              </div>
            </Link>
          )}

          {/* ── Öne Çıkan 2 Yanıt ── */}
          {top2Ids.length > 0 && (() => {
            const top2 = top2Ids.map(tid => answers.find(a => a.id === tid)).filter(Boolean) as Answer[];
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-xs font-black text-gray-700">⭐ Öne Çıkan Yanıtlar</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{topLevel.length} yanıtın en iyileri</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {top2.map(a => {
                    const myVote = userVotes[a.id] || 0;
                    const netVotes = a.votes || 0;
                    return (
                      <div key={a.id} className="px-4 py-3 hover:bg-gray-50 transition-colors group">
                        <a href={`#answer-${a.id}`} className="flex items-start gap-3 mb-2.5 cursor-pointer block">
                          <Avatar gender={a.gender} name={a.user_name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-bold text-gray-800">{a.user_name}</span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed group-hover:text-gray-800 transition-colors">{a.body}</p>
                          </div>
                        </a>
                        <div className="flex items-center gap-1.5 pl-9">
                          <button onClick={() => handleVote(a, 1)} disabled={!user}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all ${
                              myVote === 1 ? "bg-stone-100 border-stone-300 text-stone-600" : "bg-white border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600"
                            }`}>
                            👍 {netVotes > 0 ? netVotes : 0}
                          </button>
                          <button onClick={() => handleVote(a, -1)} disabled={!user}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all ${
                              myVote === -1 ? "bg-stone-100 border-stone-300 text-stone-600" : "bg-white border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500"
                            }`}>
                            👎 {netVotes < 0 ? Math.abs(netVotes) : 0}
                          </button>
                          <a href={`#answer-${a.id}`} className="ml-auto text-[11px] text-[#E8460A] font-semibold hover:underline">
                            Yanıtla →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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
                  <div key={a.id} id={`answer-${a.id}`}>
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
                              <span className="text-[11px] text-gray-400 ml-auto">{timeAgo(a.created_at)}</span>
                            </div>
                            {/* Yanıt metni */}
                            <p className="text-[15px] text-gray-800 leading-relaxed">{a.body}</p>
                          </div>
                        </div>

                        {/* Aksiyonlar */}
                        <div className={`flex items-center gap-2 mt-3 pt-3 border-t ${dividerColor}`}>
                          <button onClick={() => handleVote(a, 1)} disabled={!user}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all ${
                              myVote === 1
                                ? "bg-stone-100 border-stone-300 text-stone-600 shadow"
                                : "bg-white/60 border border-gray-200 text-gray-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600"
                            }`}>
                            👍 {a.votes > 0 ? a.votes : 0}
                          </button>
                          <button onClick={() => handleVote(a, -1)} disabled={!user}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all ${
                              myVote === -1
                                ? "bg-stone-100 border-stone-300 text-stone-600 shadow"
                                : "bg-white/60 border border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500"
                            }`}>
                            👎 {a.votes < 0 ? Math.abs(a.votes) : 0}
                          </button>

                          {user && (
                            <div className="ml-auto flex items-center gap-2">
                              {user.id === a.user_id && (
                                <>
                                  <button
                                    onClick={() => { setEditingId(a.id); setEditText(a.body); setReplyOpen(prev => ({ ...prev, [a.id]: false })); }}
                                    className="text-xs text-gray-400 hover:text-blue-500 font-semibold transition-colors cursor-pointer">
                                    ✏️ Düzenle
                                  </button>
                                  <button
                                    onClick={() => handleDelete(a.id, null)}
                                    className="text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors cursor-pointer">
                                    🗑️ Sil
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => setReplyOpen(prev => ({ ...prev, [a.id]: !isOpen }))}
                                className="text-xs text-gray-400 hover:text-[#E8460A] font-semibold transition-colors cursor-pointer">
                                {isOpen ? "Vazgeç" : "💬 Yanıtla"}
                                {nested.length > 0 && !isOpen && (
                                  <span className="ml-1 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{nested.length}</span>
                                )}
                              </button>
                            </div>
                          )}
                          {!user && nested.length > 0 && (
                            <span className="ml-auto text-[11px] text-gray-400">{nested.length} yanıt</span>
                          )}
                        </div>
                      </div>

                      {/* İnline düzenleme kutusu */}
                      {editingId === a.id && (
                        <div className="border-t border-gray-100 bg-blue-50/40 px-4 py-3">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full border border-blue-200 bg-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none transition-all"
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => { setEditingId(null); setEditText(""); }}
                              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 bg-white transition-colors">
                              Vazgeç
                            </button>
                            <button onClick={() => handleEdit(a.id)}
                              disabled={editLoading || !editText.trim()}
                              className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-4 py-1.5 rounded-lg font-bold disabled:opacity-40 transition-all">
                              {editLoading ? "..." : "Kaydet"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* İnline yanıt kutusu */}
                      {isOpen && user && editingId !== a.id && (
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
                                    <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(r.created_at)}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed mb-2">{r.body}</p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button onClick={() => handleVote(r, 1)} disabled={!user}
                                      className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all ${rv === 1 ? "bg-stone-100 border-stone-300 text-stone-600" : "bg-white border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600"}`}>
                                      👍 {r.votes > 0 ? r.votes : 0}
                                    </button>
                                    <button onClick={() => handleVote(r, -1)} disabled={!user}
                                      className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all ${rv === -1 ? "bg-stone-100 border-stone-300 text-stone-600" : "bg-white border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500"}`}>
                                      👎 {r.votes < 0 ? Math.abs(r.votes) : 0}
                                    </button>
                                    {user?.id === r.user_id && (
                                      <>
                                        <button onClick={() => { setEditingId(r.id); setEditText(r.body); }}
                                          className="text-[11px] text-gray-400 hover:text-blue-500 font-semibold transition-colors cursor-pointer">
                                          ✏️
                                        </button>
                                        <button onClick={() => handleDelete(r.id, r.parent_id)}
                                          className="text-[11px] text-gray-400 hover:text-red-500 font-semibold transition-colors cursor-pointer">
                                          🗑️
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  {editingId === r.id && (
                                    <div className="mt-2">
                                      <textarea
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        rows={2}
                                        autoFocus
                                        className="w-full border border-blue-200 bg-white rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none transition-all"
                                      />
                                      <div className="flex justify-end gap-2 mt-1.5">
                                        <button onClick={() => { setEditingId(null); setEditText(""); }}
                                          className="text-xs text-gray-400 hover:text-gray-600 px-2.5 py-1 rounded-lg border border-gray-200 transition-colors">
                                          Vazgeç
                                        </button>
                                        <button onClick={() => handleEdit(r.id)}
                                          disabled={editLoading || !editText.trim()}
                                          className="text-xs text-white bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-lg font-bold disabled:opacity-40 transition-all">
                                          {editLoading ? "..." : "Kaydet"}
                                        </button>
                                      </div>
                                    </div>
                                  )}
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
        </div>{/* ana içerik sonu */}

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

      </div>{/* max-w-[1100px] sonu */}
      <Footer />
    </main>
  );
}
