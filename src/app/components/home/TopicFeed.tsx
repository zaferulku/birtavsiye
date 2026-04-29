"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import { GenderSymbol } from "../ui/GenderIcon";

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

const CATS = ["Hepsi", "Elektronik", "Kozmetik", "Ev & Yaşam", "Spor", "Seyahat", "Motorsiklet", "Hediye", "Diğer"];

const CAT_STYLE: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Elektronik:   { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
  Kozmetik:     { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
  "Ev & Yaşam": { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
  "Ev & Yasam": { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
  Spor:         { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
  Seyahat:      { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
  Motorsiklet:  { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
  Hediye:       { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
  Diğer:        { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
  Diger:        { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-300" },
};

const CAT_LEFT_BORDER: Record<string, string> = {
  Elektronik:   "border-l-gray-200",
  Kozmetik:     "border-l-gray-200",
  "Ev & Yaşam": "border-l-gray-200",
  "Ev & Yasam": "border-l-gray-200",
  Spor:         "border-l-gray-200",
  Seyahat:      "border-l-gray-200",
  Motorsiklet:  "border-l-gray-200",
  Hediye:       "border-l-gray-200",
  Diğer:        "border-l-gray-200",
  Diger:        "border-l-gray-200",
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

function TopicAvatar({ name, gender }: { name: string; gender?: string | null }) {
  const isGender = gender === "kadin" || gender === "erkek";
  const bg = gender === "kadin"
    ? "from-pink-400 to-rose-500"
    : gender === "erkek"
    ? "from-blue-400 to-indigo-500"
    : avatarGrad(name);
  return (
    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center font-bold flex-shrink-0`}>
      {isGender
        ? <GenderSymbol gender={gender!} size={12} white />
        : <span className="text-white text-[10px]">{(name || "?")[0].toUpperCase()}</span>
      }
    </div>
  );
}

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
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<{id:string;title:string;slug:string;brand:string;image_url:string|null;category_slug:string|null}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<{id:string;title:string;slug:string;brand:string} | null>(null);
  const productSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirst = useRef(true);
  const [userGender, setUserGender] = useState<string>("");
  const [userUsername, setUserUsername] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [genderFilter, setGenderFilter] = useState<"hepsi" | "kadin" | "erkek" | "tumu">("hepsi");
  const [genderOnly, setGenderOnly] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: sdata }) => {
      const session = sdata.session;
      setUser(session?.user ?? null);
      if (session?.access_token) {
        const auth = { Authorization: `Bearer ${session.access_token}` };
        const [vRes, pRes] = await Promise.all([
          fetch("/api/me/votes", { headers: auth }).then(r => r.json()).catch(() => null),
          fetch("/api/me/profile", { headers: auth }).then(r => r.json()).catch(() => null),
        ]);
        if (vRes?.votes) setUserVotes(Object.fromEntries((vRes.votes as { topic_id: string; vote: number }[]).map(x => [x.topic_id, x.vote])));
        const profile = pRes?.profile;
        setUserGender(profile?.gender || "");
        setUserUsername(profile?.username || "");
        setIsAdmin(!!profile?.is_admin);
        if (!profile?.is_admin) {
          if (profile?.gender === "kadin" || profile?.gender === "erkek") {
            setGenderFilter(profile.gender as "kadin" | "erkek");
          }
        }
      }
      setUserLoaded(true);
    });
    const abortController = new AbortController();
    fetchTopics(abortController.signal).catch(() => { /* abort or network — silently ignore */ });
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
    return () => {
      abortController.abort();
      supabase.removeChannel(ch);
    };
  }, []);

  const fetchTopics = async (signal?: AbortSignal) => {
    const res = await fetch("/api/public/topics?limit=60", { signal }).then(r => r.json()).catch(() => null);
    if (signal?.aborted) return;
    const data = res?.topics as Topic[] | undefined;
    if (!data) return;
    setTopics(data);
    isFirst.current = false;

    // Tüm topic'lerin cevaplarını tek sorguda çek
    const ids = data.map((t: Topic) => t.id);
    if (ids.length > 0) {
      const aRes = await fetch(`/api/public/topic-answers?topic_ids=${ids.join(",")}`, { signal })
        .then(r => r.json()).catch(() => null);
      if (signal?.aborted) return;
      const ans = aRes?.answers as Answer[] | undefined;
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
    userUsername || u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Kullanıcı";

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
    if (m(["laptop","bilgisayar","notebook","macbook","dell","asus","hp","lenovo","pc","tablet","ipad","monitor","klavye","mouse","kulaklık","kulaklik","airpods","bluetooth","speaker","hoparlor","kamera","fotoğraf","fotograf","drone","oyun","konsol","playstation","xbox","nintendo","tv","televizyon","router","modem","şarj","sarj","powerbank"])) return "Elektronik";
    if (m(["krem","serum","makyaj","ruj","rimel","maskara","parfum","deodorant","saç","sac","şampuan","sampuan","losyon","yüz","yuz","cilt","fondoten"])) return "Kozmetik";
    if (m(["mobilya","koltuk","masa","sandalye","yatak","nevresim","havlu","mutfak","tencere","tava","blender","çamaşır","camasir","bulaşık","bulasik","süpürge","supurge","temizlik","deterjan","lamba","avize","hali","halı","perde","bahçe","bahce"])) return "Ev & Yaşam";
    if (m(["spor","koşu","kossu","nike","adidas","puma","fitness","dumbbell","protein","yoga","bisiklet","kamp","çadır","cadir","outdoor","futbol","basketbol","tenis","yüzme","yuzme","dağcılık"])) return "Spor";
    if (m(["oyuncak","lego","bebek","puzzle","bulmaca","hediye","doğum günü","dogum gunu","çocuk","cocuk"])) return "Hediye";
    if (m(["kitap","roman","dergi"])) return "Diğer";
    return "Elektronik";
  };

  const searchProducts = (q: string) => {
    if (productSearchTimeout.current) clearTimeout(productSearchTimeout.current);
    if (!q.trim()) { setProductResults([]); return; }
    productSearchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/public/products?q=${encodeURIComponent(q)}&limit=6`)
        .then(r => r.json()).catch(() => null);
      const data = res?.products;
      setProductResults((data || []).map((p: any) => ({ ...p, category_slug: null })));
    }, 300);
  };

  const handleSubmit = async () => {
    if (!titleVal.trim() || !user) return;
    setSubmitting(true);
    const finalCat = selectedProduct ? catVal : guessCatFromTitle(titleVal);
    const gf = genderOnly && (userGender === "kadin" || userGender === "erkek") ? userGender : null;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetch("/api/topics", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: getDisplay(user),
          title: titleVal, body: bodyVal, category: finalCat,
          gender_filter: gf,
          ...(selectedProduct ? {
            product_id: selectedProduct.id,
            product_slug: selectedProduct.slug,
            product_title: selectedProduct.title,
            product_brand: selectedProduct.brand,
          } : {}),
        }),
      });
    }
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
    const { data: { session } } = await supabase.auth.getSession();
    const auth = session?.access_token ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } : null;
    if (!auth) return;
    if (cur === val) {
      await fetch(`/api/topic-votes?topic_id=${t.id}`, { method: "DELETE", headers: auth });
    } else {
      await fetch("/api/topic-votes", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ topic_id: t.id, vote: val }),
      });
    }
    const newTotal = (t.votes || 0) + diff;
    // topics.votes güncellemesi backend'e taşınacak — şimdilik optimistic
    void newTotal;
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
    if (!userLoaded) return !t.gender_filter; // yükleniyor: sadece genel
    if (isAdmin) return true; // admin hepsini görür
    if (!user) return true; // misafir: hepsini göster (kart kilitli)
    if (genderFilter === "kadin") return t.gender_filter === "kadin" || !t.gender_filter;
    if (genderFilter === "erkek") return t.gender_filter === "erkek" || !t.gender_filter;
    if (genderFilter === "tumu") return t.gender_filter === "kadin" || t.gender_filter === "erkek";
    return !t.gender_filter;
  });
  const filtered = searchQuery.trim()
    ? genderFiltered.map(t => ({ t, score: scoreSearch(t, searchQuery) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.t)
    : genderFiltered;

  // Popüler sorular: oylarına göre sıralı top 8
  const popular = [...topics].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 8);

  return (
    <div className="flex flex-col h-full bg-[#FAFAF8]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-sm text-gray-900">Tavsiyeler</span>
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filtered.length} soru</span>
        </div>

        {/* Kategori sekmeleri */}
        <div className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATS.map(c => {
            const style = CAT_STYLE[c];
            const isActive = activeCat === c && genderFilter === "hepsi";
            return (
              <button key={c} onClick={() => { setActiveCat(c); setGenderFilter("hepsi"); }}
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive ? "border-[#E8460A] text-[#E8460A]" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}>
                {style && !isActive && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
                {c}
              </button>
            );
          })}
        </div>

        {/* Cinsiyet sekmeleri — butonlar herkese görünür, içerik sadece giriş yapana */}
        <div className="flex items-center gap-1.5 px-1 py-1.5 border-t border-gray-100">
          <button
            onClick={() => {
              if (!user) { window.location.href = "/giris"; return; }
              setGenderFilter(genderFilter === "kadin" ? "hepsi" : "kadin");
            }}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${genderFilter === "kadin" ? "bg-pink-500 text-white border-pink-500" : "border-pink-300 text-pink-600 hover:border-pink-500"}`}>
            ♀ Kadınlara Özel
          </button>
          <button
            onClick={() => {
              if (!user) { window.location.href = "/giris"; return; }
              setGenderFilter(genderFilter === "erkek" ? "hepsi" : "erkek");
            }}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${genderFilter === "erkek" ? "bg-blue-500 text-white border-blue-500" : "border-blue-300 text-blue-600 hover:border-blue-500"}`}>
            ♂ Erkeklere Özel
          </button>
          {user && (
            <button onClick={() => setGenderFilter(genderFilter === "tumu" ? "hepsi" : "tumu")}
              className={`flex items-center gap-0.5 px-2 py-1 rounded-full border transition-all ${genderFilter === "tumu" ? "border-purple-400 bg-purple-50" : "border-gray-200 bg-white hover:border-purple-300"}`}>
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-[11px] font-bold">♀</span>
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[11px] font-bold">♂</span>
            </button>
          )}
        </div>

        {/* Butonlar — kategori barının altında */}
        <div className="flex items-center gap-2 px-1 py-2 border-t border-gray-100">
          <button
            onClick={() => {
              setShowSearch(v => !v);
              if (!showSearch) setTimeout(() => searchRef.current?.focus(), 50);
              else setSearchQuery("");
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#E8460A] text-white hover:bg-[#C93A08] transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            Tavsiyelerde Ara
          </button>
          <button
            onClick={() => { if (!user) { window.location.href = "/giris"; return; } setShowForm(v => !v); }}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#E8460A] text-white hover:bg-[#C93A08] transition-all">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Soru Sor
          </button>
        </div>

        {/* Arama input */}
        {showSearch && (
          <div className="pt-2 pb-2.5">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Konularda ara..."
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

            {/* Ürün bağla */}
            <div className="mb-2.5">
              {selectedProduct ? (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                  <span className="text-[11px] font-semibold text-orange-700 flex-1 truncate">
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
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#E8460A] transition-all"
                  />
                  {productResults.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {productResults.map(p => (
                        <button key={p.id} onClick={() => { setSelectedProduct(p); setCatVal(slugToTopicCat(p.category_slug)); setProductSearch(""); setProductResults([]); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 transition-colors text-left border-b border-gray-50 last:border-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.title} className="w-7 h-7 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 flex-shrink-0">📦</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-gray-800 truncate">{p.title}</p>
                            <p className="text-[10px] text-gray-400">{p.brand}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {(userGender === "kadin" || userGender === "erkek") && (
              <label className="flex items-center gap-2 mb-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={genderOnly} onChange={e => setGenderOnly(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#E8460A]" />
                <span className="text-[11px] text-gray-600">
                  Bu soruyu sadece {userGender === "kadin" ? "♀ kadınlarla" : "♂ erkeklerle"} paylaş
                </span>
              </label>
            )}

            <div className="flex gap-2">
              {selectedProduct ? (
                <div className="flex-1 flex items-center gap-1.5 text-xs border border-orange-200 rounded-xl px-3 py-2 bg-orange-50 text-orange-700 font-semibold">
                  <svg className="w-3 h-3 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                  {catVal}
                </div>
              ) : (
                <select value={catVal} onChange={e => setCatVal(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#E8460A] bg-white text-gray-700">
                  {CATS.filter(c => c !== "Hepsi").map(c => <option key={c}>{c}</option>)}
                </select>
              )}
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
      <div className="flex flex-1 overflow-hidden justify-center">
        <div className="w-full max-w-[1100px] flex overflow-hidden">

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
                const topAnswers = [...(answers[t.id] || [])].sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 2);

                const isLocked = userLoaded && !user && !!t.gender_filter;
                return (
                  <Link href={"/tavsiye/" + t.id} key={t.id} onClick={isLocked ? (e) => { e.preventDefault(); window.location.href = "/giris"; } : undefined}>
                    <div className={`relative bg-white rounded-xl border border-gray-100 border-l-4 ${leftBorder} hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group overflow-hidden`}>
                      {isLocked && (
                        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center gap-2">
                          <span className="text-2xl">{t.gender_filter === "kadin" ? "♀️" : "♂️"}</span>
                          <span className="text-xs font-bold text-gray-600">
                            {t.gender_filter === "kadin" ? "Kadınlara özel" : "Erkeklere özel"}
                          </span>
                          <span className="text-[11px] px-3 py-1 bg-[#E8460A] text-white rounded-full font-semibold">Giriş yap</span>
                        </div>
                      )}
                      <div className={`p-3.5 ${isLocked ? "select-none pointer-events-none" : ""}`}>
                        {/* Üst satır: avatar + isim + kategori + zaman */}
                        <div className="flex items-center gap-2 mb-2">
                          <TopicAvatar name={t.user_name} gender={t.gender_filter} />
                          <span className="text-xs font-semibold text-gray-700 truncate max-w-[80px]">{t.user_name}</span>
                          {cs && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cs.bg} ${cs.text} ${cs.border}`}>
                              {t.category}
                            </span>
                          )}
                          {(t.gender_filter === "kadin" || t.gender_filter === "erkek") && (
                            <GenderSymbol gender={t.gender_filter} size={13} />
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

                        {/* Bağlı ürün */}
                        {t.product_slug && (
                          <Link href={"/urun/" + t.product_slug} onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg text-[11px] font-semibold text-orange-700 hover:bg-orange-100 transition-colors">
                            <span>📦</span>
                            <span className="truncate max-w-[180px]">{t.product_brand} {t.product_title}</span>
                          </Link>
                        )}

                        {/* Top 2 cevap önizlemesi */}
                        {topAnswers.length > 0 && (
                          <div className="mt-2 mb-2.5 space-y-1.5 border-t border-gray-50 pt-2">
                            {topAnswers.map(a => (
                              <div key={a.id} className="flex items-start gap-1.5">
                                <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center font-bold ${
                                  a.gender === "kadin" ? "bg-gradient-to-br from-pink-400 to-rose-400" : a.gender === "erkek" ? "bg-gradient-to-br from-blue-400 to-indigo-400" : "bg-gradient-to-br " + avatarGrad(a.user_name)
                                }`}>
                                  {(a.gender === "kadin" || a.gender === "erkek")
                                    ? <GenderSymbol gender={a.gender} size={9} white />
                                    : <span className="text-white text-[8px]">{(a.user_name || "?")[0].toUpperCase()}</span>
                                  }
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
                            className="flex items-center gap-1 text-[11px] text-[#E8460A] font-semibold hover:underline transition-all">
                            💬 Yanıtla
                            {t.answer_count > 0 && <span className="text-[10px] text-[#E8460A]/60">({t.answer_count})</span>}
                          </Link>

                          <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button type="button" onClick={e => handleVote(e, t, 1)}
                              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all ${
                                myVote === 1
                                  ? "bg-stone-100 border-stone-300 text-stone-600 font-bold"
                                  : "border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}>
                              👍 <span className="font-semibold">{netVotes > 0 ? netVotes : 0}</span>
                            </button>
                            <button type="button" onClick={e => handleVote(e, t, -1)}
                              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all ${
                                myVote === -1
                                  ? "bg-stone-100 border-stone-300 text-stone-600"
                                  : "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50"
                              }`}>
                              👎 <span className="font-semibold">{netVotes < 0 ? Math.abs(netVotes) : 0}</span>
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
        <div className="w-[280px] flex-shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
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
    </div>
  );
}
