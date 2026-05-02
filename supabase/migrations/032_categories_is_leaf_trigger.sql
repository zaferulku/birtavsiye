-- 032_categories_is_leaf_trigger.sql
-- Migration 030 (is_leaf backfill) için kalıcılık trigger.
-- Yeni kategori eklenince / silinince / parent değişince ilgili parent'ın
-- is_leaf flag'i otomatik güncellenir. Manuel intervention gerekmez.
--
-- PATTERN: Migration 025 sync_category_level paralel (BEFORE → AFTER fark var).
-- BEFORE kullanılamaz çünkü parent'ın child sayısı için sorgular row'un
-- INSERT/DELETE etkisinden sonraki halini görmeli. AFTER trigger row visibility
-- (statement-level) sayesinde doğru sayım yapar.
--
-- KAPSAM:
-- - AFTER INSERT: NEW.parent_id parent'ı yeniden değerlendir (artık leaf değil)
-- - AFTER DELETE: OLD.parent_id parent'ı yeniden değerlendir (child kalmadı mı?)
-- - AFTER UPDATE OF parent_id: hem OLD hem NEW parent'ı yeniden değerlendir
-- - Diğer kolon UPDATE'leri (slug, name, keywords, ...) tetiklemez (performans)

BEGIN;

-- ----------------------------------------------------------------------------
-- Function: parent_id verilen parent'ın is_leaf'ini child sayısına göre sync.
-- ----------------------------------------------------------------------------
-- child VAR  → is_leaf = false (alt kategori barındırıyor)
-- child YOK  → is_leaf = true  (Migration 030 backfill semantiği)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_category_is_leaf()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_parent_ids UUID[];
BEGIN
  -- Etkilenen parent ID'leri toplama:
  IF TG_OP = 'INSERT' THEN
    affected_parent_ids := ARRAY[NEW.parent_id]::UUID[];
  ELSIF TG_OP = 'DELETE' THEN
    affected_parent_ids := ARRAY[OLD.parent_id]::UUID[];
  ELSIF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    affected_parent_ids := ARRAY[OLD.parent_id, NEW.parent_id]::UUID[];
  ELSE
    -- UPDATE ama parent_id değişmedi (slug/name/keywords vs.) — no-op.
    RETURN NULL;
  END IF;

  -- Her etkilenen parent için is_leaf'i child varlığına göre güncelle.
  -- NULL parent_id (root) etkilenmez (ARRAY içinde NULL filtreleniyor).
  UPDATE categories c
  SET is_leaf = NOT EXISTS (
    SELECT 1 FROM categories child WHERE child.parent_id = c.id
  )
  WHERE c.id = ANY(affected_parent_ids)
    AND c.id IS NOT NULL;

  RETURN NULL;  -- AFTER trigger; row değiştirmiyor, dönüş kullanılmıyor
END;
$$;

-- ----------------------------------------------------------------------------
-- Trigger bind: AFTER INSERT/UPDATE OF parent_id/DELETE
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_sync_category_is_leaf ON categories;
CREATE TRIGGER trg_sync_category_is_leaf
  AFTER INSERT OR UPDATE OF parent_id OR DELETE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION sync_category_is_leaf();

-- ----------------------------------------------------------------------------
-- Self-verify
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  trigger_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_proc WHERE proname = 'sync_category_is_leaf'
  ) INTO function_exists;

  IF NOT function_exists THEN
    RAISE EXCEPTION 'Migration 032: sync_category_is_leaf function YOK';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_category_is_leaf'
      AND tgrelid = 'categories'::regclass
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'Migration 032: trg_sync_category_is_leaf bind FAIL';
  END IF;

  RAISE NOTICE 'Migration 032: trg_sync_category_is_leaf bind OK';
END $$;

COMMIT;
