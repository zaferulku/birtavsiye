// Kategori başına title'ı kategoriye uymayan ürünleri audit eder (salt okuma)
// node --env-file=.env.local scripts/audit-categories.mjs [category-slug]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXPECTED = {
  "akilli-telefon": /\b(iphone|galaxy|redmi|xiaomi|huawei|honor|oppo|vivo|realme|oneplus|reeder|casper|general mobile|android|ios|cep\s*telefon|smartphone|akıllı\s*telefon)\b/i,
  "telefon-aksesuar": /\b(telefon\s*kılıf|kılıf|case|cover|ekran\s*koruyucu|cam\s*koruyucu|şarj|adaptör|kablo|powerbank|power\s*bank|tripod|selfie|airpod|kulaklık|kablosuz\s*şarj|wireless)/i,
  "tablet": /\b(ipad|galaxy\s*tab|android\s*tablet|tablet|matepad|redmi\s*pad|mediapad)/i,
  "bilgisayar-laptop": /\b(laptop|notebook|macbook|ultrabook|dizüstü|bilgisayar|gaming|zenbook|thinkpad|pavilion|inspiron|probook|ideapad|aspire|vivobook|omen|predator)/i,
  "bilgisayar-bilesenleri": /\b(anakart|ekran\s*kart|ram|ssd|hdd|işlemci|cpu|gpu|soket|nvme|m\.?2|bellek|chipset|vga|ddr[345]|intel|amd|nvidia|radeon|geforce|monitör|monitor)/i,
  "tv": /\b(\d{2}\s*(inç|inch|ekran)|televizyon|smart\s*tv|oled|qled|neo|mini\s*led|4k|8k|uhd|projeksiyon|projector)\b/i,
  "ses-kulaklik": /\b(kulaklık|airpod|bluetooth|hoparlör|soundbar|anc|kulak\s*(içi|üstü)|earbud|over[- ]?ear|in[- ]?ear|mikrofon|speaker|jbl|bose|beats|sony|marshall)/i,
  "akilli-saat": /\b(apple\s*watch|galaxy\s*watch|mi\s*band|amazfit|huawei\s*watch|akıllı\s*saat|smart\s*watch|fitness\s*tracker|bileklik|kordon|kayış|strap|band)/i,
  "fotograf-kamera": /\b(kamera|fotoğraf|dslr|mirrorless|aynasız|gopro|insta360|canon|nikon|fujifilm|leica|lens|objektif|tripod|gimbal|güvenlik\s*kamera|cctv|ip\s*camera)/i,
  "oyun-konsol": /\b(playstation|ps[45]|xbox|nintendo|switch|gamepad|controller|dualsense|dualshock|oyun\s*kol|console|konsol|game|oyun)/i,
  "beyaz-esya": /\b(çamaşır\s*makinesi|bulaşık\s*makinesi|buzdolab|fırın|ocak|davlumbaz|klima|derin\s*dondurucu|kurutma\s*makinesi|no\s*frost|ankastre)/i,
  "kucuk-ev-aletleri": /\b(süpürge|ütü|blender|rondo|fritöz|air\s*fryer|tost|kahve\s*mak|espresso|kettle|su\s*ısıt|mikser|waffle|buhar)/i,
  "makyaj": /\b(ruj|lipstick|fondöten|foundation|maskara|eyeliner|kapatıcı|concealer|allık|blush|göz\s*far|eyeshadow|oje|aydınlatıcı|highlighter|primer|pudra|kaş|brow|dudak\s*kalem|lip\s*liner|setting\s*spray|bronz|kontur)/i,
  "parfum": /\b(parfüm|parfum|edp|edt|eau\s*de|kolonya|cologne|fragrance|deodorant|antiperspirant|koku)/i,
  "cilt-bakimi": /\b(yüz\s*maskesi|cilt\s*maskesi|kil\s*maskesi|sheet\s*mask|kağıt\s*mask|nemlendirici|retinol|vitamin\s*c|güneş\s*kremi|spf|ceramide|hyaluronic|peeling|tonik|yüz\s*kremi|göz\s*kremi|serum|krem|losyon|temizle|jel|yaşlanma|kırışıklık|cilt\s*bakım|foreo|led\s*maske|yüz\s*fırça)/i,
  "sac-bakimi": /\b(şampuan|saç\s*kremi|saç\s*serumu|saç\s*boyası|saç\s*kurutma|saç\s*düzleştirici|saç\s*maşa|saç\s*bak|olaplex|loreal\s*pro|keratin|argan|saç\s*nem|saç\s*onarıc|saç\s*güçlen)/i,
  "kisisel-hijyen": /\b(tuvalet\s*kağı|ped|ıslak\s*mendil|sabun|diş\s*fırça|diş\s*macun|diş|ağız|gargara|tıraş|jilet|tampon|sargı|cerrahi|meltblown)/i,
  "erkek-giyim": /\b(erkek\s*(tişört|gömlek|pantol|elbise|ceket|mont|kaban|kazak|hırka|tshirt|t[- ]?shirt|sweat|hoodie|jean|takım|kıyafet|giyim|şort))/i,
  "kadin-giyim": /\b(kadın\s*(tişört|gömlek|pantol|elbise|ceket|mont|kaban|kazak|hırka|tshirt|sweat|hoodie|jean|bluz|etek|tayt|tunik)|bayan)/i,
  "cocuk-giyim": /\b(çocuk|kız\s*çocuk|erkek\s*çocuk|okul\s*(önlük|çanta)|baby\s*grow)/i,
  "bebek-giyim": /\b(bebek|baby|0-3\s*ay|3-6\s*ay|body|zıbın|badi|tulum)/i,
  "erkek-ayakkabi": /\b(erkek\s*(ayakkab|sneaker|bot|çizme|loafer|oxford|terlik|sandalet|spor\s*ayakkab))/i,
  "kadin-ayakkabi": /\b(kadın\s*(ayakkab|topuklu|stiletto|babet|bot|çizme|sandalet|terlik)|bayan\s*ayakkab)/i,
  "fitness": /\b(dambıl|kettlebell|yoga\s*mat|pilates|kondisyon|bisiklet\s*sele|koşu\s*band|treadmill|direnç\s*band|fitness|egzersiz|squat|plates)/i,
  "bisiklet": /\b(bisiklet|scooter|elektrikli\s*scooter|bike|mtb|yol\s*bisiklet|dağ\s*bisiklet|kask|bisiklet\s*aksesuar)/i,
  "outdoor-kamp": /\b(çadır|uyku\s*tulum|kamp|outdoor|trekking|mont|termos)/i,
  "su-sporlari": /\b(dalış|şnorkel|palet|sualtı|yüzme\s*gözlü|neopren|wetsuit|yelken|sörf|sup|paddle|kano|kayak\s*(deniz)?)/i,
  "yoga": /\b(yoga|pilates|mat)/i,
  "kitap": /\b(roman|kitap|edebiyat|ciltli|yayınları|şiir|hikaye)/i,
  "oyuncak": /\b(oyuncak|lego|puzzle|maket|bebek\s*(oyuncak)?|action\s*figure|figür|kinetic|slime|oyun\s*seti)/i,
  "masa-oyunu": /\b(masa\s*oyun|puzzle|monopoly|satranç|tavla|backgammon|kart\s*oyun)/i,
  "yapi-market": /\b(tornavida|çekiç|matkap|vida|cıvata|anahtar|seti|el\s*aleti|tamir|yapı|beton|boya\s*(fırça|rulo)|bahçe|kaynak)/i,
  "mobilya-dekorasyon": /\b(koltuk|kanepe|yatak|karyola|masa|sandalye|dolap|gardrop|halı|ayna|berjer|puf|tabure)/i,
  "ev-tekstili": /\b(nevresim|yorgan|yastık|perde|havlu|banyo\s*paspas|döşeme|battaniye|pike)/i,
  "mutfak-sofra": /\b(tencere|tava|bıçak|çatal|kaşık|tabak|bardak|kadeh|kase|sofra|ekmek|hamur)/i,
  "temizlik": /\b(deterjan|çamaşır\s*suyu|bulaşık|temizlik|hijyen|silikon|cam\s*sil|beyazlat)/i,
};

