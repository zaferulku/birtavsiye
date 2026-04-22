# Migration Brief — Gün 1

## Amaç

birtavsiye.net'in ürün katmanını baştan temiz yapıya taşımak:
- Eski karışık kategori yapısı → temiz hiyerarşik taxonomy
- Tek-ürün-tek-fiyat → canonical product + listings (aggregator modeli)
- Agent'lar için self-governance altyapısı

## Kırmızı çizgiler

1. **Site tasarımı değişmez** — frontend, bileşenler, CSS, route'lar dokunulmayacak
2. **Forum yapısı korunur** — topics, topic_answers, votes tablolarının YAPISI aynı kalır
3. **Kullanıcı katmanı korunur** — profiles, public_profiles, stores, agent_logs dokunulmayacak
4. **Her adım onaylatılacak** — SQL çalıştırmadan ÖNCE kullanıcıya sonucu göster, "devam" yanıtı bekle

## Dosyalar

1. `src/lib/taxonomy/canonical-taxonomy.yaml` — Tek kategori referansı
2. `scripts/migration/schema-migration.sql` — Ana migration SQL
3. (Sonra gelecek) `scripts/migration/seed-categories.mjs` — YAML → categories tablosuna

## Adım adım

### Adım 1: Dosyaları yerleştir

Şu dizinleri oluştur:
```
src/lib/taxonomy/
scripts/migration/
```

Dosyaları yerleştir:
- `canonical-taxonomy.yaml` → `src/lib/taxonomy/canonical-taxonomy.yaml`
- `schema-migration.sql` → `scripts/migration/schema-migration.sql`

### Adım 2: pgvector kontrolü

Önce pgvector extension'ının yüklü olduğunu doğrula:

```
node --env-file=.env.local -e "
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sql = \`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'\`;
const res = await fetch(url + '/rest/v1/rpc/exec_sql', {
  method: 'POST',
  headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql })
});
console.log(JSON.stringify(await res.json(), null, 2));
"
```

Beklenen: `[{"extname":"vector","extversion":"0.8.0"}]` veya benzer

### Adım 3: Migration runner script'i yaz

`scripts/migration/run-schema-migration.mjs` dosyasını oluştur:

```javascript
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
  console.log(`[${i + 1}/${statements.length}] ${preview}${stmt.length > 100 ? '...' : ''}`);

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
```

### Adım 4: Migration'ı çalıştır

Kullanıcıya ONAYLATARAK çalıştır:

```
node --env-file=.env.local scripts/migration/run-schema-migration.mjs
```

Her ana adımdan sonra kullanıcıya rapor ver:

1. **Backup tamamlandı** (ADIM 1): "Backup alındı: 43176 ürün, 195 kategori, 43279 fiyat yedeklendi. Devam edeyim mi?"

2. **Test verisi temizlendi** (ADIM 2): "Forum yapısı korundu, test verileri silindi (topics, favorites, vs). Devam edeyim mi?"

3. **Eski tablolar silindi** (ADIM 3): "products, categories, prices, price_history silindi. Devam edeyim mi?"

4. **Yeni tablolar kuruldu** (ADIM 4-9): "10 yeni tablo, 1 RPC, 4 trigger kuruldu. Doğrulama:"
   - Doğrulama sonuçlarını göster

### Adım 5: Nihai rapor

Migration tamamlandığında kullanıcıya:

```
✓ Schema Migration v2.0 tamamlandı

Oluşturulan tablolar:
  - categories               (0 satır — henüz seed edilmedi)
  - category_aliases         (0 satır)
  - products                 (0 satır — Gün 2'de Gemini ile doldurulacak)
  - listings                 (0 satır)
  - price_history            (0 satır)
  - agent_decisions          (0 satır)
  - decision_feedback        (0 satır)
  - learned_patterns         (0 satır)
  - categorization_cache     (0 satır)
  - source_category_mappings (0 satır)

Yedekler (backup_20260422_*):
  - products     (43176 satır)
  - categories   (195 satır)
  - prices       (43279 satır)
  - price_history (X satır)

Korunan tablolar (dokunulmadı):
  - profiles, public_profiles, stores, agent_logs

Yapısı korunup verisi temizlenen tablolar:
  - topics, topic_answers, topic_votes, topic_answer_votes,
    post_votes, community_posts, favorites, price_alerts,
    affiliate_links, review_queue, product_queue

Sıradaki adım: Kategori seed (YAML → database)
```

## Hata senaryoları

### "vector type does not exist"
pgvector yüklü değil. Kullanıcıya söyle:
"Supabase Dashboard → Database → Extensions → vector extension'ını enable et"

### "relation ... already exists"
Daha önce migration çalışmış olabilir. Rollback için:
```
DROP TABLE IF EXISTS categories, products, listings, price_history,
  agent_decisions, decision_feedback, learned_patterns,
  categorization_cache, source_category_mappings, category_aliases CASCADE;
```
Sonra tekrar migration çalıştır.

### "column ... does not exist" (TRUNCATE sırasında)
Bir tablo eksik olabilir (örn. price_alerts yok ise). O satırı atla, devam et.

### Foreign key violation
Backup/rollback için:
```sql
-- Eski veriyi geri yükle
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
CREATE TABLE products AS SELECT * FROM backup_20260422_products;
CREATE TABLE categories AS SELECT * FROM backup_20260422_categories;
```

## Önemli uyarılar

- Migration HEMEN çalıştırma. Önce kullanıcıya göster, onayını bekle.
- SQL içinde yorum değiştirme, hata ayıklaması zorlaşır.
- Her `exec_sql` çağrısı ayrı transaction. Ortada kalan adım olursa kullanıcıya bildir.
- Migration'dan sonra agents yazılacak (Gün 2), şimdilik sadece altyapı.
