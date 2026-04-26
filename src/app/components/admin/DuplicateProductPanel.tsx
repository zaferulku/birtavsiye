"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type DuplicateAuditItem = {
  id: string;
  title: string;
  slug: string | null;
  brand: string | null;
  model_code: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  active_offer_count: number;
  best_price: number | null;
  freshest_seen_at: string | null;
  canonical_score: number;
};

type DuplicateAuditGroup = {
  key: string;
  mode: "strict" | "review";
  merge_ready: boolean;
  category_mismatch: boolean;
  canonical_product_id: string;
  total_active_offers: number;
  reason: string;
  products: DuplicateAuditItem[];
};

type DuplicateAuditResponse = {
  generated_at: string;
  summary: {
    scanned_products: number;
    strict_groups: number;
    strict_merge_ready_groups: number;
    review_groups: number;
  };
  strict_groups: DuplicateAuditGroup[];
  review_groups: DuplicateAuditGroup[];
};

type DuplicateMergeResponse = {
  dry_run: boolean;
  canonical_product_id: string;
  duplicate_product_ids: string[];
  impact: {
    listings: number;
    price_alerts: number;
    favorites_move: number;
    favorites_delete: number;
    affiliate_move: number;
    affiliate_delete: number;
    product_queue: number;
    topics: number;
    community_posts: number;
    agent_decisions: number;
    products_delete: number;
  };
};

type Props = {
  onMerged?: () => void;
};

function formatPrice(value: number | null): string {
  if (value == null) return "Fiyat yok";
  return `${value.toLocaleString("tr-TR")} TL`;
}

function formatDate(value: string | null): string {
  if (!value) return "Bilinmiyor";
  return new Date(value).toLocaleString("tr-TR");
}

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  } as const;
}

