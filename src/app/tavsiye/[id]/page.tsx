"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Link from "next/link";

type Topic = {
  id: string; title: string; body: string;
  user_name: string; category: string;
  votes: number; answer_count: number; created_at: string;
};

type Answer = {
  id: string; topic_id: string; user_id: string;
  user_name: string; gender: string; body: string;
  votes: number; created_at: string;
};

const timeAgo = (date: string) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "az önce";
  if (diff < 3600) return Math.floor(diff / 60) + " dk önce";
  if (diff < 86400) return Math.floor(diff / 3600) + " sa önce";
  return Math.floor(diff / 86400) + " gün önce";
};

const genderAvatar = (gender: string, name: string) => {
  if (gender === "kadin") return { emoji: "👩", bg: "from-pink-400 to-rose-400" };
  if (gender === "erkek") return { emoji: "👨", bg: "from-blue-400 to-indigo-400" };
  return { emoji: (name || "A")[0].toUpperCase(), bg: "from-[#E8460A] to-orange-400" };
};

export default function TavsiyeDetay() {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userGender, setUserGender] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(false);
  // userVotes: answerId -> 1 veya -1 veya 0
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAll();
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles").select("gender").eq("id", data.user.id).maybeSingle();
        setUserGender(profile?.gender || "");

        // Kullanıcının bu konudaki oylarını çek
        const { data: votes } = await supabase
          .from("topic_answer_votes")
          .select("answer_id, vote")
          .eq("user_id", data.user.id);
        if (votes) {
          const map: Record<string, number> = {};
          votes.forEach((v) => { map[v.answer_id] = v.vote; });
          setUserVotes(map);
        }
      }
    });

    // Realtime: yeni cevap gelince ekle
    const channel = supabase.channel(`answers-${id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "topic_answers",
        filter: `topic_id=eq.${id}`
      }, (payload) => {
        setAnswers((prev) => {
          if (prev.find((a) => a.id === payload.new.id)) return prev;
          return [...prev, payload.new as Answer];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchAll = async () => {
    const { data: t } = await supabase.from("topics").select("*").eq("id", id).maybeSingle();
    setTopic(t);
    const { data: a } = await supabase.from("topic_answers").select("*")
      .eq("topic_id", id).order("created_at", { ascending: true });
    setAnswers(a || []);
  };

  const getDisplayName = (u: any) =>
    u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Kullanıcı";

  const handleAnswer = async () => {
    if (!answerText.trim() || !user) return;
    setLoading(true);
    await supabase.from("topic_answers").insert({
      topic_id: id,
      user_id: user.id,
      user_name: getDisplayName(user),
      gender: userGender,
      body: answerText,
      votes: 0,
    });
    await supabase.from("topics")
      .update({ answer_count: (topic?.answer_count || 0) + 1 })
      .eq("id", id);
    setAnswerText("");
    setLoading(false);
  };

  const handleVote = async (answer: Answer, voteValue: 1 | -1) => {
    if (!user) return;
    const currentVote = userVotes[answer.id] || 0;
    let newVote = 0;
    let voteDiff = 0;

    if (currentVote === voteValue) {
      // Aynı oya tekrar basınca geri al
      newVote = 0;
      voteDiff = -voteValue;
      await supabase.from("topic_answer_votes")
        .delete()
        .eq("answer_id", answer.id)
        .eq("user_id", user.id);
    } else {
      // Yeni oy veya oy değiştir
      voteDiff = currentVote === 0 ? voteValue : voteValue * 2;
      newVote = voteValue;
      await supabase.from("topic_answer_votes")
        .upsert({ answer_id: answer.id, user_id: user.id, vote: voteValue },
          { onConflict: "answer_id,user_id" });
    }

    // votes kolonunu güncelle
    const newTotal = (answer.votes || 0) + voteDiff;
    await supabase.from("topic_answers")
      .update({ votes: newTotal })
      .eq("id", answer.id);

    setAnswers((prev) => prev.map((a) =>
      a.id === answer.id ? { ...a, votes: newTotal } : a
    ));
    setUserVotes((prev) => ({ ...prev, [answer.id]: newVote }));
  };

  if (!topic) return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-20 text-center text-gray-400">Yükleniyor...</div>
      <Footer />
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6">

        <Link href="/tavsiyeler" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#E8460A] mb-4 transition-colors group">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Tüm Tavsiyeler
        </Link>

        {/* Soru Kartı */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs bg-orange-50 text-[#E8460A] px-2 py-0.5 rounded-full font-medium">{topic.category}</span>
            <span className="text-xs text-gray-400">{timeAgo(topic.created_at)}</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{topic.title}</h1>
          {topic.body && <p className="text-sm text-gray-500 mb-3">{topic.body}</p>}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E8460A] to-orange-400 flex items-center justify-center text-white font-bold text-xs">
              {(topic.user_name || "A")[0].toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-gray-600">{topic.user_name}</span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">💬 {answers.length} cevap</span>
          </div>
        </div>

        {/* Cevaplar */}
        <div className="space-y-3 mb-4">
          {answers.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-sm text-gray-400">
              Henüz cevap yok — ilk cevabı sen ver!
            </div>
          ) : (
            answers.map((a) => {
              const av = genderAvatar(a.gender, a.user_name);
              const myVote = userVotes[a.id] || 0;
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${av.bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                      {av.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{a.user_name}</span>
                        {a.gender === "kadin" && <span className="text-xs text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded-full">Kadın</span>}
                        {a.gender === "erkek" && <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">Erkek</span>}
                        <span className="text-xs text-gray-400 ml-auto">{timeAgo(a.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed mb-2">{a.body}</p>

                      {/* Oy butonları */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleVote(a, 1)}
                          disabled={!user}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                            myVote === 1
                              ? "bg-green-50 border-green-300 text-green-600 font-semibold"
                              : "border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-500"
                          }`}>
                          👍 <span>{a.votes > 0 ? a.votes : 0}</span>
                        </button>
                        <button
                          onClick={() => handleVote(a, -1)}
                          disabled={!user}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                            myVote === -1
                              ? "bg-red-50 border-red-300 text-red-500 font-semibold"
                              : "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400"
                          }`}>
                          👎 <span>{a.votes < 0 ? Math.abs(a.votes) : 0}</span>
                        </button>
                        {!user && <span className="text-xs text-gray-300">Oy vermek için giriş yap</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cevap Yaz */}
        {user ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            {userGender === "kadin" && (
              <div className="text-xs text-pink-500 bg-pink-50 px-2 py-1 rounded-full inline-block mb-3">👩 Kadın olarak yanıtlıyorsun</div>
            )}
            {userGender === "erkek" && (
              <div className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-full inline-block mb-3">👨 Erkek olarak yanıtlıyorsun</div>
            )}
            <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Tavsiyeni yaz..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8460A] resize-none transition-all mb-2" />
            <button onClick={handleAnswer} disabled={loading || !answerText.trim()}
              className="w-full py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08] disabled:opacity-40 transition-all">
              {loading ? "Gönderiliyor..." : "Cevapla"}
            </button>
          </div>
        ) : (
          <Link href="/giris">
            <div className="bg-orange-50 border-2 border-dashed border-orange-200 rounded-2xl p-4 text-center text-sm text-[#E8460A] font-medium hover:bg-orange-100 transition-all cursor-pointer">
              Cevap vermek için giriş yap →
            </div>
          </Link>
        )}

      </div>
      <Footer />
    </main>
  );
}