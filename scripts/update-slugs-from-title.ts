/**
 * Tüm canonical product'ların slug'ını title (= source title) üzerinden yeniden üretir.
 *
 * Geçmiş: productIdentity.ts'de slug, canonicalTitle (kısa, "Apple iPhone 15 Plus
 * Gri" gibi) üzerinden üretiliyordu. Yeni mantık: slug source title'tan üretilir
 * (inferProductIdentity input.title kullanır). Bu fix sadece YENİ canonical'lara
 * uygulanıyordu — mevcut 16K+ kayıt eski kısa slug'ı taşıyordu.
 *
 * Bu script: her ACTIVE canonical için title üzerinden yeni slug üretir, mevcut
 * slug ile farklıysa update eder. Çakışma durumunda random 4-char suffix.
 *
 * Kullanım:
 *   DRY_RUN=1 npx tsx --env-file=.env.local scripts/update-slugs-from-title.ts
 *   npx tsx --env-file=.env.local scripts/update-slugs-from-title.ts
 */
import { createClient } from "@supabase/supabase-js";
import { inferProductIdentity } from "../src/lib/productIdentity";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DRY = process.env.DRY_RUN === "1";

interface Row {
  id: string;
  title: string | null;
  slug: string | null;
  brand: string | null;
  is_active: boolean | null;
}

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("products")
      .select("id,title,slug,brand,is_active")
      .eq("is_active", true)
      .range(from, from + 499);
    if (error) {
      console.error("FETCH err:", error.message);
      break;
    }
    if (!data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < 500) break;
    from += 500;
    if (from % 2000 === 0) console.log(` fetched: ${all.length}`);
  }
  return all;
}

async function main() {
  console.log(`=== Update slugs from title ${DRY ? "(DRY-RUN)" : ""} ===`);

  const rows = await fetchAll();
  console.log(`Active products: ${rows.length}`);

  const usedSlugs = new Set<string>(rows.map((r) => r.slug ?? "").filter(Boolean));

  let changed = 0;
  let unchanged = 0;
  let collision = 0;
  let fail = 0;
  const start = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.title) {
      unchanged++;
      continue;
    }

    const id = inferProductIdentity({ title: r.title, brand: r.brand });
    let newSlug = id.slug;

    if (!newSlug) {
      unchanged++;
      continue;
    }
    if (newSlug === r.slug) {
      unchanged++;
      continue;
    }

    if (usedSlugs.has(newSlug)) {
      const suffix = Math.random().toString(36).slice(2, 6);
      newSlug = `${newSlug.slice(0, 95)}-${suffix}`;
      collision++;
    }

    if (DRY) {
      changed++;
      usedSlugs.add(newSlug);
      continue;
    }

    const { error } = await sb.from("products").update({ slug: newSlug }).eq("id", r.id);
    if (error) {
      if (error.code === "23505") {
        const suffix = Math.random().toString(36).slice(2, 6);
        const retrySlug = `${newSlug.slice(0, 95)}-${suffix}`;
        const { error: e2 } = await sb.from("products").update({ slug: retrySlug }).eq("id", r.id);
        if (e2) {
          fail++;
          if (fail <= 3) console.log(`  FAIL ${r.id.slice(0, 8)}: ${e2.message.slice(0, 80)}`);
        } else {
          if (r.slug) usedSlugs.delete(r.slug);
          usedSlugs.add(retrySlug);
          changed++;
        }
      } else {
        fail++;
        if (fail <= 3) console.log(`  FAIL ${r.id.slice(0, 8)}: ${error.message.slice(0, 80)}`);
      }
    } else {
      if (r.slug) usedSlugs.delete(r.slug);
      usedSlugs.add(newSlug);
      changed++;
    }

    if ((i + 1) % 500 === 0 || i + 1 === rows.length) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(` progress: ${i + 1}/${rows.length} | changed=${changed} unchanged=${unchanged} collision=${collision} fail=${fail} | ${elapsed}s`);
    }
  }

  console.log(`\n=== SONUC ===`);
  console.log(`Total scanned:    ${rows.length}`);
  console.log(`Changed:          ${changed}`);
  console.log(`Unchanged:        ${unchanged}`);
  console.log(`Collisions:       ${collision}`);
  console.log(`Failed:           ${fail}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
