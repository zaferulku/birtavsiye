/**
 * Ürün başlığından canonical model_family çıkarır.
 *
 * Örnekler:
 *   "APPLE iPhone 16 Plus 256 GB Akıllı Telefon Pembe MTP13TU/A"
 *     → { family: "iPhone 16 Plus", code: "MTP13TU/A" }
 *   "Samsung Galaxy S24 Ultra 512GB Titanium Black"
 *     → { family: "Galaxy S24 Ultra", code: null }
 */

export interface ModelExtractionResult {
  family: string | null;
  code: string | null;
}

const IPHONE_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /iPhone\s*SE\s*\(?3[\.\s]*nesil\)?/i, canonical: "iPhone SE (3. nesil)" },
  { regex: /iPhone\s*SE\s*\(?2[\.\s]*nesil\)?/i, canonical: "iPhone SE (2. nesil)" },
  { regex: /iPhone\s*SE\s*2022/i, canonical: "iPhone SE (3. nesil)" },
  { regex: /iPhone\s*SE\s*2020/i, canonical: "iPhone SE (2. nesil)" },

  { regex: /iPhone\s*17\s*Pro\s*Max/i, canonical: "iPhone 17 Pro Max" },
  { regex: /iPhone\s*17\s*Pro/i, canonical: "iPhone 17 Pro" },
  { regex: /iPhone\s*17\s*Air/i, canonical: "iPhone 17 Air" },
  { regex: /iPhone\s*17e/i, canonical: "iPhone 17e" },
  { regex: /iPhone\s*17/i, canonical: "iPhone 17" },

  { regex: /iPhone\s*16\s*Pro\s*Max/i, canonical: "iPhone 16 Pro Max" },
  { regex: /iPhone\s*16\s*Pro/i, canonical: "iPhone 16 Pro" },
  { regex: /iPhone\s*16\s*Plus/i, canonical: "iPhone 16 Plus" },
  { regex: /iPhone\s*16e/i, canonical: "iPhone 16e" },
  { regex: /iPhone\s*16/i, canonical: "iPhone 16" },

  { regex: /iPhone\s*15\s*Pro\s*Max/i, canonical: "iPhone 15 Pro Max" },
  { regex: /iPhone\s*15\s*Pro/i, canonical: "iPhone 15 Pro" },
  { regex: /iPhone\s*15\s*Plus/i, canonical: "iPhone 15 Plus" },
  { regex: /iPhone\s*15/i, canonical: "iPhone 15" },

  { regex: /iPhone\s*14\s*Pro\s*Max/i, canonical: "iPhone 14 Pro Max" },
  { regex: /iPhone\s*14\s*Pro/i, canonical: "iPhone 14 Pro" },
  { regex: /iPhone\s*14\s*Plus/i, canonical: "iPhone 14 Plus" },
  { regex: /iPhone\s*14/i, canonical: "iPhone 14" },

  { regex: /iPhone\s*13\s*Pro\s*Max/i, canonical: "iPhone 13 Pro Max" },
  { regex: /iPhone\s*13\s*Pro/i, canonical: "iPhone 13 Pro" },
  { regex: /iPhone\s*13\s*mini/i, canonical: "iPhone 13 mini" },
  { regex: /iPhone\s*13/i, canonical: "iPhone 13" },

  { regex: /iPhone\s*12\s*Pro\s*Max/i, canonical: "iPhone 12 Pro Max" },
  { regex: /iPhone\s*12\s*Pro/i, canonical: "iPhone 12 Pro" },
  { regex: /iPhone\s*12\s*mini/i, canonical: "iPhone 12 mini" },
  { regex: /iPhone\s*12/i, canonical: "iPhone 12" },

  { regex: /iPhone\s*11\s*Pro\s*Max/i, canonical: "iPhone 11 Pro Max" },
  { regex: /iPhone\s*11\s*Pro/i, canonical: "iPhone 11 Pro" },
  { regex: /iPhone\s*11/i, canonical: "iPhone 11" },

  { regex: /iPhone\s*XS\s*Max/i, canonical: "iPhone XS Max" },
  { regex: /iPhone\s*XS/i, canonical: "iPhone XS" },
  { regex: /iPhone\s*XR/i, canonical: "iPhone XR" },
  { regex: /iPhone\s*X/i, canonical: "iPhone X" },
  { regex: /iPhone\s*8\s*Plus/i, canonical: "iPhone 8 Plus" },
  { regex: /iPhone\s*8/i, canonical: "iPhone 8" },
  { regex: /iPhone\s*7\s*Plus/i, canonical: "iPhone 7 Plus" },
  { regex: /iPhone\s*7/i, canonical: "iPhone 7" },
];

