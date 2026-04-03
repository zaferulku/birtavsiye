"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

type Topic = {
  id: string; title: string; body: string;
  user_name: string; category: string;
  votes: number; answer_count: number; created_at: string;
  product_slug?: string | null; product_title?: string | null; product_brand?: string | null;
  gender_filter?: string | null;
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
  "from-violet-500 to-purple-600", "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",  "from-rose-500 to-pink-500",
  "from-amber-500 to-orange-500",  "from-indigo-500 to-blue-600",
  "from-teal-500 to-green-500",    "from-red-500 to-rose-600",
];
const avatarGrad = (name: string) => GRADIENTS[(name || "A").charCodeAt(0) % GRADIENTS.length];

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "şimdi";
  if (s < 3600) return Math.floor(s / 60) + " dk önce";
  if (s < 86400) return Math.floor(s / 3600) + " sa önce";
  return Math.floor(s / 86400) + " gün önce";
};

export default function TavsiyelerSayfasi() {
  const router = useRouter();
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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<{id:string;title:string;slug:string;brand:string;image_url:string|null;category_slug:string|null}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<{id:string;title:string;slug:string;brand:string} | null>(null);
  const productSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirst = useRef(true);
  const [userGender, setUserGender] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<"hepsi" | "kadin" | "erkek">("hepsi");
  const [genderOnly, setGenderOnly] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: v } = await supabase.from("topic_votes")
          .select("topic_id,vote").eq("user_id", data.user.id);
        if (v) setUserVotes(Object.fromEntries(v.map(x => [x.topic_id, x.vote])));
        const { data: profile } = await supabase.from("profiles").select("gender").eq("id", data.user.id).maybeSingle();
        setUserGender(profile?.gender || "");
      }
    });
    fetchTopics();
    const ch = supabase.channel("topics-rt-full")
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
      .order("created_at", { ascending: false }).limit(100);
    if (!data) return;
    setTopics(data);
    isFirst.current = false;
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

  const slugToTopicCat = (slug?: string | null): string => {
    if (!slug) return "Elektronik";
    const s = slug.toLowerCase();
    const elec = ["akilli-telefon","bilgisayar-laptop","tablet","tv","ses-kulaklik","akilli-saat","fotograf-kamera","oyun-konsol","yazici-tarayici","networking","telefon-aksesuar","bilgisayar-bilesenleri","ofis-elektronigi","arac-elektronigi"];
    const kozm = ["cilt-bakimi","makyaj","sac-bakimi","parfum","erkek-bakimi","kisisel-hijyen","agiz-dis"];
    const evya = ["beyaz-esya","kucuk-ev-aletleri","mobilya-dekorasyon","mutfak-sofra","ev-tekstili","aydinlatma","bahce-balkon","yapi-market","temizlik","banyo"];
    const spor = ["spor-giyim","fitness","outdoor-kamp","bisiklet","su-sporlari","takim-sporlari","yoga","outdoor-giyim"];
    const hediye = ["oyuncak","koleksiyon","masa-oyunu","hobi-sanat","bebek-bakim","bebek-giyim","bebek-arabasi"];
    if (elec.includes(s)) return "Elektronik";
    if (kozm.includes(s)) return "Kozmetik";
    if (evya.includes(s)) return "Ev & Yaşam";
    if (spor.includes(s)) return "Spor";
    if (hediye.includes(s)) return "Hediye";
    return "Diğer";
  };

  const guessCatFromTitle = (title: string): string => {
    const n = normalize(title);
    const m = (words: string[]) => words.some(w => n.includes(w));
    if (m(["telefon","iphone","samsung","galaxy","xiaomi","huawei","oneplus","pixel","akilli"])) return "Elektronik";
    if (m(["laptop","bilgisayar","notebook","macbook","dell","asus","hp","lenovo","pc","tablet","ipad","monitor","klavye","mouse","kulaklık","kulaklik","airpods","bluetooth","speaker","hoparlor","kamera","fotograf","drone","oyun","konsol","playstation","xbox","nintendo","tv","televizyon","router","modem","sarj","powerbank"])) return "Elektronik";
    if (m(["krem","serum","makyaj","ruj","rimel","maskara","parfum","deodorant","sac","sampuan","losyon","yuz","cilt","fondoten"])) return "Kozmetik";
    if (m(["mobilya","koltuk","masa","sandalye","yatak","nevresim","havlu","mutfak","tencere","tava","blender","camasir","bulasik","supurge","temizlik","deterjan","lamba","avize","hali","perde","bahce"])) return "Ev & Yaşam";
    if (m(["spor","kosu","nike","adidas","puma","fitness","dumbbell","protein","yoga","bisiklet","kamp","cadir","outdoor","futbol","basketbol","tenis","yuzme","dagcilik"])) return "Spor";
    if (m(["oyuncak","lego","bebek","puzzle","bulmaca","hediye","cocuk"])) return "Hediye";
    return "Elektronik";
  };

  const searchProducts = (q: string) => {
    if (productSearchTimeout.current) clearTimeout(productSearchTimeout.current);
    if (!q.trim()) { setProductResults([]); return; }
    productSearchTimeout.current = setTimeout(async () => {
      const { data } = await supabase.from("products")
        .select("id,title,slug,brand,image_url,categories(slug)")
        .or(`title.ilike.%${q}%,brand.ilike.%${q}%`)
        .limit(6);
      setProductResults((data || []).map((p: any) => ({ ...p, category_slug: p.categories?.slug ?? null })));
    }, 300);
  };

  const handleSubmit = async () => {
    if (!titleVal.trim() || !user) return;
    setSubmitting(true);
    const finalCat = selectedProduct ? catVal : guessCatFromTitle(titleVal);
    const gf = genderOnly && (userGender === "kadin" || userGender === "erkek") ? userGender : null;
    await supabase.from("topics").insert({
      user_id: user.id, user_name: getDisplay(user),
      title: titleVal, body: bodyVal, category: finalCat, votes: 0, answer_count: 0,
      gender_filter: gf,
      ...(selectedProduct ? {
        product_id: selectedProduct.id,
        product_slug: selectedProduct.slug,
        product_title: selectedProduct.title,
        product_brand: selectedProduct.brand,
      } : {}),
    });
    setTitleVal(""); setBodyVal(""); setShowForm(false); setSubmitting(false);
    setSelectedProduct(null); setProductSearch(""); setProductResults([]);
    setGenderOnly(false);
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

  const normalize = (s: string) => s.toLowerCase()
    .replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ı/g, "i")
    .replace(/İ/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ç/g, "c");

  const scoreSearch = (t: Topic, q: string): number => {
    const words = normalize(q.trim()).split(/\s+/).filter(Boolean);
    if (!words.length) return 1;
    const ntitle = normalize(t.title);
    const nbody = normalize(t.body || "");
    const nanswers = (answers[t.id] || []).map(a => normalize(a.body)).join(" ");
    let score = 0;
    for (const w of words) {
      if (ntitle.includes(w)) score += ntitle.split(/\s+/).some(tw => tw === w) ? 4 : 2;
      if (nbody.includes(w)) score += 1;
      if (nanswers.includes(w)) score += 1;
    }
    return score;
  };

  const catFiltered = topics.filter(t =>
    activeCat === "Hepsi" || t.category === activeCat || normalize(t.category) === normalize(activeCat)
  );
  const genderFiltered = catFiltered.filter(t => {
    if (genderFilter === "kadin") return t.gender_filter === "kadin";
    if (genderFilter === "erkek") return t.gender_filter === "erkek";
    return !t.gender_filter;
  });
  const filtered = searchQuery.trim()
    ? genderFiltered.map(t => ({ t, score: scoreSearch(t, searchQuery) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.t)
    : genderFiltered;
  const popular = [...topics].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 12);

  return (
    <main className="min-h-screen bg-[#F5F4F0]">
      <Header />

      {/* Toggle bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-center gap-1.5 py-2">
          <button onClick={() => router.push("/urunler")} title="Ürünler"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all text-gray-300 hover:bg-gray-100 hover:text-gray-500">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
          <button onClick={() => router.push("/")} title="Ana Sayfa"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all text-gray-300 hover:bg-gray-100 hover:text-gray-500">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </button>
          <button title="Tavsiyeler"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all bg-[#E8460A]/10 text-[#E8460A]">
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-5 flex gap-6">

        {/* ── Orta: Ana Feed ── */}
        <div className="flex-1 min-w-0">

          {/* Başlık */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-sm text-gray-900">Tavsiyeler</span>
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filtered.length} soru</span>
          </div>

          {/* Kategori filtreler + butonlar */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4 shadow-sm">
            <div className="flex gap-0 overflow-x-auto px-1" style={{ scrollbarWidth: "none" }}>
              {CATS.map(c => {
                const style = CAT_STYLE[c];
                const isActive = activeCat === c;
                return (
                  <button key={c} onClick={() => setActiveCat(c)}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-3 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all ${
                      isActive ? "border-[#E8460A] text-[#E8460A]" : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}>
                    {style && !isActive && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                    {c}
                  </button>
                );
              })}
            </div>

            {/* Gender filter sekmeleri — sadece giriş yapmış kullanıcılara */}
            {user && (
              <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100">
                <button onClick={() => setGenderFilter("hepsi")}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${genderFilter === "hepsi" ? "bg-[#E8460A] text-white border-[#E8460A]" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}>
                  Hepsi
                </button>
                {userGender === "kadin" && (
                  <button onClick={() => setGenderFilter("kadin")}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${genderFilter === "kadin" ? "bg-pink-500 text-white border-pink-500" : "border-pink-200 text-pink-500 hover:border-pink-400"}`}>
                    ♀ Kızakıza
                  </button>
                )}
                {userGender === "erkek" && (
                  <button onClick={() => setGenderFilter("erkek")}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${genderFilter === "erkek" ? "bg-blue-500 text-white border-blue-500" : "border-blue-200 text-blue-500 hover:border-blue-400"}`}>
                    ♂ Erkek Özel
                  </button>
                )}
              </div>
            )}

            {/* Butonlar — kategori barının altında */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowSearch(v => !v);
                  if (!showSearch) setTimeout(() => searchRef.current?.focus(), 50);
                  else setSearchQuery("");
                }}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#E8460A] text-white hover:bg-[#C93A08] transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Tavsiyelerde Ara
              </button>
              <button
                onClick={() => { if (!user) { window.location.href = "/giris"; return; } setShowForm(v => !v); }}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#E8460A] text-white hover:bg-[#C93A08] transition-all">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Soru Sor
              </button>
            </div>

            {/* Arama input */}
            {showSearch && (
              <div className="border-t border-gray-100 px-3 py-2.5">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Konularda ara... (örn: kulaklık, güneş kremi)"
                    className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-8 py-2 outline-none focus:border-[#E8460A] focus:ring-2 focus:ring-[#E8460A]/10 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-[11px] text-gray-400 mt-1 px-1">
                    {filtered.length > 0 ? <><span className="text-[#E8460A] font-bold">{filtered.length}</span> konu bulundu</> : "Sonuç bulunamadı"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Soru formu */}
          {showForm && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-4">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Yeni Soru Sor</span>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>
              <div className="p-4">
                <input type="text" value={titleVal} onChange={e => setTitleVal(e.target.value)}
                  placeholder="Sorunuzu yazın... (örn: 5000₺'ye en iyi kulaklık hangisi?)"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#E8460A] mb-3 transition-all" />
                <textarea value={bodyVal} onChange={e => setBodyVal(e.target.value)}
                  placeholder="Detay ekleyin (isteğe bağlı)" rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#E8460A] resize-none mb-3 transition-all text-gray-700" />

                {/* Ürün bağla */}
                <div className="mb-3">
                  {selectedProduct ? (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                      <span className="text-sm font-semibold text-orange-700 flex-1 truncate">
                        📦 {selectedProduct.brand} {selectedProduct.title}
                      </span>
                      <button onClick={() => { setSelectedProduct(null); setProductSearch(""); setProductResults([]); }}
                        className="text-orange-400 hover:text-orange-600 text-sm font-bold flex-shrink-0">✕</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }}
                        placeholder="Ürün bağla (isteğe bağlı, örn: iPhone 16)"
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#E8460A] transition-all"
                      />
                      {productResults.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {productResults.map(p => (
                            <button key={p.id} onClick={() => { setSelectedProduct(p); setCatVal(slugToTopicCat(p.category_slug)); setProductSearch(""); setProductResults([]); }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-orange-50 transition-colors text-left border-b border-gray-50 last:border-0">
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.title} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">📦</div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">{p.title}</p>
                                <p className="text-[11px] text-gray-400">{p.brand}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {(userGender === "kadin" || userGender === "erkek") && (
                  <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                    <input type="checkbox" checked={genderOnly} onChange={e => setGenderOnly(e.target.checked)}
                      className="w-4 h-4 accent-[#E8460A]" />
                    <span className="text-xs text-gray-600">
                      Bu soruyu sadece {userGender === "kadin" ? "♀ kadınlarla" : "♂ erkeklerle"} paylaş
                    </span>
                  </label>
                )}

                <div className="flex gap-2">
                  {selectedProduct ? (
                    <div className="flex-1 flex items-center gap-1.5 text-sm border border-orange-200 rounded-xl px-3 py-2.5 bg-orange-50 text-orange-700 font-semibold">
                      <svg className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      {catVal}
                    </div>
                  ) : (
                    <select value={catVal} onChange={e => setCatVal(e.target.value)}
                      className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#E8460A] bg-white text-gray-700">
                      {CATS.filter(c => c !== "Hepsi").map(c => <option key={c}>{c}</option>)}
                    </select>
                  )}
                  <button onClick={handleSubmit} disabled={submitting || !titleVal.trim()}
                    className="px-6 py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08] disabled:opacity-40 transition-all">
                    {submitting ? "Gönderiliyor..." : "Gönder"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Yeni bildirim */}
          {newCount > 0 && (
            <button onClick={() => setNewCount(0)}
              className="w-full mb-3 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              {newCount} yeni soru geldi
            </button>
          )}

          {/* Sorular */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
              <div className="text-4xl mb-3">💬</div>
              <div className="text-sm font-semibold text-gray-500 mb-1">Henüz soru yok</div>
              <div className="text-xs text-gray-400">Bu kategoride ilk soruyu sen sor!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(t => {
                const cs = CAT_STYLE[t.category];
                const leftBorder = CAT_LEFT_BORDER[t.category] || "border-l-gray-200";
                const myVote = userVotes[t.id] || 0;
                const netVotes = t.votes || 0;
                const topAnswers = [...(answers[t.id] || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 2);

                return (
                  <div key={t.id} className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${leftBorder} shadow-sm overflow-hidden`}>
                    <div className="p-4">
                      {/* Meta */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGrad(t.user_name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {(t.user_name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-700">{t.user_name}</span>
                          <span className="text-[10px] text-gray-400 ml-2">{timeAgo(t.created_at)}</span>
                        </div>
                        {t.gender_filter === "kadin" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-600">♀</span>
                        )}
                        {t.gender_filter === "erkek" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">♂</span>
                        )}
                        {cs && (
                          <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cs.bg} ${cs.text} ${cs.border}`}>
                            {t.category}
                          </span>
                        )}
                      </div>

                      {/* Soru */}
                      <Link href={"/tavsiye/" + t.id}>
                        <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1.5 hover:text-[#E8460A] transition-colors cursor-pointer">
                          {t.title}
                        </h3>
                      </Link>
                      {t.body && <p className="text-xs text-gray-500 mb-2 leading-relaxed">{t.body}</p>}

                      {/* Bağlı ürün */}
                      {t.product_slug && (
                        <Link href={"/urun/" + t.product_slug}
                          className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors">
                          <span>📦</span>
                          <span className="truncate max-w-[200px]">{t.product_brand} {t.product_title}</span>
                        </Link>
                      )}

                      {/* Top 2 cevap */}
                      {topAnswers.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                          {topAnswers.map(a => (
                            <div key={a.id} className="flex items-start gap-2">
                              <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-[9px] font-bold text-white ${
                                a.gender === "kadin" ? "bg-gradient-to-br from-pink-400 to-rose-400" : "bg-gradient-to-br from-blue-400 to-indigo-400"
                              }`}>
                                {(a.user_name || "?")[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-semibold text-gray-700">{a.user_name}: </span>
                                <span className="text-[11px] text-gray-500 line-clamp-2">{a.body}</span>
                              </div>
                              {a.votes > 0 && (
                                <span className="text-[10px] text-emerald-500 font-bold flex-shrink-0">👍 {a.votes}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Aksiyonlar */}
                      <div className="flex items-center gap-2">
                        <Link href={"/tavsiye/" + t.id}
                          className="flex items-center gap-1 text-xs text-[#E8460A] font-semibold hover:underline transition-all">
                          💬 Yanıtla
                          {t.answer_count > 0 && <span className="text-[10px] text-[#E8460A]/60">({t.answer_count})</span>}
                        </Link>

                        <div className="ml-auto flex items-center gap-1">
                          <button onClick={e => handleVote(e, t, 1)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                              myVote === 1
                                ? "bg-emerald-50 border-emerald-300 text-emerald-600 font-bold"
                                : "border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-500 hover:bg-emerald-50"
                            }`}>
                            👍 <span className="font-semibold">{netVotes > 0 ? netVotes : 0}</span>
                          </button>
                          <button onClick={e => handleVote(e, t, -1)}
                            className={`flex items-center text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                              myVote === -1
                                ? "bg-red-50 border-red-300 text-red-500"
                                : "border-gray-200 text-gray-300 hover:border-red-200 hover:text-red-400 hover:bg-red-50"
                            }`}>
                            👎
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

        {/* ── Sağ: Popüler Sorular ── */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm sticky top-20">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-base">🔥</span>
                <span className="font-bold text-sm text-gray-900">Popüler Sorular</span>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {popular.map((t, i) => {
                const cs = CAT_STYLE[t.category];
                return (
                  <Link href={"/tavsiye/" + t.id} key={t.id}>
                    <div className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-bold w-5 flex-shrink-0 ${i < 3 ? "text-[#E8460A]" : "text-gray-300"}`}>
                          #{i + 1}
                        </span>
                        {cs && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cs.dot}`} />}
                        <span className="text-[10px] text-gray-400 truncate">{t.category}</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 leading-snug line-clamp-2 group-hover:text-[#E8460A] transition-colors mb-1.5 pl-7">
                        {t.title}
                      </p>
                      <div className="flex items-center gap-3 pl-7 text-[10px] text-gray-400">
                        <span>👍 {t.votes || 0}</span>
                        <span>💬 {t.answer_count}</span>
                        <span className="ml-auto">{timeAgo(t.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

      </div>
      <Footer />
    </main>
  );
}
