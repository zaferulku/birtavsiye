-- Add parent_id to topic_answers for nested/threaded replies
ALTER TABLE topic_answers
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES topic_answers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_topic_answers_parent_id ON topic_answers(parent_id);
