import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/apiAdmin";
import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  auditDuplicateProducts,
  mergeDuplicateProducts,
} from "@/lib/productDuplicates";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const productLimit = Number(url.searchParams.get("product_limit") ?? 5000);
  const groupLimit = Number(url.searchParams.get("group_limit") ?? 100);

  try {
    const result = await auditDuplicateProducts(supabaseAdmin, {
      productLimit: Number.isFinite(productLimit) ? Math.max(100, Math.min(productLimit, 10000)) : 5000,
      groupLimit: Number.isFinite(groupLimit) ? Math.max(1, Math.min(groupLimit, 500)) : 100,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "duplicate audit failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: {
    canonical_product_id?: string;
    duplicate_product_ids?: string[];
    dry_run?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const canonicalProductId = typeof body.canonical_product_id === "string" ? body.canonical_product_id : "";
  const duplicateProductIds = Array.isArray(body.duplicate_product_ids)
    ? body.duplicate_product_ids.filter((id): id is string => typeof id === "string" && Boolean(id))
    : [];

  if (!canonicalProductId || duplicateProductIds.length === 0) {
    return NextResponse.json(
      { error: "canonical_product_id ve duplicate_product_ids gerekli" },
      { status: 400 }
    );
  }

  try {
    const result = await mergeDuplicateProducts(supabaseAdmin, {
      canonicalProductId,
      duplicateProductIds,
      dryRun: body.dry_run !== false,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "duplicate merge failed" },
      { status: 500 }
    );
  }
}