const SAMSUNG_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Galaxy\s*S25\s*Ultra/i, canonical: "Galaxy S25 Ultra" },
  { regex: /Galaxy\s*S25\s*(Plus|\+)/i, canonical: "Galaxy S25 Plus" },
  { regex: /Galaxy\s*S25\s*Edge/i, canonical: "Galaxy S25 Edge" },
  { regex: /Galaxy\s*S25/i, canonical: "Galaxy S25" },

  { regex: /Galaxy\s*S24\s*Ultra/i, canonical: "Galaxy S24 Ultra" },
  { regex: /Galaxy\s*S24\s*FE/i, canonical: "Galaxy S24 FE" },
  { regex: /Galaxy\s*S24\s*(Plus|\+)/i, canonical: "Galaxy S24 Plus" },
  { regex: /Galaxy\s*S24/i, canonical: "Galaxy S24" },

  { regex: /Galaxy\s*S23\s*Ultra/i, canonical: "Galaxy S23 Ultra" },
  { regex: /Galaxy\s*S23\s*FE/i, canonical: "Galaxy S23 FE" },
  { regex: /Galaxy\s*S23\s*(Plus|\+)/i, canonical: "Galaxy S23 Plus" },
  { regex: /Galaxy\s*S23/i, canonical: "Galaxy S23" },

  { regex: /Galaxy\s*Z\s*Fold\s*6/i, canonical: "Galaxy Z Fold6" },
  { regex: /Galaxy\s*Z\s*Fold\s*5/i, canonical: "Galaxy Z Fold5" },
  { regex: /Galaxy\s*Z\s*Flip\s*6/i, canonical: "Galaxy Z Flip6" },
  { regex: /Galaxy\s*Z\s*Flip\s*5/i, canonical: "Galaxy Z Flip5" },

  { regex: /Galaxy\s*A57/i, canonical: "Galaxy A57" },
  { regex: /Galaxy\s*A56/i, canonical: "Galaxy A56" },
  { regex: /Galaxy\s*A55/i, canonical: "Galaxy A55" },
  { regex: /Galaxy\s*A54/i, canonical: "Galaxy A54" },
  { regex: /Galaxy\s*A35/i, canonical: "Galaxy A35" },
  { regex: /Galaxy\s*A34/i, canonical: "Galaxy A34" },
  { regex: /Galaxy\s*A25/i, canonical: "Galaxy A25" },
  { regex: /Galaxy\s*A24/i, canonical: "Galaxy A24" },
  { regex: /Galaxy\s*A16/i, canonical: "Galaxy A16" },
  { regex: /Galaxy\s*A15/i, canonical: "Galaxy A15" },
  { regex: /Galaxy\s*A06/i, canonical: "Galaxy A06" },
  { regex: /Galaxy\s*A05/i, canonical: "Galaxy A05" },

  { regex: /Galaxy\s*M55/i, canonical: "Galaxy M55" },
  { regex: /Galaxy\s*M35/i, canonical: "Galaxy M35" },
  { regex: /Galaxy\s*M15/i, canonical: "Galaxy M15" },
];

