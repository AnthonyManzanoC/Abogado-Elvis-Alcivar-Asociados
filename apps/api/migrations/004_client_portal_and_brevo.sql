ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT NOT NULL DEFAULT '/images/elvis-burgundy.png',
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT NOT NULL DEFAULT '/images/elvis-profile-new.png',
  ADD COLUMN IF NOT EXISTS results_phrase TEXT NOT NULL DEFAULT 'Resultados de tener una defensa técnica y eficaz',
  ADD COLUMN IF NOT EXISTS rights_phrase TEXT NOT NULL DEFAULT 'Tu libertad y tus derechos no son negociables',
  ADD COLUMN IF NOT EXISTS assistant_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mail_provider TEXT NOT NULL DEFAULT 'smtp' CHECK (mail_provider IN ('smtp','brevo')),
  ADD COLUMN IF NOT EXISTS brevo_api_key_encrypted TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brevo_sender_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brevo_sender_name TEXT NOT NULL DEFAULT 'Abg. Elvis Alcívar Burgos',
  ADD COLUMN IF NOT EXISTS public_site_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS virtual_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS virtual_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (virtual_fee >= 0),
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT NOT NULL DEFAULT '';

ALTER TABLE publications ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS modality TEXT NOT NULL DEFAULT 'presencial' CHECK (modality IN ('presencial','virtual')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required','pending','submitted','approved','rejected')),
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_note TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meeting_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_hash TEXT,
  ADD COLUMN IF NOT EXISTS tracking_token_encrypted TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_expires_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS appointments_tracking_hash_idx ON appointments(tracking_hash) WHERE tracking_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  practice_area TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_review','answered','closed')),
  client_note TEXT NOT NULL DEFAULT '',
  tracking_hash TEXT UNIQUE NOT NULL,
  tracking_token_encrypted TEXT NOT NULL,
  tracking_expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
  privacy_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','application/pdf')),
  file_data BYTEA NOT NULL CHECK (octet_length(file_data) BETWEEN 8 AND 5242880),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payment_receipts_appointment_idx ON payment_receipts(appointment_id);

CREATE TABLE IF NOT EXISTS notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key TEXT UNIQUE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_encrypted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  provider_message_id TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notification_jobs_pending_idx ON notification_jobs(next_attempt_at) WHERE status IN ('pending','sending');
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;
