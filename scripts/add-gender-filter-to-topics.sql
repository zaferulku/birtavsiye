ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS gender_filter TEXT;

CREATE INDEX IF NOT EXISTS idx_topics_gender_filter ON topics(gender_filter);
