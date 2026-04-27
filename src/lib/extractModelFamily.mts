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
