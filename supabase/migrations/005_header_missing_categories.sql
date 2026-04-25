-- ============================================================================
-- Migration 005 — Header'da var, DB'de olmayan 3 kategori ekle
-- ============================================================================
--
-- Bağlam: Header.tsx 159 slug içeriyor, 68'i DB'de yoktu (kırık link).
-- 65 slug categorySlugMap.ts ile mevcut DB kategorilerine yönlendirildi;
-- 3 slug için DB'de hedef kategori yok → bu migration ile eklenir.
--
-- Parent verify (script kontrolü):
--   - kadin-ayakkabi-* siblings → parent = moda (kadin-ayakkabi yok)
--   - kadin-giyim-alt           → mevcut
--   - kitap-hobi                → mevcut (root)
--
-- KULLANIM: Bu SQL'i Supabase Dashboard SQL Editor'a yapıştır + Run.
-- ============================================================================

-- 1) Babet → kadın ayakkabı türü, parent = moda (kadin-ayakkabi mevcut değil)
INSERT INTO categories (slug, name, parent_id, is_leaf, is_active, sort_order)
SELECT 'kadin-ayakkabi-babet', 'Kadın Babet', id, true, true, 200
FROM categories WHERE slug = 'moda'
ON CONFLICT (slug) DO NOTHING;

-- 2) Etek → kadın alt giyim altında
INSERT INTO categories (slug, name, parent_id, is_leaf, is_active, sort_order)
SELECT 'kadin-etek', 'Kadın Etek', id, true, true, 200
FROM categories WHERE slug = 'kadin-giyim-alt'
ON CONFLICT (slug) DO NOTHING;

-- 3) Film & Dizi → kitap-hobi altında medya/eğlence
INSERT INTO categories (slug, name, parent_id, is_leaf, is_active, sort_order)
SELECT 'film-dizi', 'Film & Dizi', id, true, true, 200
FROM categories WHERE slug = 'kitap-hobi'
ON CONFLICT (slug) DO NOTHING;

-- ── Doğrulama ─────────────────────────────────────────────────────────────
SELECT slug, name, parent_id, is_leaf, is_active
FROM categories
WHERE slug IN ('kadin-ayakkabi-babet', 'kadin-etek', 'film-dizi');
