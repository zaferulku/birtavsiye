"use client";
import { useState, useEffect } from "react";
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
  if (diff < 60) return "az once";
  if (diff < 3600) return Math.floor(diff / 60) + " dk once";
  if (diff < 86400) return Math.floor(diff / 3600) + " sa once";
  return Math.floor(diff / 86400) + " gun once";
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    const { data } = await supabase
      .from("topics").select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setTopics(data);
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
    await fetchTopics();
    setLoading(false);
  };

  const filtered = activeCategory === "Hepsi"
    ? topics
    : topics.filter(t => t.category === activeCategory);

  return (
    <div>
      {/* Kategori Filtreleri */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
        {categories.map((c) => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === c
                ? "bg-[#E8460A] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-[#E8460A] hover:text-[#E8460A]"
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Soru Sor Butonu */}
      {!showForm ? (
        <button onClick={() => { if (!user) { window.location.href = "/giris"; return; } setShowForm(true); }}
          className="w-full flex items-center gap-3 bg-white border-2 border-dashed border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-400 hover:border-[#E8460A] hover:text-[#E8460A] transition-all mb-4 cursor-pointer">
          <span className="text-xl">✏️</span>
          <span>Tavsiye ister misin? Soru sor...</span>
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-800">Soru Sor</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
          </div>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Sorunuzu yazin... (orn: En iyi 5000 TL telefon hangisi?)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8460A] mb-2 transition-all" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Detay eklemek ister misiniz? (isteğe bağlı)"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8460A] mb-2 resize-none transition-all" />
          <div className="flex items-center gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#E8460A] bg-white transition-all">
              {categories.filter(c => c !== "Hepsi").map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button onClick={handleSubmit} disabled={loading || !title.trim()}
              className="px-5 py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08] disabled:opacity-40 transition-all">
              {loading ? "Gonderiliyor..." : "Gonder"}
            </button>
          </div>
        </div>
      )}

      {/* Konular Listesi */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <div className="text-4xl mb-3">💬</div>
            <div className="text-sm text-gray-500">Henuz soru yok — ilk soruyu sen sor!</div>
          </div>
        ) : (
          filtered.map((t) => (
            <Link href={"/tavsiye/" + t.id} key={t.id}>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#E8460A]/30 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E8460A]/10 flex items-center justify-center text-[#E8460A] font-bold text-xs flex-shrink-0">
                    {(t.user_name || "A")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-gray-700">{t.user_name}</span>
                      <span className="text-xs bg-orange-50 text-[#E8460A] px-2 py-0.5 rounded-full">{t.category}</span>
                      <span className="text-xs text-gray-400">{timeAgo(t.created_at)}</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 leading-snug mb-1">{t.title}</div>
                    {t.body && <div className="text-xs text-gray-500 line-clamp-1">{t.body}</div>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">💬 {t.answer_count} cevap</span>
                      <span className="text-xs text-gray-400">👍 {t.votes}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}