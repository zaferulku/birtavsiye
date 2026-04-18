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

  // Fetch product + current category slug
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, title, slug, brand, image_url, specs, price:prices(price), category_id, categories(slug)")
    .eq("id", product_id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Fetch all categories for agent to choose from
  const { data: allCategories } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name");

  const categoryMap = new Map((allCategories ?? []).map(c => [c.slug, c.id]));
  const currentCategorySlug = (product as unknown as { categories?: { slug?: string } }).categories?.slug ?? null;

  // Build minimal payload
  const agentPayload = {
    product: {
      id: product.id,
      title: product.title,
      brand: product.brand,
      image_url: product.image_url,
      current_category_slug: currentCategorySlug,
    },
    available_categories: (allCategories ?? []).map(c => ({ slug: c.slug, name: c.name })),
  };

  // 1. Quality + category check
  const qualityResult = await runAgent(
    "product-qa-categorizer",
    "Validate product and pick correct category slug from available_categories",
    agentPayload
  );

  const verdict = qualityResult.data as {
    action?: "publish" | "fix_required" | "reject";
    approved_for_publish?: boolean;
    suggested_category_slug?: string;
    category_confidence?: number;
    quality_score?: number;
    issues?: string[];
    reason?: string;
  };

  const action = verdict.action ?? "fix_required";
  const qualityScore = verdict.quality_score ?? 0;
  const issues = verdict.issues ?? [];
  const suggestedSlug = verdict.suggested_category_slug;

  // Apply category correction if agent suggests different slug with confidence >= 0.7
  let categoryUpdated = false;
  if (
    suggestedSlug &&
    suggestedSlug !== currentCategorySlug &&
    (verdict.category_confidence ?? 0) >= 0.7 &&
    categoryMap.has(suggestedSlug)
  ) {
    const newCategoryId = categoryMap.get(suggestedSlug)!;
    await supabaseAdmin
      .from("products")
      .update({ category_id: newCategoryId })
      .eq("id", product_id);
    categoryUpdated = true;
    console.log(`[webhook/product/new] product ${product_id} category: ${currentCategorySlug} → ${suggestedSlug}`);
  }

  // If rejected → delete the product
  let deleted = false;
  if (action === "reject") {
    await supabaseAdmin.from("products").delete().eq("id", product_id);
    deleted = true;
    console.log(`[webhook/product/new] product ${product_id} DELETED — reason: ${verdict.reason ?? "n/a"}`);
  } else {
    // Record in queue for audit trail
    const status = action === "publish" ? "approved" : "rejected";
    await supabaseAdmin.from("product_queue").insert({
      product_id,
      status,
      quality_score: qualityScore,
      issues,
    });
  }

  // Skip matcher + affiliate when product was deleted
  let matchResult = null;
  let affiliateLinksGenerated = 0;
  if (!deleted) {
    // 2. Duplicate detection (fire-and-forget, don't block)
    matchResult = await runAgent(
      "product-matcher",
      "Check if this product is a duplicate of an existing product",
      { product: agentPayload.product }
    );

    // 3. Generate affiliate URLs
    const affiliateResult = await runAgent(
      "affiliate-link-manager",
      "Generate affiliate URLs for this new product across all platforms",
      { product: agentPayload.product }
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
    affiliateLinksGenerated = affiliateLinks.length;
  }

  return NextResponse.json({
    success: true,
    duration: Date.now() - start,
    action,
    quality_score: qualityScore,
    category_updated: categoryUpdated,
    suggested_category_slug: suggestedSlug,
    deleted,
    duplicate_detected: matchResult?.data.is_duplicate ?? false,
    affiliate_links_generated: affiliateLinksGenerated,
  });
}
