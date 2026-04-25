/**
 * Header.tsx'teki kategori slug'larını DB'deki güncel slug'lara
 * eşleyen map. Header link oluştururken bu map kontrol edilir.
 *
 * Kapsam (68 kırık slug):
 *   - 1-to-1 rename: kesin tek hedef
 *   - 1-to-many: en uygun tek alt-kategoriye yönlendir (Çözüm C hibrit)
 *   - DB'ye yeni eklenecek (migration 005): babet, etek, film-dizi
 *
 * Migration 005 uygulandıktan sonra hedef slug'lar:
 *   babet → kadin-ayakkabi-babet
 *   etek → kadin-etek
 *   film-dizi → film-dizi (kitap-hobi altında)
 */

export const CATEGORY_SLUG_MAP: Record<string, string> = {
  // ─── 1-to-1 rename (kesin tek hedef) ───────────────────────────────
  "agiz-dis": "agiz-dis-bakim",
  "atistirmalik": "atistirmalik-cikolata",
  "balik-akvaryum": "akvaryum",
  "besik": "besik-bebek-yatak",
  "biberon": "biberon-emzik",
  "bilgisayar-laptop": "laptop",
  "esofman": "esofman-spor-giyim",
  "fitness": "fitness-kondisyon",
  "hirdavat-vida": "hirdavat",
  "hobi-sanat": "kitap-hobi",
  "kahve-cay-makinesi": "kahve-makinesi",
  "kus": "kus-urunleri",
  "lastik-jant": "oto-lastik-jant",
  "lego": "oyuncak-lego",
  "mutfak-aleti": "mutfak-aleti-diger",
  "navigasyon": "oto-navigasyon",
  "oyuncak": "oyuncak-egitici",
  "serum": "serum-ampul",
  "temizlik": "temizlik-deterjan",
  "topuklu": "kadin-ayakkabi-topuklu",
  "yoga": "yoga-pilates",
  "yuz-maskesi": "yuz-maskesi-skincare",
  "yuz-temizleme": "yuz-temizleyici",

  // ─── 1-to-many split (en uygun alt-kategori — Çözüm C) ─────────────
  // Cinsiyete göre giyim
  "kadin-giyim": "kadin-giyim-ust",
  "kadin-tisort-bluz": "kadin-giyim-ust",
  "kadin-kazak": "kadin-giyim-ust",
  "kadin-pantolon": "kadin-giyim-alt",
  "kadin-ceket-mont": "kadin-dis-giyim",
  "kadin-ayakkabi": "kadin-ayakkabi-sneaker",
  "kadin-bot": "kadin-ayakkabi-bot",
  "kadin-sneaker": "kadin-ayakkabi-sneaker",
  "kadin-sandalet": "kadin-ayakkabi-sneaker",
  "klasik-ayakkabi": "kadin-ayakkabi-sneaker",

  "erkek-giyim": "erkek-giyim-ust",
  "erkek-tisort": "erkek-giyim-ust",
  "erkek-gomlek": "erkek-giyim-ust",
  "erkek-pantolon": "erkek-giyim-alt",
  "erkek-ceket-mont": "erkek-dis-giyim",
  "erkek-ayakkabi": "erkek-giyim-alt",
  "erkek-sneaker": "erkek-giyim-alt",
  "erkek-bot": "erkek-giyim-alt",

  "elbise": "kadin-elbise",
  "takim-elbise": "erkek-takim-elbise",

  "spor-giyim": "spor-outdoor",
  "outdoor-giyim": "spor-outdoor",

  // Bakım / kozmetik
  "cilt-bakimi": "kozmetik-bakim",
  "sac-bakimi": "sac-bakim",
  "sac-stilizasyon": "sac-kurutma-sekillendirici",
  "erkek-bakimi": "kozmetik-bakim",
  "makyaj": "yuz-makyaji",

  // Bebek
  "bebek-arabasi": "anne-bebek",
  "bebek-bakim": "anne-bebek",
  "bebek-giyim": "anne-bebek",
  "bebek-kozmetik": "anne-bebek",
  "bebek-sagligi": "anne-bebek",

  // Pet
  "pet-bakim": "pet-shop",
  "diger-evcil-hayvan": "pet-diger",

  // Oyuncak
  "egitici-oyuncak": "oyuncak-egitici",
  "figur-oyuncak": "oyuncak-figur",
  "masa-oyunu": "oyuncak-masa",
  "rc-robot": "oyuncak-rc",

  // Mobilya
  "mobilya-dekorasyon": "mobilya-oturma",
  "ofis-mobilyasi": "mobilya-ofis",
  "ofis-elektronigi": "mobilya-ofis",

  // Otomotiv
  "oto-teyp": "otomotiv",

  // ─── No-match — DB'de migration 005 ile eklenecek ──────────────────
  "babet": "kadin-ayakkabi-babet",
  "etek": "kadin-etek",
  "film-dizi": "film-dizi",
};

/**
 * Slug çevir: kırık ise map'ten çevir, değilse aynısını döndür.
 * Header link href oluştururken kullanılır.
 */
export function resolveSlug(slug: string): string {
  return CATEGORY_SLUG_MAP[slug] || slug;
}

/**
 * Slug DB'de geçerli mi (Header link gizleme/gösterme için).
 * validSlugs: DB'den fetch edilen aktif kategori slug Set'i.
 */
export function isValidSlug(slug: string, validSlugs: Set<string>): boolean {
  return validSlugs.has(resolveSlug(slug));
}
