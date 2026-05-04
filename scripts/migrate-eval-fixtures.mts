/**
 * P6.1 ADIM 4 — Eval fixture migrate (Phase 5 hierarchik path).
 *
 * Bug A: chatbot_dialogs_*.jsonl category_slug field'ları leaf-only format
 * (Phase 5 öncesi). Phase 5 sonrası DB slug'lar full hierarchik path.
 * Eval comparator format mismatch ile FAIL veriyor.
 *
 * Bu script: her dialog'taki category_slug değerini DB'de leaf-suffix match
 * ile full path'e çevirir. Backup .v1-backup uzantısıyla saklanır.
 *
 * Run: npx tsx scripts/migrate-eval-fixtures.mts
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
env.split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
});

const { createClient } = await import("@supabase/supabase-js");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const { data: catRows, error } = await sb.from("categories").select("slug");
if (error) {
  console.error("DB fetch fail:", error.message);
  process.exit(1);
}
const taxonomy = new Set(catRows.map((c) => c.slug));

// P6.8 helper: --dump-taxonomy flag
if (process.argv.includes("--dump-taxonomy")) {
  for (const s of [...taxonomy].sort()) console.log(s);
  process.exit(0);
}

// Manuel mapping fallback (Phase 5D-3.3 + Migration 029 ile uyumlu).
// P6.8: 130 leaf-only fixture entry için kategori-aile koruyan precise mapping.
// DB taxonomy üzerinden manuel review (npx tsx scripts/migrate-eval-fixtures.mts
// --dump-taxonomy ile alındı).
const MANUAL_MAPPINGS: Record<string, string> = {
  // P6.1 baseline (16 entry, korunuyor)
  "telefon-kilifi": "elektronik/telefon/kilif",
  "telefon-yedek-parca": "elektronik/telefon/yedek-parca",
  "telefon-aksesuar": "elektronik/telefon/aksesuar",
  "fotograf-kamera": "elektronik/kamera/fotograf-makinesi",
  "guvenlik-kamerasi": "elektronik/ag-guvenlik/guvenlik-kamera",
  "bilgisayar-bilesenleri": "elektronik/bilgisayar-tablet/bilesenler",
  tv: "elektronik/tv-ses-goruntu/televizyon",
  firin: "beyaz-esya/firin-ocak",
  "kedi-mamasi": "pet-shop/kedi/mama",
  "kopek-mamasi": "pet-shop/kopek/mama",
  "kedi-kumu": "pet-shop/kedi/kum",
  "erkek-giyim-ust": "moda/erkek-giyim/ust",
  "erkek-giyim-alt": "moda/erkek-giyim/alt",
  "kadin-giyim-ust": "moda/kadin-giyim/ust",
  "kadin-giyim-alt": "moda/kadin-giyim/alt",
  "kadin-elbise": "moda/kadin-giyim/elbise",

  // P6.8 expansion — Elektronik / IoT
  "akilli-ampul": "elektronik/akilli-ev",
  "akilli-asistan": "elektronik/akilli-ev",
  "akilli-priz": "elektronik/akilli-ev",
  "router-modem": "elektronik/ag-guvenlik/modem",
  "harici-disk": "elektronik/bilgisayar-tablet/bilesenler",
  "klavye": "elektronik/bilgisayar-tablet/klavye-mouse",
  "mouse": "elektronik/bilgisayar-tablet/klavye-mouse",
  "dizustu-bilgisayar": "elektronik/bilgisayar-tablet/laptop",
  "oyun-konsolu": "elektronik/oyun/konsol",
  "dijital-kod-oyun": "elektronik/oyun/konsol",

  // Anne-bebek
  "bebek-arabasi": "anne-bebek/bebek-tasima/araba-puset",
  "bebek-giyim": "moda/cocuk-moda/giyim",
  "bebek-mama": "anne-bebek/bebek-beslenme/mama",
  "bebek-oyuncak": "anne-bebek/oyuncak/diger",
  "bebek-oyuncak-bez": "anne-bebek/bebek-bakim/bebek-bezi",
  "biberon": "anne-bebek/bebek-beslenme/biberon-emzik",
  "mama-sandalyesi": "anne-bebek/bebek-beslenme",
  "puzzle": "anne-bebek/oyuncak/masa-oyunu",
  "kutu-oyunu": "anne-bebek/oyuncak/masa-oyunu",
  "kedi-mama": "pet-shop/kedi/mama",
  "kopek-mama": "pet-shop/kopek/mama",
  "kus-yemi": "pet-shop/kus",
  "akvaryum-aksesuar": "pet-shop/akvaryum",
  "evcil-tasima": "pet-shop/aksesuar",

  // Moda — ayakkabı/giyim/aksesuar
  "ayakkabi-erkek": "moda/erkek-ayakkabi",
  "ayakkabi-kadin": "moda/kadin-ayakkabi",
  "kosu-ayakkabisi": "moda/erkek-ayakkabi/sneaker",
  "bot": "moda/kadin-ayakkabi/bot",
  "canta-kadin": "moda/aksesuar/canta-cuzdan",
  "cuzdan": "moda/aksesuar/canta-cuzdan",
  "kemer": "moda/aksesuar",
  "sapka": "moda/aksesuar",
  "esarp-fular": "moda/aksesuar",
  "corap": "moda/aksesuar",
  "saat-aksesuar": "moda/aksesuar/saat-taki",
  "kazak": "moda/kadin-giyim/ust",
  "mont": "moda/kadin-giyim/dis-giyim",
  "mayo-bikini": "moda/kadin-giyim",
  "hamile-giyim": "moda/kadin-giyim",

  // Kozmetik — makyaj/cilt/saç/kişisel bakım
  "fondoten": "kozmetik/makyaj/yuz",
  "maskara": "kozmetik/makyaj/goz",
  "ruj": "kozmetik/makyaj/dudak",
  "oje": "kozmetik/makyaj",
  "goz-far": "kozmetik/makyaj/goz",
  "makyaj-cantasi": "kozmetik/makyaj/firca-aksesuar",
  "makyaj-firca": "kozmetik/makyaj/firca-aksesuar",
  "tonik": "kozmetik/cilt-bakim/temizleyici",
  "temizleme-jeli": "kozmetik/cilt-bakim/temizleyici",
  "el-kremi": "kozmetik/cilt-bakim/nemlendirici",
  "gunes-kremi": "kozmetik/cilt-bakim/gunes-koruyucu",
  "vucut-losyonu": "kozmetik/kisisel-bakim/vucut",
  "sac-aksesuar": "kozmetik/sac-bakim/urunler",
  "sac-bakim-yagi": "kozmetik/sac-bakim/urunler",
  "sac-kremi": "kozmetik/sac-bakim/urunler",
  "dis-firca-elektrikli": "kozmetik/kisisel-bakim/agiz-dis",
  "tras-makinesi": "kozmetik/kisisel-bakim/erkek",
  "tirnak-bakim": "kozmetik/kisisel-bakim/hijyen",

  // Kucuk-ev-aletleri
  "epilator": "kucuk-ev-aletleri/kisisel-bakim/diger",
  "sac-duzlestirici": "kucuk-ev-aletleri/kisisel-bakim/diger",
  "sac-kurutma": "kucuk-ev-aletleri/kisisel-bakim/sac-kurutma",
  "blender-rondo": "kucuk-ev-aletleri/mutfak/blender",
  "sebil": "kucuk-ev-aletleri/mutfak/su-isiticisi",
  "ankastre-set": "beyaz-esya",
  "mikrodalga-firin": "beyaz-esya/mikrodalga",
  "ates-olcer": "saglik-vitamin",
  "tansiyon-aleti": "saglik-vitamin",
  "seker-olcer": "saglik-vitamin",
  "vitamin-takviye": "saglik-vitamin/vitamin-mineral",
  "maske-medikal": "saglik-vitamin",

  // Ev-yaşam — mobilya/banyo/mutfak
  "abajur-aydinlatma": "ev-yasam/aydinlatma",
  "ayna": "ev-yasam/mobilya/yatak-odasi",
  "kanepe": "ev-yasam/mobilya/oturma-odasi",
  "kitaplik": "ev-yasam/mobilya/oturma-odasi",
  "yatak": "ev-yasam/mobilya/yatak-odasi",
  "yemek-masasi": "ev-yasam/mobilya/yemek-odasi",
  "sandalye": "ev-yasam/mobilya/yemek-odasi",
  "ofis-koltugu": "ev-yasam/mobilya/ofis",
  "ofis-masasi": "ev-yasam/mobilya/ofis",
  "vazo-dekor": "ev-yasam/mobilya",
  "perde": "ev-yasam/ev-tekstili",
  "hali": "ev-yasam/ev-tekstili",
  "yastik": "ev-yasam/ev-tekstili",
  "yatak-takimi": "ev-yasam/ev-tekstili",
  "havlu-bornoz": "ev-yasam/banyo",
  "bahce-mobilya": "ev-yasam/bahce-balkon",
  "bicak-seti": "ev-yasam/mutfak-sofra",
  "catal-bicak-kasik": "ev-yasam/mutfak-sofra",
  "tencere-tava": "ev-yasam/mutfak-sofra",
  "yemek-takimi": "ev-yasam/mutfak-sofra",
  "saklama-kabi": "ev-yasam/mutfak-sofra",

  // Spor & Outdoor
  "fitness-aksesuar": "spor-outdoor/fitness",
  "dumbel-agirlik": "spor-outdoor/fitness",
  "kosu-bandi": "spor-outdoor/fitness",
  "yoga-mat": "spor-outdoor/fitness/yoga-pilates",
  "kamp-cadiri": "spor-outdoor/kamp",
  "uyku-tulumu": "spor-outdoor/kamp",
  "termos-mataralar": "spor-outdoor/kamp",

  // Hobi & Eglence — kitap/kırtasiye/müzik
  "kalem": "hobi-eglence/kitap-kirtasiye/kirtasiye",
  "defter": "hobi-eglence/kitap-kirtasiye/kirtasiye",
  "kitap-cocuk": "hobi-eglence/kitap-kirtasiye/cocuk-kitap",
  "kitap-kisisel-gelisim": "hobi-eglence/kitap-kirtasiye/kitap",
  "kitap-roman": "hobi-eglence/kitap-kirtasiye/kitap",
  "muzik-album": "hobi-eglence/sanat-muzik",
  "gitar": "hobi-eglence/sanat-muzik/muzik-aleti",
  "klavye-piyano": "hobi-eglence/sanat-muzik/muzik-aleti",
  "rc-oyuncak": "anne-bebek/oyuncak/rc-robot",

  // Otomotiv (Türkçe ç ascii-norm sonrası "arac-aksesuar")
  "arac-aksesuar": "otomotiv/arac-aksesuar",

  // Yapı-market
  "el-aleti": "yapi-market/el-aletleri",
  "matkap": "yapi-market/elektrikli-aletler",
  "vidalama": "yapi-market/elektrikli-aletler",
  "ot-cim-bicme": "yapi-market/elektrikli-aletler",

  // Süpermarket — gıda
  "bal": "supermarket/gida-icecek/kahvalti-kahve",
  "cay": "supermarket/gida-icecek/kahvalti-kahve",
  "zeytinyagi": "supermarket/gida-icecek/kahvalti-kahve",
  "kuruyemis": "supermarket/gida-icecek/atistirmalik",
  "cikolata": "supermarket/gida-icecek/dondurma-tatli",
  "konserve": "supermarket/gida-icecek/konserve-sos",
  "mineral-su": "supermarket/gida-icecek/icecek",

  // Kozmetik parfüm (variant kadin/erkek tek leaf)
  "parfum-erkek": "kozmetik/parfum",
  "parfum-kadin": "kozmetik/parfum",
};

// P6.8: Türkçe karakter normalize. Fixture'larda 'araç-aksesuar', 'guneş-kremi',
// 'saç-kurutma', 'epilatör', 'vücut-losyonu' gibi non-ascii varyantlar var; DB
// slug'lar Migration 021 sonrası ascii-only.
function trAsciiNormalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function resolveSlug(leafOrPath: string): string | null {
  // 1. Exact taxonomy match
  if (taxonomy.has(leafOrPath)) return leafOrPath;

  // 2. Manual override (curated, kategori-aile doğruluğu garanti)
  const mapped = MANUAL_MAPPINGS[leafOrPath];
  if (mapped && taxonomy.has(mapped)) return mapped;

  // 3. Türkçe ascii-normalize varyantı (guneş→gunes, epilatör→epilator vs.)
  const ascii = trAsciiNormalize(leafOrPath);
  if (ascii !== leafOrPath) {
    if (taxonomy.has(ascii)) return ascii;
    const mappedAscii = MANUAL_MAPPINGS[ascii];
    if (mappedAscii && taxonomy.has(mappedAscii)) return mappedAscii;
  }

  // 4. Leaf-suffix unique match (Phase 5C helper paterni)
  // Çoklu match → null (sticky context fixture'da yok, ilk-match heuristic
  // kategori-aile yanlışlığı üretiyor: "fitness-aksesuar" → "elektronik/
  // telefon/aksesuar" gibi). Doğru çözüm: MANUAL_MAPPINGS'e ekle.
  const candidates = [leafOrPath, ascii];
  for (const cand of candidates) {
    const matches: string[] = [];
    for (const t of taxonomy) {
      if (t === cand || t.endsWith("/" + cand)) matches.push(t);
    }
    if (matches.length === 1) return matches[0];
  }

  return null;
}

function migrateObject(
  obj: unknown,
  stats: { resolved: number; unchanged: number; unmatched: string[] },
): unknown {
  if (Array.isArray(obj)) return obj.map((item) => migrateObject(item, stats));
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (key === "category_slug" && typeof value === "string" && value) {
        if (taxonomy.has(value)) {
          result[key] = value;
          stats.unchanged++;
        } else {
          const resolved = resolveSlug(value);
          if (resolved) {
            result[key] = resolved;
            stats.resolved++;
          } else {
            result[key] = value;
            if (!stats.unmatched.includes(value)) stats.unmatched.push(value);
          }
        }
      } else {
        result[key] = migrateObject(value, stats);
      }
    }
    return result;
  }
  return obj;
}

const FIXTURE_PATHS = [
  "tests/chatbot/fixtures/chatbot_dialogs_200.jsonl",
  "tests/chatbot/fixtures/chatbot_dialogs_eval2_200.jsonl",
];

for (const fpath of FIXTURE_PATHS) {
  if (!existsSync(fpath)) {
    console.warn(`SKIP: ${fpath} not found`);
    continue;
  }
  const backupPath = fpath + ".v1-backup";
  if (!existsSync(backupPath)) {
    copyFileSync(fpath, backupPath);
    console.log(`Backup: ${backupPath}`);
  } else {
    console.log(`Backup exists: ${backupPath} (skipping copy)`);
  }

  const raw = readFileSync(fpath, "utf8");
  const lines = raw.split("\n");
  const stats = { resolved: 0, unchanged: 0, unmatched: [] as string[] };
  const newLines: string[] = [];
  let dialogsProcessed = 0;

  for (const line of lines) {
    if (line.trim().length === 0) {
      newLines.push(line);
      continue;
    }
    try {
      const obj = JSON.parse(line);
      const migrated = migrateObject(obj, stats);
      newLines.push(JSON.stringify(migrated));
      dialogsProcessed++;
    } catch (_e) {
      console.warn(`Parse fail: ${line.slice(0, 80)}...`);
      newLines.push(line);
    }
  }

  writeFileSync(fpath, newLines.join("\n"), "utf8");
  console.log(
    `${fpath}: ${dialogsProcessed} dialog | resolved=${stats.resolved}, unchanged=${stats.unchanged}, unmatched=${stats.unmatched.length}`,
  );
  if (stats.unmatched.length > 0) {
    // P6.8: full unmatched list (slice kaldırıldı). Audit + manuel mapping
    // genişletme için tüm değerler görünür.
    console.log(`  Unmatched slug'lar (${stats.unmatched.length}):`);
    for (const slug of stats.unmatched) console.log(`    - ${slug}`);
  }
}

console.log("\nDone.");
