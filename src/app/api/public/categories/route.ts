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

export async function GET() {
  const res = await withTimeout(
    supabaseAdmin
      .from("categories")
      .select("id, slug, parent_id, name, icon")
      .neq("slug", "siniflandirilmamis")
      .order("name") as PromiseLike<{ data: CategoryRow[] | null; error: { message: string } | null }>,
    "categories",
  );

  if (!res) {
    // Timeout — boş liste döndür ki build düşmesin; client retry yapar.
    return NextResponse.json(
      { categories: [] },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  }

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  return NextResponse.json(
    { categories: res.data ?? [] },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