const XIAOMI_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  // Redmi Note (uzun match once)
  { regex: /Redmi\s*Note\s*15\s*Pro\+/i, canonical: "Redmi Note 15 Pro+" },
  { regex: /Redmi\s*Note\s*15\s*Pro/i, canonical: "Redmi Note 15 Pro" },
  { regex: /Redmi\s*Note\s*15/i, canonical: "Redmi Note 15" },
  { regex: /Redmi\s*Note\s*14\s*Pro\+/i, canonical: "Redmi Note 14 Pro+" },
  { regex: /Redmi\s*Note\s*14\s*Pro/i, canonical: "Redmi Note 14 Pro" },
  { regex: /Redmi\s*Note\s*14/i, canonical: "Redmi Note 14" },
  { regex: /Redmi\s*Note\s*13\s*Pro\+/i, canonical: "Redmi Note 13 Pro+" },
  { regex: /Redmi\s*Note\s*13\s*Pro/i, canonical: "Redmi Note 13 Pro" },
  { regex: /Redmi\s*Note\s*13/i, canonical: "Redmi Note 13" },
  { regex: /Redmi\s*Note\s*12\s*Pro/i, canonical: "Redmi Note 12 Pro" },
  { regex: /Redmi\s*Note\s*12/i, canonical: "Redmi Note 12" },
  { regex: /Redmi\s*Note\s*11\s*Pro/i, canonical: "Redmi Note 11 Pro" },
  { regex: /Redmi\s*Note\s*11/i, canonical: "Redmi Note 11" },
  // Redmi
  { regex: /Redmi\s*15C/i, canonical: "Redmi 15C" },
  { regex: /Redmi\s*15/i, canonical: "Redmi 15" },
  { regex: /Redmi\s*14C/i, canonical: "Redmi 14C" },
  { regex: /Redmi\s*14/i, canonical: "Redmi 14" },
  { regex: /Redmi\s*13C/i, canonical: "Redmi 13C" },
  { regex: /Redmi\s*13/i, canonical: "Redmi 13" },
  { regex: /Redmi\s*12C/i, canonical: "Redmi 12C" },
  { regex: /Redmi\s*12/i, canonical: "Redmi 12" },
  // Poco
  { regex: /Poco\s*F8\s*Pro/i, canonical: "Poco F8 Pro" },
  { regex: /Poco\s*F7\s*Pro/i, canonical: "Poco F7 Pro" },
  { regex: /Poco\s*F6\s*Pro/i, canonical: "Poco F6 Pro" },
  { regex: /Poco\s*F5\s*Pro/i, canonical: "Poco F5 Pro" },
  { regex: /Poco\s*X8\s*Pro/i, canonical: "Poco X8 Pro" },
  { regex: /Poco\s*X7\s*Pro/i, canonical: "Poco X7 Pro" },
  { regex: /Poco\s*X6\s*Pro/i, canonical: "Poco X6 Pro" },
  { regex: /Poco\s*M7\s*Pro/i, canonical: "Poco M7 Pro" },
  { regex: /Poco\s*M6\s*Pro/i, canonical: "Poco M6 Pro" },
  { regex: /Poco\s*C75/i, canonical: "Poco C75" },
  // Xiaomi T variants
  { regex: /\bXiaomi\s*15T\s*Pro/i, canonical: "Xiaomi 15T Pro" },
  { regex: /\bXiaomi\s*15T\b/i, canonical: "Xiaomi 15T" },
  { regex: /\bXiaomi\s*14T\s*Pro/i, canonical: "Xiaomi 14T Pro" },
  { regex: /\bXiaomi\s*14T\b/i, canonical: "Xiaomi 14T" },
  { regex: /\bXiaomi\s*13T\s*Pro/i, canonical: "Xiaomi 13T Pro" },
  { regex: /\bXiaomi\s*13T\b/i, canonical: "Xiaomi 13T" },
  // Xiaomi numara-only
  { regex: /\bXiaomi\s*17\s*Ultra/i, canonical: "Xiaomi 17 Ultra" },
  { regex: /\bXiaomi\s*17\s*Pro/i, canonical: "Xiaomi 17 Pro" },
  { regex: /\bXiaomi\s*17\b/i, canonical: "Xiaomi 17" },
  { regex: /\bXiaomi\s*16\s*Pro/i, canonical: "Xiaomi 16 Pro" },
  { regex: /\bXiaomi\s*16\b/i, canonical: "Xiaomi 16" },
  { regex: /\bXiaomi\s*15\s*Ultra/i, canonical: "Xiaomi 15 Ultra" },
  { regex: /\bXiaomi\s*15\s*Pro/i, canonical: "Xiaomi 15 Pro" },
  { regex: /\bXiaomi\s*15\b/i, canonical: "Xiaomi 15" },
  { regex: /\bXiaomi\s*14\s*Ultra/i, canonical: "Xiaomi 14 Ultra" },
  { regex: /\bXiaomi\s*14\s*Pro/i, canonical: "Xiaomi 14 Pro" },
  { regex: /\bXiaomi\s*14\b/i, canonical: "Xiaomi 14" },
  { regex: /\bXiaomi\s*13\s*Pro/i, canonical: "Xiaomi 13 Pro" },
  { regex: /\bXiaomi\s*13\b/i, canonical: "Xiaomi 13" },
  { regex: /\bXiaomi\s*12T\s*Pro/i, canonical: "Xiaomi 12T Pro" },
  { regex: /\bXiaomi\s*12T\b/i, canonical: "Xiaomi 12T" },
  { regex: /\bXiaomi\s*12\s*Pro/i, canonical: "Xiaomi 12 Pro" },
  { regex: /\bXiaomi\s*12\b/i, canonical: "Xiaomi 12" },
];

const TECNO_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Camon\s*40\s*Premier/i, canonical: "Camon 40 Premier" },
  { regex: /Camon\s*40\s*Pro/i, canonical: "Camon 40 Pro" },
  { regex: /Camon\s*40/i, canonical: "Camon 40" },
  { regex: /Camon\s*30\s*Pro/i, canonical: "Camon 30 Pro" },
  { regex: /Camon\s*30/i, canonical: "Camon 30" },
  { regex: /Spark\s*Slim/i, canonical: "Spark Slim" },
  { regex: /Spark\s*Go\s*2/i, canonical: "Spark Go 2" },
  { regex: /Spark\s*Go/i, canonical: "Spark Go" },
  { regex: /Spark\s*40\s*Pro/i, canonical: "Spark 40 Pro" },
  { regex: /Spark\s*40/i, canonical: "Spark 40" },
  { regex: /Spark\s*30\s*Pro/i, canonical: "Spark 30 Pro" },
  { regex: /Spark\s*30/i, canonical: "Spark 30" },
  { regex: /Pop\s*9/i, canonical: "Pop 9" },
  { regex: /Pop\s*8/i, canonical: "Pop 8" },
];

