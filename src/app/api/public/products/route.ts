import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import {
  CategoryNotFoundError,
  retrieveRankedProducts,
} from "../../../../lib/search/productRetrieval";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const categorySlug = url.searchParams.get("category");
    const q = url.searchParams.get("q");
    const brand = url.searchParams.get("brand");
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10))
    );
    const offset = Math.max(
      0,
      parseInt(url.searchParams.get("offset") || "0", 10)
    );

    const { products } = await retrieveRankedProducts({
      sb: supabaseAdmin,
      query: q,
      categorySlug,
      brand,
      limit,
      offset,
    });

    return NextResponse.json(
      { products },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    if (error instanceof CategoryNotFoundError) {
      return NextResponse.json(
        { products: [], error: "category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "internal error",
      },
      { status: 500 }
    );
  }
}
