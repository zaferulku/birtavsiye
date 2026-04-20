// Çok-sinyalli kategori sınıflandırıcı — brand/title-context/source-cat/specs birleştirir
// Usage:
//   node --env-file=.env.local scripts/classify-products-smart.mjs --dry-run
//   node --env-file=.env.local scripts/classify-products-smart.mjs --apply
//   node --env-file=.env.local scripts/classify-products-smart.mjs --apply --category=cilt-bakimi

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes("--dry-run") || !process.argv.includes("--apply");
const ONLY_CAT = (process.argv.find(a => a.startsWith("--category=")) || "").split("=")[1] || null;
const APPLY_THRESHOLD = 70;
const REVIEW_THRESHOLD = 50;

// 1) BRAND → CATEGORY (exclusive brands)
const BRAND_EXCLUSIVE = [
  { pattern: /^(Cressi|Mares|Scubapro|Aqua\s*Lung|Apeks|Salvimar|Beuchat|Apnea|Busso|Bestway|Dunny|Intex|Sea\s*Doo|Subea|Tusa|Speedo)$/i, cats: ["su-sporlari"], score: 100 },
  { pattern: /^(Bianchi|Trek|Giant|Cube|Specialized|Merida|Kron|Salcano|Bisan)$/i, cats: ["bisiklet"], score: 100 },
  { pattern: /^(Apple|iPhone)$/i, cats: ["akilli-telefon", "bilgisayar-laptop", "tablet", "akilli-saat", "ses-kulaklik", "telefon-aksesuar"], score: 60 },
  { pattern: /^(Samsung|Xiaomi|Huawei|Honor|Oppo|Vivo|Realme|OnePlus|Reeder|Casper|General\s*Mobile|Infinix|Tecno|Nokia|TCL)$/i, cats: ["akilli-telefon", "tablet", "telefon-aksesuar", "akilli-saat"], score: 70 },
  { pattern: /^(Dijitsu|Profilo|Altus|Vestel|Arçelik|Beko|Axen|Sunny|Awox|Finlux|Grundig|Regal|Telefunken)$/i, cats: ["tv", "beyaz-esya", "kucuk-ev-aletleri"], score: 70 },
  { pattern: /^(Bosch|Siemens|Miele|Electrolux|Whirlpool|Candy|Hotpoint|Ariston|Hoover|Indesit)$/i, cats: ["beyaz-esya", "kucuk-ev-aletleri"], score: 80 },
  { pattern: /^(Tefal|Arzum|Fakir|Karaca|Braun|Moulinex|Kenwood|Delonghi|Rowenta|Korkmaz|Sinbo|Russell\s*Hobbs)$/i, cats: ["kucuk-ev-aletleri"], score: 90 },
  { pattern: /^(MacBook|HP|Dell|Lenovo|Acer|MSI|Monster|Razer|Gigabyte|Fujitsu)$/i, cats: ["bilgisayar-laptop", "bilgisayar-bilesenleri"], score: 80 },
  { pattern: /^ASUS$/i, cats: ["bilgisayar-laptop", "bilgisayar-bilesenleri", "tv"], score: 60 },
  { pattern: /^(CeraVe|La\s*Roche[- ]?Posay|Vichy|Bioderma|Eucerin|Cetaphil|Neutrogena|Olay|Nivea|Avene|Garnier)$/i, cats: ["cilt-bakimi"], score: 95 },
  { pattern: /^(Maybelline|L'Oreal|Loreal|NYX|MAC|Nars|Urban\s*Decay|Revlon|Essence|Catrice|Flormar|Gabrini|Golden\s*Rose|Avon|Farmasi|Oriflame)$/i, cats: ["makyaj", "cilt-bakimi"], score: 80 },
  { pattern: /^(Schwarzkopf|Wella|Pantene|Head\s*&\s*Shoulders|Elseve|Elvive|TRESemmé|Palmolive|Kerastase|Kérastase)$/i, cats: ["sac-bakimi"], score: 100 },
  { pattern: /^(Hiking)$/i, cats: ["akilli-telefon"], score: 95 },
  { pattern: /^(Anker|Soundcore|Baseus|Ugreen|Spigen)$/i, cats: ["telefon-aksesuar"], score: 70 },
  { pattern: /^(JBL|Bose|Beats|Sennheiser|AKG|Marshall|Harman\s*Kardon|Boltune|Edifier|Soundcore|Anker|Creative|Yamaha|Nothing|HyperX|SteelSeries)$/i, cats: ["ses-kulaklik"], score: 90 },
  { pattern: /^(Nike|Adidas|Puma|Reebok|Asics|New\s*Balance|Converse|Vans|Skechers|Timberland|Under\s*Armour|Fila|Kappa|Superga|Geox)$/i, cats: ["erkek-ayakkabi", "kadin-ayakkabi", "spor-giyim", "erkek-giyim", "kadin-giyim"], score: 50 },
  { pattern: /^(Sony|Microsoft|Nintendo)$/i, cats: ["oyun-konsol", "tv", "ses-kulaklik", "fotograf-kamera"], score: 40 },
  { pattern: /^(Canon|Nikon|Fujifilm|Olympus|GoPro|DJI|Insta360|Leica)$/i, cats: ["fotograf-kamera"], score: 95 },
];

// 2) TITLE + CONTEXT RULES (multi-word)
const TITLE_RULES = [
  // === YENİ ALT KATEGORILER (hiyerarşik) ===
  // Telefon Aksesuar alt tipleri
  { cat: "telefon-kilifi", score: 98, pattern: /\b(telefon\s*k[ıi]l[ıi]f|iphone\s*k[ıi]l[ıi]f|samsung\s*k[ıi]l[ıi]f|kapak\s*k[ıi]l[ıi]f|flip\s*cover|silikon\s*k[ıi]l[ıi]f|cüzdan\s*k[ıi]l[ıi]f|deri\s*k[ıi]l[ıi]f)\b/i },
  { cat: "ekran-koruyucu", score: 98, pattern: /\b(ekran\s*koruyucu|cam\s*koruyucu|nano\s*koruyucu|hidrojel\s*koruyucu|temperli\s*cam)\b/i },
  { cat: "powerbank", score: 98, pattern: /\b(powerbank|power\s*bank|ta[sş][ıi]nab[ıi]l[ıi]r\s*[sş]arj\s*cihaz|magsafe\s*powerbank|powercore)\b/i },
  { cat: "sarj-kablo", score: 95, pattern: /\b(şarj\s*kablosu|usb[- ]?c\s*kablo|lightning\s*kablo|h[ıi]zl[ıi]\s*[sş]arj|ara[cç]\s*[sş]arj|sarj\s*adapt[oö]r|duvar\s*şarj)\b/i },

  // Bilgisayar alt tipleri
  { cat: "masaustu-bilgisayar", score: 95, pattern: /\b(masa[uü]st[uü]\s*bilgisayar|desktop\s*pc|all[- ]?in[- ]?one|mini\s*pc|i[sş]\s*istasyon|tower\s*pc|gaming\s*pc)\b/i },
  { cat: "monitor", score: 95, pattern: /\b(monit[oö]r|gaming\s*monit[oö]r|27\s*in[çc]\s*monit[oö]r|32\s*in[çc]\s*monit[oö]r|ultrawide)\b/i },

  // Ses
  { cat: "soundbar", score: 95, pattern: /\b(soundbar|sound\s*bar|ev\s*sinema\s*sistem|home\s*theater|dolby\s*atmos)\b/i },
  { cat: "bluetooth-hoparlor", score: 95, pattern: /\b(bluetooth\s*hopar|ta[sş][ıi]nab[ıi]l[ıi]r\s*hopar|wireless\s*speaker|JBL\s*(go|flip|clip|charge|xtreme)|Bose\s*speaker)/i },

  // TV
  { cat: "projeksiyon", score: 95, pattern: /\b(projeksiyon|projector|short\s*throw|mini\s*led\s*projekt)\b/i },

  // Fotoğraf
  { cat: "drone", score: 98, pattern: /\b(drone|drön|dji\s*(mini|air|mavic|inspire|avata)|fpv\s*drone|yarı[sş]\s*drone)\b/i },
  { cat: "aksiyon-kamera", score: 98, pattern: /\b(aksiyon\s*kamera|action\s*cam|gopro|osmo\s*action|insta360|360[°o]\s*kamera)\b/i },
  { cat: "guvenlik-kamerasi", score: 98, pattern: /\b(g[uü]venlik\s*kamera|ip\s*kamera|ip\s*camera|cctv|dome\s*kamera|nvr|dvr)\b/i },

  // Anne-Bebek alt tipleri
  { cat: "bebek-bezi", score: 98, pattern: /\b(bebek\s*bezi|[ıi]slak\s*mendil|Pampers|Huggies|Prima|Molfix|Sleepy|bebek\s*bezi\s*kovas)\b/i },
  { cat: "biberon", score: 98, pattern: /\b(biberon|emzik|g[oö][gğ][uü]s\s*pompas|sterilizat[oö]r|biberon\s*[ıi]s[ıi]t[ıi]c)\b/i },
  { cat: "mama", score: 90, pattern: /\b(devam\s*mamas|bebek\s*mamas|kavanoz\s*mama|sürülebilir\s*mama|form[uü]la\s*mama|bebek\s*bisk[uü]vi)\b/i },
  { cat: "bebek-kozmetik", score: 90, pattern: /\b(bebek\s*[sş]ampuan|bebek\s*kremi|bebek\s*ya[gğ][ıi]|bebek\s*sabun|Johnson'?s|Sebamed)\b/i },
  { cat: "oto-koltugu", score: 98, pattern: /\b(oto\s*koltu[gğ][uü]|car\s*seat|bebek\s*oto\s*koltu[gğ]|maxi[- ]?cosi|besafe|cybex\s*(solution|sirona)|isofix)\b/i },
  { cat: "puset-araba", score: 95, pattern: /\b(puset|bebek\s*arabas|bebek\s*taşıma|tam\s*yatar\s*araba|3'?[uü]\s*1\s*arada|chicco\s*araba|bugaboo|stokke)\b/i },
  { cat: "besik", score: 95, pattern: /\b(be[sş]ik|karyola|bebek\s*yata[gğ]|park\s*yatak|ah[sş]ap\s*be[sş]ik|co[- ]?sleeper)\b/i },

  // Beyaz eşya alt tipleri (üst seviye rule'ları override eden daha spesifik)
  { cat: "camasir-makinesi", score: 98, pattern: /\b[çc]ama[sş][ıi]r\s*makinesi\b/i },
  { cat: "bulasik-makinesi", score: 98, pattern: /\bbula[sş][ıi]k\s*makinesi\b/i },
  { cat: "buzdolabi", score: 98, pattern: /\b(buzdolab|no\s*frost\s*buzdolab|french\s*door|side\s*by\s*side)\b/i },
  { cat: "firin-ocak", score: 98, pattern: /\b(ankastre\s*f[ıi]r[ıi]n|ankastre\s*ocak|ba[gğ][ıi]ms[ıi]z\s*f[ıi]r[ıi]n|ba[gğ][ıi]ms[ıi]z\s*ocak)\b/i },
  { cat: "kurutma-makinesi", score: 98, pattern: /\bkurutma\s*makinesi\b|\b(?:ısı\s*pompalı|yoğuşmalı)\s*kurutma\b/i },
  { cat: "klima", score: 98, pattern: /\b(inverter\s*klima|split\s*klima|ta[sş][ıi]nab[ıi]l[ıi]r\s*klima|fanl[ıi]\s*[ıi]s[ıi]t[ıi]c)\b/i },

  // Küçük ev aletleri alt tipleri
  { cat: "supurge", score: 95, pattern: /\b(robot\s*s[uü]p[uü]rge|dikey\s*s[uü]p[uü]rge|Dyson\s*V\d|Roomba|elektrik\s*s[uü]p)\b/i },
  { cat: "kahve-cay-makinesi", score: 95, pattern: /\b(espresso\s*makinesi|kahve\s*makinesi|nespresso|[çc]ay\s*makinesi|french\s*press\s*makinesi)\b/i },
  { cat: "utu", score: 95, pattern: /\b(buharl[ıi]\s*[uü]t[uü]|buharl[ıi]\s*dikey|[uü]t[uü]\s*makinesi)\b/i },
  { cat: "mutfak-aleti", score: 90, pattern: /\b(blender|mutfak\s*robotu|air\s*fryer|frit[oö]z|tost\s*makinesi|waffle\s*makinesi)\b/i },
  { cat: "sac-stilizasyon", score: 98, pattern: /\b(sa[çc]\s*kurutma\s*mak|sa[çc]\s*kurutucu|sa[çc]\s*d[uü]zle[sş]tir|sa[çc]\s*ma[sş]a|airwrap|dyson\s*supersonic|bigudi)\b/i },

  // Kozmetik alt tipleri
  { cat: "yuz-nemlendirici", score: 90, pattern: /\b(y[uü]z\s*kremi|nemlendirici\s*krem|moisturizer|g[uü]ndem\s*krem|gece\s*krem)\b/i },
  { cat: "yuz-temizleme", score: 90, pattern: /\b(y[uü]z\s*k[oö]p[uü][gğ]|y[uü]z\s*jel|misel\s*su|tonik|y[uü]z\s*temizleyici)\b/i },
  { cat: "gunes-koruyucu", score: 92, pattern: /\b(g[uü]ne[sş]\s*kremi|spf\s*\d+|bronzla[sş]t[ıi]r[ıi]c)\b/i },
  { cat: "serum", score: 90, pattern: /\b(c\s*vitamini\s*serumu|niacinamide|retinol\s*serum|hyaluronik\s*asit|y[uü]z\s*serumu)\b/i },
  { cat: "yuz-maskesi", score: 90, pattern: /\b(kil\s*maskesi|sheet\s*mask|ka[gğ][ıi]t\s*maske|soyulabilir\s*maske|y[uü]z\s*maskesi)\b/i },

  // Makyaj alt tipleri
  { cat: "yuz-makyaji", score: 90, pattern: /\b(fond[oö]ten|foundation|kapat[ıi]c|concealer|pudra|all[ıi]k|blush|highlighter|kont[uü]r|bb\s*krem|cc\s*krem)\b/i },
  { cat: "goz-makyaji", score: 92, pattern: /\b(maskara|eyeliner|far\s*palet|g[oö]z\s*far|eyeshadow|ka[sş]\s*kalem|ka[sş]\s*jel)\b/i },
  { cat: "dudak-makyaji", score: 92, pattern: /\b(\bruj\b|lipstick|lip\s*gloss|dudak\s*kalem|lip\s*liner|dudak\s*rujj)\b/i },

  // Saç bakım
  { cat: "sampuan", score: 92, pattern: /\b(şampuan|shampoo|sa[çc]\s*kremi|conditioner|sa[çc]\s*bak[ıi]m\s*kremi)\b/i },
  { cat: "sac-boyasi", score: 95, pattern: /\b(sa[çc]\s*boyas[ıi]|kal[ıi]c[ıi]\s*boya|yar[ıi]\s*kal[ıi]c[ıi]\s*boya|r[oö]fle|balyaj)\b/i },

  // Oyuncak
  { cat: "lego", score: 98, pattern: /\bLEGO\b/i },
  { cat: "figur-oyuncak", score: 92, pattern: /\b(Barbie|Hot\s*Wheels|Marvel\s*Fig[uü]r|DC\s*Fig[uü]r|Funko\s*Pop|Playmobil|anime\s*fig[uü]r)\b/i },
  { cat: "egitici-oyuncak", score: 90, pattern: /\b(Montessori|e[gğ]itici\s*oyuncak|puzzle\s*oyun|aktivite\s*tahtas|fisher[- ]?price)\b/i },
  { cat: "rc-robot", score: 92, pattern: /\b(kumandalı\s*araba|RC\s*(heli|drone|araba)|robot\s*oyuncak|yarış\s*pisti\s*oyuncak)\b/i },

  // Moda alt tipleri
  { cat: "elbise", score: 88, pattern: /\b(elbise|abiye|mini\s*elbise|midi\s*elbise|maxi\s*elbise|t[uü]l\s*elbise|gece\s*elbise|kokteyl\s*elbise)\b/i },
  { cat: "etek", score: 88, pattern: /\b(mini\s*etek|midi\s*etek|maxi\s*etek|pileli\s*etek|deri\s*etek|t[uü]l\s*etek|b[uü]y[uü]k\s*beden\s*etek)\b/i },
  { cat: "takim-elbise", score: 92, pattern: /\b(takım\s*elbise|2\s*par[çc]a\s*takım|3\s*par[çc]a\s*takım|düğ[uü]n\s*tak[ıi]m)\b/i },
  { cat: "esofman", score: 88, pattern: /\b(e[sş]ofman\s*tak[ıi]m|e[sş]ofman\s*alt|sweatshirt\s*tak[ıi]m|kap[uü][sş]onl[uü]\s*tak)\b/i },

  // Ayakkabı alt tipleri
  { cat: "topuklu", score: 92, pattern: /\b(topuklu\s*ayakkab|stiletto|platform\s*topuk|dolgu\s*topuk|k[ıi]sa\s*topuk|abiye\s*topuklu)\b/i },
  { cat: "klasik-ayakkabi", score: 88, pattern: /\b(oxford\s*ayakkab|derby|loafer\s*erkek|klasik\s*deri\s*ayakkab|mokasen)\b/i },
  { cat: "babet", score: 90, pattern: /\b(babet|espadrille|loafer\s*kad[ıi]n|deri\s*babet|toka\s*babet)\b/i },

  // Otomotiv
  { cat: "oto-teyp", score: 92, pattern: /\b(oto\s*teyp|2\s*DIN|Android\s*Auto|Apple\s*CarPlay|ara[cç]\s*multimedya)\b/i },

  // Hobi
  { cat: "resim-cizim", score: 88, pattern: /\b(ya[gğ]l[ıi]\s*boya|suluboya|akrilik\s*boya|pastel\s*boya|renk\s*kalem|[çc]izim\s*seti)\b/i },
  { cat: "el-sanatlari", score: 85, pattern: /\b([oö]rg[uü]\s*ipli[gğ]i|amigurumi|scrapbooking|boncuk\s*seti|takı\s*yap[ıi]m|reçine\s*sanat)\b/i },


  { cat: "su-sporlari", score: 95, pattern: /\bmaske\b.*\b(şnorkel|dal[ıi][sş]|palet|y[uü]zme|sualt[ıi])\b/i },
  { cat: "su-sporlari", score: 95, pattern: /\b(şnorkel|dal[ıi][sş]|palet|sualt[ıi])\b.*\bmaske\b/i },
  { cat: "cilt-bakimi", score: 90, pattern: /\b(y[uü]z|cilt|kil|sheet|kağı[dt]|hidrojel)\s*maskesi\b/i },
  { cat: "sac-bakimi", score: 95, pattern: /\bsa[çc]\s*maskesi\b/i },
  { cat: "kisisel-hijyen", score: 85, pattern: /\b(cerrahi|tıbbi|medikal|FFP2|FFP3|N95|KN95|meltblown|3\s*kat|nebülizat|nebulizat)\s*(maske)?/i },
  // Industrial masks (welding, respirator, half/full face)
  { cat: "yapi-market", score: 90, pattern: /\b(kaynak\s*maske|welding\s*mask|kömürlü\s*maske|filtreli\s*maske|yar[ıi]m\s*y[uü]z\s*maske|tam\s*y[uü]z\s*maske|anti[- ]?gaz|X[- ]?plore|gaz\s*maskes)/i },
  // Costume/party masks
  { cat: "oyuncak", score: 90, pattern: /\b(spiderman|batman|zorro|venom|hulk|thor|iron\s*man|superhero|s[uü]per\s*kahraman|cosplay|maskeli\s*balo|halloween|cad[ıi]lar|harley\s*quinn|scream|ghost\s*face|ninja|anonim|vendetta|animasyon|[cç]izgi\s*film|elektronik\s*maske|elektronic\s*mask|kost[uü]m)\b/i },
  // Hair care disguised as skincare (Loreal Pro hair, Olaplex, Garnier hair)
  { cat: "sac-bakimi", score: 95, pattern: /\b(Olaplex|Kerastase|Loreal\s*Professionnel|Serie\s*Expert|Vitamino|Metal\s*Detox|Wella\s*Professional|Schwarzkopf\s*Pro|Nem\s*Bombas[ıi]\s*Canland[ıi]r[ıi]c[ıi]\s*Ka[gğ][ıi]t|Hair\s*Resfyer|keratin\s*maske|sa[çc]\s*onarıc|sa[çc]\s*g[uü][çc]lendir|sa[çc]\s*nem)\b/i },
  // Foreo & light therapy cosmetic devices stay in cilt-bakimi
  { cat: "cilt-bakimi", score: 80, pattern: /\b(Foreo|UFO\s*Power\s*Maske|[ıi][sş][ıi]k\s*terapi|cilt\s*cihaz[ıi]|LED\s*maske)\b/i },
  { cat: "fotograf-kamera", score: 85, pattern: /\b(aynas[ıi]z|mirrorless|dslr|reflex|aksiyon\s*kamera|action\s*cam|gopro|full\s*frame)\b/i },
  { cat: "fotograf-kamera", score: 80, pattern: /\b(objektif|\blens\b|tripod|gimbal)\b/i },
  { cat: "networking", score: 80, pattern: /\b(g[uü]venlik\s*kamera|ip\s*camera|cctv|nvr|dvr)\b/i },
  { cat: "tv", score: 90, pattern: /\b(\d{2})\s*(inç|inch|ekran)\s*(smart\s*)?(tv|televizyon|oled|qled|lcd|led)\b/i },
  { cat: "mobilya-dekorasyon", score: 70, pattern: /\b(ask[ıi]\s*aparat|duvar\s*ask[ıi]|tav[aı]n\s*ask[ıi]|mount)\b/i },
  { cat: "akilli-telefon", score: 95, pattern: /\b(iphone|galaxy|redmi|xiaomi)\s+\d+\s*(pro|plus|ultra|max|mini|fe|lite|se)?\s*\d+\s*(gb|tb)\b/i },
  { cat: "telefon-aksesuar", score: 85, pattern: /\b(telefon\s*k[ıi]l[ıi]f|iphone\s*k[ıi]l[ıi]f|samsung\s*k[ıi]l[ıi]f|case|cover|ekran\s*koruyucu|cam\s*koruyucu)\b/i },
  { cat: "bilgisayar-laptop", score: 90, pattern: /\b(macbook|laptop|notebook|diz[uü]st[uü]\s*bilgisayar)\s+(pro|air|gaming|\d+|i\d|ryzen)/i },
  { cat: "bilgisayar-bilesenleri", score: 80, pattern: /\b(anakart|ekran\s*kart[ıi]|ram\s*bellek|\bssd\b|\bhdd\b|i[sş]lemci|\bcpu\b|\bgpu\b|soket)\b/i },
  { cat: "beyaz-esya", score: 90, pattern: /\b([çc]ama[sş][ıi]r|bula[sş][ıi]k)\s*(makinesi|kurutucusu)\b|\b[çc]ama[sş][ıi]r\s*kurutma\s*mak|\bbuzdolab\b|\bderin\s*dondurucu\b|\bankastre\s*(f[ıi]r[ıi]n|ocak|bula[sş][ıi]k)\b/i },
  // Hair care — explicit override so "saç kurutma makinesi" stays in sac-bakimi
  { cat: "sac-bakimi", score: 95, pattern: /\b(sa[çc]\s*kurutma\s*mak|sa[çc]\s*kurutucu|sa[çc]\s*d[uü]zle[sş]tirici|sa[çc]\s*ma[sş]a|sa[çc]\s*kesme\s*mak|[sş]ampuan|sa[çc]\s*kremi|sa[çc]\s*serum|sa[çc]\s*boyas[ıi]|sa[çc]\s*bak[ıi]m)\b/i },
  { cat: "kucuk-ev-aletleri", score: 85, pattern: /\b(s[uü]p[uü]rge|elektrik\s*s[uü]p|blender|rondo|air\s*fryer|frit[oö]z|tost\s*mak|kahve\s*mak|espresso|kettle|su\s*[ıi]s[ıi]t|[uü]t[uü]\s*mak)\b/i },
  { cat: "su-sporlari", score: 85, pattern: /\b(dal[ıi][sş]\s*ekipman|sualt[ıi]|y[uü]zme\s*g[oö]zl[uü][gğ][uü]|palet|[sş]nor|neopren|wetsuit)\b/i },
  { cat: "fitness", score: 80, pattern: /\b(yoga\s*mat|dambıl|kettlebell|k[oö]t[uü]ren|pilates|direnç\s*band|kondisyon)\b/i },
  { cat: "outdoor-kamp", score: 85, pattern: /\b([çc]ad[ıi]r|uyku\s*tulum|kamp\s*mutfa|kamp\s*masa|termos|kamp\s*sandalyesi)\b/i },
  { cat: "makyaj", score: 90, pattern: /\b(ruj|lipstick|fond[oö]ten|foundation|maskara|eyeliner|kapat[ıi]c|concealer|all[ıi]k|blush|g[oö]z\s*far|eyeshadow|oje\b|aydınlatıcı|highlighter)\b/i },
  { cat: "parfum", score: 90, pattern: /\b(parf[uü]m|\bedp\b|\bedt\b|eau\s*de|kolonya|cologne|deodorant|antiperspirant)\b/i },
  { cat: "cilt-bakimi", score: 85, pattern: /\b(nemlendirici|retinol|vitamin\s*c\s*serum|g[uü]ne[sş]\s*kremi|spf\s*\d+|ceramide|hyaluronic|peeling|tonik|temizleme\s*jel|y[uü]z\s*kremi)\b/i },
  { cat: "sac-bakimi", score: 90, pattern: /\b(şampuan|saç\s*kremi|saç\s*serumu|saç\s*boyası|saç\s*kurutma|sa[çc]\s*d[uü]zle[sş]tirici|sa[çc]\s*ma[sş]a)\b/i },
  { cat: "telefon-aksesuar", score: 95, pattern: /\b(powerbank|power\s*bank|powercore|maggo|magsafe|ta[sş][ıi]nab[ıi]l[ıi]r\s*[sş]arj|h[ıi]zl[ıi]\s*[sş]arj\s*(cihaz)?)\b/i },
  // Phone-specific accessory (iPhone 15 Pro Kılıf Flip Cover — stronger than akilli-telefon)
  { cat: "telefon-aksesuar", score: 95, pattern: /\b(iphone|galaxy|redmi|xiaomi|huawei|samsung|honor|oppo)\s*([a-z]+\s*)?(\d+\s*)?(pro|plus|ultra|max|mini|fe|se)?\s*(k[ıi]l[ıi]f|case|cover|silikon|kapak|flip|kamera\s*lens|cam\s*koruyucu|ekran\s*koruyucu|raze|harvel|bilvis|optimum)\b/i },
  // Saç kurutma makinesi (yüksek skor — kucuk-ev-aletleri'ni override eder)
  { cat: "sac-bakimi", score: 98, pattern: /\b(sa[çc]\s*kurutma\s*mak|sa[çc]\s*kurutucu|sa[çc]\s*d[uü]zle[sş]tir|sa[çc]\s*ma[sş]a|sa[çc]\s*[sş]ekillen|bigudi)\b/i },
  // Gaming mouse / oyuncu donanım
  { cat: "bilgisayar-bilesenleri", score: 90, pattern: /\b(oyuncu\s*mouse|gaming\s*mouse|pulsefire|deathadder|mx\s*master|g502|viper|basilisk|logitech\s*g|razer\s*(mouse|klavye|keyboard)|mekanik\s*klavye|oyuncu\s*klavye)\b/i },
  // VGA/HDMI/AV/DisplayPort kablo → bilgisayar-bilesenleri (bilgisayar aksesuarı)
  { cat: "bilgisayar-bilesenleri", score: 85, pattern: /\b(vga\s*kablo|hdmi\s*kablo|display\s*port|dp\s*kablo|av\s*kablo|d[- ]?sub\s*kablo|bilgisayar.*kablo|monit[oö]r\s*kablo)\b/i },
  // Laptop adaptörü / bataryası → bilgisayar-laptop (bileşen değil aksesuar ama laptop'a ait)
  { cat: "bilgisayar-laptop", score: 80, pattern: /\b(laptop\s*adapt[oö]r|notebook\s*adapt[oö]r|laptop\s*batarya|notebook\s*batarya|dell\s*laptop\s*pil|asus\s*laptop\s*pil|hp\s*laptop\s*pil|notebook\s*klavye)\b/i },
  { cat: "akilli-saat", score: 90, pattern: /\b(apple\s*watch|galaxy\s*watch|mi\s*band|amazfit|huawei\s*watch|akıllı\s*saat|smart\s*watch|fitness\s*tracker)\b/i },
  { cat: "oyun-konsol", score: 90, pattern: /\b(playstation|ps[45]|xbox\s*series|nintendo\s*switch|dualsense|dualshock|gamepad|oyun\s*kol)\b/i },
  { cat: "tablet", score: 90, pattern: /\b(ipad\s*(pro|air|mini)?|galaxy\s*tab|huawei\s*matepad|android\s*tablet|tablet\s*bilgisayar)\b/i },
  { cat: "kitap", score: 85, pattern: /\b(roman|kitap|edebiyat|ciltli\s*(kitap|baskı)|yay[ıi]nlar[ıi])\b/i },
  { cat: "oyuncak", score: 85, pattern: /\b(oyuncak|lego|puzzle\s*oyun|bebek\s*oyuncak|maket)\b/i },
];

// 3) SOURCE CATEGORY → OUR CATEGORY
// Based on PttAVM and MediaMarkt category captures (scripts/audit PttAVM categories)
// Aligned with docs/CATEGORIZATION_STANDARDS.md
const SOURCE_CAT_MAP = {
  // === PHONE & ACCESSORIES ===
  "iPhone iOS Telefonlar": "akilli-telefon",
  "Android Telefonlar": "akilli-telefon",
  "Cep Telefonları": "akilli-telefon",
  "İthalatçı Garantili Telefonlar": "akilli-telefon",
  "Cep Telefonu Aksesuarları": "telefon-aksesuar",
  "Ekran Koruyucular": "telefon-aksesuar",
  "TV Ekran Koruyucular": "tv",
  "Kılıflar": "telefon-aksesuar",
  "Kılıf ve Kapaklar": "telefon-aksesuar",
  "Kılıflar ve Çantalar": "telefon-aksesuar",
  "Selfie Çubukları": "telefon-aksesuar",
  "Araç İçi Tutucular": "telefon-aksesuar",
  "Stand ve Tutucular": "telefon-aksesuar",
  "Şarj Kabloları": "telefon-aksesuar",
  "Araç Şarj Cihazları": "telefon-aksesuar",
  "iPhone Kabloları (iOS)": "telefon-aksesuar",
  "Adaptör ve Çeviriciler": "telefon-aksesuar",
  "Powerbank": "telefon-aksesuar",
  "Taşınabilir Şarj Cihazları": "telefon-aksesuar",

  // === TABLET ===
  "Tabletler": "tablet",
  "Samsung Tablet": "tablet",
  "Android Tabletler": "tablet",
  "Tablet Kılıfları": "telefon-aksesuar",

  // === WATCH ===
  "Akıllı Saatler": "akilli-saat",
  "Apple Watch Series 11": "akilli-saat",
  "Huawei Akıllı Saatler": "akilli-saat",

  // === LAPTOP & COMPONENTS ===
  "Dizüstü Bilgisayarlar": "bilgisayar-laptop",
  "Asus Laptop": "bilgisayar-laptop",
  "Lenovo Laptop Modelleri": "bilgisayar-laptop",
  "Laptop": "bilgisayar-laptop",
  "Notebook Bataryaları": "bilgisayar-laptop",
  "Notebook Adaptörleri": "bilgisayar-laptop",
  "Notebook Soğutucuları": "bilgisayar-laptop",
  "Notebook Standları": "bilgisayar-laptop",
  "Çalışma Masası": "mobilya-dekorasyon",
  "Ekran Kartları (GPU)": "bilgisayar-bilesenleri",
  "Ekran Kartı": "bilgisayar-bilesenleri",
  "Bellek (RAM)": "bilgisayar-bilesenleri",
  "Ram": "bilgisayar-bilesenleri",
  "İşlemciler (CPU)": "bilgisayar-bilesenleri",
  "Solid State Disk Drive (SSD)": "bilgisayar-bilesenleri",
  "Taşınabilir Disk Aksesuarları": "bilgisayar-bilesenleri",
  "Bilgisayar Kasaları": "bilgisayar-bilesenleri",
  "Kasa": "bilgisayar-bilesenleri",
  "Bilgisayar Bileşenleri": "bilgisayar-bilesenleri",
  "Bilgisayar Aksesuarları": "bilgisayar-bilesenleri",
  "Soğutucu ve Fan": "bilgisayar-bilesenleri",
  "Klavye": "bilgisayar-bilesenleri",
  "Mouse": "bilgisayar-bilesenleri",
  "Bilgisayar Hoparlörleri": "ses-kulaklik",
  "Güç Kabloları": "bilgisayar-bilesenleri",
  "Kablolar": "bilgisayar-bilesenleri",
  "Patch Kablolar": "networking",

  // === TV & AUDIO ===
  "Televizyon": "tv",
  "Televizyonlar": "tv",
  "QLED TV": "tv",
  "OLED TV": "tv",
  "TV Box ve Medya Oynatıcı": "tv",
  "Televizyon Aksesuarları": "tv",
  "Uzaktan Kumandalar": "tv",
  "TV Kabloları": "bilgisayar-bilesenleri",
  "Askı Aparatları": "mobilya-dekorasyon",
  "Tv Sehpası": "mobilya-dekorasyon",
  "Tv Ünitesi Ve Sehpaları": "mobilya-dekorasyon",
  "Bluetooth Kulaklıklar": "ses-kulaklik",
  "Kulak İçi Kulaklıklar": "ses-kulaklik",
  "Kulak içi Kulaklıklar": "ses-kulaklik",
  "Oyuncu Kulaklıkları": "ses-kulaklik",
  "Bluetooth Hoparlörler": "ses-kulaklik",

  // === CAMERA ===
  "Aynasız Fotoğraf Makineleri": "fotograf-kamera",
  "Şipşak Fotoğraf Makineleri": "fotograf-kamera",
  "Analog Fotoğraf Makineleri": "fotograf-kamera",
  "Aksiyon Kameralar": "fotograf-kamera",
  "Aksiyon Kamerası": "fotograf-kamera",
  "Kamera Aksesuarları": "fotograf-kamera",
  "Fotoğraf & Kamera Aksesuarları": "fotograf-kamera",
  "Tripod": "fotograf-kamera",
  "Stand ve Tripodlar": "fotograf-kamera",
  "Güvenlik Kamerası": "networking",
  "Akıllı Güvenlik Sistemleri": "networking",

  // === NETWORKING / SMART HOME ===
  "Router": "networking",
  "Wi-Fi Mesh Sistemi": "networking",
  "Access Point": "networking",
  "Menzil Genişletici": "networking",
  "Antenler": "networking",
  "Antenler ve Kablolar": "networking",
  "Akıllı Ampuller": "networking",
  "Akıllı Ev Sistemleri": "networking",

  // === PRINTER ===
  "Yazıcı & Tarayıcı": "yazici-tarayici",

  // === CONSOLE ===
  "Oyun Konsolları": "oyun-konsol",
  "Oyun Konsolları & Aksesuarlar": "oyun-konsol",
  "Oyuncu Ekipmanları": "oyun-konsol",

  // === WHITE GOODS ===
  "Çamaşır Makineleri": "beyaz-esya",
  "Buzdolapları": "beyaz-esya",
  "Fırınlar": "beyaz-esya",
  "Bulaşık Makineleri": "beyaz-esya",
  "Klimalar": "beyaz-esya",
  "Kombiler": "beyaz-esya",
  "Fanlı Isıtıcılar": "beyaz-esya",
  "Oto Buzdolabı": "beyaz-esya",
  "Endüstriyel Beyaz Eşyalar": "beyaz-esya",
  "Beyaz Eşya": "beyaz-esya",
  "Beyaz Eşya Yedek Parça": "beyaz-esya",
  "Aksesuar ve Yedek Parçalar": "beyaz-esya",
  "Bulaşık Makinası Ek Ürünleri": "beyaz-esya",
  "Vantilatörler": "kucuk-ev-aletleri",

  // === SMALL APPLIANCES ===
  "Tost Makineleri": "kucuk-ev-aletleri",
  "Endüstriyel Mutfak Aletleri": "kucuk-ev-aletleri",
  "Yüz Temizleme Cihazları": "cilt-bakimi",
  "Saç Şekillendirme Cihazları": "sac-bakimi",

  // === CLOTHING — WOMEN ===
  "Günlük Etek": "kadin-giyim",
  "Büyük Beden Etek": "kadin-giyim",
  "Pileli Etek": "kadin-giyim",
  "Mini Etek": "kadin-giyim",
  "Uzun Etek": "kadin-giyim",
  "Etek": "kadin-giyim",
  "Günlük Elbise": "kadin-giyim",
  "Elbise": "kadin-giyim",
  "Bluz": "kadin-giyim",
  "Büyük Beden Bluz": "kadin-giyim",
  "Pantolon ve Kapri": "kadin-giyim",
  "Büyük Beden Pantolon": "kadin-giyim",

  // === CLOTHING — MEN ===
  "Günlük Pantolon": "erkek-giyim",
  "Kot Pantolon": "erkek-giyim",
  "Pantolon": "erkek-giyim",
  "Gömlekler": "erkek-giyim",
  "Gömlek": "erkek-giyim",
  "Polo Yaka": "erkek-giyim",
  "Hakim Yaka": "erkek-giyim",
  "Takım": "erkek-giyim",
  "İş Elbiseleri": "erkek-giyim",

  // === CLOTHING — OUTERWEAR / SPORT ===
  "Günlük Ceket": "erkek-giyim",
  "Ceket": "erkek-giyim",
  "Spor Ceket": "spor-giyim",
  "Montlar ve Ceketler": "erkek-giyim",
  "Mont Ve Ceket": "erkek-giyim",
  "Mont & Kaban": "erkek-giyim",
  "Kaztüyü Mont & Parka": "erkek-giyim",
  "Yağmurluk & Anorak": "outdoor-giyim",
  "Yelek": "erkek-giyim",
  "Yelekler": "erkek-giyim",
  "Kapüşonlu": "erkek-giyim",
  "Eşofman Altı": "spor-giyim",
  "Spor Tayt": "spor-giyim",
  "Şort": "spor-giyim",
  "Şort & Kapri": "spor-giyim",
  "Plaj Giyim": "kadin-giyim",
  "Avcı Pantolonları": "outdoor-giyim",
  "Bisiklet Giyim": "spor-giyim",

  // === FOOTWEAR ===
  "Outdoor Ayakkabı": "erkek-ayakkabi",
  "Klasik Bot ": "erkek-ayakkabi",
  "Klasik Bot": "erkek-ayakkabi",
  "Bootie ": "kadin-ayakkabi",
  "Bootie": "kadin-ayakkabi",
  "Bot & Çizme": "erkek-ayakkabi",
  "Bot": "erkek-ayakkabi",
  "Yürüyüş Ayakkabısı": "erkek-ayakkabi",
  "Yürüyüş & Koşu Ayakkabısı": "erkek-ayakkabi",
  "Günlük Ayakkabı": "erkek-ayakkabi",
  "Günlük Spor Ayakkabı": "erkek-ayakkabi",
  "Casual Ayakkabı": "erkek-ayakkabi",
  "Topuklu Bot ": "kadin-ayakkabi",
  "Topuklu Bot": "kadin-ayakkabi",
  "İş ayakkabısı ve Çizmeler": "erkek-ayakkabi",
  "Kız Çocuk Ayakkabı": "cocuk-giyim",
  "Ayakkabı": "erkek-ayakkabi",

  // === BAGS ===
  "Çantalar ve Kılıflar": "canta-cuzdan",
  "Okul Çantası": "canta-cuzdan",
  "Günlük Sırt Çantası": "canta-cuzdan",
  "Çapraz Çanta": "canta-cuzdan",
  "Takım Çantaları": "canta-cuzdan",
  "Dağcılık ve Kamp Çantaları": "outdoor-kamp",

  // === OUTDOOR / CAMP ===
  "Çadır": "outdoor-kamp",
  "Uyku Tulumu": "outdoor-kamp",
  "Kamp Aksesuarları": "outdoor-kamp",
  "Outdoor / Trekking": "outdoor-kamp",
  "Termos": "outdoor-kamp",
  "Termoslar": "outdoor-kamp",
  "Buzluk & Soğutucu": "outdoor-kamp",
  "El Fenerleri": "outdoor-kamp",
  "Fenerler": "outdoor-kamp",
  "Fener": "outdoor-kamp",
  "Katlanabilir Çakı": "outdoor-kamp",
  "Outdoor Bıçak": "outdoor-kamp",
  "Şemsiye": "outdoor-kamp",

  // === SPORTS ===
  "Maske ve Şnorkeller": "su-sporlari",
  "Maskeler": "kisisel-hijyen", // revised — generic "Maskeler" is usually surgical/hygiene
  "Cerrahi Maskeler": "kisisel-hijyen",
  "Şnorkel": "su-sporlari",
  "Dalış Ürünleri": "su-sporlari",
  "Deniz Malzemeleri ve Oyuncakları": "su-sporlari",
  "Şişme Havuzlar": "su-sporlari",
  "Havuz Temizlik Malzemeleri ve Kimyasalları": "temizlik",
  "Tekne Bakımı": "su-sporlari",
  "Masa Tenisi Topları": "takim-sporlari",
  "Koşu Bantları": "fitness",
  "Vinyl ve Plastik Dambıllar": "fitness",

  // === TOY ===
  "Oyun Çadırları": "oyuncak",
  "Özel Eğitim Oyuncakları": "oyuncak",
  "Aktivite ve Eğitici Oyuncaklar": "oyuncak",

  // === COSMETICS ===
  "Eyeliner": "makyaj",
  "Allıklar": "makyaj",
  "Parlatıcı": "makyaj",
  "Peeling Ürünleri": "cilt-bakimi",
  "Saç Maskeleri,Bakım Krem,Losyon Ve Spreyleri": "sac-bakimi",

  // === HEALTH ===
  "Sağlık Ürünleri": "kisisel-hijyen",
  "Medikal Ürünler": "kisisel-hijyen",

  // === HOME / FURNITURE ===
  "Dekoratif Objeler": "mobilya-dekorasyon",
  "Dekoratif Kutu": "mobilya-dekorasyon",
  "Masa Lambaları": "mobilya-dekorasyon",
  "Halı Örtüsü": "ev-tekstili",
  "Kuru Bitkiler": "mobilya-dekorasyon",
  "Çok Amaçlı Dolaplar": "mobilya-dekorasyon",
  "Ofis Koltukları": "ofis-mobilyasi",

  // === CLEANING ===
  "Makine Deterjanı": "temizlik",
  "Bulaşık Makinesi Tuzu": "temizlik",
  "Fırın, Beyaz Eşya Temizleme": "temizlik",
  "Tuvalet Temizleyiciler": "temizlik",

  // === HARDWARE / TOOLS ===
  "Test Cihazları": "yapi-market",
  "Ölçüm Aletleri": "yapi-market",
  "Dedektörler": "yapi-market",
  "Kaynak Aksesuarları": "yapi-market",
  "Benzinli Tırpanlar": "yapi-market",
  "Elektrik Aksesuarları": "yapi-market",

  // === JEWELRY ===
  "Kişiye Özel Takılar": "saat-taki",

  // === BOOKS ===
  "Roman": "kitap",
  "Versatil Kalem": "kirtasiye",
};

// 4) SPECS.Ürün Tipi → OUR CATEGORY (MediaMarkt)
const SPEC_URUN_TIPI_MAP = {
  "Akıllı Telefon": "akilli-telefon",
  "Tablet": "tablet",
  "Dizüstü Bilgisayar": "bilgisayar-laptop",
  "Laptop": "bilgisayar-laptop",
  "Akıllı Saat": "akilli-saat",
  "Kulaklık": "ses-kulaklik",
  "Kamera": "fotograf-kamera",
  "Televizyon": "tv",
};

function classify(product) {
  const title = product.title || "";
  const brand = (product.brand || "").trim();
  const specs = product.specs || {};
  const scores = {};

  function add(cat, score) {
    if (!cat) return;
    scores[cat] = (scores[cat] || 0) + score;
  }

  for (const rule of BRAND_EXCLUSIVE) {
    if (rule.pattern.test(brand)) {
      for (const c of rule.cats) add(c, rule.score / rule.cats.length);
    }
  }

  for (const rule of TITLE_RULES) {
    if (rule.pattern.test(title)) add(rule.cat, rule.score);
  }

  const srcCat = specs.pttavm_category || specs.mediamarkt_category;
  if (srcCat) {
    const direct = SOURCE_CAT_MAP[srcCat];
    if (direct) add(direct, 95);
    else {
      for (const [key, cat] of Object.entries(SOURCE_CAT_MAP)) {
        if (srcCat.includes(key)) { add(cat, 60); break; }
      }
    }
  }

  const urunTipi = specs["Ürün Tipi"];
  if (urunTipi && SPEC_URUN_TIPI_MAP[urunTipi]) {
    add(SPEC_URUN_TIPI_MAP[urunTipi], 95);
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { category: null, score: 0 };
  return { category: sorted[0][0], score: sorted[0][1] };
}

(async () => {
  const { data: cats } = await sb.from("categories").select("id, slug");
  const slugToId = new Map(cats.map(c => [c.slug, c.id]));
  const idToSlug = new Map(cats.map(c => [c.id, c.slug]));

  let baseQuery = sb.from("products").select("id, title, brand, category_id, specs, source");
  if (ONLY_CAT) {
    const catId = slugToId.get(ONLY_CAT);
    if (!catId) { console.error("Unknown category:", ONLY_CAT); process.exit(1); }
    baseQuery = baseQuery.eq("category_id", catId);
  }

  let applied = 0, wouldApply = 0, review = 0, skipped = 0, kept = 0;
  const changes = {};

  for (let page = 0; page < 60; page++) {
    const { data } = await baseQuery.range(page * 1000, page * 1000 + 999);
    if (!data || data.length === 0) break;

    for (const p of data) {
      const result = classify(p);
      const currentSlug = idToSlug.get(p.category_id) || "(null)";
      if (!result.category) { skipped++; continue; }
      if (result.category === currentSlug) { kept++; continue; }

      if (result.score >= APPLY_THRESHOLD) {
        const key = `${currentSlug} → ${result.category}`;
        changes[key] = (changes[key] || 0) + 1;

        if (DRY_RUN) {
          wouldApply++;
        } else {
          const newCatId = slugToId.get(result.category);
          if (newCatId) {
            await sb.from("products").update({ category_id: newCatId }).eq("id", p.id);
            applied++;
          }
        }
      } else if (result.score >= REVIEW_THRESHOLD) {
        review++;
      } else {
        skipped++;
      }
    }

    if (data.length < 1000) break;
    if ((page + 1) % 5 === 0) {
      process.stdout.write(`\r  page ${page + 1}: kept=${kept} ${DRY_RUN ? `would-apply=${wouldApply}` : `applied=${applied}`} review=${review} skipped=${skipped}`);
    }
  }

  console.log(`\n\n=== Summary ${DRY_RUN ? "[DRY RUN]" : "[APPLIED]"} ===`);
  console.log(`Kept (already correct):   ${kept}`);
  console.log(`${DRY_RUN ? "Would apply" : "Applied"}:              ${DRY_RUN ? wouldApply : applied}`);
  console.log(`Review (score 50-70):     ${review}`);
  console.log(`Skipped (no signal):      ${skipped}`);

  console.log(`\nTop category changes:`);
  Object.entries(changes).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => {
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  });

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] — ${wouldApply} değişiklik uygulanmadı. Onaylamak için --apply ile çalıştır.`);
  }
})();
