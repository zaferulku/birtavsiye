import { supabase } from "../lib/supabase";
import type { MetadataRoute } from "next";

const BASE_URL = "https://birtavsiye.net";

// ISR: build sırasında pre-render etme, periyodik yeniden üret. Aksi takdirde
// büyük ürün listesi + DB lock contention build timeout'una sebep oluyordu
// (Vercel 60sn limiti).
export const revalidate = 3600; // 1 saat
export const dynamic = "force-static";

const QUERY_TIMEOUT_MS = 25_000;

async function withTimeout<T>(thenable: PromiseLike<T>, label: string): Promise<T | null> {
  return await Promise.race([
    Promise.resolve(thenable),
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`[sitemap] ${label} timed out after ${QUERY_TIMEOUT_MS}ms`);
        resolve(null);
      }, QUERY_TIMEOUT_MS),
    ),
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/tavsiyeler`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/urunler`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/ara`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

  // Sadece is_active=true ürünleri al; sıralama created_at (indexed) ile.
  // updated_at'a göre order indexsiz olduğu için 16K satırda yavaşlıyordu.
  type ProductRow = { slug: string; updated_at: string | null };
  type TopicRow = { id: string; created_at: string | null };
  type CategoryRow = { slug: string };

  const productsRes = await withTimeout(
    supabase
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1000) as PromiseLike<{ data: ProductRow[] | null }>,
    "products",
  );
  const products: ProductRow[] = productsRes?.data ?? [];

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/urun/${p.slug}`,
    lastModified: p.updated_at || now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const topicsRes = await withTimeout(
    supabase
      .from("topics")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(1000) as PromiseLike<{ data: TopicRow[] | null }>,
    "topics",
  );
  const topics: TopicRow[] = topicsRes?.data ?? [];

  const topicRoutes: MetadataRoute.Sitemap = topics.map((t) => ({
    url: `${BASE_URL}/tavsiye/${t.id}`,
    lastModified: t.created_at || now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const categoriesRes = await withTimeout(
    supabase
      .from("categories")
      .select("slug")
      .neq("slug", "siniflandirilmamis")
      .limit(200) as PromiseLike<{ data: CategoryRow[] | null }>,
    "categories",
  );
  const categories: CategoryRow[] = categoriesRes?.data ?? [];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE_URL}/kategori/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...topicRoutes, ...categoryRoutes];
}
