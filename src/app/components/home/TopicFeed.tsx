"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

type Topic = {
  id: string;
  title: string;
  body: string;
  user_name: string;
  category: string;
  votes: number;
  answer_count: number;
  created_at: string;
};

const categories = ["Hepsi", "Elektronik", "Kozmetik", "Ev & Yasam", "Spor", "Hediye", "Diger"];

const timeAgo = (date: string) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "az önce";
  if (diff < 3600) return Math.floor(diff / 60) + " dk önce";
  if (diff < 86400) return Math.floor(diff / 3600) + " sa önce";
  return Math.floor(diff / 86400) + " gün önce";
};

const categoryColors: Record<string, string> = {
  Elektronik: "bg-blue-50 text-blue-600",
  Kozmetik: "bg-pink-50 text-pink-600",
  "Ev & Yasam": "bg-green-50 text-green-600",
  Spor: "bg-orange-50 text-orange-600",
  Hediye: "bg-purple-50 text-purple-600",
  Diger: "bg-gray-50 text-gray-500",
};

export default function TopicFeed() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeCategory, setActiveCategory] = useState("Hepsi");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Elektronik");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [newCount, setNewCount] = useState(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchTopics();

    // Supabase Realtime
    const channel = supabase
      .channel("topics-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "topics" }, (payload) => {
        const newTopic = payload.new as Topic;
        if (isFirstLoad.current) return;
        setTopics((prev) => [newTopic, ...prev]);
        setNewCount((c) => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchTopics = async () => {
    const { data } = await supabase
      .from("topics").select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) {
      setTopics(data);
      isFirstLoad.current = false;
    }
  };

  const getDisplayName = (u: any) =>
    u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Kullanici";

  const handleSubmit = async () => {
    if (!title.trim()) return;
    if (!user) { window.location.href = "/giris"; return; }
    setLoading(true);
    await supabase.from("topics").insert({
      user_id: user.id,
      user_name: getDisplayName(user),
      title, body, category, votes: 0, answer_count: 0,
    });
    setTitle(""); setBody(""); setShowForm(false);
    setLoading(false);
  };

  const filtered = topics
  .filter((t) => activeCategory === "Hepsi" || t.category === activeCategory)
  .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  const trendTopics = [...topics]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  const activeTopics = [...topics]
    .sort((a, b) => b.answer_count - a.answer_count)
    .slice(0, 5);

  return (
    <div className="flex gap-4">

      {/* SOL: ANA FEED */}
      <div className="flex-1 min-w-0">

        {/* Kategori Filtreleri */}
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === c
                  ? "bg-[#E8460A] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A]"
              }`}>
              {c}
            </button>
          ))}
        </div>

        {/* Yeni içerik bildirimi */}
        {newCount > 0 && (
          <button onClick={() => { setNewCount(0); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="w-full mb-3 py-2 bg-[#E8460A] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 animate-pulse">
            ↑ {newCount} yeni tavsiye geldi — görmek için tıkla
          </button>
        )}

{/* Arama çubuğu */}
<div className="relative mb-3">
  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <input
    type="text"
    placeholder="Konularda ara..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#E8460A] focus:bg-white transition-all"
  />
</div>

        {/* Soru Sor */}
        {!showForm ? (
          <button onClick={() => { if (!user) { window.location.href = "/giris"; return; } setShowForm(true); }}
            className="w-full flex items-center gap-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-400 hover:border-[#E8460A] hover:text-[#E8460A] transition-all mb-3 cursor-pointer">
            <span className="text-lg">✏️</span>
            <span>{user ? "Tavsiye ister misin? Soru sor..." : "Soru sormak için giriş yap"}</span>
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-gray-800">Soru Sor</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Sorunuzu yazın... (örn: En iyi 5000 TL telefon hangisi?)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8460A] mb-2 transition-all" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Detay eklemek ister misiniz? (isteğe bağlı)"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8460A] mb-2 resize-none transition-all" />
            <div className="flex items-center gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8460A] bg-white transition-all">
                {categories.filter((c) => c !== "Hepsi").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button onClick={handleSubmit} disabled={loading || !title.trim()}
                className="px-5 py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08] disabled:opacity-40 transition-all">
                {loading ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <div className="text-4xl mb-3">💬</div>
              <div className="text-sm text-gray-500">Henüz soru yok — ilk soruyu sen sor!</div>
            </div>
          ) : (
            filtered.map((t) => (
              <Link href={"/tavsiye/" + t.id} key={t.id}>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#E8460A]/30 hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E8460A] to-orange-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                      {(t.user_name || "A")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">{t.user_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[t.category] || "bg-gray-50 text-gray-500"}`}>
                          {t.category}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{timeAgo(t.created_at)}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 leading-snug mb-1">{t.title}</div>
                      {t.body && <div className="text-xs text-gray-500 line-clamp-1 mb-2">{t.body}</div>}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
  💬 <span>{t.answer_count} cevap</span>
</span>
<span className="text-xs text-gray-400 flex items-center gap-1">
  👍 <span>{t.votes}</span>
</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* SAĞ: SIDEBAR */}
      <div className="w-56 flex-shrink-0 hidden lg:block space-y-4">

        {/* Trend Konular */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">🔥</span>
            <span className="font-bold text-sm text-gray-800">Trend Konular</span>
          </div>
          <div className="p-2">
            {trendTopics.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-3">Henüz konu yok</div>
            ) : (
              trendTopics.map((t, i) => (
                <Link href={"/tavsiye/" + t.id} key={t.id}>
                  <div className="flex items-start gap-2 px-2 py-2 rounded-xl hover:bg-orange-50 transition-colors cursor-pointer group">
                    <span className={`text-xs font-black flex-shrink-0 mt-0.5 ${i === 0 ? "text-[#E8460A]" : i === 1 ? "text-orange-400" : "text-gray-300"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 line-clamp-2 group-hover:text-[#E8460A] transition-colors leading-snug">
                        {t.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">👍 {t.votes}</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Aktif Sorular */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <span className="text-base">💬</span>
            <span className="font-bold text-sm text-gray-800">En Aktif</span>
          </div>
          <div className="p-2">
            {activeTopics.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-3">Henüz soru yok</div>
            ) : (
              activeTopics.map((t) => (
                <Link href={"/tavsiye/" + t.id} key={t.id}>
                  <div className="flex items-start gap-2 px-2 py-2 rounded-xl hover:bg-orange-50 transition-colors cursor-pointer group">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E8460A] to-orange-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {(t.user_name || "A")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 line-clamp-2 group-hover:text-[#E8460A] transition-colors leading-snug">
                        {t.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">💬 {t.answer_count} cevap</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}