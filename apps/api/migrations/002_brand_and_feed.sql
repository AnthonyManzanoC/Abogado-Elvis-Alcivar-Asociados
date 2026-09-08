ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS publications_feed_idx
  ON publications (published_at DESC, id DESC)
  WHERE status = 'published';
