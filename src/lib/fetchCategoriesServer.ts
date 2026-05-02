import { supabaseAdmin } from "./supabaseServer";

/**
 * P6.20-A: Server-side categories prefetch helper.
 *
 * Header SSR'da catMap'i prefetch'lenmiş data ile başlatmak için.
 * Önceki davranış (P6.20-B öncesi): Header.tsx 'use client' useEffect
 * ile API fetch yapıyordu, SSR'da empty render → linkFor /?q=<slug>
 * fallback ana sayfaya yönlendiriyordu.
 *
 * Server pages bu helper'ı çağırıp Header'a `initialCats` prop geçirir:
 *
 *   const cats = await fetchCategoriesServer();
 *   return <Header initialCats={cats} />
 *
 * Client pages eski yapıda kalır (CSR useEffect fetch, P6.20-B hotfix
 * fallback yeterince koruyor). Bu hibrit yaklaşım scope'u kısıtlı tutar
 * (Codex 4 backup sayfasına dokunmadan).
 */
export type ServerCat = {
  id: string;
  slug: string;
  parent_id: string | null;
};

export async function fetchCategoriesServer(): Promise<ServerCat[]> {
  // P6.27: Supabase default 1000 row limit -> Header SSR catMap eksik dolup
  // smart tag-resolve fail oluyordu (Pioneer/iPhone parent sayfaya dusuyordu).
  // Pagination loop ile tum satirlari topla.
  const all: ServerCat[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id, slug, parent_id")
      .eq("is_active", true)
      .order("slug")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) {
      console.warn(`[fetchCategoriesServer] page ${page} fail:`, error.message);
      return all;
    }
    if (!data || data.length === 0) break;
    all.push(...(data as ServerCat[]));
    if (data.length < PAGE_SIZE) break;
    page++;
    if (page > 50) break; // safety
  }
  return all;
}
