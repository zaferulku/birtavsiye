-- 030_categories_is_leaf_backfill.sql
-- Migration 021 sonrası is_leaf flag'i sadece siniflandirilmamis için true.
-- Recursive: child'sı olmayan tüm kategoriler leaf say.
-- Beklenen: 172 leaf=true (1 + 58 + 113), 44 leaf=false (14 root + 30 child'lı mid)
--
-- KOD ETKİSİ: SIFIR. Sadece DB UPDATE. Chatbot loadCategories
-- artık 172 kategori yükleyecek (önceden 1).
--
-- Kök neden: P6.1-AUDIT bisect ile tespit edildi. 4 commit'lik bisect hepsi
-- 0/5 PASS verdi → sebep daha eski. is_leaf flag distribution kontrol edildi:
-- 215/216 kategori is_leaf=false. Chatbot loadCategories'in is_leaf=true
-- filtresi yüzünden 1 kategori yüklüyordu → kategori match her zaman fail.

BEGIN;

UPDATE categories c
SET is_leaf = NOT EXISTS (
  SELECT 1 FROM categories child WHERE child.parent_id = c.id
);

-- Self-verify
DO $$
DECLARE
  leaf_count INT;
  total_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM categories;
  SELECT COUNT(*) INTO leaf_count FROM categories WHERE is_leaf = true;

  RAISE NOTICE 'Migration 030: % kategori leaf=true, % toplam', leaf_count, total_count;

  IF leaf_count <> 172 THEN
    RAISE WARNING 'Migration 030: leaf count beklenmedik: % (172 hedeflenmişti)', leaf_count;
  ELSE
    RAISE NOTICE 'Migration 030: OK 172/216 leaf';
  END IF;
END $$;

COMMIT;
