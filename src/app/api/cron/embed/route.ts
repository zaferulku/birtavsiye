import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

/**
 * /api/cron/embed — NULL embedding olan products için günlük backfill.
 *
 * Strateji:
 *  - GitHub Actions her gün 23:00'da çağırır (Faz 1 ile çakışmaz)
 *  - Free tier 1500 RPD koruması: max 200 ürün/gün
 *  - Rate limit: 6 RPM (10s/embed)
 *  - 429 (kota dolu) → graceful return, kalan ürün ertesi gün
 *  - Bağımsız çalışır (agentRunner kullanmaz, direct call)
 */

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBED_MODEL = "gemini-embedding-001";
const GEMINI_EMBED_DIM = 768;

const MAX_PER_RUN = 200;
const EMBED_DELAY_MS = 10_000; // 6 RPM
const HARD_TIMEOUT_MS = 270_000; // 4.5 min, runner timeout 300

const MEANINGFUL_KEYS = new Set([
  "Renk", "Hacim", "Ağırlık", "Boyut", "Malzeme",
  "Menşei", "Garanti", "Kapasite", "İçerik",
  "renk", "hacim", "ağırlık", "boyut", "malzeme",
  "kapasite", "içerik",
]);

type ProductRow = {
  id: string;
  title: string | null;
  brand: string | null;
  model_family: string | null;
  variant_storage: string | null;
  variant_color: string | null;
  specs: Record<string, unknown> | null;
  categories: { name: string | null } | { name: string | null }[] | null;
};

function verifyCron(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

function extractMeaningfulSpecs(specs: Record<string, unknown> | null): string[] {
  if (!specs || typeof specs !== "object") return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(specs)) {
    if (!MEANINGFUL_KEYS.has(key)) continue;
    if (key.startsWith("_")) continue;
    if (/^\d+(\.\d+)?$/.test(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "string" && (value.trim() === "" || value === "null" || value.length > 100)) continue;
    out.push(`${key}: ${String(value)}`);
    if (out.length >= 6) break;
  }
  return out;
}

function buildEmbeddingText(p: ProductRow): string {
  const parts: string[] = [];
  if (p.title) parts.push(p.title);
  if (p.brand && p.brand !== "null") parts.push(`Marka: ${p.brand}`);
  const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
  if (cat?.name) parts.push(`Kategori: ${cat.name}`);
  const modelParts: string[] = [];
  if (p.model_family) modelParts.push(p.model_family);
  if (p.variant_storage) modelParts.push(p.variant_storage);
  if (p.variant_color) modelParts.push(p.variant_color);
  if (modelParts.length > 0) parts.push(`Model: ${modelParts.join(" ")}`);
  const meaningful = extractMeaningfulSpecs(p.specs);
  if (meaningful.length > 0) parts.push(`Özellikler: ${meaningful.join(", ")}`);
  return parts.join("\n");
}

async function embedText(text: string): Promise<{ ok: true; values: number[] } | { ok: false; status: number; error: string }> {
  if (!GEMINI_API_KEY) return { ok: false, status: 0, error: "GEMINI_API_KEY missing" };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  const body = {
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: GEMINI_EMBED_DIM,
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, status: res.status, error: errText.slice(0, 200) };
    }
    const data = await res.json();
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length !== GEMINI_EMBED_DIM) {
      return { ok: false, status: 0, error: `Bad embedding shape: ${values?.length}` };
    }
    return { ok: true, values };
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const stats = { fetched: 0, embedded: 0, failed: 0, quotaExceeded: false, durationMs: 0 };

  console.log(`[${new Date().toISOString()}] CRON /api/cron/embed started`);

  // 1. NULL embedding aktif products
  const { data: rows, error: fetchErr } = await supabaseAdmin
    .from("products")
    .select(`
      id, title, brand, model_family,
      variant_storage, variant_color, specs,
      categories(name)
    `)
    .eq("is_active", true)
    .is("embedding", null)
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (fetchErr) {
    return NextResponse.json({ error: `fetch: ${fetchErr.message}` }, { status: 500 });
  }

  const products = (rows ?? []) as ProductRow[];
  stats.fetched = products.length;

  if (products.length === 0) {
    stats.durationMs = Date.now() - start;
    return NextResponse.json({ success: true, ...stats, message: "No products need embedding" });
  }

  // 2. Embed each, soft timeout
  for (const p of products) {
    if (Date.now() - start > HARD_TIMEOUT_MS) {
      console.warn(`[cron/embed] hard timeout at ${stats.embedded}/${products.length}`);
      break;
    }

    const text = buildEmbeddingText(p);
    if (!text || text.length < 5) {
      stats.failed++;
      continue;
    }

    const result = await embedText(text);

    if (!result.ok) {
      stats.failed++;
      // 429 → quota dolu, graceful kapat
      if (result.status === 429 || /quota|RESOURCE_EXHAUSTED/i.test(result.error)) {
        stats.quotaExceeded = true;
        console.warn(`[cron/embed] quota exceeded at ${stats.embedded}, stopping`);
        break;
      }
      continue;
    }

    const { error: updateErr } = await supabaseAdmin
      .from("products")
      .update({ embedding: result.values })
      .eq("id", p.id);

    if (updateErr) {
      stats.failed++;
      console.error(`[cron/embed] update fail ${p.id}: ${updateErr.message}`);
      continue;
    }

    stats.embedded++;
    await sleep(EMBED_DELAY_MS);
  }

  stats.durationMs = Date.now() - start;
  console.log(`[cron/embed] done: ${JSON.stringify(stats)}`);
  return NextResponse.json({ success: true, ...stats });
}
