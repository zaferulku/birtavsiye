import { supabase } from "../lib/supabase";
import type { MetadataRoute } from "next";

const BASE_URL = "https://birtavsiye.net";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // Statik sayfalar
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/tavsiyeler`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/urunler`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/ara`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

  // Dinamik ürün sayfaları
  const { data: products } = await supabase
    .from("products").select("slug, updated_at").order("updated_at", { ascending: false }).limit(1000);

  const productRoutes: MetadataRoute.Sitemap = (products || []).map((p) => ({
    url: `${BASE_URL}/urun/${p.slug}`,
    lastModified: p.updated_at || now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dinamik tavsiye sayfaları
  const { data: topics } = await supabase
    .from("topics").select("id, created_at").order("created_at", { ascending: false }).limit(1000);

  const topicRoutes: MetadataRoute.Sitemap = (topics || []).map((t) => ({
    url: `${BASE_URL}/tavsiye/${t.id}`,
    lastModified: t.created_at || now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Kategori sayfaları
  const { data: categories } = await supabase
    .from("categories").select("slug").limit(200);

  const categoryRoutes: MetadataRoute.Sitemap = (categories || []).map((c) => ({
    url: `${BASE_URL}/kategori/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...topicRoutes, ...categoryRoutes];
}