const VIVO_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Vivo\s*X300\s*Pro/i, canonical: "Vivo X300 Pro" },
  { regex: /Vivo\s*X300/i, canonical: "Vivo X300" },
  { regex: /Vivo\s*X200\s*Pro/i, canonical: "Vivo X200 Pro" },
  { regex: /Vivo\s*X200/i, canonical: "Vivo X200" },
  { regex: /Vivo\s*X100\s*Pro/i, canonical: "Vivo X100 Pro" },
  { regex: /Vivo\s*X100/i, canonical: "Vivo X100" },
  { regex: /V60\s*Lite/i, canonical: "Vivo V60 Lite" },
  { regex: /V60\b/i, canonical: "Vivo V60" },
  { regex: /V50\s*Lite/i, canonical: "Vivo V50 Lite" },
  { regex: /V50\b/i, canonical: "Vivo V50" },
  { regex: /V40\s*Lite/i, canonical: "Vivo V40 Lite" },
  { regex: /V40\b/i, canonical: "Vivo V40" },
  { regex: /V30\s*Pro/i, canonical: "Vivo V30 Pro" },
  { regex: /V30\b/i, canonical: "Vivo V30" },
  { regex: /Y31\b/i, canonical: "Vivo Y31" },
  { regex: /Y29S/i, canonical: "Vivo Y29S" },
  { regex: /Y29\b/i, canonical: "Vivo Y29" },
  { regex: /Y28\b/i, canonical: "Vivo Y28" },
];

const INFINIX_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Hot\s*60\s*Pro\+/i, canonical: "Infinix Hot 60 Pro+" },
  { regex: /Hot\s*60\s*Pro/i, canonical: "Infinix Hot 60 Pro" },
  { regex: /Hot\s*60i/i, canonical: "Infinix Hot 60i" },
  { regex: /Hot\s*60\b/i, canonical: "Infinix Hot 60" },
  { regex: /Hot\s*50\s*Pro\+|Hot\s*50\s*Pro\s*Plus/i, canonical: "Infinix Hot 50 Pro+" },
  { regex: /Hot\s*50\s*Pro/i, canonical: "Infinix Hot 50 Pro" },
  { regex: /Hot\s*50i/i, canonical: "Infinix Hot 50i" },
  { regex: /Hot\s*50\b/i, canonical: "Infinix Hot 50" },
  { regex: /Note\s*50\s*Pro/i, canonical: "Infinix Note 50 Pro" },
  { regex: /Note\s*50\b/i, canonical: "Infinix Note 50" },
  { regex: /Smart\s*9/i, canonical: "Infinix Smart 9" },
  { regex: /Smart\s*8/i, canonical: "Infinix Smart 8" },
];

const OPPO_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Find\s*X8\s*Ultra/i, canonical: "Oppo Find X8 Ultra" },
  { regex: /Find\s*X8\s*Pro/i, canonical: "Oppo Find X8 Pro" },
  { regex: /Find\s*X8/i, canonical: "Oppo Find X8" },
  { regex: /Find\s*X7\s*Ultra/i, canonical: "Oppo Find X7 Ultra" },
  { regex: /Find\s*X7/i, canonical: "Oppo Find X7" },
  { regex: /Reno\s*15\s*F/i, canonical: "Oppo Reno 15 F" },
  { regex: /Reno\s*15\s*Pro/i, canonical: "Oppo Reno 15 Pro" },
  { regex: /Reno\s*15\b/i, canonical: "Oppo Reno 15" },
  { regex: /Reno\s*14\s*F/i, canonical: "Oppo Reno 14 F" },
  { regex: /Reno\s*14\s*Pro/i, canonical: "Oppo Reno 14 Pro" },
  { regex: /Reno\s*14\b/i, canonical: "Oppo Reno 14" },
  { regex: /Reno\s*13\s*F/i, canonical: "Oppo Reno 13 F" },
  { regex: /Reno\s*13\s*Pro/i, canonical: "Oppo Reno 13 Pro" },
  { regex: /Reno\s*13\b/i, canonical: "Oppo Reno 13" },
  { regex: /Reno\s*12\s*Pro/i, canonical: "Oppo Reno 12 Pro" },
  { regex: /Reno\s*12\b/i, canonical: "Oppo Reno 12" },
  { regex: /A6T\s*5G/i, canonical: "Oppo A6T 5G" },
  { regex: /A6\s*Pro\s*5G/i, canonical: "Oppo A6 Pro 5G" },
  { regex: /A6\s*Pro\s*4G/i, canonical: "Oppo A6 Pro 4G" },
  { regex: /A6\b/i, canonical: "Oppo A6" },
  { regex: /A5\s*5G/i, canonical: "Oppo A5 5G" },
  { regex: /A5\b/i, canonical: "Oppo A5" },
  { regex: /A79\b/i, canonical: "Oppo A79" },
  { regex: /A78\b/i, canonical: "Oppo A78" },
];

