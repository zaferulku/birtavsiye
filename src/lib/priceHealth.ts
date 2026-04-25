import { supabaseAdmin } from "./supabaseServer";

const SUPPORTED_REFRESH_SOURCES = [
  "trendyol",
  "hepsiburada",
  "mediamarkt",
  "pttavm",
  "vatan",
] as const;

const SUPPORTED_REFRESH_SOURCE_SET = new Set<string>(SUPPORTED_REFRESH_SOURCES);
const LISTING_SAMPLE_COLUMNS =
  "id, product_id, source, source_url, source_product_id, price, last_seen, in_stock, is_active, updated_at";

export type PriceHealthSample = {
  id: string;
  product_id: string | null;
  source: string | null;
  source_url: string | null;
  source_product_id: string | null;
  price: number | null;
  last_seen: string | null;
  in_stock: boolean | null;
  is_active: boolean | null;
  updated_at: string | null;
};

export type PriceHealthAlert = {
  key:
    | "history_stalled"
    | "stale_active_listings"
    | "missing_identity_listings"
    | "invalid_price_listings"
    | "unsupported_active_sources";
  severity: "warn" | "error";
  count: number;
  title: string;
  description: string;
  action: string;
};

export type PriceHealthSnapshot = {
  status: "ok" | "warn" | "error";
  generated_at: string;
  stale_after_hours: number;
  supported_refresh_sources: string[];
  summary: {
    active_listings: number;
    stale_active_listings: number;
    missing_identity_listings: number;
      invalid_price_listings: number;
      unsupported_active_sources: number;
      history_rows_last_24h: number;
    };
  alerts: PriceHealthAlert[];
  samples: {
    stale: PriceHealthSample[];
    missing_identity: PriceHealthSample[];
    invalid_price: PriceHealthSample[];
    unsupported_source: PriceHealthSample[];
  };
  product: null | {
    id: string;
    title: string;
    slug: string;
    brand: string | null;
    total_listings: number;
    active_listings: number;
    stale_active_listings: number;
    missing_identity_listings: number;
    invalid_price_listings: number;
    unsupported_active_sources: number;
    listings: PriceHealthSample[];
  };
};