const onlyCat = process.argv[2] || null;

(async () => {
  const { data: cats } = await sb.from("categories").select("id, slug, name").in("slug", onlyCat ? [onlyCat] : Object.keys(EXPECTED));

  const report = {};

  for (const cat of cats) {
    const re = EXPECTED[cat.slug];
    if (!re) continue;
    const { data: products, count } = await sb
      .from("products")
      .select("title", { count: "exact" })
      .eq("category_id", cat.id)
      .limit(2000);

    const misses = products.filter(p => !re.test(p.title));
    report[cat.slug] = {
      name: cat.name,
      sampled: products.length,
      total: count,
      suspicious: misses.length,
      pct: products.length > 0 ? Math.round(100 * misses.length / products.length) : 0,
      samples: misses.slice(0, 8).map(p => p.title.slice(0, 75)),
    };
  }

  const sorted = Object.entries(report).sort((a, b) => b[1].pct - a[1].pct);

  console.log("\n=== CATEGORY AUDIT REPORT ===\n");
  for (const [slug, r] of sorted) {
    if (r.suspicious === 0) continue;
    console.log(`${r.name} (${slug}) — ${r.suspicious}/${r.sampled} suspicious (${r.pct}%, total ${r.total})`);
    r.samples.forEach(t => console.log("  ⚠ " + t));
    console.log("");
  }

  console.log("\n=== CLEAN CATEGORIES ===");
  for (const [slug, r] of sorted) {
    if (r.suspicious === 0) console.log(`  ✓ ${r.name} (${slug}) — ${r.sampled}/${r.total} all match`);
  }
})();
