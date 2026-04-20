"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import Link from "next/link";

const tabs = ["Yorumlar", "Teknik Özellikler", "Benzer Ürünler", "Tavsiyeler"];

type Post = {
  id: string;
  body: string;
  user_name: string;
  created_at: string;
  parent_id: string | null;
  votes: number;
  downvotes: number;
  rating?: number;
};

type LinkedTopic = {
  id: string; title: string; body: string;
  user_name: string; category: string;
  votes: number; answer_count: number; created_at: string;
};

type SimilarProduct = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  image_url?: string;
  prices?: { price: number }[];
};

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} viewBox="0 0 20 20" fill={s <= rating ? "#E8A000" : "#E0E0E0"}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const StarSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const labels = ["", "Çok Kötü", "Kötü", "Orta", "İyi", "Mükemmel"];
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)} className="focus:outline-none">
          <svg className="w-8 h-8" viewBox="0 0 20 20" fill={value >= s ? "#E8A000" : "#E0E0E0"}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      {value > 0 && <span className="text-sm text-[#E8A000] font-semibold ml-1">{labels[value]}</span>}
    </div>
  );
};

const Avatar = ({ name, size = "md" }: { name: string; size?: "sm" | "md" }) => (
  <div className={`rounded-full bg-[#E8460A]/10 flex items-center justify-center text-[#E8460A] font-bold flex-shrink-0 ${size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm"}`}>
    {(name || "A")[0].toUpperCase()}
  </div>
);

const formatDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

