"use client";
import { useState, useEffect } from "react";
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
};

export default function CommunitySection({ productId }: { productId: string }) {
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [votedPosts, setVotedPosts] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadUserVotes(data.user.id);
    });
    fetchPosts();
  }, [productId]);

  const loadUserVotes = async (userId: string) => {
    const { data } = await supabase
      .from("post_votes")
      .select("post_id, vote_type")
      .eq("user_id", userId);
    if (data) {
      const map: Record<string, "up" | "down"> = {};
      data.forEach((v) => { map[v.post_id] = v.vote_type; });
      setVotedPosts(map);
    }
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("community_posts")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    if (data) setPosts(data);
  };

  const getDisplayName = (u: any) =>
    u.user_metadata?.full_name ||
    u.user_metadata?.name ||
    u.email?.split("@")[0] ||
    "Kullanıcı";

  const handleVote = async (post: Post, type: "up" | "down") => {
  if (!user) { window.location.href = "/giris"; return; }
  const existing = votedPosts[post.id];
  
  const update: any = {};
  
  if (existing === type) {
    // Aynı ikona tekrar tıklayınca iptal et
    if (type === "up") update.votes = Math.max(0, post.votes - 1);
    else update.downvotes = Math.max(0, post.downvotes - 1);
    
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...update } : p)));
    setVotedPosts((prev) => { const n = { ...prev }; delete n[post.id]; return n; });
    await supabase.from("community_posts").update(update).eq("id", post.id);
    await supabase.from("post_votes").delete().eq("post_id", post.id).eq("user_id", user.id);
    return;
  }

  if (type === "up") {
    update.votes = post.votes + 1;
    if (existing === "down") update.downvotes = Math.max(0, post.downvotes - 1);
  } else {
    update.downvotes = (post.downvotes || 0) + 1;
    if (existing === "up") update.votes = Math.max(0, post.votes - 1);
  }

  setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...update } : p)));
  setVotedPosts((prev) => ({ ...prev, [post.id]: type }));
  await supabase.from("community_posts").update(update).eq("id", post.id);
  await supabase.from("post_votes").upsert({
    post_id: post.id,
    user_id: user.id,
    vote_type: type,
  }, { onConflict: "post_id,user_id" });
};

  const handleSubmit = async () => {
    if (!body.trim()) return;
    if (!user) { window.location.href = "/giris"; return; }
    setLoading(true);
    await supabase.from("community_posts").insert({
      product_id: productId,
      user_id: user.id,
      user_name: getDisplayName(user),
      type: "yorum",
      title: body.slice(0, 80),
      body,
      votes: 0,
      downvotes: 0,
      parent_id: null,
    });
    setBody("");
    await fetchPosts();
    setLoading(false);
  };

  const handleReply = async (parentId: string) => {
    if (!replyBody.trim()) return;
    if (!user) { window.location.href = "/giris"; return; }
    setReplyLoading(true);
    await supabase.from("community_posts").insert({
      product_id: productId,
      user_id: user.id,
      user_name: getDisplayName(user),
      type: "yorum",
      title: replyBody.slice(0, 80),
      body: replyBody,
      votes: 0,
      downvotes: 0,
      parent_id: parentId,
    });
    setReplyBody("");
    setReplyTo(null);
    await fetchPosts();
    setReplyLoading(false);
  };

  const topPosts = posts
    .filter((p) => !p.parent_id)
    .sort((a, b) => (b.votes - b.downvotes) - (a.votes - a.downvotes));

  const getReplies = (id: string) =>
    posts
      .filter((p) => p.parent_id === id)
      .sort((a, b) => (b.votes - b.downvotes) - (a.votes - a.downvotes));

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const Avatar = ({ name }: { name: string }) => (
    <div className="w-8 h-8 rounded-full bg-[#FFF0EB] flex items-center justify-center text-xs font-bold text-[#E8460A] flex-shrink-0">
      {(name || "A")[0].toUpperCase()}
    </div>
  );

  const PostCard = ({ p, indent = false }: { p: Post; indent?: boolean }) => {
    const replies = getReplies(p.id);
    const voted = votedPosts[p.id];
    return (
      <div className={indent ? "ml-6" : ""}>
        <div className={`border border-[#E8E4DF] rounded-2xl p-4 ${indent ? "bg-[#F8F6F2]" : "bg-white"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Avatar name={p.user_name} />
            <div className="flex-1">
              <div className="text-sm font-medium">{p.user_name || "Anonim"}</div>
              <div className="text-xs text-[#A8A49F]">{formatDate(p.created_at)}</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleVote(p, "up")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
                  voted === "up"
                    ? "bg-green-50 border-green-300 text-green-600"
                    : "bg-[#F8F6F2] border-[#E8E4DF] text-[#6B6760] hover:border-green-300 hover:text-green-600"
                }`}
              >
                👍 <span className="ml-0.5">{p.votes || 0}</span>
              </button>
              <button
                onClick={() => handleVote(p, "down")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all border ${
                  voted === "down"
                    ? "bg-red-50 border-red-300 text-red-500"
                    : "bg-[#F8F6F2] border-[#E8E4DF] text-[#6B6760] hover:border-red-300 hover:text-red-500"
                }`}
              >
                👎 <span className="ml-0.5">{p.downvotes || 0}</span>
              </button>
            </div>
          </div>

          <div className="text-sm text-[#0F0E0D] leading-relaxed mb-3">{p.body}</div>

          <button
            onClick={() => {
              if (!user) { window.location.href = "/giris"; return; }
              setReplyTo(replyTo?.id === p.id ? null : { id: p.id, name: p.user_name });
              setReplyBody("");
            }}
            className="text-xs text-[#A8A49F] hover:text-[#E8460A] transition-colors"
          >
            💬 Yanıtla {replies.length > 0 && `(${replies.length})`}
          </button>
        </div>

        {replyTo?.id === p.id && (
          <div className="ml-6 mt-2 bg-white border-2 border-orange-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Avatar name={user ? getDisplayName(user) : "?"} />
              <span className="text-xs font-medium text-[#6B6760]">
                {p.user_name} kullanıcısına yanıt veriyorsun
              </span>
            </div>
            <textarea
              className="w-full bg-[#F8F6F2] rounded-lg p-2 text-sm outline-none resize-none placeholder:text-[#A8A49F]"
              rows={2}
              placeholder="Yanıtını yaz..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => { setReplyTo(null); setReplyBody(""); }}
                className="text-xs text-[#6B6760] px-3 py-1.5 rounded-lg border border-[#E8E4DF] hover:border-[#E8460A] transition-all"
              >
                İptal
              </button>
              <button
                onClick={() => handleReply(p.id)}
                disabled={replyLoading || !replyBody.trim()}
                className="text-xs bg-[#E8460A] text-white px-3 py-1.5 rounded-lg disabled:opacity-40 hover:bg-[#C93A08] transition-all"
              >
                {replyLoading ? "Gönderiliyor..." : "Yanıtla →"}
              </button>
            </div>
          </div>
        )}

        {replies.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {replies.map((r) => (
              <PostCard key={r.id} p={r} indent />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex border-b border-[#E8E4DF] mb-6">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
              activeTab === i
                ? "border-[#E8460A] text-[#E8460A]"
                : "border-transparent text-[#6B6760]"
            }`}
          >
            {t} {i === 0 && `(${topPosts.length})`}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div>
          <div className="bg-white border-2 border-[#E8E4DF] rounded-2xl p-4 mb-6">
            {user ? (
              <div className="flex items-center gap-2 mb-3">
                <Avatar name={getDisplayName(user)} />
                <span className="text-sm font-medium">{getDisplayName(user)}</span>
              </div>
            ) : (
              <div className="text-sm text-center py-2 mb-3 bg-[#FFF0EB] rounded-xl">
                Yorum yapmak için{" "}
                <a href="/giris" className="text-[#E8460A] font-semibold">giriş yap</a>
                {" "}veya{" "}
                <a href="/giris" className="text-[#E8460A] font-semibold">kayıt ol</a>
                {" "}— ücretsiz!
              </div>
            )}
            <textarea
              className="w-full bg-[#F8F6F2] rounded-xl p-3 text-sm outline-none resize-none text-[#0F0E0D] placeholder:text-[#A8A49F]"
              rows={3}
              placeholder="Bu ürün hakkında ne düşünüyorsun? Deneyimini paylaş..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-[#A8A49F]">
                {body.length > 0 ? `${body.length} karakter` : "Gerçek deneyimler en değerli 👀"}
              </span>
              <button
                onClick={handleSubmit}
                disabled={loading || !body.trim()}
                className="bg-[#E8460A] text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-[#C93A08] transition-all"
              >
                {loading ? "Gönderiliyor..." : "Yorum Yap →"}
              </button>
            </div>
          </div>

          {topPosts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">💬</div>
              <div className="text-sm font-medium text-[#0F0E0D] mb-1">Henüz yorum yok</div>
              <div className="text-xs text-[#A8A49F]">İlk yorumu sen yap, topluluğa öncülük et!</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {topPosts.map((p) => (
                <PostCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            {[
              ["İşlemci", "Apple A18 Pro (3nm)"],
              ["Ekran", '6.3" Super Retina XDR OLED'],
              ["Yenileme Hızı", "120 Hz ProMotion"],
              ["Ana Kamera", "48MP f/1.78"],
              ["Batarya", "3.582 mAh"],
              ["Bağlantı", "5G · Wi-Fi 7 · USB-C"],
            ].map(([l, v], i) => (
              <tr key={l} className={i % 2 === 0 ? "bg-white" : "bg-[#F8F6F2]"}>
                <td className="px-4 py-3 text-[#6B6760] font-medium w-1/3">{l}</td>
                <td className="px-4 py-3">{v}</td>
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
            <div key={p.name} className="bg-white border border-[#E8E4DF] rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all">
              <div className="h-24 bg-[#F8F6F2] flex items-center justify-center text-4xl">{p.emoji}</div>
              <div className="p-3">
                <div className="text-xs font-medium mb-2 leading-snug">{p.name}</div>
                <div className="font-syne font-bold text-sm text-[#E8460A]">{p.price} ₺</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}