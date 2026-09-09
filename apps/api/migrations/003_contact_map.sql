-- Additive only: preserve the existing identity, contact details and SMTP settings.
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS map_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS map_embed_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS map_query TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS map_load_on_click BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS office_directions TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_heading TEXT NOT NULL DEFAULT 'Hablemos con claridad sobre tu situación.',
  ADD COLUMN IF NOT EXISTS contact_intro TEXT NOT NULL DEFAULT 'Comparte la información inicial mediante la agenda. El detalle sensible del caso se revisará de forma privada durante la consulta.',
  ADD COLUMN IF NOT EXISTS whatsapp_message TEXT NOT NULL DEFAULT 'Hola, quisiera información para agendar una consulta legal.';
