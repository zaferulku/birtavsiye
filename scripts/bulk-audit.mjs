// Toplu kategori audit: mevcut ürünleri agent ile denetle + düzelt
// node --env-file=.env.local scripts/bulk-audit.mjs <category-slug>
// veya:
// node --env-file=.env.local scripts/bulk-audit.mjs all        (tüm kategoriler)
//
// Provider: Groq Llama 3.3 70B (30 RPM free tier, 14400 RPD)
// Batch: 10 ürün / API çağrısı → ~3-4 saniye / batch
// 15k ürün ≈ 1500 batch ≈ 90-120 dakika

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SPEC_PATH = ".claude/agents/product-qa-categorizer.md";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const BATCH_SIZE = 10;
const RATE_DELAY_MS = 2100; // 30 RPM → ~2s arası

function loadSpec() {
  const raw = fs.readFileSync(SPEC_PATH, "utf-8");
  return raw.replace(/^---[\s\S]*?---\n/, "").trim();
}

async function callGroq(systemPrompt, userMessage) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.1,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function cascadeDelete(ids) {
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    await sb.from("prices").delete().in("product_id", chunk);
    await sb.from("price_history").delete().in("product_id", chunk);
    await sb.from("product_queue").delete().in("product_id", chunk);
    await sb.from("affiliate_links").delete().in("product_id", chunk);
    await sb.from("products").delete().in("id", chunk);
  }
}

async function auditBatch(products, availableCategories, systemPrompt, slugToId) {
  const payload = {
    products: products.map(p => ({
      id: p.id,
      title: p.title,
      brand: p.brand,
      image_url: p.image_url,
      current_category_slug: p.categories?.slug ?? null,
    })),
    available_categories: availableCategories,
  };

  const userMsg = `Batch of ${products.length} products. For EACH, return a verdict with suggested_category_slug and action.\n\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nReturn JSON: { "verdicts": [ { "product_id": "...", "action": "publish|reject", "suggested_category_slug": "...", "category_confidence": 0.0-1.0, "reason": "..." } ] }`;

  const raw = await callGroq(systemPrompt, userMsg);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { verdicts: [] };
  }

  const verdicts = parsed.verdicts || [];
  const updates = {}; // slug → [ids]
  const deletes = [];
  let kept = 0;

  for (const v of verdicts) {
    const product = products.find(p => p.id === v.product_id);
    if (!product) continue;

    if (v.action === "reject") {
      deletes.push(v.product_id);
      continue;
    }

    const currentSlug = product.categories?.slug;
    const suggestedSlug = v.suggested_category_slug;
    const conf = v.category_confidence ?? 0;

    if (suggestedSlug && suggestedSlug !== currentSlug && conf >= 0.7 && slugToId[suggestedSlug]) {
      (updates[suggestedSlug] ||= []).push(v.product_id);
    } else {
      kept++;
    }
  }

  for (const [slug, ids] of Object.entries(updates)) {
    await sb.from("products").update({ category_id: slugToId[slug] }).in("id", ids);
  }

  if (deletes.length) {
    await cascadeDelete(deletes);
  }

  const moved = Object.values(updates).reduce((s, a) => s + a.length, 0);
  return { moved, deleted: deletes.length, kept };
}

async function auditCategory(slug) {
  console.log(`\n━━━ Auditing: ${slug} ━━━`);

  const { data: allCats } = await sb.from("categories").select("id,slug,name");
  const availableCategories = allCats.map(c => ({ slug: c.slug, name: c.name }));
  const slugToId = Object.fromEntries(allCats.map(c => [c.slug, c.id]));

  const category = allCats.find(c => c.slug === slug);
  if (!category) {
    console.log(`  kategori bulunamadı: ${slug}`);
    return;
  }

  const { data: products } = await sb
    .from("products")
    .select("id,title,brand,image_url,categories(slug)")
    .eq("category_id", category.id);

  console.log(`  ${products.length} ürün`);

  const systemPrompt = loadSpec();
  let totalMoved = 0, totalDeleted = 0, totalKept = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    try {
      const r = await auditBatch(batch, availableCategories, systemPrompt, slugToId);
      totalMoved += r.moved;
      totalDeleted += r.deleted;
      totalKept += r.kept;
      const pct = ((i + batch.length) / products.length * 100).toFixed(1);
      process.stdout.write(`\r  [${pct}%] moved=${totalMoved} deleted=${totalDeleted} kept=${totalKept} errors=${errors}`);
    } catch (e) {
      errors++;
      if (e.message.includes("429")) {
        process.stdout.write(`\r  [rate-limit, 10s bekleme]`);
        await new Promise(r => setTimeout(r, 10_000));
      } else {
        process.stdout.write(`\r  [error: ${e.message.slice(0, 40)}]`);
      }
    }
    await new Promise(r => setTimeout(r, RATE_DELAY_MS));
  }
  console.log(`\n  ✓ ${slug}: moved=${totalMoved} deleted=${totalDeleted} kept=${totalKept} errors=${errors}`);
}

const target = process.argv[2] || "akilli-telefon";

if (target === "all") {
  const { data: cats } = await sb.from("categories").select("slug").order("name");
  for (const c of cats) {
    await auditCategory(c.slug);
  }
} else {
  await auditCategory(target);
}

console.log("\nDone.");