const HUAWEI_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Pura\s*80\s*Ultra/i, canonical: "Huawei Pura 80 Ultra" },
  { regex: /Pura\s*80\s*Pro/i, canonical: "Huawei Pura 80 Pro" },
  { regex: /Pura\s*80\b/i, canonical: "Huawei Pura 80" },
  { regex: /Pura\s*70\s*Ultra/i, canonical: "Huawei Pura 70 Ultra" },
  { regex: /Pura\s*70\s*Pro/i, canonical: "Huawei Pura 70 Pro" },
  { regex: /Pura\s*70\b/i, canonical: "Huawei Pura 70" },
  { regex: /Mate\s*X6/i, canonical: "Huawei Mate X6" },
  { regex: /Mate\s*X5/i, canonical: "Huawei Mate X5" },
  { regex: /Mate\s*70\s*Pro/i, canonical: "Huawei Mate 70 Pro" },
  { regex: /Mate\s*70\b/i, canonical: "Huawei Mate 70" },
  { regex: /Mate\s*60\s*Pro/i, canonical: "Huawei Mate 60 Pro" },
  { regex: /Mate\s*60\b/i, canonical: "Huawei Mate 60" },
  { regex: /Mate\s*50\s*Pro/i, canonical: "Huawei Mate 50 Pro" },
  { regex: /Mate\s*50\b/i, canonical: "Huawei Mate 50" },
  { regex: /Nova\s*13\s*Pro/i, canonical: "Huawei Nova 13 Pro" },
  { regex: /Nova\s*13/i, canonical: "Huawei Nova 13" },
  { regex: /Nova\s*12\s*Pro/i, canonical: "Huawei Nova 12 Pro" },
  { regex: /Nova\s*12/i, canonical: "Huawei Nova 12" },
  { regex: /Nova\s*11\s*Pro/i, canonical: "Huawei Nova 11 Pro" },
  { regex: /Nova\s*11/i, canonical: "Huawei Nova 11" },
  { regex: /P60\s*Pro/i, canonical: "Huawei P60 Pro" },
  { regex: /P60\b/i, canonical: "Huawei P60" },
];

const REEDER_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /S23\s*Pro\s*Max/i, canonical: "Reeder S23 Pro Max" },
  { regex: /S23\s*Pro/i, canonical: "Reeder S23 Pro" },
  { regex: /S23\b/i, canonical: "Reeder S23" },
  { regex: /S19\s*Max\s*Pro\s*S\s*Edge/i, canonical: "Reeder S19 Max Pro S Edge" },
  { regex: /S19\s*Max\s*Pro\s*S/i, canonical: "Reeder S19 Max Pro S" },
  { regex: /S19\s*Max\s*Pro/i, canonical: "Reeder S19 Max Pro" },
  { regex: /S19\s*Max/i, canonical: "Reeder S19 Max" },
  { regex: /S19\b/i, canonical: "Reeder S19" },
  { regex: /S71/i, canonical: "Reeder S71" },
  { regex: /P13\s*Blue\s*Max/i, canonical: "Reeder P13 Blue Max" },
  { regex: /P13\s*Blue/i, canonical: "Reeder P13 Blue" },
];

const REALME_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Realme\s*GT\s*7\s*Pro/i, canonical: "Realme GT 7 Pro" },
  { regex: /Realme\s*GT\s*6/i, canonical: "Realme GT 6" },
  { regex: /Realme\s*GT\s*5/i, canonical: "Realme GT 5" },
  { regex: /Realme\s*Note\s*60/i, canonical: "Realme Note 60" },
  { regex: /Realme\s*C75/i, canonical: "Realme C75" },
  { regex: /Realme\s*C61/i, canonical: "Realme C61" },
  { regex: /Realme\s*C55/i, canonical: "Realme C55" },
  { regex: /Realme\s*C53/i, canonical: "Realme C53" },
  { regex: /Realme\s*12\s*Pro\+/i, canonical: "Realme 12 Pro+" },
  { regex: /Realme\s*12\s*Pro/i, canonical: "Realme 12 Pro" },
  { regex: /Realme\s*12\s*Lite/i, canonical: "Realme 12 Lite" },
  { regex: /Realme\s*12\b/i, canonical: "Realme 12" },
  { regex: /Realme\s*11\s*Pro/i, canonical: "Realme 11 Pro" },
  { regex: /Realme\s*11\b/i, canonical: "Realme 11" },
  { regex: /Realme\s*10\s*Pro/i, canonical: "Realme 10 Pro" },
  { regex: /Realme\s*10\b/i, canonical: "Realme 10" },
];