function clampInteger(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function isStaleListing(sample: PriceHealthSample, staleBeforeIso: string): boolean {
  return !sample.last_seen || sample.last_seen < staleBeforeIso;
}

function hasMissingIdentity(sample: PriceHealthSample): boolean {
  return !sample.source || !sample.source_url || !sample.source_product_id;
}

function hasInvalidPrice(sample: PriceHealthSample): boolean {
  return sample.price == null || Number(sample.price) <= 0;
}

function hasUnsupportedSource(sample: PriceHealthSample): boolean {
  if (!sample.source) return false;
  return !SUPPORTED_REFRESH_SOURCE_SET.has(sample.source);
}

async function readCount(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>
): Promise<number> {
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function readSamples(
  query: PromiseLike<{ data: PriceHealthSample[] | null; error: { message: string } | null }>
): Promise<PriceHealthSample[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

function buildPriceHealthAlerts(summary: PriceHealthSnapshot["summary"]): PriceHealthAlert[] {
  const alerts: PriceHealthAlert[] = [];

  if (summary.active_listings > 0 && summary.history_rows_last_24h === 0) {
    alerts.push({
      key: "history_stalled",
      severity: "warn",
      count: 0,
      title: "24 saattir yeni fiyat gecmisi yok",
      description: "Aktif listing var ama son 24 saatte price_history kaydi uretilmemis.",
      action: "sync, refresh-prices ve scraper akislarini kontrol et.",
    });
  }

  if (summary.stale_active_listings > 0) {
    alerts.push({
      key: "stale_active_listings",
      severity: "warn",
      count: summary.stale_active_listings,
      title: "Stale aktif listing var",
      description: "Uzun suredir gorulmeyen listingler en ucuz sonucunu sessizce bozabilir.",
      action: "Bu kayitlari refresh et ya da gerekirse pasife cek.",
    });
  }

  if (summary.missing_identity_listings > 0) {
    alerts.push({
      key: "missing_identity_listings",
      severity: "warn",
      count: summary.missing_identity_listings,
      title: "Kimlik bilgisi eksik listing var",
      description: "source, source_url veya source_product_id eksik olunca refresh ve eslestirme aksiyor.",
      action: "Eksik kaynak alanlarini doldur ya da gecersiz kaydi temizle.",
    });
  }

  if (summary.invalid_price_listings > 0) {
    alerts.push({
      key: "invalid_price_listings",
      severity: "error",
      count: summary.invalid_price_listings,
      title: "Hatali fiyatli aktif listing var",
      description: "0 veya null fiyatli aktif listingler kullaniciya yanlis fiyat gosterebilir.",
      action: "Fiyati duzelt ya da listingi pasife cek.",
    });
  }

  if (summary.unsupported_active_sources > 0) {
    alerts.push({
      key: "unsupported_active_sources",
      severity: "warn",
      count: summary.unsupported_active_sources,
      title: "Desteklenmeyen kaynakli aktif listing var",
      description: "Refresh akisi bu kaynaklari guncelleyemeyecegi icin veriler stale kalabilir.",
      action: "Kaynagi refresh listesine ekle ya da listingi destekli bir akisa tasi.",
    });
  }

  return alerts;
}

function derivePriceHealthStatus(alerts: PriceHealthAlert[]): PriceHealthSnapshot["status"] {
  if (alerts.some((alert) => alert.severity === "error")) return "error";
  if (alerts.length > 0) return "warn";
  return "ok";
}

export async function getPriceHealthSnapshot(options?: {
  staleHours?: number;
  productId?: string | null;
}): Promise<PriceHealthSnapshot> {
  const staleHours = clampInteger(options?.staleHours ?? 36, 36, 1, 24 * 14);
  const productId = options?.productId?.trim() || null;
  const now = new Date();
  const staleBeforeIso = new Date(now.getTime() - staleHours * 60 * 60 * 1000).toISOString();
  const recentHistorySinceIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const supportedSourceList = [...SUPPORTED_REFRESH_SOURCES];
  const supportedSourceQuery = `(${supportedSourceList.join(",")})`;

  const [
    activeListings,
    staleMissingLastSeen,
    staleOlderThanThreshold,
    missingIdentityListings,
    invalidPriceListings,
    unsupportedActiveSources,
    historyRowsLast24h,
    staleCandidates,
    missingIdentitySamples,
    invalidPriceSamples,
    unsupportedSourceSamples,
  ] = await Promise.all([
    readCount(
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("is_active", true)
    ),
    readCount(
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("is_active", true).is("last_seen", null)
    ),
    readCount(
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("is_active", true).not("last_seen", "is", null).lt("last_seen", staleBeforeIso)
    ),
    readCount(
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("is_active", true).or("source.is.null,source_url.is.null,source_product_id.is.null")
    ),
    readCount(
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("is_active", true).or("price.is.null,price.lte.0")
    ),
    readCount(
      supabaseAdmin.from("listings").select("id", { count: "exact", head: true }).eq("is_active", true).not("source", "in", supportedSourceQuery)
    ),
    readCount(
      supabaseAdmin.from("price_history").select("id", { count: "exact", head: true }).gte("recorded_at", recentHistorySinceIso)
    ),
    readSamples(
      supabaseAdmin
        .from("listings")
        .select(LISTING_SAMPLE_COLUMNS)
        .eq("is_active", true)
        .order("last_seen", { ascending: true, nullsFirst: true })
        .limit(12)
    ),
    readSamples(
      supabaseAdmin
        .from("listings")
        .select(LISTING_SAMPLE_COLUMNS)
        .eq("is_active", true)
        .or("source.is.null,source_url.is.null,source_product_id.is.null")
        .limit(5)
    ),
    readSamples(
      supabaseAdmin
        .from("listings")
        .select(LISTING_SAMPLE_COLUMNS)
        .eq("is_active", true)
        .or("price.is.null,price.lte.0")
        .limit(5)
    ),
    readSamples(
      supabaseAdmin
        .from("listings")
        .select(LISTING_SAMPLE_COLUMNS)
        .eq("is_active", true)
        .not("source", "in", supportedSourceQuery)
        .limit(5)
    ),
  ]);

  const staleActiveListings = staleMissingLastSeen + staleOlderThanThreshold;
  const staleSamples = staleCandidates.filter((sample) => isStaleListing(sample, staleBeforeIso)).slice(0, 5);

  let product: PriceHealthSnapshot["product"] = null;
  if (productId) {
    const { data: productRow, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, title, slug, brand")
      .eq("id", productId)
      .maybeSingle();

    if (productError) throw new Error(productError.message);

    if (productRow) {
      const productListings = await readSamples(
        supabaseAdmin
          .from("listings")
          .select(LISTING_SAMPLE_COLUMNS)
          .eq("product_id", productId)
          .order("is_active", { ascending: false })
          .order("last_seen", { ascending: true, nullsFirst: true })
      );
      const activeProductListings = productListings.filter((listing) => listing.is_active !== false);

      product = {
        id: productRow.id,
        title: productRow.title,
        slug: productRow.slug,
        brand: productRow.brand,
        total_listings: productListings.length,
        active_listings: activeProductListings.length,
        stale_active_listings: activeProductListings.filter((listing) => isStaleListing(listing, staleBeforeIso)).length,
        missing_identity_listings: productListings.filter(hasMissingIdentity).length,
        invalid_price_listings: productListings.filter(hasInvalidPrice).length,
        unsupported_active_sources: activeProductListings.filter(hasUnsupportedSource).length,
        listings: productListings.slice(0, 8),
      };
    }
  }

  const summary: PriceHealthSnapshot["summary"] = {
    active_listings: activeListings,
    stale_active_listings: staleActiveListings,
    missing_identity_listings: missingIdentityListings,
    invalid_price_listings: invalidPriceListings,
    unsupported_active_sources: unsupportedActiveSources,
    history_rows_last_24h: historyRowsLast24h,
  };
  const alerts = buildPriceHealthAlerts(summary);

  return {
    status: derivePriceHealthStatus(alerts),
    generated_at: now.toISOString(),
    stale_after_hours: staleHours,
    supported_refresh_sources: supportedSourceList,
    summary,
    alerts,
    samples: {
      stale: staleSamples,
      missing_identity: missingIdentitySamples,
      invalid_price: invalidPriceSamples,
      unsupported_source: unsupportedSourceSamples,
    },
    product,
  };
}

export async function recordPriceHealthWatch(
  snapshot: PriceHealthSnapshot,
  options?: {
    trigger?: string;
    productId?: string | null;
    durationMs?: number;
  }
): Promise<void> {
  const task =
    snapshot.status === "ok"
      ? "Check listing and price history health"
      : "Check listing and price history health and surface issues";

  const { error } = await supabaseAdmin.from("agent_logs").insert({
    agent_name: "price-health-watch",
    task,
    payload: {
      trigger: options?.trigger ?? "manual",
      stale_after_hours: snapshot.stale_after_hours,
      product_id: options?.productId ?? snapshot.product?.id ?? null,
    },
    result: {
      health_status: snapshot.status,
      generated_at: snapshot.generated_at,
      summary: snapshot.summary,
      alerts: snapshot.alerts,
      product: snapshot.product
        ? {
            id: snapshot.product.id,
            slug: snapshot.product.slug,
            title: snapshot.product.title,
          }
        : null,
      sample_ids: {
        stale: snapshot.samples.stale.map((sample) => sample.id),
        missing_identity: snapshot.samples.missing_identity.map((sample) => sample.id),
        invalid_price: snapshot.samples.invalid_price.map((sample) => sample.id),
        unsupported_source: snapshot.samples.unsupported_source.map((sample) => sample.id),
      },
    },
    status: "success",
    duration_ms: options?.durationMs ?? null,
  });

  if (error) throw new Error(error.message);
}
