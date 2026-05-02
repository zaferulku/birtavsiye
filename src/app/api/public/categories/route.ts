import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";

export const runtime = "nodejs";
// ISR: build sırasında DB bağlantısı yavaşlayınca 60sn limit aşılıp build fail
// oluyordu. force-static + uzun revalidate ile build'de pre-render denemesi
// yumuşatılır; ilk request'te generate, 1 saatte bir yenilenir.
export const revalidate = 3600;
export const dynamic = "force-static";

const QUERY_TIMEOUT_MS = 25_000;

interface CategoryRow {
  id: string;
  slug: string;
  parent_id: string | null;
  name: string;
  icon: string | null;
}

async function withTimeout<T>(thenable: PromiseLike<T>, label: string): Promise<T | null> {
  return await Promise.race([
    Promise.resolve(thenable),
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`[api/public/categories] ${label} timed out after ${QUERY_TIMEOUT_MS}ms`);
        resolve(null);
      }, QUERY_TIMEOUT_MS),
    ),
  ]);
}

async function fetchAllCategories(): Promise<CategoryRow[] | null> {
  // P6.27: Supabase default 1000 row limit — DB 1683+ kategori (Migration 040+041
  // sonrasi). Pagination loop ile tum satirlari topla. Bu duzeltme yapilmadan
  // Header smart tag-resolve eski catMap (1000 satir) ile calisamiyor; yeni
  // leaf'ler catMap'te yok -> Pioneer/iPhone gibi tag'ler parent sayfaya
  // dusuyordu (kullanici raporu).
  const all: CategoryRow[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("id, slug, parent_id, name, icon")
      .neq("slug", "siniflandirilmamis")
      .order("name")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) {
      console.warn(`[api/public/categories] page ${page} err:`, error.message);
      return null;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
    if (page > 50) break; // safety: 50k limit
  }
  return all;
}

export async function GET() {
  const data = await withTimeout(fetchAllCategories(), "categories");

  if (!data) {
    return NextResponse.json(
      { categories: [] },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  }

  return NextResponse.json(
    { categories: data },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
