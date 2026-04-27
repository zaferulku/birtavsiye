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
