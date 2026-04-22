// Schema migration runner — exec_sql RPC üzerinden statement-by-statement çalıştırır.
// Kullanım: node --env-file=.env.local scripts/migration/run-schema-migration.mjs
//
// UYARI: Bu script DESTRUCTIVE migration'ı çalıştırır.
// Çalıştırmadan önce kullanıcı onayı şart. Brief: docs/migration-brief.md

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("HATA: Supabase env değişkenleri yok");
  process.exit(1);
}

const sqlPath = resolve(__dirname, "schema-migration.sql");
const fullSql = readFileSync(sqlPath, "utf-8");

// SQL'i DO blokları dahil olacak şekilde parçalara böl
// ';' ile sonlanan ama string literal içinde olmayan statement'ları ayır
const statements = splitSqlStatements(fullSql);

console.log(`Toplam ${statements.length} statement bulundu`);
console.log("");

let failCount = 0;
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i].trim();
  if (!stmt || stmt.startsWith("--")) continue;

  const preview = stmt.substring(0, 100).replace(/\n/g, " ");
  console.log(`[${i + 1}/${statements.length}] ${preview}${stmt.length > 100 ? "..." : ""}`);

  const res = await fetch(url + "/rest/v1/rpc/exec_sql", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: stmt }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  HATA: ${res.status} ${text.substring(0, 300)}`);
    failCount++;
    if (failCount >= 3) {
      console.error("\n3 hata üst üste. Durduruyorum.");
      process.exit(1);
    }
    continue;
  }

  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    console.log(`  ✓ ${data.length} satır döndü`);
    if (data.length <= 20) {
      console.log("  " + JSON.stringify(data, null, 2).split("\n").join("\n  "));
    }
  } else {
    console.log("  ✓");
  }
}

console.log("");
console.log(failCount === 0 ? "✓ Migration başarılı" : `⚠️ ${failCount} hata ile bitti`);

function splitSqlStatements(sql) {
  // Basit ama sağlam: DO $$ ... $$ bloklarını ve normal ';' ayrımlarını ayır
  const parts = [];
  let current = "";
  let inDollar = false;
  let dollarTag = "";

  const lines = sql.split("\n");
  for (const line of lines) {
    // Yorum satırlarını atla (statement parse etkilemez ama okunuşluk için)
    if (line.trim().startsWith("--") && !inDollar) continue;

    current += line + "\n";

    // Dollar quote başlatıcı/bitirici kontrolü
    const dollarMatches = line.matchAll(/\$([A-Za-z0-9_]*)\$/g);
    for (const m of dollarMatches) {
      if (!inDollar) {
        inDollar = true;
        dollarTag = m[1];
      } else if (m[1] === dollarTag) {
        inDollar = false;
        dollarTag = "";
      }
    }

    // Dollar quote DIŞINDA ';' ile biten satır = statement sonu
    if (!inDollar && line.trim().endsWith(";")) {
      parts.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}