function ReplyBox({ post, onSubmit, onCancel }: {
  post: Post;
  onSubmit: (parentId: string, body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!replyBody.trim()) return;
    setLoading(true);
    await onSubmit(post.id, replyBody);
    setReplyBody("");
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="ml-12 mt-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
      {sent && <div className="text-xs text-green-600 font-medium mb-1.5">✓ Yanıtınız gönderildi!</div>}
      <textarea
        className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm outline-none resize-none placeholder:text-gray-400 focus:border-[#E8460A] transition-all"
        rows={2}
        placeholder={post.user_name + " kullanıcısına yanıtınızı yazın..."}
        value={replyBody}
        onChange={(e) => { setReplyBody(e.target.value); setSent(false); }}
      />
      <div className="flex gap-2 mt-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-all">Kapat</button>
        <button onClick={handleSubmit} disabled={loading || !replyBody.trim()}
          className="px-4 py-1.5 text-xs bg-[#E8460A] text-white rounded-lg hover:bg-[#C93A08] disabled:opacity-40 transition-all">
          {loading ? "Gönderiliyor..." : "Yanıtla"}
        </button>
      </div>
    </div>
  );
}

export default function CommunitySection({
  productId,
  specs,
  categoryId,
}: {
  productId: string;
  specs?: Record<string, string> | null;
  categoryId?: string | null;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [votedPosts, setVotedPosts] = useState<Record<string, "up" | "down">>({});
  const [sortBy, setSortBy] = useState("onerilen");
  const [searchQuery, setSearchQuery] = useState("");
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [linkedTopics, setLinkedTopics] = useState<LinkedTopic[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadUserVotes(data.user.id);
    });
    fetchPosts();
  }, [productId]);

  useEffect(() => {
    if (!categoryId) return;

    const load = async () => {
      // Bu ürünün model_family'sini öğren — variant dedup için
      const { data: thisProd } = await supabase
        .from("products")
        .select("brand, model_family")
        .eq("id", productId)
        .maybeSingle();

      let q = supabase.from("products")
        .select("id,title,slug,brand,image_url,model_family,prices(price)")
        .eq("category_id", categoryId)
        .neq("id", productId);

      if (thisProd?.model_family) {
        q = q.neq("model_family", thisProd.model_family);
      }

      const { data } = await q.limit(40);
      if (!data) return;

      // Her family'den 1 temsilci (variant dedup)
      const byFamily = new Map<string, typeof data[number]>();
      const noFamily: typeof data = [];
      for (const p of data) {
        if (p.brand && p.model_family) {
          const key = `${p.brand}|${p.model_family}`;
          if (!byFamily.has(key)) byFamily.set(key, p);
        } else {
          noFamily.push(p);
        }
      }
      const deduped = [...byFamily.values(), ...noFamily];

      // Aynı brand'i öne al
      const sorted = deduped.sort((a, b) => {
        const aBrand = thisProd?.brand && a.brand === thisProd.brand ? 0 : 1;
        const bBrand = thisProd?.brand && b.brand === thisProd.brand ? 0 : 1;
        return aBrand - bBrand;
      });

      setSimilarProducts(sorted.slice(0, 8) as unknown as SimilarProduct[]);
    };
    load();
  }, [categoryId, productId]);

  useEffect(() => {
    supabase.from("topics")
      .select("id,title,body,user_name,category,votes,answer_count,created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setLinkedTopics(data); });
  }, [productId]);

  const loadUserVotes = async (userId: string) => {
    const { data } = await supabase.from("post_votes").select("post_id, vote_type").eq("user_id", userId);
    if (data) {
      const map: Record<string, "up" | "down"> = {};
      data.forEach((v) => { map[v.post_id] = v.vote_type; });
      setVotedPosts(map);
    }
  };

  const fetchPosts = async () => {
    const { data } = await supabase.from("community_posts").select("*")
      .eq("product_id", productId).order("created_at", { ascending: true });
    if (data) setPosts(data);
  };

  const getDisplayName = (u: any) =>
    u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Kullanıcı";

  const handleVote = async (post: Post, type: "up" | "down") => {
    if (!user) { window.location.href = "/giris"; return; }
    const existing = votedPosts[post.id];
    if (existing === type) {
      const update: any = type === "up" ? { votes: Math.max(0, post.votes - 1) } : { downvotes: Math.max(0, post.downvotes - 1) };
      setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, ...update } : p));
      setVotedPosts((prev) => { const n = { ...prev }; delete n[post.id]; return n; });
      await supabase.from("community_posts").update(update).eq("id", post.id);
      await supabase.from("post_votes").delete().eq("post_id", post.id).eq("user_id", user.id);
      return;
    }
    const update: any = {};
    if (type === "up") { update.votes = post.votes + 1; if (existing === "down") update.downvotes = Math.max(0, post.downvotes - 1); }
    else { update.downvotes = (post.downvotes || 0) + 1; if (existing === "up") update.votes = Math.max(0, post.votes - 1); }
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, ...update } : p));
    setVotedPosts((prev) => ({ ...prev, [post.id]: type }));
    await supabase.from("community_posts").update(update).eq("id", post.id);
    await supabase.from("post_votes").upsert({ post_id: post.id, user_id: user.id, vote_type: type }, { onConflict: "post_id,user_id" });
  };

  const handleSubmit = async () => {
    if (userRating === 0) return;
    if (!user) { window.location.href = "/giris"; return; }
    setLoading(true);
    const submitBody = body.trim() || `${userRating} yıldız puan verildi.`;
    await supabase.from("community_posts").insert({
      product_id: productId, user_id: user.id,
      user_name: getDisplayName(user), type: "yorum",
      title: submitBody.slice(0, 80), body: submitBody,
      votes: 0, downvotes: 0, parent_id: null, rating: userRating,
    });
    setBody(""); setUserRating(0); await fetchPosts(); setLoading(false);
  };

  const handleReply = useCallback(async (parentId: string, replyBody: string) => {
    if (!user) { window.location.href = "/giris"; return; }
    await supabase.from("community_posts").insert({
      product_id: productId, user_id: user.id,
      user_name: getDisplayName(user), type: "yorum",
      title: replyBody.slice(0, 80), body: replyBody,
      votes: 0, downvotes: 0, parent_id: parentId,
    });
    await fetchPosts();
    setReplyToId(null);
  }, [user, productId]);

  const topPostsRaw = posts.filter((p) => !p.parent_id)
    .filter((p) => searchQuery === "" || p.body.toLowerCase().includes(searchQuery.toLowerCase()) || p.user_name.toLowerCase().includes(searchQuery.toLowerCase()));

  const topPosts = [...topPostsRaw].sort((a, b) => {
    if (sortBy === "en-yeni") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "en-eski") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "en-faydali") return (b.votes - b.downvotes) - (a.votes - a.downvotes);
    if (sortBy === "en-yuksek") return (b.rating || 0) - (a.rating || 0);
    if (sortBy === "en-dusuk") return (a.rating || 0) - (b.rating || 0);
    return (b.votes - b.downvotes) - (a.votes - a.downvotes);
  });
  const getReplies = (id: string) => posts.filter((p) => p.parent_id === id);

  const ratingsAll = topPosts.filter((p) => p.rating && p.rating > 0);
  const yorumCount = topPosts.filter((p) => p.body && !p.body.match(/^\d yıldız puan verildi\.$/)).length;
  const degerlendirmeCount = ratingsAll.length;
  const avgRating = ratingsAll.length > 0
    ? Math.round(ratingsAll.reduce((acc, p) => acc + (p.rating || 0), 0) / ratingsAll.length) : 0;
  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star, count: ratingsAll.filter((p) => p.rating === star).length,
  }));
  const maxCount = Math.max(...ratingDist.map((r) => r.count), 1);

  const specEntries = specs ? Object.entries(specs).filter(([, v]) => v) : [];

  const PostRow = ({ p, indent = false }: { p: Post; indent?: boolean }) => {
    const replies = getReplies(p.id);
    const voted = votedPosts[p.id];
    const postRating = p.rating || 0;
    const isPureRating = p.body === `${postRating} yıldız puan verildi.`;
    if (isPureRating) return null;

    return (
      <div>
        <div className="py-3 border-t border-gray-100">
          <div className="flex gap-3">
            <Avatar name={p.user_name} size={indent ? "sm" : "md"} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="font-semibold text-sm text-gray-900">{p.user_name || "Anonim"}</span>
                <span className="text-gray-300 text-xs">·</span>
                <span className="text-xs text-gray-400">{formatDate(p.created_at)}</span>
                {!indent && postRating > 0 && <StarRating rating={postRating} />}
                {!indent && (
                  <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">
                    Doğrulanmış
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{p.body}</p>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  {!indent && (
                    <button
                      onClick={() => { if (!user) { window.location.href = "/giris"; return; } setReplyToId(replyToId === p.id ? null : p.id); }}
                      className="text-xs text-gray-400 hover:text-[#E8460A] transition-colors px-1.5 py-1 rounded">
                      Yanıtla {replies.length > 0 && `(${replies.length})`}
                    </button>
                  )}
                  <button onClick={() => handleVote(p, "up")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs transition-all ${voted === "up" ? "bg-green-500 border-green-500 text-white" : "border-gray-200 text-gray-400 hover:border-green-400 hover:text-green-500"}`}>
                    👍 {p.votes || 0}
                  </button>
                  <button onClick={() => handleVote(p, "down")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs transition-all ${voted === "down" ? "bg-red-400 border-red-400 text-white" : "border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-400"}`}>
                    👎 {p.downvotes || 0}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {replyToId === p.id && (
          <ReplyBox post={p} onSubmit={handleReply} onCancel={() => setReplyToId(null)} />
        )}

        {replies.length > 0 && (
          <div className="ml-12 border-l-2 border-gray-100 pl-3">
            {replies.map((r) => <PostRow key={r.id} p={r} indent />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="yorumlar">
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${activeTab === i ? "border-[#E8460A] text-[#E8460A]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
            {i === 0 && ` (${topPosts.length})`}
            {i === 1 && specEntries.length > 0 && ` (${specEntries.length})`}
            {i === 2 && similarProducts.length > 0 && ` (${similarProducts.length})`}
            {i === 3 && linkedTopics.length > 0 && ` (${linkedTopics.length})`}
          </button>
        ))}
      </div>

      {/* Yorumlar */}
      {activeTab === 0 && (
        <div className="flex gap-10">
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-24">
              <h3 className="font-bold text-base text-gray-900 mb-4">Müşteri Yorumları</h3>
              <div className="mb-4">
                <div className="text-5xl font-bold text-gray-900 mb-1">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</div>
                <StarRating rating={avgRating} size="lg" />
                <div className="text-sm text-gray-500 mt-1">{topPosts.length} değerlendirme</div>
              </div>
              <div className="mb-5 space-y-1.5">
                {ratingDist.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-[#E8460A] w-12 text-right flex-shrink-0">{star} yıldız</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#E8A000] h-full rounded-full" style={{ width: `${maxCount > 0 ? Math.round((count / maxCount) * 100) : 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-7 flex-shrink-0">
                      {topPosts.length > 0 && count > 0 ? Math.round((count / topPosts.length) * 100) + "%" : "0%"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="text-sm font-bold text-gray-800 mb-0.5">Bu ürünü incele</div>
                <div className="text-xs text-gray-500 mb-3">Düşüncelerinizi paylaşın</div>
                {user ? (
                  <button onClick={() => document.getElementById("yorum-kutusu")?.scrollIntoView({ behavior: "smooth" })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
                    Yorum yaz
                  </button>
                ) : (
                  <a href="/giris" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-[#E8460A] hover:text-[#E8460A] transition-all text-center">
                    Giriş yapıp yorum yaz
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div id="yorum-kutusu" className="mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">Tüm Değerlendirmeler</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={avgRating} size="sm" />
                      <span className="text-sm font-bold text-gray-800">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</span>
                      <span className="text-xs text-gray-400">· {degerlendirmeCount} değerlendirme · {yorumCount} yorum</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Yorumlarda Ara</label>
                    <div className="flex items-center bg-gray-100 rounded-lg px-3 gap-2 h-9">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Yorum veya kullanıcı adı ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder:text-gray-400"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
                      )}
                    </div>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 h-9 text-xs text-gray-600 outline-none bg-white cursor-pointer hover:border-[#E8460A] transition-all">
                    <option value="onerilen">Önerilen Sıralama</option>
                    <option value="en-yeni">En Yeni</option>
                    <option value="en-eski">En Eski</option>
                    <option value="en-faydali">En Faydalı</option>
                    <option value="en-yuksek">En Yüksek Puan</option>
                    <option value="en-dusuk">En Düşük Puan</option>
                  </select>
                </div>
              </div>
              {user ? (
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={getDisplayName(user)} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">{getDisplayName(user)}</div>
                      <div className="text-xs text-gray-400">Doğrulanmış üye</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Puanınız</div>
                      <StarSelector value={userRating} onChange={setUserRating} />
                    </div>
                  </div>
                  <textarea
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none text-gray-800 placeholder:text-gray-400 focus:border-[#E8460A] focus:bg-white transition-all"
                    rows={3}
                    placeholder="Yorumunuz isteğe bağlı — sadece puan vermek yeterli!"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{userRating === 0 ? "En az puan seçin" : `${["", "Çok Kötü", "Kötü", "Orta", "İyi", "Mükemmel"][userRating]} seçildi ✓`}</span>
                    <button onClick={handleSubmit} disabled={loading || userRating === 0}
                      className="px-6 py-2 bg-[#E8A000] hover:bg-[#CC8C00] text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-all">
                      {loading ? "Gönderiliyor..." : "Gönder"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-2xl mb-2">✍️</div>
                  <p className="text-sm text-gray-600 mb-1">Yorum yazmak için giriş yapınız</p>
                  <p className="text-xs text-gray-400 mb-4">Deneyiminizi paylaşarak diğer kullanıcılara yardımcı olun</p>
                  <a href="/giris" className="px-6 py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08] transition-all inline-block">Giriş Yap</a>
                </div>
              )}
            </div>

            {topPosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💬</div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Henüz yorum yok</div>
                <div className="text-xs text-gray-400">İlk değerlendirmeyi sen yap!</div>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-sm text-gray-900 mb-1">En iyi değerlendirmeler</h3>
                {topPosts.map((p) => <PostRow key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teknik Özellikler */}
      {activeTab === 1 && (
        <div>
          {specEntries.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <div className="text-3xl mb-3">📋</div>
              <div className="text-sm font-medium text-gray-600 mb-1">Teknik özellik girilmemiş</div>
              <div className="text-xs text-gray-400">Bu ürün için henüz teknik özellik bilgisi bulunmuyor</div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {specEntries.map(([key, value], i) => (
                    <tr key={key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-6 py-3.5 text-gray-500 font-medium w-2/5 border-r border-gray-100">{key}</td>
                      <td className="px-6 py-3.5 text-gray-800 font-medium">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Benzer Ürünler */}
      {activeTab === 2 && (
        <div>
          {similarProducts.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <div className="text-3xl mb-3">📦</div>
              <div className="text-sm font-medium text-gray-600">Benzer ürün bulunamadı</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {similarProducts.map((p) => {
                const minPrice = p.prices?.length
                  ? p.prices.reduce((m, x) => x.price < m.price ? x : m, p.prices[0])
                  : null;
                return (
                  <Link href={"/urun/" + p.slug} key={p.id}>
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-[#E8460A]/30 transition-all group cursor-pointer">
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.title} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
                          : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                        }
                      </div>
                      <div className="p-3">
                        <div className="text-[10px] font-bold text-[#E8460A] uppercase tracking-wide mb-0.5">{p.brand}</div>
                        <div className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug mb-2">{p.title}</div>
                        {minPrice ? (
                          <div className="text-sm font-bold text-gray-900">{minPrice.price.toLocaleString("tr-TR")} <span className="text-xs font-normal text-gray-400">₺</span></div>
                        ) : (
                          <div className="text-xs text-[#E8460A] font-semibold">Fiyatları Gör →</div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tavsiyeler */}
      {activeTab === 3 && (
        <div id="tavsiyeler">
          {linkedTopics.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <div className="text-3xl mb-3">💬</div>
              <div className="text-sm font-medium text-gray-600 mb-1">Bu ürün için henüz soru sorulmamış</div>
              <div className="text-xs text-gray-400 mb-4">Soru sor butonuyla bu ürünü bir soruya bağlayabilirsin</div>
              <Link href="/tavsiyeler" className="inline-block px-5 py-2 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08] transition-all">
                Soru Sor
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedTopics.map(t => (
                <Link href={"/tavsiye/" + t.id} key={t.id}>
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-[#E8460A]/30 transition-all group cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#E8460A]/10 flex items-center justify-center text-[#E8460A] font-bold text-sm flex-shrink-0">
                        {(t.user_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-[#E8460A] transition-colors leading-snug mb-1 line-clamp-2">
                          {t.title}
                        </p>
                        {t.body && <p className="text-xs text-gray-400 line-clamp-1 mb-2">{t.body}</p>}
                        <div className="flex items-center gap-3 text-[11px] text-gray-400">
                          <span className="font-medium text-gray-600">{t.user_name}</span>
                          <span>👍 {t.votes || 0}</span>
                          <span>💬 {t.answer_count} yanıt</span>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-[#E8460A] flex-shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