const HONOR_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Magic\s*8\s*Pro/i, canonical: "Honor Magic 8 Pro" },
  { regex: /Magic\s*8\s*Lite/i, canonical: "Honor Magic 8 Lite" },
  { regex: /Magic\s*8\b/i, canonical: "Honor Magic 8" },
  { regex: /Magic\s*7\s*Pro/i, canonical: "Honor Magic 7 Pro" },
  { regex: /Magic\s*7\s*Lite/i, canonical: "Honor Magic 7 Lite" },
  { regex: /Magic\s*7\b/i, canonical: "Honor Magic 7" },
  { regex: /Magic\s*6\s*Pro/i, canonical: "Honor Magic 6 Pro" },
  { regex: /Magic\s*6\s*Lite/i, canonical: "Honor Magic 6 Lite" },
  { regex: /Magic\s*6\b/i, canonical: "Honor Magic 6" },
  { regex: /400\s*Pro/i, canonical: "Honor 400 Pro" },
  { regex: /400\b/i, canonical: "Honor 400" },
  { regex: /200\s*Pro/i, canonical: "Honor 200 Pro" },
  { regex: /200\b/i, canonical: "Honor 200" },
  { regex: /X9b/i, canonical: "Honor X9b" },
  { regex: /90\s*Lite/i, canonical: "Honor 90 Lite" },
  { regex: /90\b/i, canonical: "Honor 90" },
];

const CASPER_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Via\s*X45/i, canonical: "Casper Via X45" },
  { regex: /Via\s*X40/i, canonical: "Casper Via X40" },
  { regex: /Via\s*X30\s*Plus/i, canonical: "Casper Via X30 Plus" },
  { regex: /Via\s*X30/i, canonical: "Casper Via X30" },
  { regex: /Via\s*A40/i, canonical: "Casper Via A40" },
  { regex: /Via\s*A30/i, canonical: "Casper Via A30" },
  { regex: /Via\s*M40/i, canonical: "Casper Via M40" },
];

const OMIX_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /O1\s*Icon/i, canonical: "Omix O1 Icon" },
  { regex: /O1\s*Neo/i, canonical: "Omix O1 Neo" },
  { regex: /O1\s*Next/i, canonical: "Omix O1 Next" },
  { regex: /O1\b/i, canonical: "Omix O1" },
  { regex: /X400/i, canonical: "Omix X400" },
  { regex: /X4\b/i, canonical: "Omix X4" },
  { regex: /X3\b/i, canonical: "Omix X3" },
];

const GENERAL_MOBILE_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /Era\s*30\s*Pro/i, canonical: "GM Era 30 Pro" },
  { regex: /Era\s*30/i, canonical: "GM Era 30" },
  { regex: /Era\s*20/i, canonical: "GM Era 20" },
  { regex: /GM\s*26\s*Pro/i, canonical: "GM 26 Pro" },
  { regex: /GM\s*23\b/i, canonical: "GM 23" },
  { regex: /GM\s*22\s*Pro/i, canonical: "GM 22 Pro" },
  { regex: /GM\s*22\b/i, canonical: "GM 22" },
  { regex: /GM20\s*Pro|GM\s*20\s*Pro/i, canonical: "GM 20 Pro" },
  { regex: /GM\s*20\b/i, canonical: "GM 20" },
];

