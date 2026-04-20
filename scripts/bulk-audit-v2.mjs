// Agent-driven kategori audit v2 — Gemini primary + Groq fallback
// node --env-file=.env.local scripts/bulk-audit-v2.mjs <category-slug>
// node --env-file=.env.local scripts/bulk-audit-v2.mjs all

import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const BATCH = 5;
const DELAY_MS = 4500;

const SYSTEM_PROMPT = `Sen birtavsiye.net için ürün kategori audit agent'ısın. Türkçe e-ticaret ürünleri için.

Her ürüne ŞUNLARI YAP:
1. Title'dan ne olduğunu anla (telefon mu, aksesuar mı, yedek parça mı, 2.el mi?)
2. Doğru kategori slug'ını seç (available_categories listesinden)
3. reject et: "İkinci El", "Yenilenmiş", "Refurbished", "Outlet", "Defolu", "Teşhir", "Kullanılmış"

KRİTİK KURALLAR:
- Telefon kılıfı/kapak/ekran koruyucu/şarj aleti/kablosu/tutucu → telefon-aksesuar
- Akıllı saat/bileklik/watch/band → akilli-saat
- Kulaklık/airpods/buds/hoparlör → ses-kulaklik
- Tablet/iPad/Pad → tablet
- Laptop batarya/pil/adaptör/ram/ssd → bilgisayar-bilesenleri
- Laptop çantası/stand → telefon-aksesuar
- Gimbal/tripod/lens/kamera aksesuar → fotograf-kamera
- Robot süpürge/hava temizleme/ütü/air fryer → kucuk-ev-aletleri
- Mesh wifi/router/switch → networking
- "Uyumlu/İçin/İle" içeren → aksesuar (o marka telefon üretmiyorsa)

Sadece bilinen telefon markaları: Apple, Samsung, Xiaomi, Huawei, Honor, Oppo, Vivo, Realme, OnePlus, Pixel, Nokia, Motorola, Tecno, Infinix, Nubia, General Mobile, Blackview, Redmi, Poco

Output: { "verdicts": [ { "product_id": "uuid", "action": "publish" or "reject", "suggested_category_slug": "...", "confidence": 0.0-1.0 } ] }
action=reject olunca suggested_category_slug boş olabilir.
Sadece JSON ver, başka hiçbir şey.`;

async function callGemini(userMsg) {
  const r = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMsg,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 1000,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  return r.text ?? "";
}

async function callGroq(userMsg) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.1,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
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

async function auditOne(slug, availableCategories, slugToId) {
  console.log(`\n━━ ${slug} ━━`);
  const { data: cat } = await sb.from("categories").select("id").eq("slug", slug).single();
  if (!cat) { console.log("  kategori yok"); return; }

  const { data: products } = await sb
    .from("products")
    .select("id,title,brand,categories(slug)")
    .eq("category_id", cat.id);

  console.log(`  ${products.length} ürün`);

  let moved = 0, deleted = 0, errors = 0;
  const start = Date.now();

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    const payload = {
      products: batch.map(p => ({ id: p.id, title: p.title, brand: p.brand, current: p.categories?.slug })),
      available_categories: availableCategories,
    };
    const userMsg = JSON.stringify(payload);

    let raw = "";
    try {
      try {
        raw = await callGemini(userMsg);
      } catch (e) {
        if (e.message.includes("429") || e.message.includes("RESOURCE_EXHAUSTED")) {
          raw = await callGroq(userMsg);
        } else throw e;
      }
    } catch (e) {
      errors++;
      process.stdout.write(`\r  [${((i + batch.length) / products.length * 100).toFixed(0)}%] moved=${moved} deleted=${deleted} errors=${errors}`);
      await new Promise(r => setTimeout(r, DELAY_MS));
      continue;
    }

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { verdicts: [] }; }

    const verdicts = parsed.verdicts ?? [];
    const toDelete = [];
    const toMove = {};

    for (const v of verdicts) {
      const p = batch.find(x => x.id === v.product_id);
      if (!p) continue;
      if (v.action === "reject") {
        toDelete.push(v.product_id);
      } else if (v.suggested_category_slug && v.suggested_category_slug !== p.categories?.slug && (v.confidence ?? 0) >= 0.7 && slugToId[v.suggested_category_slug]) {
        (toMove[v.suggested_category_slug] ||= []).push(v.product_id);
      }
    }

    if (toDelete.length) { await cascadeDelete(toDelete); deleted += toDelete.length; }
    for (const [s, ids] of Object.entries(toMove)) {
      await sb.from("products").update({ category_id: slugToId[s] }).in("id", ids);
      moved += ids.length;
    }

    const pct = ((i + batch.length) / products.length * 100).toFixed(0);
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    process.stdout.write(`\r  [${pct}%] moved=${moved} deleted=${deleted} errors=${errors} ${elapsed}s`);

    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  console.log(`\n  ✓ ${slug}: moved=${moved}, deleted=${deleted}, errors=${errors}`);
}

(async () => {
  const { data: cats } = await sb.from("categories").select("id,slug,name");
  const availableCategories = cats.map(c => ({ slug: c.slug, name: c.name }));
  const slugToId = Object.fromEntries(cats.map(c => [c.slug, c.id]));

  const target = process.argv[2] || "akilli-telefon";

  if (target === "all") {
    const bigCats = ["akilli-telefon", "bilgisayar-laptop", "tablet", "akilli-saat", "ses-kulaklik", "tv", "oyun-konsol", "kucuk-ev-aletleri", "bilgisayar-bilesenleri"];
    for (const slug of bigCats) {
      await auditOne(slug, availableCategories, slugToId);
    }
  } else {
    await auditOne(target, availableCategories, slugToId);
  }
  console.log("\nDone.");
})();
