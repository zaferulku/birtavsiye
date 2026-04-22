// Migration öncesi mevcut durum denetimi.
// Kullanım: node --env-file=.env.local scripts/migration/inspect-current-state.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("HATA: NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY tanımlı değil.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EXEC_SQL_URL = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;

async function runSql(sql) {
  const cleaned = sql.trim().replace(/;\s*$/, "");
  const res = await fetch(EXEC_SQL_URL, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: cleaned }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: `HTTP ${res.status}: ${text}` };
  }
  return { data: await res.json() };
}

async function countSafe(table) {
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
  if (error) return "tablo yok";
  return String(count ?? 0);
}

function banner(title) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

async function main() {
  // === SORGU 1: Tüm public tablolar ===
  banner("SORGU 1: Tüm public tablolar");
  {
    const { data, error } = await runSql(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    if (error) {
      console.log("HATA (exec_sql RPC tanımlı değil olabilir):", error);
      console.log("\nFallback: bilinen tablo adaylarını tek tek deniyorum...");
      const candidates = [
        "products", "categories", "prices", "stores",
        "profiles", "public_profiles", "topics", "topic_answers",
        "topic_votes", "topic_answer_votes", "community_posts",
        "post_votes", "favorites", "price_alerts", "reviews",
        "price_history", "documents_chunks",
      ];
      for (const t of candidates) {
        const { error: err } = await sb.from(t).select("*", { count: "exact", head: true });
        console.log(`  ${t.padEnd(22)} ${err ? "YOK" : "VAR"}`);
      }
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  // === SORGU 2: Ürün katmanı tablolarının satır sayısı ===
  banner("SORGU 2: Ürün katmanı tablolarının satır sayısı");
  for (const t of ["products", "categories", "prices"]) {
    const c = await countSafe(t);
    console.log(`  ${t.padEnd(15)} | ${c}`);
  }

  // === SORGU 3: Kullanıcı katmanı tablolarının satır sayısı ===
  banner("SORGU 3: Kullanıcı katmanı tablolarının satır sayısı");
  for (const t of ["profiles", "topics", "topic_answers", "reviews", "price_alerts"]) {
    const c = await countSafe(t);
    console.log(`  ${t.padEnd(15)} | ${c}`);
  }

  // === SORGU 4: Products / Categories / Prices'a bağlı foreign key'ler ===
  banner("SORGU 4: Products / Categories / Prices'a gelen foreign key'ler");
  {
    const { data, error } = await runSql(`
      SELECT
        tc.table_name AS bagli_tablo,
        kcu.column_name AS bagli_kolon,
        ccu.table_name AS hedef_tablo,
        ccu.column_name AS hedef_kolon
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name IN ('products', 'categories', 'prices');
    `);
    if (error) console.log("HATA:", error);
    else console.log(JSON.stringify(data, null, 2));
  }

  // === SORGU 5: pgvector extension yüklü mü? ===
  banner("SORGU 5: pgvector extension");
  {
    const { data, error } = await runSql(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'vector';
    `);
    if (error) {
      console.log("HATA:", error);
      console.log("Not: Supabase Dashboard → Database → Extensions sayfasından manuel kontrol edebilirsin.");
    } else {
      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) console.log("pgvector YÜKLÜ DEĞİL");
      else console.log(JSON.stringify(rows, null, 2));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Denetim tamamlandı.");
  console.log("=".repeat(60));
}

main().catch(err => {
  console.error("Beklenmeyen hata:", err);
  process.exit(1);
});
