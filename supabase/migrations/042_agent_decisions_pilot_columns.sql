-- ============================================================================
-- Migration 042 — agent_decisions pilot kolonları
-- ============================================================================
-- NOT: Bu migration başlangıçta 041 olarak oluşturulmuştu, ancak 041
-- numarası 041_tag_leaf_categories ile çakıştı. 042'ye taşındı.
--
-- AMAÇ: category-link-auditor (pilot agent) ve gelecekteki cron-tetikli
-- script-agent'ları için 4 yeni kolon. agent_decisions zaten LLM kararı için
-- varolan tablo; pilot agent kararları (rule/script çıktıları) ve patch
-- önerme/uygulama akışı için bu kolonları ekliyoruz.
--
-- Yeni kolonlar:
--   status              text     — 'success' | 'partial' | 'error' | 'noop'
--   triggered_by        text     — 'cron' | 'manual' | 'webhook' | 'agent'
--   patch_proposed      boolean  — agent bir fix önerdi mi (henüz uygulanmadı)
--   patch_applied_at    timestamptz — fix uygulandığında damgalanır (null=öneri)
--
-- IDempotent: tüm ALTER'lar IF NOT EXISTS — tekrar çalıştırılabilir.
-- ROLLBACK güvenli: kolonlar nullable veya default'lu, mevcut INSERT'ler
-- kırılmaz.
-- ============================================================================

BEGIN;

ALTER TABLE agent_decisions
  ADD COLUMN IF NOT EXISTS status           text         NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS triggered_by     text         NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS patch_proposed   boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS patch_applied_at timestamptz  NULL;

-- CHECK constraint'ları (defansif — runtime'da yanlış değer girmesin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agent_decisions_status_chk'
  ) THEN
    ALTER TABLE agent_decisions
      ADD CONSTRAINT agent_decisions_status_chk
      CHECK (status IN ('success', 'partial', 'error', 'noop'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agent_decisions_triggered_by_chk'
  ) THEN
    ALTER TABLE agent_decisions
      ADD CONSTRAINT agent_decisions_triggered_by_chk
      CHECK (triggered_by IN ('cron', 'manual', 'webhook', 'agent'));
  END IF;
END $$;

-- Reporting indexler (admin paneli için)
CREATE INDEX IF NOT EXISTS idx_agent_decisions_status
  ON agent_decisions(agent_name, status, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_triggered_by
  ON agent_decisions(triggered_by, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_patch_pending
  ON agent_decisions(timestamp DESC)
  WHERE patch_proposed = true AND patch_applied_at IS NULL;

COMMIT;

-- ============================================================================
-- DOĞRULAMA (apply sonrası)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'agent_decisions'
--   AND column_name IN ('status', 'triggered_by', 'patch_proposed', 'patch_applied_at')
-- ORDER BY ordinal_position;
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'agent_decisions'::regclass
--   AND conname LIKE 'agent_decisions_%_chk';
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'agent_decisions'
--   AND indexname LIKE 'idx_agent_decisions_%';
