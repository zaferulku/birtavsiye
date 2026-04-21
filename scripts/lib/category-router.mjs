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

  // === 6. MODA — AYAKKABI (kıyafetten önce, "kadın sneaker" gibi ikili matchleri kaçırmayalım) ===
  { slug: "kadin-sneaker", patterns: [/\b(kadın\s*sneaker|bayan\s*sneaker|sneaker\s*kadın|sneaker\s*bayan)\b/i] },
  { slug: "erkek-sneaker", patterns: [/\b(erkek\s*sneaker|sneaker\s*erkek)\b/i] },
  { slug: "topuklu", patterns: [/\b(topuklu\s*ayakkab|stiletto|platform\s*topuk|dolgu\s*topuk|abiye\s*topuklu)\b/i] },
  { slug: "babet", patterns: [/\b(babet|espadrille)\b/i] },
  { slug: "kadin-bot", patterns: [/\b(kadın\s*bot|bayan\s*bot|çizme\s*kadın|kadın\s*çizme)\b/i] },
  { slug: "erkek-bot", patterns: [/\b(erkek\s*bot|timberland|chelsea\s*bot|bot\s*erkek)\b/i] },
  { slug: "kadin-sandalet", patterns: [/\b(kadın\s*sandalet|bayan\s*sandalet|topuklu\s*sandalet|düz\s*sandalet|parmak\s*arası|havuzbaşı\s*terlik)\b/i] },
  { slug: "klasik-ayakkabi", patterns: [/\b(oxford\s*ayakkab|derby\s*ayakkab|klasik\s*deri\s*ayakkab|mokasen|loafer)\b/i] },

  // === 7. MODA — GİYİM (kadın/erkek) ===
  { slug: "elbise", patterns: [/\b(elbise|abiye|mini\s*elbise|midi\s*elbise|maxi\s*elbise|tül\s*elbise|gece\s*elbise|kokteyl\s*elbise)\b/i] },
  { slug: "etek", patterns: [/\b(mini\s*etek|midi\s*etek|maxi\s*etek|pileli\s*etek|deri\s*etek|kalem\s*etek|günlük\s*etek)\b/i] },
  { slug: "kadin-pantolon", patterns: [/\b(kadın\s*(pantolon|jean)|bayan\s*(pantolon|jean)|skinny\s*jean|mom\s*jean|wide\s*leg|kumaş\s*pantolon|tayt)\b/i] },
  { slug: "erkek-pantolon", patterns: [/\b(erkek\s*(pantolon|jean)|slim\s*fit\s*jean|regular\s*jean|cargo\s*pantolon|chino|spor\s*şort|bermuda)\b/i] },
  { slug: "kadin-tisort-bluz", patterns: [/\b(kadın\s*(tişört|bluz|gömlek)|bayan\s*(bluz|tişört)|crop\s*top|büyük\s*beden\s*(bluz|tişört))\b/i] },
  { slug: "erkek-tisort", patterns: [/\b(erkek\s*tişört|polo\s*yaka|basic\s*tişört|oversize\s*tişört|v\s*yaka\s*tişört)\b/i] },
  { slug: "erkek-gomlek", patterns: [/\b(erkek\s*gömlek|slim\s*fit\s*gömlek|oxford\s*gömlek|keten\s*gömlek|flannel)\b/i] },
  { slug: "kadin-ceket-mont", patterns: [/\b(kadın\s*(ceket|mont|kaban)|bayan\s*(ceket|mont)|trençkot|puffer\s*mont\s*kad|blazer\s*kad)\b/i] },
  { slug: "erkek-ceket-mont", patterns: [/\b(erkek\s*(ceket|mont|kaban)|blazer|deri\s*ceket\s*erk|puffer\s*erk|parka|denim\s*ceket)\b/i] },
  { slug: "kadin-kazak", patterns: [/\b(kadın\s*(kazak|hırka)|oversize\s*kazak|crop\s*kazak|örgü\s*kazak)\b/i] },
  { slug: "takim-elbise", patterns: [/\b(takım\s*elbise|2\s*parça\s*takım|3\s*parça\s*takım|düğün\s*takım|smokin)\b/i] },
  { slug: "esofman", patterns: [/\b(eşofman|sweatshirt|kapüşonlu|polar\s*üst|hoodie)\b/i] },

  // === 8. MODA — AKSESUAR ===
  { slug: "canta-cuzdan", patterns: [/\b(kadın\s*(çanta|cüzdan)|omuz\s*çantas|el\s*çantas|sırt\s*çantas\s*kadın|kemer\s*erkek|kadın\s*cüzdan|erkek\s*cüzdan|kartlık)\b/i] },
  { slug: "gozluk", patterns: [/\b(güneş\s*gözlüğ|optik\s*gözlük|gözlük\s*çerçeve|ray[- ]?ban|oakley)\b/i] },
  { slug: "saat-taki", patterns: [/\b(kol\s*saati\s*kadın|kol\s*saati\s*erkek|bileklik|altın\s*kolye|gümüş\s*kolye|yüzük\s*altın|inci\s*kolye|pırlanta|tektaş)\b/i] },

  // === 9. EV & YAŞAM ===
  { slug: "aydinlatma", patterns: [/\b(avize|aplik|abajur|sarkıt|spot\s*ampul|led\s*ampul|masa\s*lambas|gece\s*lambas|avize\s*modern)\b/i] },
  { slug: "banyo", patterns: [/\b(duş\s*başlığ|duş\s*teknes|klozet|lavabo\s*bataryas|banyo\s*bataryas|havlupan|banyo\s*rafı|banyo\s*aynas)\b/i] },
  { slug: "camasir-makinesi", patterns: [/\b(çamaşır\s*makines)\b/i] },
  { slug: "bulasik-makinesi", patterns: [/\b(bulaşık\s*makines)\b/i] },
  { slug: "buzdolabi", patterns: [/\b(buzdolab|no\s*frost|french\s*door|side\s*by\s*side|dondurucu\s*buzdolab)\b/i] },
  { slug: "firin-ocak", patterns: [/\b(ankastre\s*(fırın|ocak)|bağımsız\s*(fırın|ocak)|davlumbaz|aspiratör|set\s*üstü\s*ocak)\b/i] },
  { slug: "kurutma-makinesi", patterns: [/\b(kurutma\s*makinesi|ısı\s*pompalı\s*kurutma|yoğuşmalı\s*kurutma)\b/i] },
  { slug: "klima", patterns: [/\b(inverter\s*klima|split\s*klima|taşınabilir\s*klima|fanlı\s*ısıtıc|kombi|termosifon)\b/i] },
  { slug: "supurge", patterns: [/\b(robot\s*süpürge|dikey\s*süpürge|elektrik\s*süpürge|toz\s*torbas|dyson\s*v\d|roomba)\b/i] },
  { slug: "kahve-cay-makinesi", patterns: [/\b(espresso\s*makinesi|kahve\s*makinesi|nespresso|türk\s*kahve\s*mak|çay\s*makinesi|filtre\s*kahve)\b/i] },
  { slug: "mutfak-aleti", patterns: [/\b(blender|mutfak\s*robotu|air\s*fryer|fritöz|tost\s*makinesi|waffle|mikser|rondo|doğrayıc|kettle|su\s*ısıt)\b/i] },
  { slug: "utu", patterns: [/\b(buharlı\s*ütü|buharlı\s*dikey|ütü\s*makinesi|kuru\s*ütü|ütü\s*masas)\b/i] },
  { slug: "mobilya-dekorasyon", patterns: [/\b(koltuk\s*takım|kanepe\s*takım|yemek\s*masas|tv\s*ünites|komodin|gardırop|halı|perde|yatak\s*baza|şifonyer|döşemeli\s*koltuk)\b/i] },
  { slug: "ev-tekstili", patterns: [/\b(nevresim\s*takım|yatak\s*örtü|çarşaf|pike|battaniye|yorgan|yastık\s*iç|lazy\s*bag|havlu\s*set)\b/i] },
  { slug: "mutfak-sofra", patterns: [/\b(tencere\s*set|tava\s*set|çatal\s*bıçak|yemek\s*tabağ|kase\s*set|fincan\s*takım|bardak\s*set|çaydanlık)\b/i] },
  { slug: "temizlik", patterns: [/\b(deterjan|çamaşır\s*suyu|yüzey\s*temizleyic|cam\s*silici|sprey\s*temizley|sabun\s*kalıp|ıslak\s*zemin|tuvalet\s*kağıd|süngeri\s*temizlik)\b/i] },
  { slug: "ofis-mobilyasi", patterns: [/\b(çalışma\s*masas|ofis\s*koltuğ|oyuncu\s*koltuğ|bilgisayar\s*masas|dosya\s*dolab|sandalye\s*ofis)\b/i] },
  { slug: "bahce-balkon", patterns: [/\b(bahçe\s*mobilyas|balkon\s*masas|bahçe\s*hortumu|çim\s*biçme|sulama\s*setı|çiçek\s*saksı|mangal\s*bahçe)\b/i] },

  // === 10. OTOMOTİV ===
  { slug: "navigasyon", patterns: [/\b(navigasyon|gps\s*(cihaz|navigasyon)|garmin\s*(nuvi|drive)|tomtom|dash\s*gps)\b/i] },
  { slug: "oto-teyp", patterns: [/\b(oto\s*teyp|oto\s*multimedya|2\s*din|android\s*auto|apple\s*carplay|oto\s*stereo)\b/i] },
  { slug: "arac-aksesuar", patterns: [/\b(oto\s*paspas|araç\s*parfüm|koltuk\s*kılıf\s*araç|vantuz\s*tutucu|direksiyon\s*kılıf|motor\s*yağ|antifriz|araç\s*cilas|akü\s*\d+|motor\s*yağı)\b/i] },
  { slug: "motor-scooter", patterns: [/\b(motosiklet|scooter\s*elektrik|segway|yamaha\s*\d+cc|honda\s*cbr|bmw\s*motor)\b/i] },
  { slug: "lastik-jant", patterns: [/\b(yaz\s*lastik|kış\s*lastik|4\s*mevsim\s*lastik|michelin|pirelli|bridgestone|goodyear|\d+\s*inç\s*jant)\b/i] },

  // === 11. ANNE & BEBEK ===
  { slug: "bebek-bezi", patterns: [/\b(bebek\s*bezi|ıslak\s*mendil|pampers|huggies|prima|molfix|sleepy)\b/i] },
  { slug: "biberon", patterns: [/\b(biberon|emzik|göğüs\s*pompas|bebek\s*sterilizat|biberon\s*ısıtıc|bebek\s*uyuyucu)\b/i] },
  { slug: "mama", patterns: [/\b(devam\s*mama|bebek\s*mama|kavanoz\s*mama|formüla\s*mama|bebek\s*biskü|sürülebilir\s*mama)\b/i] },
  { slug: "bebek-kozmetik", patterns: [/\b(bebek\s*şampuan|bebek\s*kremi|bebek\s*yağı|bebek\s*sabun|johnson'?s|sebamed)\b/i] },
  { slug: "oto-koltugu", patterns: [/\b(oto\s*koltu|car\s*seat|isofix|maxi[- ]?cosi|besafe|cybex\s*(sirona|solution))/i] },
  { slug: "puset-araba", patterns: [/\b(puset|bebek\s*arabas|3'ü\s*1\s*arada|çift\s*bebek\s*araba|stokke|bugaboo|chicco\s*araba)/i] },
  { slug: "besik", patterns: [/\b(beşik|karyola\s*bebek|bebek\s*yatağ|park\s*yatak|co[- ]?sleeper)\b/i] },
  { slug: "lego", patterns: [/\bLEGO\b/i] },
  { slug: "figur-oyuncak", patterns: [/\b(barbie|hot\s*wheels|marvel\s*figür|dc\s*figür|funko\s*pop|playmobil|anime\s*figür|action\s*figür)\b/i] },
  { slug: "egitici-oyuncak", patterns: [/\b(montessori|eğitici\s*oyuncak|puzzle\s*oyun|aktivite\s*tahtas|fisher[- ]?price|vtech\s*oyuncak)\b/i] },
  { slug: "rc-robot", patterns: [/\b(kumandalı\s*araba|rc\s*(heli|drone|araba)|robot\s*oyuncak|yarış\s*pisti\s*oyuncak)\b/i] },
  { slug: "oyuncak", patterns: [/\b(oyuncak|peluş\s*oyuncak|bebek\s*oyuncak|yapım\s*seti|play[- ]?doh|slime)\b/i] },

  // === 12. SPOR & OUTDOOR ===
  { slug: "outdoor-kamp", patterns: [/\b(kamp\s*çadır|çadır\s*kişilik|uyku\s*tulum|kamp\s*mat|kamp\s*ocağ|kamp\s*lambas|kamp\s*sandal|kamp\s*çakı|termos|outdoor\s*(çadır|uyku)|sırt\s*çantas\s*outdoor|matara|piknik\s*seti)\b/i] },
  { slug: "su-sporlari", patterns: [/\b(dalış\s*seti|şnorkel|palet\s*yüzme|sualtı\s*kamera|yüzme\s*gözlü|neopren|wetsuit|dalış\s*ekipman)\b/i] },
  { slug: "fitness", patterns: [/\b(koşu\s*band|treadmill|eliptik\s*bisiklet|kondisyon\s*bisiklet|dumbbell|\bdambıl\b|kettlebell|\bhalter\b|yoga\s*mat|pilates\s*mat|foam\s*roller|\btrx\b|\bfitness\b|resistance\s*band|direnç\s*(band|lastik)|whey\s*protein|bcaa)\b/i] },
  { slug: "bisiklet", patterns: [/\b(dağ\s*bisiklet|yol\s*bisiklet|şehir\s*bisiklet|katlanır\s*bisiklet|bisiklet\s*\d{2}\s*jant|trek\s*bisiklet|giant\s*bisiklet)\b/i] },
  { slug: "yoga", patterns: [/\b(yoga\s*mat|yoga\s*blok|pilates\s*topu|stretching|yoga\s*çantas|meditasyon\s*min)\b/i] },
  { slug: "takim-sporlari", patterns: [/\b(futbol\s*topu|basketbol\s*topu|voleybol\s*topu|fileli\s*top|futbol\s*forma|dribbler|halı\s*saha)\b/i] },

  // === 13. KOZMETİK & KİŞİSEL BAKIM ===
  { slug: "dudak-makyaji", patterns: [/\b(\bruj\b|lipstick|lip\s*gloss|dudak\s*kalem|lip\s*liner|dudak\s*parlatıc|lip\s*balm|lip\s*scrub)\b/i] },
  { slug: "goz-makyaji", patterns: [/\b(maskara|eyeliner|far\s*palet|göz\s*far|eyeshadow|kaş\s*kalem|kaş\s*jel|göz\s*kalem|kirpik\s*ser)\b/i] },
  { slug: "yuz-makyaji", patterns: [/\b(fondöten|foundation|kapatıc|concealer|allık|blush|highlighter|aydınlatıc|kontür|bb\s*krem|cc\s*krem|primer|setting\s*spray|pudra|bronzer)\b/i] },
  { slug: "yuz-maskesi", patterns: [/\b(kil\s*maskes|sheet\s*mask|kağıt\s*mask|soyulabilir\s*mask|hidrojel\s*mask|yüz\s*maskes|led\s*mask)\b/i] },
  { slug: "gunes-koruyucu", patterns: [/\b(güneş\s*kremi|spf\s*\d+|bronzlaştırıc|sunscreen|after\s*sun)\b/i] },
  { slug: "serum", patterns: [/\b(vitamin\s*c\s*serum|c\s*vitamini\s*serum|niacinamide|retinol\s*serum|hyaluronik|yüz\s*serum|anti[- ]?aging\s*serum|the\s*ordinary|peptit\s*serum)\b/i] },
  { slug: "yuz-temizleme", patterns: [/\b(yüz\s*köpüğ|yüz\s*jel|misel\s*su|tonik|yüz\s*temizley|yüz\s*sabun|peeling|temizleme\s*jel)\b/i] },
  { slug: "yuz-nemlendirici", patterns: [/\b(yüz\s*kremi|nemlendirici\s*krem|moisturizer|gündüz\s*krem|gece\s*krem|yüz\s*nemlend|göz\s*kremi|göz\s*çevresi)\b/i] },
  { slug: "sac-stilizasyon", patterns: [/\b(saç\s*kurutma\s*mak|saç\s*kurutucu|fön\s*mak|saç\s*düzleştir|saç\s*maşa|airwrap|dyson\s*supersonic|bigudi|saç\s*kesme\s*mak)\b/i] },
  { slug: "sac-boyasi", patterns: [/\bsaç\s*boyas/i] },
  { slug: "sampuan", patterns: [/\b(şampuan|shampoo|saç\s*kremi|conditioner|kepek\s*önley|saç\s*serum|keratin\s*bakım|argan\s*yağ\s*saç)\b/i] },
  { slug: "parfum", patterns: [/\b(parfüm|parfum|edp|edt|eau\s*de\s*(parfum|toilette)|fragrance|kolonya|cologne|deodorant|antiperspirant)\b/i] },
  { slug: "agiz-dis", patterns: [/\b(diş\s*fırça|diş\s*macun|gargara|diş\s*beyazlat|dil\s*temizley|diş\s*ipi|oral[- ]?b)\b/i] },
  { slug: "kisisel-hijyen", patterns: [/\b(hijyenik\s*ped|regl\s*ped|tampon|dolce\s*vita|jilet|tıraş\s*(makin|jilet|bıçağ|kremi)|vücut\s*losyon|el\s*kremi)\b/i] },

  // === 14. KİTAP & HOBİ ===
  { slug: "resim-cizim", patterns: [/\b(yağlı\s*boya|suluboya|akrilik\s*boya|pastel\s*boya|renk\s*kalem\s*set|çizim\s*seti|faber[- ]?castell|arteza|resim\s*tuval)\b/i] },
  { slug: "el-sanatlari", patterns: [/\b(örgü\s*ipliğ|amigurumi|dikiş\s*seti|scrapbooking|boncuk\s*seti|takı\s*yapım|reçine\s*sanat)\b/i] },
  { slug: "kitap", patterns: [/\bkitap(?!\s*(tutucu|okuma\s*lambas))|\broman\b|\bbiyografi\b|\bşiir\s*kitab|\bders\s*kitab/i] },
  { slug: "muzik-aleti", patterns: [/\b(akustik\s*gitar|elektro\s*gitar|klasik\s*gitar|piano|keyboard|dijital\s*piyano|bateri|bağlama|ney|saksofon)\b/i] },
  { slug: "kirtasiye", patterns: [/\b(defter|dosya|klasör|tükenmez\s*kalem|kurşun\s*kalem|silgi|kalemtraş|zımba|delgeç|post[- ]?it|stabilo)\b/i] },
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
