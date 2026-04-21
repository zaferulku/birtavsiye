// Ürün başlığından doğru kategori ID'sini routluyan paylaşılan kütüphane.
// Öncelik sırası (üstten alta, ilk eşleşme kazanır):
//   1. Yedek parça (uyumlu, servis, şarj soket, sim bordu, lens cam, pil batarya...)
//   2. Telefon aksesuarı (kılıf, ekran koruyucu, powerbank, şarj-kablo)
//   3. Kategori-spesifik aksesuarlar (tv kumanda, laptop batarya)
//   4. Ana kategori (STRICT leaf patterns — iPhone/Galaxy vs.)
//   5. Fallback: verilen default
//
// Kullanım:
//   import { buildRouter } from './lib/category-router.mjs';
//   const router = await buildRouter(sb);
//   const { categoryId, reason, changed } = router.route(title, brand, currentCategoryId);

function tlower(s) {
  return (s || "")
    .replace(/İ/g, "i").replace(/I/g, "ı")
    .replace(/Ş/g, "ş").replace(/Ç/g, "ç").replace(/Ğ/g, "ğ")
    .replace(/Ü/g, "ü").replace(/Ö/g, "ö")
    .toLowerCase();
}

// Priority-ordered rule list. İlk match kazanır.
const RULES = [
  // === 1. YEDEK PARÇA (en spesifik) ===
  { slug: "telefon-yedek-parca", patterns: [
    /\b(şarj\s*soket|charging\s*port|sim\s*bordu|mikrofon\s*(bordu|soket)|hoparlör\s*bordu|kamera\s*flexi|lcd\s*ekran\s*değişim|on[- ]off\s*tuş|power\s*tuşu|güç\s*tuşu|ses\s*tuşu|home\s*tuşu|parmak\s*izi\s*sensör|titreşim\s*motoru|arka\s*kapak|orta\s*kasa|menteşe|yedek\s*parça|yedek\s*pil|yedek\s*batarya|orjinal\s*batarya|apple\s*batarya\s*pili|dell\s*pili|lenovo\s*pili|hp\s*pili|asus\s*pili|samsung\s*pili|retro\s+\w+\s*pil|retro\s+\w+\s*batarya|sanger\s*(pil|batarya|şarj))\b/i,
    /\buyumlu\s*(pil|batarya|lcd|ekran|kamera|mikrofon|hoparlör|anten|şarj\s*soket)/i,
    /\bservis\s*(parça|pack|kit)?\b/i,
  ] },

  // === 2. TELEFON AKSESUAR ===
  { slug: "telefon-kilifi", patterns: [
    /\b(telefon\s*kılıf|iphone\s*kılıf|samsung\s*kılıf|huawei\s*kılıf|xiaomi\s*kılıf|realme\s*kılıf|oppo\s*kılıf|honor\s*kılıf|redmi\s*kılıf|\bkılıf\b|silikon\s*kılıf|deri\s*kılıf|magsafe\s*kılıf|cüzdan\s*kılıf|flip\s*cover|kapaklı\s*kılıf|şeffaf\s*kılıf|case\s*(iphone|samsung|huawei))\b/i,
  ] },
  { slug: "ekran-koruyucu", patterns: [
    /\b(ekran\s*koruyucu|cam\s*koruyucu|nano\s*koruyucu|hidrojel\s*koruyucu|temperli\s*cam|tempered\s*glass|screen\s*protector|cam\s*jelatin|nano\s*jelatin)\b/i,
  ] },
  { slug: "powerbank", patterns: [
    /\b(powerbank|power\s*bank|powercore|magsafe\s*powerbank|taşınabilir\s*şarj|harici\s*pil|taşınabilir\s*pil)\b/i,
  ] },
  { slug: "sarj-kablo", patterns: [
    /\b(şarj\s*(kablosu|cihazı|adaptör|istasyon|standı|pedi|dock)|kablosuz\s*şarj|usb[- ]?c\s*(kablo|şarj)|lightning\s*(kablo|şarj)|hızlı\s*şarj|type[- ]?c\s*kablo|duvar\s*(şarj|adaptör)|araç\s*şarj|gan\s*şarj|magsafe\s*şarj|anker\s*şarj)\b/i,
  ] },
  { slug: "telefon-aksesuar", patterns: [
    /\b(selfie\s*çubuğ|araç\s*tutucu|pop\s*socket|parmak\s*tutucu|tripod\s*telefon|stereo\s*tak\s*çalıştır|uyumlu.*adaptör|uyumlu.*şarj|uyumlu\s*stereo|uyumlu\s*adapter|uyumlu.*kablo|otg\s*kablo|flash\s*bellek|otg\s*kablosu|dokunmatik\s*kalem|stylus\s*pen)\b/i,
  ] },

  // === 3. TV AKSESUAR ===
  { slug: "tv-aksesuar", patterns: [
    /\b(tv\s*kumanda|televizyon\s*kumanda|lcd\s*kumanda|led\s*kumanda|smart\s*kumanda|vesa|duvar\s*askı\s*aparat|tv\s*sehpa|tv\s*askı|hdmi\s*kablo|tv\s*adaptör)\b/i,
  ] },

  // === 4. BİLGİSAYAR BİLEŞEN/AKSESUAR ===
  { slug: "bilgisayar-bilesenleri", patterns: [
    /\b(laptop\s*(batarya|pil|adaptör)|notebook\s*(batarya|pil|adaptör|power|kablo|soğutucu)|ram\s*\d+\s*gb|\bssd\b|m\.?2\s*ssd|nvme|anakart|ekran\s*kart|ddr[345]\s*ram|sodimm|dimm|kingston|corsair|g\.skill|crucial|klavye\s*(mekanik|gaming)|mouse\s*(gaming|kablosuz)|mouse\s*pad|webcam)\b/i,
  ] },

  // === 5. ANA KATEGORİLER ===
  { slug: "akilli-telefon", patterns: [
    /\b(iphone\s*\d+|galaxy\s*(s|note|a|z|m|fold|flip)\s*\d+|redmi\s*(note|k)?\s*\d+|xiaomi\s*\d+|poco\s*[xfm]?\s*\d+|huawei\s*(p|mate|nova|pura)\s*\d+|honor\s*(magic|x|\d+)|oppo\s*(reno|find|a)\s*\d+|vivo\s*(y|x|v)\s*\d+|realme\s*(gt|c|\d+)|oneplus\s*\d+|tecno\s*(camon|spark|pova)|infinix\s*(hot|note|zero)|reeder\s*[pms]\d+|hiking\s*a\d+|blackview|general\s*mobile|akıllı\s*telefon|cep\s*telefon)\b/i,
  ] },
  { slug: "akilli-saat", patterns: [
    /\b(apple\s*watch|galaxy\s*watch|mi\s*band|amazfit|huawei\s*(watch|band)|xiaomi\s*watch|akıllı\s*saat|smart\s*watch|fitness\s*tracker)\b/i,
  ] },
  { slug: "tablet", patterns: [
    /\b(ipad\s*(pro|air|mini)?|galaxy\s*tab|android\s*tablet|matepad|honor\s*pad|redmi\s*pad|lenovo\s*(tab|idea\s*tab|yoga\s*tab)|samsung\s*tab|xiaomi\s*pad|tablet\s*pc)\b/i,
  ] },
  { slug: "bilgisayar-laptop", patterns: [
    /\b(laptop|notebook|macbook\s*(air|pro)|dizüstü\s*bilgisayar|(asus|lenovo|hp|dell|acer|msi|monster|casper|huawei|razer)\s*(vivobook|zenbook|thinkpad|ideapad|pavilion|omen|inspiron|alienware|legion|aspire|predator|gram|magicbook|nitro|victus|tuf))/i,
  ] },
  { slug: "ses-kulaklik", patterns: [
    /\b(airpods|kulak\s*içi|kulak\s*üstü|wh-|wf-|galaxy\s*buds|bluetooth\s*kulaklık|kulaklık|true\s*wireless|\btws\b|gaming\s*headset|anc\s*kulaklık|earbud|kemik\s*iletim)/i,
  ] },
  { slug: "tv", patterns: [
    /\b(\d{2}\s*(inç|inch|"|')\s*(smart\s*)?(tv|televizyon|oled|qled|lcd|led)|\boled\b|\bqled\b|smart\s*(tv|led)|led\s*tv|android\s*tv|4k\s*(smart|uhd)\s*(tv|led)?|televizyon\s+\w)\b/i,
  ] },
  { slug: "fotograf-kamera", patterns: [
    /\b(aynasız\s*fotoğraf|mirrorless|dslr|fotoğraf\s*makines|video\s*kamera|instax|sony\s*a\d+|canon\s*(eos|r\d+)|nikon\s*(z\d+|d\d+)|fujifilm\s*x)\b/i,
  ] },
  { slug: "aksiyon-kamera", patterns: [
    /\b(gopro|osmo\s*action|insta360|aksiyon\s*kamera|action\s*cam)\b/i,
  ] },
  { slug: "drone", patterns: [
    /\b(drone|drön|dji\s*(mini|air|mavic|inspire|avata|fpv|neo))\b/i,
  ] },
];

export async function buildRouter(sb) {
  const { data: cats } = await sb.from("categories").select("id, slug, parent_id, name");
  const bySlug = new Map((cats ?? []).map(c => [c.slug, c]));

  const resolved = [];
  for (const rule of RULES) {
    const cat = bySlug.get(rule.slug);
    if (!cat) {
      console.warn(`[router] category not found for rule: ${rule.slug}`);
      continue;
    }
    resolved.push({ ...rule, id: cat.id });
  }

  return {
    route(title, brand, currentCategoryId) {
      if (!title) return null;
      const t = tlower(title);
      for (const rule of resolved) {
        for (const pat of rule.patterns) {
          if (pat.test(t)) {
            return {
              categoryId: rule.id,
              reason: `${rule.slug}`,
              changed: rule.id !== currentCategoryId,
            };
          }
        }
      }
      return null;
    },
    categoryBySlug: bySlug,
    rules: resolved,
  };
}