export default function DuplicateProductPanel({ onMerged }: Props) {
  const [audit, setAudit] = useState<DuplicateAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [actionError, setActionError] = useState("");
  const [lastResult, setLastResult] = useState<DuplicateMergeResponse | null>(null);
  const [lastResultKey, setLastResultKey] = useState("");

  const loadAudit = useCallback(async () => {
    const headers = await getAuthHeaders();
    if (!headers) {
      setError("Admin oturumu bulunamadi");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products/duplicates?group_limit=40", {
        headers,
      });
      const json = (await response.json().catch(() => null)) as
        | DuplicateAuditResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        setError((json as { error?: string } | null)?.error || "Duplicate audit yuklenemedi");
        setAudit(null);
        return;
      }

      setAudit(json as DuplicateAuditResponse);
    } catch {
      setError("Duplicate audit yuklenemedi");
      setAudit(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const handleMerge = async (group: DuplicateAuditGroup, dryRun: boolean) => {
    const headers = await getAuthHeaders();
    if (!headers) {
      setActionError("Admin oturumu bulunamadi");
      return;
    }

    if (!dryRun) {
      const confirmed = window.confirm(
        `Bu grup gercekten birlestirilsin mi?\nCanonical: ${group.products[0]?.title}\nSilinecek duplicate sayisi: ${Math.max(
          group.products.length - 1,
          0
        )}`
      );
      if (!confirmed) return;
    }

    setActionKey(group.key);
    setActionError("");
    try {
      const response = await fetch("/api/admin/products/duplicates", {
        method: "POST",
        headers,
        body: JSON.stringify({
          canonical_product_id: group.canonical_product_id,
          duplicate_product_ids: group.products
            .map((product) => product.id)
            .filter((id) => id !== group.canonical_product_id),
          dry_run: dryRun,
        }),
      });
      const json = (await response.json().catch(() => null)) as
        | DuplicateMergeResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        setActionError((json as { error?: string } | null)?.error || "Merge calismadi");
        return;
      }

      setLastResult(json as DuplicateMergeResponse);
      setLastResultKey(group.key);

      if (!dryRun) {
        await loadAudit();
        onMerged?.();
      }
    } catch {
      setActionError("Merge calismadi");
    } finally {
      setActionKey("");
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-base text-gray-900">Duplicate Product Audit</h2>
            <div className="text-xs text-gray-500 mt-1">
              Ayni urunun farkli canonical kayitlara dagilip dagilmadigini kontrol eder.
              {audit ? ` Son tarama: ${formatDate(audit.generated_at)}.` : ""}
            </div>
          </div>
          <button
            onClick={loadAudit}
            disabled={loading}
            className="text-xs font-semibold border border-gray-300 bg-white rounded-lg px-3 py-2 hover:border-[#E8460A] hover:text-[#E8460A] transition-all disabled:opacity-50"
          >
            {loading ? "Yukleniyor..." : "Yenile"}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {audit && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {[
              ["Taranan", audit.summary.scanned_products],
              ["Strict Grup", audit.summary.strict_groups],
              ["Merge Ready", audit.summary.strict_merge_ready_groups],
              ["Review Grup", audit.summary.review_groups],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
                <div className="text-2xl font-bold mt-2 text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {actionError}
        </div>
      )}

      {lastResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="text-sm font-semibold text-amber-900">
            {lastResult.dry_run ? "Son Dry Run Sonucu" : "Son Merge Sonucu"}
          </div>
          <div className="text-xs text-amber-800 mt-1">Grup: {lastResultKey}</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            {[
              ["Listings", lastResult.impact.listings],
              ["Alerts", lastResult.impact.price_alerts],
              ["Favorites", lastResult.impact.favorites_move],
              ["Affiliate", lastResult.impact.affiliate_move],
              ["Silinecek Urun", lastResult.impact.products_delete],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-amber-200 bg-white rounded-xl p-3">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-lg font-bold text-gray-900 mt-1">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DuplicateGroupSection
        title="Strict Gruplar"
        description="Ayni model_code veya tam varyant kimligiyle acilmis duplicate adaylari."
        groups={audit?.strict_groups ?? []}
        loading={loading}
        actionKey={actionKey}
        onDryRun={handleMerge}
      />

      <DuplicateGroupSection
        title="Review Gruplar"
        description="Ayni marka + model_family icin olasi dagilmalar. Bunlar merge oncesi gozle kontrol edilmeli."
        groups={audit?.review_groups ?? []}
        loading={loading}
        actionKey={actionKey}
        onDryRun={handleMerge}
        reviewOnly
      />
    </div>
  );
}

function DuplicateGroupSection({
  title,
  description,
  groups,
  loading,
  actionKey,
  onDryRun,
  reviewOnly = false,
}: {
  title: string;
  description: string;
  groups: DuplicateAuditGroup[];
  loading: boolean;
  actionKey: string;
  onDryRun: (group: DuplicateAuditGroup, dryRun: boolean) => Promise<void>;
  reviewOnly?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="font-bold text-base text-gray-900">{title}</h2>
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Yukleniyor...</div>
      ) : groups.length === 0 ? (
        <div className="text-sm text-gray-400">Su an bu kategoride grup yok.</div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const canonical = group.products[0];
            return (
              <div key={group.key} className="border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50/60 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{canonical?.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {group.reason} {group.category_mismatch ? "Kategori farki var." : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {group.merge_ready ? (
                      <span className="inline-flex rounded-full bg-green-100 text-green-700 px-2 py-1 text-[10px] font-bold">
                        Merge Ready
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-[10px] font-bold">
                        Review
                      </span>
                    )}
                    <button
                      onClick={() => onDryRun(group, true)}
                      disabled={actionKey === group.key}
                      className="text-xs font-semibold border border-gray-300 bg-white rounded-lg px-3 py-2 hover:border-[#E8460A] hover:text-[#E8460A] transition-all disabled:opacity-50"
                    >
                      {actionKey === group.key ? "Calisiyor..." : "Dry Run"}
                    </button>
                    {!reviewOnly && group.merge_ready && (
                      <button
                        onClick={() => onDryRun(group, false)}
                        disabled={actionKey === group.key}
                        className="text-xs font-semibold border border-[#E8460A] text-[#E8460A] bg-white rounded-lg px-3 py-2 hover:bg-orange-50 transition-all disabled:opacity-50"
                      >
                        Gercek Merge
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {group.products.map((product, index) => (
                    <div key={product.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-20 flex-shrink-0">
                        {index === 0 ? (
                          <span className="inline-flex rounded-full bg-[#E8460A] text-white px-2 py-1 text-[10px] font-bold">
                            Canonical
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-gray-100 text-gray-600 px-2 py-1 text-[10px] font-bold">
                            Duplicate
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{product.title}</div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {(product.brand || "Marka yok")} · {product.model_code || product.model_family || "Kimlik eksik"} ·{" "}
                          {[product.variant_storage, product.variant_color].filter(Boolean).join(" · ") || "Varyant yok"}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="text-xs text-gray-500">Teklif: {product.active_offer_count}</div>
                        <div className="text-xs text-gray-500">En iyi: {formatPrice(product.best_price)}</div>
                        <div className="text-xs text-gray-400">{formatDate(product.freshest_seen_at)}</div>
                      </div>
                      {product.slug && (
                        <a
                          href={`/urun/${product.slug}`}
                          target="_blank"
                          className="text-xs text-[#E8460A] border border-[#E8460A] rounded-lg px-2 py-1 hover:bg-orange-50 transition-all"
                        >
                          Ac
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
