"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";

export type ReviewSummary = {
  average: number;
  ratingCount: number;
  commentCount: number;
};

type Post = {
  id: string;
  body: string;
  user_name: string;
  created_at: string;
  parent_id: string | null;
  votes: number;
  downvotes: number;
  rating?: number | null;
};

type LinkedTopic = {
  id: string;
  title: string;
  body: string;
  user_name: string;
  category: string;
  votes: number;
  answer_count: number;
  created_at: string;
};

type SimilarProduct = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  image_url?: string | null;
  prices?: Array<{ price: number }>;
};

type Props = {
  productId: string;
  productTitle: string;
  categoryId?: string | null;
  onSummaryChange?: (summary: ReviewSummary) => void;
  hideSimilarProducts?: boolean;
  hideRecommendations?: boolean;
};

type SortValue = "recommended" | "newest" | "oldest" | "highest" | "lowest";

export default function CommunitySection({
  productId,
  productTitle,
  categoryId,
  onSummaryChange,
  hideSimilarProducts = false,
  hideRecommendations = false,
}: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [votedPosts, setVotedPosts] = useState<Record<string, "up" | "down">>({});
  const [sortBy, setSortBy] = useState<SortValue>("recommended");
  const [searchQuery, setSearchQuery] = useState("");
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [linkedTopics, setLinkedTopics] = useState<LinkedTopic[]>([]);

  const fetchPosts = useCallback(async () => {
    const response = await fetch(`/api/public/community-posts?product_id=${productId}`)
      .then((result) => result.json())
      .catch(() => null);

    if (Array.isArray(response?.posts)) {
      setPosts(response.posts);
    }
  }, [productId]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      setUser(session?.user ?? null);

      if (session?.access_token) {
        const response = await fetch("/api/me/post-votes", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((result) => result.json())
          .catch(() => null);

        const votes = response?.votes as Array<{ post_id: string; vote_type: "up" | "down" }> | undefined;
        if (votes) {
          const nextVotes: Record<string, "up" | "down"> = {};
          for (const vote of votes) {
            nextVotes[vote.post_id] = vote.vote_type;
          }
          setVotedPosts(nextVotes);
        }
      }
    });

    const loadInitialPosts = async () => {
      await fetchPosts();
    };

    void loadInitialPosts();
  }, [fetchPosts, productId]);

  useEffect(() => {
    if (hideSimilarProducts || !categoryId) {
      return;
    }

    fetch(`/api/public/products/similar?product_id=${productId}`)
      .then((result) => result.json())
      .then((response) => {
        if (Array.isArray(response?.products)) {
          setSimilarProducts(response.products as SimilarProduct[]);
        }
      })
      .catch(() => {});
  }, [categoryId, hideSimilarProducts, productId]);

  useEffect(() => {
    if (hideRecommendations) {
      return;
    }

    fetch(`/api/public/topics?product_id=${productId}&limit=20`)
      .then((result) => result.json())
      .then((response) => {
        if (Array.isArray(response?.topics)) {
          setLinkedTopics(response.topics as LinkedTopic[]);
        }
      })
      .catch(() => {});
  }, [hideRecommendations, productId]);

  const topLevelPosts = useMemo(
    () => posts.filter((post) => !post.parent_id),
    [posts]
  );

  const ratingPosts = useMemo(
    () => topLevelPosts.filter((post) => (post.rating ?? 0) > 0),
    [topLevelPosts]
  );

  const commentPosts = useMemo(
    () => topLevelPosts.filter((post) => !isRatingOnlyPost(post)),
    [topLevelPosts]
  );

  const reviewSummary = useMemo<ReviewSummary>(() => {
    const ratingCount = ratingPosts.length;
    const average =
      ratingCount > 0
        ? ratingPosts.reduce((total, post) => total + (post.rating ?? 0), 0) / ratingCount
        : 0;

    return {
      average,
      ratingCount,
      commentCount: commentPosts.length,
    };
  }, [commentPosts.length, ratingPosts]);

  useEffect(() => {
    onSummaryChange?.(reviewSummary);
  }, [onSummaryChange, reviewSummary]);

  const filteredComments = useMemo(() => {
    if (!searchQuery.trim()) return commentPosts;
    const query = searchQuery.trim().toLowerCase();

    return commentPosts.filter((post) => {
      return (
        post.body.toLowerCase().includes(query) ||
        post.user_name.toLowerCase().includes(query)
      );
    });
  }, [commentPosts, searchQuery]);

  const pinnedPosts = useMemo(() => {
    if (searchQuery.trim()) return [];

    return [...commentPosts]
      .sort(compareHelpful)
      .slice(0, 2);
  }, [commentPosts, searchQuery]);

  const pinnedIds = useMemo(() => new Set(pinnedPosts.map((post) => post.id)), [pinnedPosts]);

  const visibleComments = useMemo(() => {
    const list = filteredComments.filter((post) => !pinnedIds.has(post.id));

    return [...list].sort((left, right) => {
      if (sortBy === "newest") {
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }

      if (sortBy === "oldest") {
        return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      }

      if (sortBy === "highest") {
        return (right.rating ?? 0) - (left.rating ?? 0);
      }

      if (sortBy === "lowest") {
        return (left.rating ?? 0) - (right.rating ?? 0);
      }

      return compareHelpful(left, right);
    });
  }, [filteredComments, pinnedIds, sortBy]);

  const ratingDistribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: ratingPosts.filter((post) => post.rating === star).length,
    }));
  }, [ratingPosts]);

  const maxDistributionValue = Math.max(...ratingDistribution.map((item) => item.count), 1);

  const getReplies = useCallback(
    (postId: string) => posts.filter((post) => post.parent_id === postId),
    [posts]
  );

  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) return null;

    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    } as const;
  };

  const getDisplayName = (currentUser: User | null) => {
    return (
      currentUser?.user_metadata?.full_name ||
      currentUser?.user_metadata?.name ||
      currentUser?.email?.split("@")[0] ||
      "Kullanici"
    );
  };

  const handleVote = async (post: Post, voteType: "up" | "down") => {
    if (!user) {
      window.location.href = "/giris";
      return;
    }

    const authHeaders = await getAuthHeaders();
    if (!authHeaders) return;

    const currentVote = votedPosts[post.id];

    if (currentVote === voteType) {
      setPosts((previous) =>
        previous.map((item) => {
          if (item.id !== post.id) return item;
          return {
            ...item,
            votes: voteType === "up" ? Math.max(0, item.votes - 1) : item.votes,
            downvotes: voteType === "down" ? Math.max(0, item.downvotes - 1) : item.downvotes,
          };
        })
      );

      setVotedPosts((previous) => {
        const next = { ...previous };
        delete next[post.id];
        return next;
      });

      await fetch(`/api/post-votes?post_id=${post.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      return;
    }

    setPosts((previous) =>
      previous.map((item) => {
        if (item.id !== post.id) return item;

        const nextVotes = voteType === "up" ? item.votes + 1 : currentVote === "up" ? Math.max(0, item.votes - 1) : item.votes;
        const nextDownvotes =
          voteType === "down"
            ? item.downvotes + 1
            : currentVote === "down"
              ? Math.max(0, item.downvotes - 1)
              : item.downvotes;

        return {
          ...item,
          votes: nextVotes,
          downvotes: nextDownvotes,
        };
      })
    );

    setVotedPosts((previous) => ({ ...previous, [post.id]: voteType }));

    await fetch("/api/post-votes", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ post_id: post.id, vote_type: voteType }),
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      window.location.href = "/giris";
      return;
    }

    if (userRating === 0) return;

    const authHeaders = await getAuthHeaders();
    if (!authHeaders) return;

    setLoading(true);

    const fallbackBody = `${userRating} yıldız puan verildi.`;
    const trimmedBody = body.trim();

    await fetch("/api/community-posts", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        product_id: productId,
        user_name: getDisplayName(user),
        type: "yorum",
        title: (trimmedBody || fallbackBody).slice(0, 80),
        body: trimmedBody || fallbackBody,
        rating: userRating,
      }),
    });

    setBody("");
    setUserRating(0);
    setLoading(false);
    await fetchPosts();
  };

  const handleReply = useCallback(
    async (parentId: string, replyBody: string) => {
      if (!user) {
        window.location.href = "/giris";
        return;
      }

      const authHeaders = await getAuthHeaders();
      if (!authHeaders) return;

      await fetch("/api/community-posts", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          product_id: productId,
          user_name: getDisplayName(user),
          type: "yorum",
          title: replyBody.slice(0, 80),
          body: replyBody,
          parent_id: parentId,
        }),
      });

      setReplyToId(null);
      await fetchPosts();
    },
    [fetchPosts, productId, user]
  );

  return (
    <div className="space-y-8">
      <section
        id="urun-yorumlari"
        className="rounded-[24px] border border-[#E8E4DF] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-4 border-b border-[#F2ECE6] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A06B53]">
              Urun Yorumlari
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#171412]">
              {productTitle} hakkinda kullanici yorumlari
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6D655E]">
              5 yildiz puan ver, yorum ekle, diger yorumlara cevap yaz. Tavsiyeler forumunda bu urune
              etiketlenen basliklar da asagida listelenir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl bg-[#FFF7F2] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B56B48]">
                Ortalama puan
              </div>
              <div className="mt-1 text-2xl font-black text-[#E8460A]">
                {reviewSummary.ratingCount > 0 ? reviewSummary.average.toFixed(1) : "—"}
              </div>
            </div>

            <div className="rounded-2xl border border-[#EFE7DF] bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <StarRating rating={reviewSummary.average} size="lg" />
                <span className="text-sm font-semibold text-[#171412]">
                  {reviewSummary.ratingCount} degerlendirme
                </span>
              </div>
              <p className="mt-1 text-xs text-[#7C746D]">{reviewSummary.commentCount} yorum gorunuyor</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="rounded-[20px] border border-[#EFE7DF] bg-[#FAF7F4] p-4">
              <div className="text-5xl font-black text-[#171412]">
                {reviewSummary.ratingCount > 0 ? reviewSummary.average.toFixed(1) : "—"}
              </div>
              <div className="mt-3">
                <StarRating rating={reviewSummary.average} size="lg" />
              </div>
              <div className="mt-4 space-y-2">
                {ratingDistribution.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-10 text-xs font-medium text-[#7C746D]">{star} yildiz</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E9E1D8]">
                      <div
                        className="h-full rounded-full bg-[#E8A000]"
                        style={{ width: `${Math.round((count / maxDistributionValue) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-[#7C746D]">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#EFE7DF] bg-white p-4">
              <h3 className="text-sm font-bold text-[#171412]">Kendi yorumunu birak</h3>
              <p className="mt-1 text-sm leading-6 text-[#6D655E]">
                Yorum yazmak istersen puanini da ekle. Sadece puan vermek de mumkun.
              </p>
              <button
                type="button"
                onClick={() => document.getElementById("yorum-formu")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-4 w-full rounded-xl border border-[#E8E4DF] px-4 py-3 text-sm font-semibold text-[#171412] transition hover:border-[#E8460A] hover:text-[#E8460A]"
              >
                Yorum alanina git
              </button>
            </div>
          </aside>

          <div className="space-y-6">
            <div
              id="yorum-formu"
              className="rounded-[22px] border border-[#EFE7DF] bg-white shadow-sm"
            >
              <div className="border-b border-[#F2ECE6] px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#171412]">Degerlendir ve yorumla</h3>
                    <p className="mt-1 text-sm text-[#6D655E]">
                      Verdigin puan urun isminin altindaki genel puana dahil edilir.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium uppercase tracking-[0.12em] text-[#8A8179]">
                      Siralama
                    </label>
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as SortValue)}
                      className="rounded-xl border border-[#E8E4DF] bg-white px-3 py-2 text-sm text-[#171412] outline-none transition focus:border-[#E8460A]"
                    >
                      <option value="recommended">Onerilen</option>
                      <option value="newest">En yeni</option>
                      <option value="oldest">En eski</option>
                      <option value="highest">En yuksek puan</option>
                      <option value="lowest">En dusuk puan</option>
                    </select>
                  </div>
                </div>
              </div>

              {user ? (
                <div className="space-y-4 px-5 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={getDisplayName(user)} />
                      <div>
                        <div className="text-sm font-semibold text-[#171412]">{getDisplayName(user)}</div>
                        <div className="text-xs text-[#7C746D]">Puanini ve yorumunu paylas</div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-[#8A8179]">
                        Puanin
                      </div>
                      <StarSelector value={userRating} onChange={setUserRating} />
                    </div>
                  </div>

                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={4}
                    placeholder="Bu urunle ilgili deneyimini yazabilirsin. Yalnizca puan vermek istersen yorumu bos da birakabilirsin."
                    className="w-full rounded-[18px] border border-[#E8E4DF] bg-[#FAF7F4] px-4 py-3 text-sm text-[#171412] outline-none transition focus:border-[#E8460A] focus:bg-white"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-[#6D655E]">
                      {userRating > 0 ? `${userRating} yildiz sectin.` : "Yorum gondermek icin once puan sec."}
                    </p>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || userRating === 0}
                      className="rounded-xl bg-[#E8460A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#C93A08] disabled:opacity-40"
                    >
                      {loading ? "Gonderiliyor..." : "Yorumu gonder"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-6">
                  <div className="rounded-[18px] border border-dashed border-[#E8E4DF] bg-[#FAF7F4] px-4 py-6 text-center">
                    <h4 className="text-base font-bold text-[#171412]">Yorum yapmak icin giris yap</h4>
                    <p className="mt-2 text-sm leading-6 text-[#6D655E]">
                      Puan verip yorum birakabilir, diger yorumlara cevap yazabilir ve oy kullanabilirsin.
                    </p>
                    <Link
                      href="/giris"
                      className="mt-4 inline-flex rounded-xl bg-[#E8460A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#C93A08]"
                    >
                      Giris yap
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-[22px] border border-[#EFE7DF] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-[#171412]">Yorumlari tara</h3>
                <p className="mt-1 text-sm text-[#6D655E]">Kullanici adi veya yorum icerigiyle ara.</p>
              </div>
              <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-[#E8E4DF] bg-[#FAF7F4] px-3 py-2">
                <svg className="h-4 w-4 text-[#8A8179]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="11" cy="11" r="6" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Yorum veya kullanici ara..."
                  className="w-full bg-transparent text-sm text-[#171412] outline-none placeholder:text-[#8A8179]"
                />
              </div>
            </div>

            {pinnedPosts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#171412]">One cikan ilk 2 yorum</h3>
                  <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#8A8179]">
                    oy puanina gore sabitlendi
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {pinnedPosts.map((post) => (
                    <CommentCard
                      key={post.id}
                      post={post}
                      replies={getReplies(post.id)}
                      isPinned
                      votedPosts={votedPosts}
                      onVote={handleVote}
                      onReplyClick={() => {
                        if (!user) {
                          window.location.href = "/giris";
                          return;
                        }
                        setReplyToId((current) => (current === post.id ? null : post.id));
                      }}
                    >
                      {replyToId === post.id && (
                        <ReplyComposer
                          post={post}
                          onCancel={() => setReplyToId(null)}
                          onSubmit={handleReply}
                        />
                      )}
                    </CommentCard>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#171412]">Tum yorumlar</h3>

              {visibleComments.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#E8E4DF] bg-[#FAF7F4] px-5 py-10 text-center">
                  <div className="text-lg font-bold text-[#171412]">Henuz yorum gorunmuyor</div>
                  <p className="mt-2 text-sm leading-6 text-[#6D655E]">
                    Bu urun icin ilk puani veya ilk yorumu sen birakabilirsin.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleComments.map((post) => (
                    <CommentCard
                      key={post.id}
                      post={post}
                      replies={getReplies(post.id)}
                      votedPosts={votedPosts}
                      onVote={handleVote}
                      onReplyClick={() => {
                        if (!user) {
                          window.location.href = "/giris";
                          return;
                        }
                        setReplyToId((current) => (current === post.id ? null : post.id));
                      }}
                    >
                      {replyToId === post.id && (
                        <ReplyComposer
                          post={post}
                          onCancel={() => setReplyToId(null)}
                          onSubmit={handleReply}
                        />
                      )}
                    </CommentCard>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {!hideSimilarProducts && (
      <section className="rounded-[24px] border border-[#E8E4DF] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A06B53]">
              Benzer Urunler
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#171412]">Ayni kategoriden alternatifler</h2>
          </div>
        </div>

        {similarProducts.length === 0 ? (
          <div className="mt-5 rounded-[20px] border border-dashed border-[#E8E4DF] bg-[#FAF7F4] px-5 py-10 text-center">
            <div className="text-lg font-bold text-[#171412]">Benzer urun bulunamadi</div>
            <p className="mt-2 text-sm leading-6 text-[#6D655E]">
              Bu kategoride karsilastirabilecegin baska urunler geldiginde burada gorunecek.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {similarProducts.map((product) => {
              const minPrice = product.prices?.length
                ? product.prices.reduce((minimum, current) => (current.price < minimum.price ? current : minimum), product.prices[0])
                : null;

              return (
                <Link
                  key={product.id}
                  href={`/urun/${product.slug}`}
                  className="group overflow-hidden rounded-[20px] border border-[#EFE7DF] bg-white transition hover:border-[#E8460A]/40 hover:shadow-md"
                >
                  <div className="aspect-square bg-[#FAF7F4]">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-[#C7BEB6]">?</div>
                    )}
                  </div>

                  <div className="space-y-2 p-4">
                    {product.brand && (
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A06B53]">
                        {product.brand}
                      </div>
                    )}
                    <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-[#171412]">
                      {product.title}
                    </h3>
                    <div className="text-base font-black text-[#171412]">
                      {minPrice ? `${minPrice.price.toLocaleString("tr-TR")} TL` : "Fiyatlari incele"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      )}

      {!hideRecommendations && (
      <section className="rounded-[24px] border border-[#E8E4DF] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A06B53]">
              Tavsiyeler
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#171412]">Forumda bu urune etiketlenen basliklar</h2>
          </div>
          <Link
            href="/tavsiyeler"
            className="rounded-xl border border-[#E8E4DF] px-4 py-2 text-sm font-semibold text-[#171412] transition hover:border-[#E8460A] hover:text-[#E8460A]"
          >
            Tavsiyeler sayfasina git
          </Link>
        </div>

        {linkedTopics.length === 0 ? (
          <div className="mt-5 rounded-[20px] border border-dashed border-[#E8E4DF] bg-[#FAF7F4] px-5 py-10 text-center">
            <div className="text-lg font-bold text-[#171412]">Bu urune bagli tavsiye konusu yok</div>
            <p className="mt-2 text-sm leading-6 text-[#6D655E]">
              Tavsiye forumunda bu urune etiketlenmis sorular olustukca burada listelenecek.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {linkedTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/tavsiye/${topic.id}`}
                className="group flex flex-col gap-4 rounded-[20px] border border-[#EFE7DF] bg-white p-4 transition hover:border-[#E8460A]/40 hover:shadow-sm sm:flex-row"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF3EE] font-bold text-[#E8460A]">
                  {(topic.user_name || "?").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {topic.category && (
                      <span className="rounded-full bg-[#FAF7F4] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A8179]">
                        {topic.category}
                      </span>
                    )}
                    <span className="text-xs text-[#8A8179]">{formatDate(topic.created_at)}</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold leading-7 text-[#171412] transition group-hover:text-[#E8460A]">
                    {topic.title}
                  </h3>
                  {topic.body && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6D655E]">{topic.body}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#6D655E]">
                    <span className="font-medium text-[#171412]">{topic.user_name}</span>
                    <span>{topic.votes || 0} oy</span>
                    <span>{topic.answer_count || 0} cevap</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
}

function CommentCard({
  post,
  replies,
  votedPosts,
  isPinned = false,
  onVote,
  onReplyClick,
  children,
}: {
  post: Post;
  replies: Post[];
  votedPosts: Record<string, "up" | "down">;
  isPinned?: boolean;
  onVote: (post: Post, voteType: "up" | "down") => void;
  onReplyClick: () => void;
  children?: ReactNode;
}) {
  return (
    <article
      className={`rounded-[22px] border p-5 shadow-sm ${
        isPinned ? "border-[#F3CDBB] bg-[#FFF9F5]" : "border-[#EFE7DF] bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={post.user_name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-[#171412]">{post.user_name || "Anonim"}</h4>
            <span className="text-xs text-[#8A8179]">{formatDate(post.created_at)}</span>
            {(post.rating ?? 0) > 0 && <StarRating rating={post.rating ?? 0} />}
            {isPinned && (
              <span className="rounded-full bg-[#FFE7D9] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D13F05]">
                One cikan
              </span>
            )}
          </div>

          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#4D4741]">{post.body}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <VoteButton
              active={votedPosts[post.id] === "up"}
              count={post.votes || 0}
              label="Begendim"
              icon="up"
              onClick={() => onVote(post, "up")}
            />
            <VoteButton
              active={votedPosts[post.id] === "down"}
              count={post.downvotes || 0}
              label="Begendim degil"
              icon="down"
              onClick={() => onVote(post, "down")}
            />
            <button
              type="button"
              onClick={onReplyClick}
              className="rounded-full border border-[#E8E4DF] px-3 py-1.5 text-xs font-semibold text-[#5E5750] transition hover:border-[#E8460A] hover:text-[#E8460A]"
            >
              Cevapla {replies.length > 0 ? `(${replies.length})` : ""}
            </button>
          </div>

          {children}

          {replies.length > 0 && (
            <div className="mt-4 space-y-3 border-l-2 border-[#F3ECE5] pl-4">
              {replies.map((reply) => (
                <div key={reply.id} className="rounded-[18px] bg-[#FAF7F4] p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={reply.user_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#171412]">{reply.user_name || "Anonim"}</span>
                        <span className="text-xs text-[#8A8179]">{formatDate(reply.created_at)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#4D4741]">{reply.body}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <VoteButton
                          active={votedPosts[reply.id] === "up"}
                          count={reply.votes || 0}
                          label="Begendim"
                          icon="up"
                          onClick={() => onVote(reply, "up")}
                        />
                        <VoteButton
                          active={votedPosts[reply.id] === "down"}
                          count={reply.downvotes || 0}
                          label="Begendim degil"
                          icon="down"
                          onClick={() => onVote(reply, "down")}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ReplyComposer({
  post,
  onSubmit,
  onCancel,
}: {
  post: Post;
  onSubmit: (parentId: string, body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!replyBody.trim()) return;
    setLoading(true);
    await onSubmit(post.id, replyBody.trim());
    setReplyBody("");
    setLoading(false);
  };

  return (
    <div className="mt-4 rounded-[18px] border border-[#EFE7DF] bg-[#FAF7F4] p-4">
      <div className="mb-2 text-sm font-semibold text-[#171412]">{post.user_name} yorumuna cevap yaz</div>
      <textarea
        rows={3}
        value={replyBody}
        onChange={(event) => setReplyBody(event.target.value)}
        placeholder="Cevabini buraya yaz..."
        className="w-full rounded-[16px] border border-[#E8E4DF] bg-white px-4 py-3 text-sm text-[#171412] outline-none transition focus:border-[#E8460A]"
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[#E8E4DF] px-4 py-2 text-sm font-semibold text-[#5E5750] transition hover:border-[#E8460A] hover:text-[#E8460A]"
        >
          Vazgec
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !replyBody.trim()}
          className="rounded-xl bg-[#E8460A] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#C93A08] disabled:opacity-40"
        >
          {loading ? "Gonderiliyor..." : "Cevabi gonder"}
        </button>
      </div>
    </div>
  );
}

function VoteButton({
  active,
  count,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  icon: "up" | "down";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[#E8460A] bg-[#FFF3EE] text-[#E8460A]"
          : "border-[#E8E4DF] text-[#5E5750] hover:border-[#E8460A] hover:text-[#E8460A]"
      }`}
    >
      {icon === "up" ? <ThumbUpIcon /> : <ThumbDownIcon />}
      <span>{count}</span>
    </button>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-[#FFF3EE] font-bold text-[#E8460A] ${
        size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"
      }`}
    >
      {(name || "A").charAt(0).toUpperCase()}
    </div>
  );
}

function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="rounded-full p-1 transition hover:scale-105"
        >
          <svg
            className="h-7 w-7"
            viewBox="0 0 20 20"
            fill={value >= star ? "#E8A000" : "#E0E0E0"}
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) {
  const rounded = Math.round(rating);

  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={size === "lg" ? "h-5 w-5" : "h-4 w-4"}
          viewBox="0 0 20 20"
          fill={star <= rounded ? "#E8A000" : "#E0E0E0"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function ThumbUpIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2.5 9.5A1.5 1.5 0 014 8h2v8H4a1.5 1.5 0 01-1.5-1.5v-5zm5.2-5.78A1 1 0 018.6 3h.23a1 1 0 01.97 1.243L9.16 7H14a2 2 0 011.96 2.392l-1.04 5A2 2 0 0112.96 16H7V8.7l.7-4.98z" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.5 10.5A1.5 1.5 0 0116 12h-2V4h2a1.5 1.5 0 011.5 1.5v5zm-5.2 5.78A1 1 0 0111.4 17h-.23a1 1 0 01-.97-1.243L10.84 13H6a2 2 0 01-1.96-2.392l1.04-5A2 2 0 017.04 4H13v7.3l-.7 4.98z" />
    </svg>
  );
}

function compareHelpful(left: Post, right: Post) {
  const leftScore = (left.votes || 0) - (left.downvotes || 0);
  const rightScore = (right.votes || 0) - (right.downvotes || 0);

  if (rightScore !== leftScore) return rightScore - leftScore;
  if ((right.rating ?? 0) !== (left.rating ?? 0)) return (right.rating ?? 0) - (left.rating ?? 0);
  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
}

function isRatingOnlyPost(post: Post) {
  if ((post.rating ?? 0) <= 0) return false;
  const body = post.body.trim().toLowerCase();
  return body.includes("puan verildi") && body.length <= 40;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
