import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { supabaseAdmin } from "@/lib/supabaseServer";

function verifyWebhook(req: Request): boolean {
  return req.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

export async function POST(req: Request) {
  if (!verifyWebhook(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const { product_id } = await req.json() as { product_id: string };

  if (!product_id) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 });
  }

  console.log(`[${new Date().toISOString()}] WEBHOOK /api/webhook/product/new product_id=${product_id}`);

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, title, slug, brand, image_url, specs")
    .eq("id", product_id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // 1. Quality check
  const qualityResult = await runAgent(
    "product-qa-categorizer",
    "Evaluate product data quality and return quality_score (0-1) and issues list",
    { product }
  );

  const qualityScore = (qualityResult.data.quality_score as number) ?? 0;
  const issues = qualityResult.data.issues ?? [];
  const status = qualityScore >= 0.6 ? "approved" : "rejected";

  await supabaseAdmin.from("product_queue").insert({
    product_id,
    status,
    quality_score: qualityScore,
    issues,
  });

  // 2. Duplicate detection
  const matchResult = await runAgent(
    "product-matcher",
    "Check if this product is a duplicate of an existing product",
    { product }
  );

  // 3. Generate affiliate URLs
  const affiliateResult = await runAgent(
    "affiliate-link-manager",
    "Generate affiliate URLs for this new product across all platforms",
    { product }
  );

  const affiliateLinks = Array.isArray(affiliateResult.data.links)
    ? (affiliateResult.data.links as Array<{ platform: string; url: string; commission_rate?: number }>)
    : [];

  for (const link of affiliateLinks) {
    if (link.platform && link.url) {
      await supabaseAdmin.from("affiliate_links").upsert(
        { product_id, platform: link.platform, url: link.url, commission_rate: link.commission_rate ?? 0 },
        { onConflict: "product_id,platform" }
      );
    }
  }

  return NextResponse.json({
    success: true,
    agent: "product-quality-agent",
    duration: Date.now() - start,
    quality_score: qualityScore,
    status,
    duplicate_detected: matchResult.data.is_duplicate ?? false,
    affiliate_links_generated: affiliateLinks.length,
  });
}