const TABLET_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  // Apple iPad
  { regex: /iPad\s*Pro\s*M5/i, canonical: "iPad Pro M5" },
  { regex: /iPad\s*Pro\s*M4/i, canonical: "iPad Pro M4" },
  { regex: /iPad\s*Pro\s*13/i, canonical: "iPad Pro 13" },
  { regex: /iPad\s*Pro\s*11/i, canonical: "iPad Pro 11" },
  { regex: /iPad\s*Pro/i, canonical: "iPad Pro" },
  { regex: /iPad\s*Air\s*M3/i, canonical: "iPad Air M3" },
  { regex: /iPad\s*Air\s*M2/i, canonical: "iPad Air M2" },
  { regex: /iPad\s*Air/i, canonical: "iPad Air" },
  { regex: /iPad\s*Mini\s*7/i, canonical: "iPad Mini 7" },
  { regex: /iPad\s*Mini/i, canonical: "iPad Mini" },
  { regex: /iPad\s*A16/i, canonical: "iPad A16" },
  { regex: /iPad\s*11/i, canonical: "iPad 11" },
  { regex: /iPad\s*10/i, canonical: "iPad 10" },
  { regex: /iPad/i, canonical: "iPad" },
  // Samsung Galaxy Tab
  { regex: /Galaxy\s*Tab\s*S11\s*Ultra/i, canonical: "Galaxy Tab S11 Ultra" },
  { regex: /Galaxy\s*Tab\s*S11\+/i, canonical: "Galaxy Tab S11+" },
  { regex: /Galaxy\s*Tab\s*S11/i, canonical: "Galaxy Tab S11" },
  { regex: /Galaxy\s*Tab\s*S10\s*Ultra/i, canonical: "Galaxy Tab S10 Ultra" },
  { regex: /Galaxy\s*Tab\s*S10\+/i, canonical: "Galaxy Tab S10+" },
  { regex: /Galaxy\s*Tab\s*S10/i, canonical: "Galaxy Tab S10" },
  { regex: /Galaxy\s*Tab\s*S9\s*FE/i, canonical: "Galaxy Tab S9 FE" },
  { regex: /Galaxy\s*Tab\s*S9\s*Ultra/i, canonical: "Galaxy Tab S9 Ultra" },
  { regex: /Galaxy\s*Tab\s*S9\+/i, canonical: "Galaxy Tab S9+" },
  { regex: /Galaxy\s*Tab\s*S9/i, canonical: "Galaxy Tab S9" },
  { regex: /Galaxy\s*Tab\s*A9\+/i, canonical: "Galaxy Tab A9+" },
  { regex: /Galaxy\s*Tab\s*A9/i, canonical: "Galaxy Tab A9" },
  // Huawei MatePad
  { regex: /MatePad\s*Pro\s*13/i, canonical: "MatePad Pro 13" },
  { regex: /MatePad\s*Pro\s*11/i, canonical: "MatePad Pro 11" },
  { regex: /MatePad\s*Pro/i, canonical: "MatePad Pro" },
  { regex: /MatePad\s*11\.5\s*S/i, canonical: "MatePad 11.5 S" },
  { regex: /MatePad\s*11/i, canonical: "MatePad 11" },
  { regex: /MatePad/i, canonical: "MatePad" },
  // Xiaomi Pad
  { regex: /Xiaomi\s*Pad\s*7\s*Pro/i, canonical: "Xiaomi Pad 7 Pro" },
  { regex: /Xiaomi\s*Pad\s*7/i, canonical: "Xiaomi Pad 7" },
  { regex: /Xiaomi\s*Pad\s*6\s*Pro/i, canonical: "Xiaomi Pad 6 Pro" },
  { regex: /Xiaomi\s*Pad\s*6/i, canonical: "Xiaomi Pad 6" },
  { regex: /Redmi\s*Pad\s*Pro/i, canonical: "Redmi Pad Pro" },
  { regex: /Redmi\s*Pad/i, canonical: "Redmi Pad" },
  // Lenovo
  { regex: /Lenovo\s*Tab\s*M11/i, canonical: "Lenovo Tab M11" },
  { regex: /Lenovo\s*Tab\s*P12/i, canonical: "Lenovo Tab P12" },
  { regex: /Lenovo\s*Tab\s*P11/i, canonical: "Lenovo Tab P11" },
  { regex: /Lenovo\s*Tab/i, canonical: "Lenovo Tab" },
];

const WATCH_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  // Apple Watch
  { regex: /Watch\s*Ultra\s*3/i, canonical: "Apple Watch Ultra 3" },
  { regex: /Watch\s*Ultra\s*2/i, canonical: "Apple Watch Ultra 2" },
  { regex: /Watch\s*Ultra/i, canonical: "Apple Watch Ultra" },
  { regex: /Watch\s*Series\s*11/i, canonical: "Apple Watch Series 11" },
  { regex: /Watch\s*Series\s*10/i, canonical: "Apple Watch Series 10" },
  { regex: /Watch\s*Series\s*9/i, canonical: "Apple Watch Series 9" },
  { regex: /Watch\s*Series\s*8/i, canonical: "Apple Watch Series 8" },
  { regex: /Watch\s*Series\s*7/i, canonical: "Apple Watch Series 7" },
  { regex: /Watch\s*SE\s*3/i, canonical: "Apple Watch SE 3" },
  { regex: /Watch\s*SE\s*2/i, canonical: "Apple Watch SE 2" },
  { regex: /Watch\s*SE/i, canonical: "Apple Watch SE" },
  // Samsung
  { regex: /Galaxy\s*Watch\s*Ultra/i, canonical: "Galaxy Watch Ultra" },
  { regex: /Galaxy\s*Watch\s*8\s*Classic/i, canonical: "Galaxy Watch 8 Classic" },
  { regex: /Galaxy\s*Watch\s*8/i, canonical: "Galaxy Watch 8" },
  { regex: /Galaxy\s*Watch\s*7/i, canonical: "Galaxy Watch 7" },
  { regex: /Galaxy\s*Watch\s*6\s*Classic/i, canonical: "Galaxy Watch 6 Classic" },
  { regex: /Galaxy\s*Watch\s*6/i, canonical: "Galaxy Watch 6" },
  { regex: /Galaxy\s*Watch\s*FE/i, canonical: "Galaxy Watch FE" },
  // Huawei
  { regex: /Huawei\s*Watch\s*GT\s*5/i, canonical: "Huawei Watch GT 5" },
  { regex: /Huawei\s*Watch\s*GT\s*4/i, canonical: "Huawei Watch GT 4" },
  { regex: /Huawei\s*Watch\s*Ultimate/i, canonical: "Huawei Watch Ultimate" },
  { regex: /Huawei\s*Watch\s*D2/i, canonical: "Huawei Watch D2" },
  // Xiaomi
  { regex: /Xiaomi\s*Watch\s*S4/i, canonical: "Xiaomi Watch S4" },
  { regex: /Xiaomi\s*Watch\s*S3/i, canonical: "Xiaomi Watch S3" },
  { regex: /Mi\s*Band\s*9/i, canonical: "Xiaomi Mi Band 9" },
  { regex: /Mi\s*Band\s*8/i, canonical: "Xiaomi Mi Band 8" },
  // Garmin
  { regex: /Garmin\s*Fenix\s*8/i, canonical: "Garmin Fenix 8" },
  { regex: /Garmin\s*Fenix\s*7/i, canonical: "Garmin Fenix 7" },
  { regex: /Garmin\s*Forerunner\s*265/i, canonical: "Garmin Forerunner 265" },
  { regex: /Garmin\s*Forerunner/i, canonical: "Garmin Forerunner" },
  { regex: /Garmin\s*Venu\s*3/i, canonical: "Garmin Venu 3" },
  { regex: /Garmin\s*Descent\s*Mk2S/i, canonical: "Garmin Descent Mk2S" },
];

