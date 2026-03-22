"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

const tabs = ["Yorumlar", "Teknik Özellikler", "Benzer Ürünler"];

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

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} className={size === "lg" ? "w-5 h-5" : "w-4 h-4"} viewBox="0 0 20 20" fill={s <= rating ? "#E8A000" : "#E0E0E0"}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const StarSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const labels = ["", "Cok Kotu", "Kotu", "Orta", "Iyi", "Mukemmel"];
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)} className="focus:outline-none">
          <svg className="w-8 h-8" viewBox="0 0 20 20" fill={value >= s ? "#E8A000" : "#E0E0E0"}>
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span className="text-sm text-[#E8A000] font-semibold ml-1">{labels[value]}</span>
      )}
    </div>
  );
};

const Avatar = ({ name, size = "md" }: { name: string; size?: "sm" | "md" }) => (
  <div className={`rounded-full bg-[#E8460A]/10 flex items-center justify-center text-[#E8460A] font-bold flex-shrink-0 ${size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"}`}>
    {(name || "A")[0].toUpperCase()}
  </div>
);

const formatDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

// ReplyBox ayrı component olarak dışarıda tanımlı
function ReplyBox({ post, user, onSubmit, onCancel }: {
  post: Post;
  user: any;
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
    <div className="ml-14 mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
      {sent && (
        <div className="text-xs text-green-600 font-medium mb-2">✓ Yanitiniz gonderildi! Tekrar yazabilirsiniz.</div>
      )}
      <textarea
        className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm outline-none resize-none placeholder:text-gray-400 focus:border-[#E8460A] transition-all"
        rows={2}
        placeholder={post.user_name + " kullanicisina yanitinizi yazin..."}
        value={replyBody}
        onChange={(e) => { setReplyBody(e.target.value); setSent(false); }}
      />
      <div className="flex gap-2 mt-2 justify-end">
        <button onClick={onCancel}
          className="px-4 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-all">
          Kapat
        </button>
        <button onClick={handleSubmit} disabled={loading || !replyBody.trim()}
          className="px-4 py-1.5 text-xs bg-[#E8460A] text-white rounded-lg hover:bg-[#C93A08] disabled:opacity-40 transition-all">
          {loading ? "Gonderiliyor..." : "Yanitla"}
        </button>
      </div>
    </div>
  );
}

export default function CommunitySection({ productId }: { productId: string }) {
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [votedPosts, setVotedPosts] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadUserVotes(data.user.id);
    });
    fetchPosts();
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
    const { data } = await supabase
      .from("community_posts").select("*")
      .eq("product_id", productId).order("created_at", { ascending: true });
    if (data) setPosts(data);
  };

  const getDisplayName = (u: any) =>
    u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Kullanici";

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
    const submitBody = body.trim() || `${userRating} yildiz puan verildi.`;
    await supabase.from("community_posts").insert({
      product_id: productId, user_id: user.id,
      user_name: getDisplayName(user), type: "yorum",
      title: submitBody.slice(0, 80), body: submitBody,
      votes: 0, downvotes: 0, parent_id: null,
      rating: userRating,
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

  const topPosts = posts.filter((p) => !p.parent_id).sort((a, b) => (b.votes - b.downvotes) - (a.votes - a.downvotes));
  const getReplies = (id: string) => posts.filter((p) => p.parent_id === id);

  const ratingsAll = topPosts.filter((p) => p.rating && p.rating > 0);
  const avgRating = ratingsAll.length > 0
    ? Math.round(ratingsAll.reduce((acc, p) => acc + (p.rating || 0), 0) / ratingsAll.length)
    : 0;

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratingsAll.filter((p) => p.rating === star).length,
  }));
  const maxCount = Math.max(...ratingDist.map((r) => r.count), 1);

  const PostRow = ({ p, indent = false }: { p: Post; indent?: boolean }) => {
    const replies = getReplies(p.id);
    const voted = votedPosts[p.id];
    const postRating = p.rating || 0;
    const isPureRating = p.body === `${postRating} yildiz puan verildi.`;

    return (
      <div className={indent ? "ml-12 mt-3" : "py-5 border-b border-gray-100 last:border-0"}>
        <div className="flex gap-4">
          <Avatar name={p.user_name} size={indent ? "sm" : "md"} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">{p.user_name || "Anonim"}</span>
                {!indent && (
                  <span className="text-xs text-green-700 font-medium bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                    Dogrulanmis
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400">{formatDate(p.created_at)}</span>
            </div>

            {!indent && postRating > 0 && (
              <div className="mb-1.5"><StarRating rating={postRating} /></div>
            )}

            {!isPureRating && (
              <p className="text-sm text-gray-700 leading-relaxed mb-2">{p.body}</p>
            )}

            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-gray-400">Faydali mi?</span>
              <button onClick={() => handleVote(p, "up")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all ${voted === "up" ? "bg-green-500 border-green-500 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-600"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                {p.votes || 0}
              </button>
              <button onClick={() => handleVote(p, "down")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-all ${voted === "down" ? "bg-red-500 border-red-500 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                {p.downvotes || 0}
              </button>
              {!indent && (
                <button
                  onClick={() => {
                    if (!user) { window.location.href = "/giris"; return; }
                    setReplyToId(replyToId === p.id ? null : p.id);
                  }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#E8460A] transition-colors ml-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Yanitla {replies.length > 0 && `(${replies.length})`}
                </button>
              )}
            </div>
          </div>
        </div>

        {replyToId === p.id && (
          <ReplyBox
            post={p}
            user={user}
            onSubmit={handleReply}
            onCancel={() => setReplyToId(null)}
          />
        )}

        {replies.length > 0 && (
          <div className="ml-14 mt-3 border-l-2 border-gray-100 pl-4">
            {replies.map((r) => <PostRow key={r.id} p={r} indent />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="yorumlar">
      <div className="flex border-b border-gray-200 mb-8">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${activeTab === i ? "border-[#E8460A] text-[#E8460A]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t} {i === 0 && `(${topPosts.length})`}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="flex gap-10">

          {/* SOL - Sabit */}
          <div className="w-72 flex-shrink-0">
            <div className="sticky top-24">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Musteri Yorumlari</h3>
              <div className="mb-4">
                <div className="text-5xl font-bold text-gray-900 mb-1">
                  {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                </div>
                <StarRating rating={avgRating} size="lg" />
                <div className="text-sm text-gray-500 mt-1">{topPosts.length} degerlendirme</div>
              </div>
              <div className="mb-6 space-y-2">
                {ratingDist.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-[#E8460A] w-12 text-right whitespace-nowrap flex-shrink-0">{star} yildiz</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#E8A000] h-full rounded-full" style={{ width: `${maxCount > 0 ? Math.round((count / maxCount) * 100) : 0}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 flex-shrink-0">
                      {topPosts.length > 0 && count > 0 ? Math.round((count / topPosts.length) * 100) + "%" : "0%"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="text-sm font-bold text-gray-800 mb-1">Bu urunu incele</div>
                <div className="text-xs text-gray-500 mb-3">Dusuncelerinizi diger musteriler ile paylasin</div>
                {user ? (
                  <button onClick={() => document.getElementById("yorum-kutusu")?.scrollIntoView({ behavior: "smooth" })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-[#E8460A] hover:text-[#E8460A] transition-all">
                    Urun yorumu yazin
                  </button>
                ) : (
                  <a href="/giris" className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-[#E8460A] hover:text-[#E8460A] transition-all text-center">
                    Giris yapip yorum yazin
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* SAG */}
          <div className="flex-1 min-w-0">
            <div id="yorum-kutusu" className="mb-8 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-3 border-b border-gray-100">
                <h4 className="font-bold text-gray-800 text-sm">Deneyiminizi Paylasin</h4>
                <p className="text-xs text-gray-500">Gercek yorumlar diger kullanicilara yol gosterir</p>
              </div>
              {user ? (
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar name={getDisplayName(user)} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">{getDisplayName(user)}</div>
                      <div className="text-xs text-gray-400">Dogrulanmis uye</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1 font-medium">Puaniniz</div>
                      <StarSelector value={userRating} onChange={setUserRating} />
                    </div>
                  </div>
                  <textarea
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm outline-none resize-none text-gray-800 placeholder:text-gray-400 focus:border-[#E8460A] focus:bg-white focus:ring-2 focus:ring-[#E8460A]/10 transition-all"
                    rows={4}
                    placeholder="Yorumunuz isteğe bağlı — sadece puan vermek yeterli!"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400">
                      {userRating === 0 ? "En az puan secin" : `${["", "Cok Kotu", "Kotu", "Orta", "Iyi", "Mukemmel"][userRating]} puan secildi ✓`}
                    </span>
                    <button onClick={handleSubmit} disabled={loading || userRating === 0}
                      className="px-8 py-2.5 bg-[#E8A000] hover:bg-[#CC8C00] text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-all">
                      {loading ? "Gonderiliyor..." : "Gonder"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-3xl mb-3">✍️</div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Yorum yazmak icin giris yapmaniz gerekiyor</p>
                  <p className="text-xs text-gray-400 mb-5">Deneyiminizi paylasarak diger kullanicilara yardimci olun</p>
                  <a href="/giris" className="px-8 py-3 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08] transition-all inline-block">
                    Giris Yap
                  </a>
                </div>
              )}
            </div>

            {topPosts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">💬</div>
                <div className="text-sm font-semibold text-gray-700 mb-1">Henuz yorum yok</div>
                <div className="text-xs text-gray-400">Ilk degerlendirmeyi sen yap!</div>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-base text-gray-900 mb-2">En iyi degerlendirmeler</h3>
                {topPosts.map((p) => <PostRow key={p.id} p={p} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            {[
              ["Islemci", "Apple A18 Pro (3nm)"],
              ["Ekran", '6.3" Super Retina XDR OLED'],
              ["Yenileme Hizi", "120 Hz ProMotion"],
              ["Ana Kamera", "48MP f/1.78"],
              ["Batarya", "3.582 mAh"],
              ["Baglanti", "5G - Wi-Fi 7 - USB-C"],
            ].map(([l, v], i) => (
              <tr key={l} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-6 py-4 text-gray-500 font-medium w-1/3">{l}</td>
                <td className="px-6 py-4 text-gray-800">{v}</td>
              </tr>
            ))}
          </table>
        </div>
      )}

      {activeTab === 2 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { emoji: "📱", name: "Samsung Galaxy S25 Ultra", price: "59.999" },
            { emoji: "📱", name: "iPhone 16 128GB", price: "62.999" },
            { emoji: "📱", name: "Google Pixel 9 Pro", price: "48.499" },
            { emoji: "📱", name: "OnePlus 13 512GB", price: "34.999" },
          ].map((p) => (
            <div key={p.name} className="bg-white border border-gray-100 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all">
              <div className="h-28 bg-gray-50 flex items-center justify-center text-4xl">{p.emoji}</div>
              <div className="p-4">
                <div className="text-xs font-medium mb-2 leading-snug text-gray-800">{p.name}</div>
                <div className="font-bold text-sm text-[#E8460A]">{p.price} TL</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}