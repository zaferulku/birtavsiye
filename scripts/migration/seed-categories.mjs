// =============================================================================
// Seed Canonical Categories
// =============================================================================
// Bu script:
//   1. src/lib/taxonomy/canonical-taxonomy.yaml dosyasını okur
//   2. categories tablosuna 13 ana + ~150 alt kategoriyi yazar
//   3. category_aliases tablosuna eski slug mapping'lerini yazar
//
// Kullanım:
//   node --env-file=.env.local scripts/migration/seed-categories.mjs
//
// Güvenlik:
//   - Script idempotent: Kategoriler zaten varsa INSERT atlar (ON CONFLICT)
//   - Önce categories temizlenip TRUNCATE edilebilir (aşağıda flag var)
// =============================================================================

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import yaml from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("HATA: Supabase env değişkenleri yok");
  process.exit(1);
}

// =============================================================================
// Helper: exec_sql RPC üzerinden SQL çalıştır
// =============================================================================

async function execSql(query, params = []) {
  // Parametrize sorgular için params array'ini query'e yerleştir
  // (Bu script'te genelde tek seferlik INSERT'ler var)
  const res = await fetch(url + "/rest/v1/rpc/exec_sql", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQL error ${res.status}: ${text.substring(0, 500)}`);
  }

  return await res.json();
}

// SQL literal escape (simple — values only, no identifiers)
function sqlStr(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  // String: escape single quotes
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function sqlArray(arr) {
  if (!arr || arr.length === 0) return "NULL";
  // TEXT[] literal: ARRAY['a','b',...]
  const items = arr.map(item => sqlStr(item)).join(",");
  return `ARRAY[${items}]::TEXT[]`;
}

// =============================================================================
// Ana akış
// =============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("SEED CANONICAL CATEGORIES");
  console.log("=".repeat(60));

  // 1. YAML dosyasını oku
  const yamlPath = resolve(__dirname, "../../src/lib/taxonomy/canonical-taxonomy.yaml");
  console.log(`\n📄 YAML okunuyor: ${yamlPath}`);

  let taxonomy;
  try {
    const content = readFileSync(yamlPath, "utf-8");
    taxonomy = yaml.load(content);
  } catch (e) {
    console.error(`HATA: YAML okunamadı: ${e.message}`);
    process.exit(1);
  }

  const roots = taxonomy.root_categories || [];
  console.log(`✓ ${roots.length} ana kategori bulundu`);

  // 2. Mevcut kategorileri kontrol et
  const existing = await execSql("SELECT COUNT(*) as c FROM categories");
  const existingCount = existing[0]?.c || 0;

  if (existingCount > 0) {
    console.log(`\n⚠️  categories tablosunda zaten ${existingCount} satır var.`);
    console.log("   Önce temizlemek için şunu Supabase Dashboard'da çalıştır:");
    console.log("   TRUNCATE TABLE category_aliases CASCADE;");
    console.log("   TRUNCATE TABLE categories CASCADE;");
    console.log("   Sonra bu script'i tekrar çalıştır.");
    process.exit(1);
  }

  console.log("✓ categories tablosu boş, seed başlıyor\n");

  // 3. ANA KATEGORİLERİ EKLE (parent_id = NULL)
  console.log("=".repeat(60));
  console.log("ADIM 1: Ana kategoriler");
  console.log("=".repeat(60));

  const rootIds = {}; // slug → id mapping
  let rootOrder = 0;

  for (const root of roots) {
    rootOrder++;
    const sql = `
      INSERT INTO categories (slug, name, icon, parent_id, sort_order, is_leaf)
      VALUES (
        ${sqlStr(root.slug)},
        ${sqlStr(root.name_tr)},
        ${sqlStr(root.icon || null)},
        NULL,
        ${rootOrder},
        FALSE
      )
      RETURNING id
    `;
    const result = await execSql(sql);
    const id = result[0]?.id;
    if (!id) {
      console.error(`  ✗ ${root.slug} eklenemedi`);
      continue;
    }
    rootIds[root.slug] = id;
    console.log(`  ✓ ${root.name_tr.padEnd(30)} (${root.slug})`);
  }

  console.log(`\n  Toplam ${Object.keys(rootIds).length} ana kategori eklendi`);

  // 4. ALT KATEGORİLERİ EKLE
  console.log("\n" + "=".repeat(60));
  console.log("ADIM 2: Alt kategoriler");
  console.log("=".repeat(60));

  let subCount = 0;
  let aliasCount = 0;
  const leafIds = {}; // slug → id (alt kategoriler)

  for (const root of roots) {
    const parentId = rootIds[root.slug];
    if (!parentId) continue;

    const subs = root.subcategories || [];
    console.log(`\n  [${root.name_tr}] ${subs.length} alt kategori`);

    let subOrder = 0;
    for (const sub of subs) {
      subOrder++;
      const sql = `
        INSERT INTO categories (
          slug, name, parent_id, sort_order, is_leaf,
          keywords, title_patterns, exclude_keywords, related_brands, migrate_from
        )
        VALUES (
          ${sqlStr(sub.slug)},
          ${sqlStr(sub.name_tr)},
          ${sqlStr(parentId)},
          ${subOrder},
          TRUE,
          ${sqlArray(sub.keywords)},
          ${sqlArray(sub.title_patterns)},
          ${sqlArray(sub.exclude_keywords)},
          ${sqlArray(sub.related_brands)},
          ${sqlArray(sub.migrate_from)}
        )
        RETURNING id
      `;
      try {
        const result = await execSql(sql);
        const id = result[0]?.id;
        if (id) {
          leafIds[sub.slug] = id;
          subCount++;

          // Alias'ları da ekle
          if (sub.migrate_from && sub.migrate_from.length > 0) {
            for (const oldSlug of sub.migrate_from) {
              // Kendi slug'ı değilse alias ekle
              if (oldSlug === sub.slug) continue;

              const aliasSql = `
                INSERT INTO category_aliases (alias_slug, canonical_id, source)
                VALUES (${sqlStr(oldSlug)}, ${sqlStr(id)}, 'deprecated')
                ON CONFLICT (alias_slug) DO NOTHING
              `;
              try {
                await execSql(aliasSql);
                aliasCount++;
              } catch (e) {
                console.log(`      ⚠ alias ${oldSlug} atlandı: ${e.message.substring(0, 80)}`);
              }
            }
          }
        }
      } catch (e) {
        console.error(`    ✗ ${sub.slug}: ${e.message.substring(0, 120)}`);
      }
    }
  }

  console.log(`\n  Toplam ${subCount} alt kategori eklendi`);
  console.log(`  Toplam ${aliasCount} alias kurulmuş`);

  // 5. DOĞRULAMA
  console.log("\n" + "=".repeat(60));
  console.log("ADIM 3: Doğrulama");
  console.log("=".repeat(60));

  const totalCats = await execSql("SELECT COUNT(*) as c FROM categories");
  const totalAliases = await execSql("SELECT COUNT(*) as c FROM category_aliases");
  const rootCount = await execSql("SELECT COUNT(*) as c FROM categories WHERE parent_id IS NULL");
  const leafCount = await execSql("SELECT COUNT(*) as c FROM categories WHERE is_leaf = TRUE");

  console.log(`\n  Toplam kategori:     ${totalCats[0]?.c || 0}`);
  console.log(`  Ana kategori:        ${rootCount[0]?.c || 0}`);
  console.log(`  Leaf kategori:       ${leafCount[0]?.c || 0}`);
  console.log(`  Alias sayısı:        ${totalAliases[0]?.c || 0}`);

  // Ana kategorilerin listesi
  console.log("\n  Ana kategoriler:");
  const rootList = await execSql(`
    SELECT c.slug, c.name,
      (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as alt_sayi
    FROM categories c
    WHERE c.parent_id IS NULL
    ORDER BY c.sort_order
  `);
  for (const r of rootList) {
    console.log(`    ${r.name.padEnd(25)} (${r.alt_sayi} alt kategori)`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ SEED TAMAMLANDI");
  console.log("=".repeat(60));
  console.log("\nSıradaki adım: Gün 2 — Gemini classifier servisi");
}

main().catch(err => {
  console.error("\n🔴 HATA:", err.message);
  console.error(err.stack);
  process.exit(1);
});