const APPLE_SKU_REGEX = /\b([A-Z]{2}[A-Z0-9]{2,6}TU\/A)\b/i;
const NUMERIC_SKU_REGEX = /^\d{6,13}$/;

export function extractModelFamily(title: string, brand?: string | null): ModelExtractionResult {
  if (!title) return { family: null, code: null };

  let code: string | null = null;
  const appleSkuMatch = title.match(APPLE_SKU_REGEX);
  if (appleSkuMatch) code = appleSkuMatch[1].toUpperCase();

  const brandLower = (brand ?? "").toLowerCase();

  if (/iphone/i.test(title)) {
    for (const { regex, canonical } of IPHONE_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/galaxy/i.test(title) || brandLower === "samsung") {
    for (const { regex, canonical } of SAMSUNG_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/xiaomi|redmi|poco/i.test(title) || brandLower === "xiaomi" || brandLower === "poco") {
    for (const { regex, canonical } of XIAOMI_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/tecno/i.test(title) || brandLower === "tecno" || brandLower === "tecno mobile") {
    for (const { regex, canonical } of TECNO_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/vivo/i.test(title) || brandLower === "vivo") {
    for (const { regex, canonical } of VIVO_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/infinix/i.test(title) || brandLower === "infinix") {
    for (const { regex, canonical } of INFINIX_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/oppo/i.test(title) || brandLower === "oppo") {
    for (const { regex, canonical } of OPPO_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/huawei/i.test(title) || brandLower === "huawei") {
    for (const { regex, canonical } of HUAWEI_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/reeder/i.test(title) || brandLower === "reeder") {
    for (const { regex, canonical } of REEDER_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/realme/i.test(title) || brandLower === "realme") {
    for (const { regex, canonical } of REALME_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/honor/i.test(title) || brandLower === "honor") {
    for (const { regex, canonical } of HONOR_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/casper/i.test(title) || brandLower === "casper") {
    for (const { regex, canonical } of CASPER_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/omix/i.test(title) || brandLower === "omix") {
    for (const { regex, canonical } of OMIX_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  if (/general\s*mobile|gm\s/i.test(title) || brandLower === "general mobile") {
    for (const { regex, canonical } of GENERAL_MOBILE_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  // Tablet patterns (iPad/Galaxy Tab/MatePad/Xiaomi Pad/Lenovo Tab)
  if (/ipad|galaxy\s*tab|matepad|xiaomi\s*pad|redmi\s*pad|lenovo\s*tab/i.test(title)) {
    for (const { regex, canonical } of TABLET_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  // Akilli saat patterns (Apple Watch/Galaxy Watch/Huawei Watch/Garmin/Mi Band)
  if (/\bwatch\b|mi\s*band|fenix|forerunner/i.test(title)) {
    for (const { regex, canonical } of WATCH_PATTERNS) {
      if (regex.test(title)) return { family: canonical, code };
    }
  }

  return { family: null, code };
}

export function isInvalidModelFamily(value: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (NUMERIC_SKU_REGEX.test(trimmed)) return true;
  if (APPLE_SKU_REGEX.test(trimmed)) return true;
  if (trimmed.length < 3) return true;
  return false;
}
