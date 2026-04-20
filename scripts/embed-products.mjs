// Ürünlerin (title + brand + model + category adı) embedding'ini NIM ile üret
// node --env-file=.env.local scripts/embed-products.mjs [--limit=N] [--brand=X]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const limitArg = process.argv.find(a => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const brandArg = process.argv.find(a => a.startsWith("--brand="));
const BRAND = brandArg ? brandArg.split("=")[1] : null;

const BATCH_SIZE = 32;
const NIM_ENDPOINT = "https://integrate.api.nvidia.com/v1/embeddings";
const NIM_MODEL = "nvidia/nv-embedqa-e5-v5";

async function nimEmbedBatch(texts) {
  const res = await fetch(NIM_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: NIM_MODEL,
      input: texts,
      input_type: "passage",
      encoding_format: "float",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NIM ${res.status}: ${body.slice(0, 200)}`);
  }
  const j = await res.json();
  return (j.data ?? []).map(d => d.embedding);
}

function buildEmbeddingText(p, catMap) {
  const parts = [];
  if (p.brand) parts.push(p.brand);
  if (p.model_family) parts.push(p.model_family);
  if (p.variant_storage) parts.push(p.variant_storage);
  if (p.variant_color) parts.push(p.variant_color);
  if (p.title) parts.push(p.title);
  const catName = p.category_id ? catMap.get(p.category_id) : null;
  if (catName) parts.push(`Kategori: ${catName}`);
  return parts.join(" | ").slice(0, 500);
}

(async () => {
  const { data: cats } = await sb.from("categories").select("id, name");
  const catMap = new Map(cats.map(c => [c.id, c.name]));

  let processed = 0, embedded = 0, errors = 0;
  const startTs = Date.now();

  for (let page = 0; page < 100; page++) {
    if (processed >= LIMIT) break;

    let q = sb.from("products")
      .select("id, title, brand, model_family, variant_storage, variant_color, category_id")
      .is("embedding", null)
      .not("title", "is", null);
    if (BRAND) q = q.ilike("brand", BRAND);

    const { data } = await q.limit(BATCH_SIZE * 8);
    if (!data || data.length === 0) break;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      if (processed >= LIMIT) break;
      const chunk = data.slice(i, i + BATCH_SIZE);
      const texts = chunk.map(p => buildEmbeddingText(p, catMap));

      try {
        const embeddings = await nimEmbedBatch(texts);
        for (let j = 0; j < chunk.length; j++) {
          const emb = embeddings[j];
          if (!emb) { errors++; continue; }
          const { error } = await sb.from("products").update({ embedding: emb }).eq("id", chunk[j].id);
          if (error) { errors++; continue; }
          embedded++;
        }
      } catch (e) {
        errors += chunk.length;
        console.error(`batch err: ${e.message}`);
        await new Promise(r => setTimeout(r, 3000));
      }

      processed += chunk.length;
      if (processed % 128 === 0) {
        const elapsed = ((Date.now() - startTs) / 1000).toFixed(0);
        process.stdout.write(`\r  processed=${processed} embedded=${embedded} errors=${errors} ${elapsed}s`);
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\n\nDone. processed=${processed} embedded=${embedded} errors=${errors}`);
})();
