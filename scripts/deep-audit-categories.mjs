// STRICT inclusion audit: her kategoride ürünler pozitif pattern'e uymalı.
// Uymayanlar best-match kategoriye taşınır, hiçbirine uymazsa parent'a düşer.
// node --env-file=.env.local scripts/deep-audit-categories.mjs [--dry-run] [--category=<slug>]

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY = process.argv.includes("--dry-run");
const ONLY = (process.argv.find(a => a.startsWith("--category=")) || "").split("=")[1] || null;
const SAMPLE = (process.argv.find(a => a.startsWith("--sample=")) || "").split("=")[1] || null;

function tlower(s) {
  return (s || "").replace(/İ/g, "i").replace(/I/g, "ı").replace(/Ş/g, "ş").replace(/Ç/g, "ç").replace(/Ğ/g, "ğ").replace(/Ü/g, "ü").replace(/Ö/g, "ö").toLowerCase();
}

const STRICT_INCLUDE = {
  "akilli-telefon": [
    /\b(iphone|galaxy\s*(s|note|a|z|m|fold|flip)\s*\d+|redmi\s*(note|k)?\s*\d+|xiaomi\s*\d+|poco\s*[xfm]?\s*\d+|huawei\s*(p|mate|nova|y|pura)\s*\d+|honor\s*(magic|x|\d+)|oppo\s*(reno|find|a)\s*\d+|vivo\s*(y|x|v)\s*\d+|realme\s*(gt|c|\d+)|oneplus\s*\d+|tecno\s*(camon|spark|pova)|infinix\s*(hot|note|zero)|nokia\s*\d+|reeder\s*[pms]\d+|hiking\s*a\d+|blackview|general\s*mobile|itel\s*\w+|tcl\s*\d+|wiko|vestel\s*venü|doogee|ulefone|samsung\s*a\d+|samsung\s*s\d+)\b/i,
    /\bakıllı\s*telefon\b/i,
    /\bcep\s*telefon/i,
  ],
  "telefon-kilifi": [/\b(telefon\s*kılıf|iphone\s*kılıf|samsung\s*kılıf|huawei\s*kılıf|xiaomi\s*kılıf|kılıf|case|cover|flip\s*cover|deri\s*kılıf|silikon\s*kılıf|cüzdanlı\s*kılıf|şeffaf\s*kılıf)\b/i],
  "ekran-koruyucu": [/\b(ekran\s*koruyucu|cam\s*koruyucu|nano\s*koruyucu|hidrojel\s*koruyucu|temperli\s*cam|tempered\s*glass|screen\s*protector)\b/i],
  "powerbank": [/\b(powerbank|power\s*bank|powercore|magsafe\s*powerbank|taşınabilir\s*şarj\s*cihaz|harici\s*pil)\b/i],
  "sarj-kablo": [/\b(şarj\s*(kablosu|cihazı|adaptör|istasyon|standı|pedi|alıcı|modül|dock|portu)|kablosuz\s*şarj|usb[- ]?c\s*(kablo|şarj)|lightning\s*(kablo|şarj)|hızlı\s*şarj|type[- ]?c\s*(kablo|şarj|adapt)|duvar\s*(şarj|adaptör)|araç\s*şarj|gan\s*şarj|magsafe\s*şarj|qi\s*(şarj|wpc)|anker\s*şarj)\b/i],

  "bilgisayar-laptop": [/\b(laptop|notebook|macbook\s*(air|pro)|dizüstü\s*bilgisayar|(asus|lenovo|hp|dell|acer|msi|monster|casper|huawei|razer)\s*(vivobook|zenbook|thinkpad|ideapad|pavilion|omen|inspiron|alienware|legion|aspire|predator|gram|magicbook|nitro|victus))/i],
  "masaustu-bilgisayar": [/\b(masaüstü\s*bilgisayar|desktop\s*pc|all[- ]?in[- ]?one|mini\s*pc|tower\s*pc|gaming\s*pc|imac|mac\s*mini|mac\s*studio|iş\s*istasyonu)\b/i],
  "monitor": [/\b(monitör|gaming\s*monit|ultrawide|curve[ds]?\s*monit|\d{2}\s*inç\s*monit|27'?\s*monit|32'?\s*monit|4k\s*monit|qhd\s*monit|1440p\s*monit|144hz\s*monit|165hz\s*monit|240hz\s*monit)\b/i],
  "bilgisayar-bilesenleri": [/\b(anakart|ekran\s*kart|\bram\b|\bbellek\b|sodimm|dimm|ddr[345]|\bssd\b|m\.?2\s*ssd|nvme|\bhdd\b|işlemci|\bcpu\b|\bgpu\b|soğutucu\s*fan|power\s*supply|\bpsu\b|klavye|\bmouse\b|webcam|notebook\s*(batarya|pil|adaptör|power|kablo)|laptop\s*(batarya|pil|adaptör)|dell\s*pili|dell\s*batarya|asus\s*(batarya|pil)|lenovo\s*(batarya|pil)|hp\s*(batarya|pil|adaptör)|batarya\s*pili|kingston|corsair|g\.skill|crucial)/i],
  "tablet": [/\b(ipad\s*(pro|air|mini)?|galaxy\s*tab|android\s*tablet|matepad|honor\s*pad|redmi\s*pad|lenovo\s*(tab|idea\s*tab|yoga\s*tab)|idea\s*tab|yoga\s*tab|samsung\s*tab|xiaomi\s*pad|tablet\s*(\d|bilgisayar|pc)|\d{1,2}\s*(inç|inch|")\s*tablet|wifi\s*tablet)/i],

  "tv": [/\b(\d{2}\s*(inç|inch|"|')\s*(smart\s*)?(tv|televizyon|oled|qled|lcd|led|nanocell|mini\s*led)|\boled\b|\bqled\b|nanocell|neo\s*qled|smart\s*(tv|led)|led\s*tv|lcd\s*led\s*tv|android\s*(led|tv)|televizyon|4k\s*(smart|uhd)|8k\s*(tv|smart)|uhd\s*(tv|smart|google)|hd\s*ready|google\s*tv|qe\d+q\w*|ue\d+|a\d{2}\s*e\s*\d{3})\b/i],
  "projeksiyon": [/\b(projeksiyon|projector|short\s*throw|mini\s*led\s*projekt)\b/i],
  "ses-kulaklik": [/\b(airpods|kulak\s*içi|kulak\s*üstü|wh-|wf-|galaxy\s*buds|bluetooth\s*kulaklık|kulaklık|true\s*wireless|\btws\b|over[- ]?ear|in[- ]?ear|oyuncu\s*kulaklık|gaming\s*headset|anc\s*kulaklık|earbud|kemik\s*iletim|bluetooth.*(kulak|tws)|pedi\s*süngeri)/i],
  "soundbar": [/\b(soundbar|sound\s*bar|ev\s*sinema|home\s*theater|dolby\s*atmos\s*(sound|bar)|\d\.\d\s*ses\s*sistem)\b/i],
  "bluetooth-hoparlor": [/\b(bluetooth\s*hopar|taşınabilir\s*hopar|wireless\s*speaker|(jbl|bose|marshall)\s*(go|flip|clip|charge|xtreme|pulse|emberton|acton|stanmore))/i],
  "networking": [/\b(router|modem|wi[- ]?fi\s*(\d|mesh|extender|repeater|ap|adaptör|anten|kablo|sistem)|mesh\s*(wi[- ]?fi|sistem)|access\s*point|repeater|menzil\s*geniş|akıllı\s*(priz|ampul|güvenlik|sensör)|switch\s*(hub|ağ)|\bswitch\b\s*\d+\s*port|ağ\s*(anahtar|switch|kablo\s*test)|powerline|deco\s*x|tenda\s*nova|poe\s*(switch|enjektör))/i],
  "guvenlik-kamerasi": [/\b(güvenlik\s*kamera|ip\s*kamera|cctv|dome\s*kamera|nvr|dvr|gece\s*görüş\s*kamera)\b/i],

  "fotograf-kamera": [/\b(aynasız\s*fotoğraf|mirrorless|dslr|reflex|kompakt\s*kamera|analog\s*kamera|film\s*kamera|şipşak\s*kamera|medium\s*format|rangefinder|fotoğraf\s*makines|video\s*kamera|kamera\s*batarya|kamera\s*şarj|objektif|lens\s*(set|canon|nikon|sony)|parasoley|instax|gimbal|sony\s*a\d+|canon\s*(eos|r\d+)|nikon\s*(z\d+|d\d+|1v)|fujifilm\s*(x|instax)|leica\s*m|panasonic\s*hc)/i],
  "drone": [/\b(drone|drön|dji\s*(mini|air|mavic|inspire|avata|fpv|neo)|fpv\s*drone|yarış\s*drone)\b/i],
  "aksiyon-kamera": [/\b(aksiyon\s*kamera|action\s*cam|gopro|osmo\s*action|insta360|360[°o]\s*kamera)\b/i],

  "camasir-makinesi": [/\bçamaşır\s*makinesi\b/i],
  "bulasik-makinesi": [/\bbulaşık\s*makinesi\b/i],
  "buzdolabi": [/\b(buzdolab|no\s*frost|french\s*door|side\s*by\s*side\s*buzdolab)\b/i],
  "firin-ocak": [/\b(ankastre\s*(fırın|ocak)|bağımsız\s*(fırın|ocak)|davlumbaz|aspiratör)\b/i],
  "kurutma-makinesi": [/\bkurutma\s*makinesi\b|\b(ısı\s*pompalı|yoğuşmalı)\s*kurutma/i],
  "klima": [/\b(inverter\s*klima|split\s*klima|taşınabilir\s*klima|fanlı\s*ısıtıc|kombi|termosifon)\b/i],

  "supurge": [/\b(robot\s*süpürge|dikey\s*süpürge|elektrik\s*süpürge|dyson\s*v\d|roomba)\b/i],
  "kahve-cay-makinesi": [/\b(espresso\s*makinesi|kahve\s*makinesi|nespresso|çay\s*makinesi)\b/i],
  "mutfak-aleti": [/\b(blender|mutfak\s*robotu|air\s*fryer|fritöz|tost\s*makinesi|waffle|mikser|rondo|doğrayıc)\b/i],
  "utu": [/\b(buharlı\s*ütü|buharlı\s*dikey|ütü\s*makinesi|kuru\s*ütü)\b/i],

  "sac-stilizasyon": [/\b(saç\s*kurutma\s*mak|saç\s*kurutucu|saç\s*düzleştir|saç\s*maşa|airwrap|dyson\s*supersonic|bigudi|saç\s*kesme\s*mak|saç\s*şekillendir)\b/i],
  "sampuan": [/\b(şampuan|shampoo|saç\s*kremi|conditioner|kepek\s*önleyici)\b/i],
  "sac-boyasi": [/\bsaç\s*boyas/i],
  "yuz-nemlendirici": [/\b(yüz\s*kremi|nemlendirici\s*krem|moisturizer|gündüz\s*krem|gece\s*krem|yüz\s*nemlend)\b/i],
  "yuz-temizleme": [/\b(yüz\s*köpüğ|yüz\s*jel|misel\s*su|tonik|yüz\s*temizley|yüz\s*sabun|peeling)\b/i],
  "gunes-koruyucu": [/\b(güneş\s*kremi|spf\s*\d+|bronzlaştırıc|sunscreen)\b/i],
  "serum": [/\b(c\s*vitamini\s*serum|niacinamide|retinol\s*serum|hyaluronik\s*asit|yüz\s*serumu|the\s*ordinary)\b/i],
  "yuz-maskesi": [/\b(kil\s*maskesi|sheet\s*mask|kağıt\s*mask|soyulabilir\s*maske|hidrojel\s*mask|yüz\s*maskesi)\b/i],
  "yuz-makyaji": [/\b(fondöten|foundation|kapatıc|concealer|allık|blush|highlighter|kontür|bb\s*krem|cc\s*krem|primer|setting\s*spray|pudra|bronz)\b/i],
  "goz-makyaji": [/\b(maskara|eyeliner|far\s*palet|göz\s*far|eyeshadow|kaş\s*kalem|kaş\s*jel|göz\s*kalem)\b/i],
  "dudak-makyaji": [/\b(\bruj\b|lipstick|lip\s*gloss|dudak\s*kalem|lip\s*liner|dudak\s*parlatıc|lip\s*balm|lip\s*scrub)\b/i],
  "parfum": [/\b(parfüm|parfum|edp|edt|eau\s*de\s*(parfum|toilette)|kolonya|cologne|deodorant|antiperspirant)\b/i],

  "bebek-bezi": [/\b(bebek\s*bezi|ıslak\s*mendil|pampers|huggies|prima|molfix|sleepy)\b/i],
  "biberon": [/\b(biberon|emzik|göğüs\s*pompas|bebek\s*sterilizat|biberon\s*ısıtıc)\b/i],
  "mama": [/\b(devam\s*mama|bebek\s*mama|kavanoz\s*mama|formüla\s*mama|bebek\s*biskü|sürülebilir\s*mama)\b/i],
  "bebek-kozmetik": [/\b(bebek\s*şampuan|bebek\s*kremi|bebek\s*yağı|bebek\s*sabun|johnson'?s|sebamed)\b/i],
  "oto-koltugu": [/\b(oto\s*koltu|car\s*seat|isofix|maxi[- ]?cosi|besafe|cybex\s*(sirona|solution))/i],
  "puset-araba": [/\b(puset|bebek\s*arabas|3'ü\s*1\s*arada|çift\s*bebek\s*araba|stokke|bugaboo|chicco\s*araba)/i],
  "besik": [/\b(beşik|karyola|bebek\s*yatağ|park\s*yatak|co[- ]?sleeper)\b/i],

  "lego": [/\bLEGO\b/i],
  "figur-oyuncak": [/\b(barbie|hot\s*wheels|marvel\s*figür|dc\s*figür|funko\s*pop|playmobil|anime\s*figür|action\s*figür)\b/i],
  "egitici-oyuncak": [/\b(montessori|eğitici\s*oyuncak|puzzle\s*oyun|aktivite\s*tahtas|fisher[- ]?price|vtech\s*oyuncak)\b/i],
  "rc-robot": [/\b(kumandalı\s*araba|rc\s*(heli|drone|araba)|robot\s*oyuncak|yarış\s*pisti\s*oyuncak)\b/i],
  "oyuncak": [/\b(oyuncak|puzzle|yapım\s*seti|peluş\s*oyuncak|bebek\s*oyuncak)\b/i],

  "elbise": [/\b(elbise|abiye|mini\s*elbise|midi\s*elbise|maxi\s*elbise|tül\s*elbise|gece\s*elbise)\b/i],
  "etek": [/\b(mini\s*etek|midi\s*etek|maxi\s*etek|pileli\s*etek|deri\s*etek|tül\s*etek|günlük\s*etek|büyük\s*beden\s*etek)\b/i],
  "kadin-pantolon": [/\b(kadın\s*(pantolon|jean)|bayan\s*(pantolon|jean)|skinny\s*jean|mom\s*jean|wide\s*leg|kumaş\s*pantolon|tayt)\b/i],
  "erkek-pantolon": [/\b(erkek\s*(pantolon|jean)|slim\s*fit\s*jean|regular\s*jean|cargo\s*pantolon|chino|spor\s*şort|bermuda)\b/i],
  "erkek-tisort": [/\b(erkek\s*tişört|polo\s*yaka|basic\s*tişört|oversize\s*tişört|v\s*yaka\s*tişört)\b/i],
  "erkek-gomlek": [/\b(gömlek|slim\s*fit\s*gömlek|oxford\s*gömlek|keten\s*gömlek|flannel)\b/i],
  "takim-elbise": [/\b(takım\s*elbise|2\s*parça\s*takım|3\s*parça\s*takım|düğün\s*takım)\b/i],
  "esofman": [/\b(eşofman|sweatshirt|kapüşonlu|polar\s*üst|hoodie)\b/i],
  "kadin-tisort-bluz": [/\b(kadın\s*(tişört|bluz)|bayan\s*bluz|crop\s*top|büyük\s*beden\s*bluz)\b/i],
  "kadin-ceket-mont": [/\b(kadın\s*(ceket|mont|kaban)|bayan\s*(ceket|mont)|trençkot|puffer\s*mont\s*kad|blazer\s*kad)\b/i],
  "erkek-ceket-mont": [/\b(erkek\s*(ceket|mont|kaban)|blazer|deri\s*ceket|puffer|parka|denim\s*ceket)\b/i],
  "kadin-kazak": [/\b(kadın\s*(kazak|hırka)|oversize\s*kazak|crop\s*kazak|örgü\s*kazak)\b/i],

  "topuklu": [/\b(topuklu\s*ayakkab|stiletto|platform\s*topuk|dolgu\s*topuk|abiye\s*topuklu)\b/i],
  "kadin-sneaker": [/\b(kadın\s*sneaker|bayan\s*sneaker)\b/i],
  "erkek-sneaker": [/\b(erkek\s*sneaker|sneaker\s*erkek)\b/i],
  "kadin-sandalet": [/\b(kadın\s*sandalet|bayan\s*sandalet|topuklu\s*sandalet|düz\s*sandalet|parmak\s*arası|havuzbaşı\s*terlik)\b/i],
  "kadin-bot": [/\b(kadın\s*bot|bayan\s*bot|diz\s*altı\s*bot|diz\s*üstü\s*çizme)\b/i],
  "erkek-bot": [/\b(erkek\s*bot|timberland|kar\s*botu|chelsea\s*bot\s*erk|deri\s*bot\s*erk)\b/i],
  "klasik-ayakkabi": [/\b(oxford\s*ayakkab|derby\s*ayakkab|klasik\s*deri\s*ayakkab|mokasen|loafer)\b/i],
  "babet": [/\b(babet|espadrille|deri\s*babet|tokalı\s*babet)\b/i],

  "navigasyon": [/\b(navigasyon|gps\s*(cihaz|navigasyon)|garmin\s*(nuvi|drive)|tomtom|dash\s*gps)\b/i],
  "oto-teyp": [/\b(oto\s*teyp|oto\s*multimedya|2\s*din|android\s*auto|apple\s*carplay|oto\s*stereo)\b/i],
  "arac-aksesuar": [/\b(oto\s*paspas|araç\s*parfüm|koltuk\s*kılıf|vantuz\s*tutucu|direksiyon\s*kılıf|motor\s*yağ|antifriz|araç\s*cilası)\b/i],

  "outdoor-kamp": [/\b(kamp\s*çadır|çadır|uyku\s*tulum|kamp\s*mat|kamp\s*ocağ|kamp\s*lambas|kamp\s*sandal|kamp\s*çakı|kamp\s*masa|termos|\boutdoor\b|sırt\s*çantas|balıkçı|trekking|doğa\s*yürüyüş|plaj\s*şemsiye|kamp\s*sandalye|kamp\s*mut|matara|mangal|piknik)/i],
  "su-sporlari": [/\b(dalış|şnorkel|palet|sualtı|yüzme\s*gözlü|neopren|wetsuit|dalış\s*ekipman)\b/i],
  "fitness": [/\b(koşu\s*band|treadmill|eliptik\s*bisiklet|kondisyon\s*bisiklet|dumbbell|\bdambıl\b|kettlebell|\bhalter\b|ağırlık\s*set|yoga\s*mat|pilates|foam\s*roller|\btrx\b|\bfitness\b|resistance\s*band|direnç\s*(band|lastik|ip)|whey\s*protein|bcaa|spor\s*aleti|egzersiz\s*aleti|\bbisiklet\b|barfiks|mekik\s*çekme|şınav|kas\s*(geliştir|güçlen)|\bems\b\s*spor|titreşimli\s*(egzersiz|spor)|plastik\s*dambıl|pvc\s*dambıl|kaucuk\s*dambıl|pazı\s*güçlen)\b/i],

  "resim-cizim": [/\b(yağlı\s*boya|suluboya|akrilik\s*boya|pastel\s*boya|renk\s*kalem\s*set|çizim\s*seti|faber[- ]?castell|arteza)\b/i],
  "el-sanatlari": [/\b(örgü\s*ipliği|amigurumi|dikiş\s*seti|scrapbooking|boncuk\s*seti|takı\s*yapım|reçine\s*sanat)\b/i],
};

(async () => {
  const { data: cats } = await sb.from("categories").select("id, slug, parent_id, name");
  const catBySlug = new Map(cats.map(c => [c.slug, c]));
  const catById = new Map(cats.map(c => [c.id, c]));

  const slugs = ONLY ? [ONLY] : Object.keys(STRICT_INCLUDE);

  let totalKept = 0, totalMoved = 0, totalStuck = 0;
  const byDest = {};

  for (const slug of slugs) {
    const cat = catBySlug.get(slug);
    if (!cat) continue;
    const patterns = STRICT_INCLUDE[slug];
    if (!patterns) continue;

    const parent = cat.parent_id ? catById.get(cat.parent_id) : null;

    let audited = 0, kept = 0, moved = 0, toParent = 0, stuck = 0;

    for (let page = 0; page < 20; page++) {
      const { data } = await sb.from("products")
        .select("id, title, category_id")
        .eq("category_id", cat.id)
        .range(page * 1000, page * 1000 + 999);
      if (!data || data.length === 0) break;

      for (const p of data) {
        audited++;
        const title = tlower(p.title);
        const matches = patterns.some(re => re.test(title));
        if (matches) { kept++; continue; }
        if (SAMPLE === slug && moved < 25) console.log(`  MISS: ${p.title}`);

        let target = null;
        for (const [otherSlug, otherPatterns] of Object.entries(STRICT_INCLUDE)) {
          if (otherSlug === slug) continue;
          if (otherPatterns.some(re => re.test(title))) {
            target = catBySlug.get(otherSlug);
            if (target) break;
          }
        }
        if (!target && parent) { target = parent; toParent++; }

        if (target && target.id !== cat.id) {
          if (!DRY) await sb.from("products").update({ category_id: target.id }).eq("id", p.id);
          moved++;
          byDest[target.slug] = (byDest[target.slug] || 0) + 1;
        } else {
          stuck++;
        }
      }
      if (data.length < 1000) break;
    }

    totalKept += kept;
    totalMoved += moved;
    totalStuck += stuck;
    console.log(`${slug.padEnd(22)} total=${audited} kept=${kept} moved=${moved} (→parent=${toParent}) stuck=${stuck}`);
  }

  console.log(`\n=== ${DRY ? "DRY RUN" : "APPLIED"} ===`);
  console.log(`Kept:   ${totalKept}`);
  console.log(`Moved:  ${totalMoved}`);
  console.log(`Stuck:  ${totalStuck}`);

  console.log(`\nTop destinations:`);
  Object.entries(byDest).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([s, c]) => {
    console.log(`  ${String(c).padStart(5)}  ${s}`);
  });
})();
