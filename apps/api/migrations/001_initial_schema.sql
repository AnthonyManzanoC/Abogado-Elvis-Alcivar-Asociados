CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Administración Alcívar Legal',
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  firm_name TEXT NOT NULL DEFAULT 'Alcívar Legal',
  attorney_name TEXT NOT NULL DEFAULT 'Abg. Elvis Alcívar Burgos',
  professional_title TEXT NOT NULL DEFAULT 'Abogado litigante',
  tagline TEXT NOT NULL DEFAULT 'Defensa estratégica. Atención directa.',
  biography TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL DEFAULT '593988937221',
  contact_email TEXT NOT NULL DEFAULT '',
  office_address TEXT NOT NULL DEFAULT 'Edificio Álavama, Sucre y 5 de Junio, Babahoyo',
  maps_url TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT 'https://www.instagram.com/ab.elvisalcivar/',
  tiktok_url TEXT NOT NULL DEFAULT 'https://www.tiktok.com/@ab.elvisalcivar',
  timezone TEXT NOT NULL DEFAULT 'America/Guayaquil',
  consultation_minutes INTEGER NOT NULL DEFAULT 60 CHECK (consultation_minutes BETWEEN 15 AND 240),
  office_hours_note TEXT NOT NULL DEFAULT 'Atención con cita previa',
  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 465 CHECK (smtp_port BETWEEN 1 AND 65535),
  smtp_secure BOOLEAN NOT NULL DEFAULT TRUE,
  smtp_user TEXT NOT NULL DEFAULT '',
  smtp_password_encrypted TEXT NOT NULL DEFAULT '',
  smtp_from_email TEXT NOT NULL DEFAULT '',
  smtp_from_name TEXT NOT NULL DEFAULT 'Alcívar Legal',
  notify_attorney BOOLEAN NOT NULL DEFAULT TRUE,
  notify_client BOOLEAN NOT NULL DEFAULT TRUE,
  reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'scale',
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'article' CHECK (kind IN ('article', 'case', 'video', 'photo', 'news')),
  platform TEXT NOT NULL DEFAULT 'website' CHECK (platform IN ('website', 'instagram', 'tiktok', 'youtube', 'facebook')),
  media_url TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  legal_disclaimer TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60 CHECK (slot_minutes BETWEEN 15 AND 240),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (day_of_week, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 240),
  practice_area TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  source TEXT NOT NULL DEFAULT 'website',
  privacy_accepted_at TIMESTAMPTZ NOT NULL,
  reminder_sent_at TIMESTAMPTZ,
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_unique
  ON appointments (starts_at)
  WHERE status IN ('scheduled', 'confirmed');

CREATE INDEX IF NOT EXISTS appointments_starts_at_idx ON appointments (starts_at);
CREATE INDEX IF NOT EXISTS publications_status_published_idx ON publications (status, published_at DESC);

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'skipped', 'failed')),
  error_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (id, biography)
VALUES (1, 'Abogado litigante en Babahoyo, dedicado a la defensa técnica, la preparación rigurosa de cada caso y la comunicación directa con sus clientes.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO availability (day_of_week, start_time, end_time, slot_minutes)
VALUES
  (1, '09:00', '17:00', 60),
  (2, '09:00', '17:00', 60),
  (3, '09:00', '17:00', 60),
  (4, '09:00', '17:00', 60),
  (5, '09:00', '17:00', 60)
ON CONFLICT DO NOTHING;

INSERT INTO services (slug, title, summary, description, icon, display_order)
VALUES
  ('defensa-penal', 'Defensa penal', 'Estrategia y acompañamiento desde la investigación hasta la audiencia.', 'Análisis del expediente, diseño de teoría del caso, defensa en flagrancia y representación durante el proceso penal.', 'shield', 1),
  ('litigio-procesal', 'Litigio procesal', 'Preparación técnica para cada etapa del proceso.', 'Patrocinio judicial, elaboración de escritos, preparación de audiencias y seguimiento claro de actuaciones.', 'scale', 2),
  ('asesoria-legal', 'Asesoría legal', 'Orientación directa para tomar decisiones con claridad.', 'Consulta confidencial, evaluación inicial de riesgos y definición de los siguientes pasos jurídicos.', 'briefcase', 3),
  ('familia', 'Familia', 'Acompañamiento firme y humano en asuntos familiares.', 'Asesoría y patrocinio en situaciones de familia, priorizando soluciones responsables y comunicación directa.', 'users', 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO publications (slug, title, excerpt, body, kind, platform, thumbnail_url, external_url, featured, status, legal_disclaimer, published_at)
VALUES
  ('defensa-con-preparacion', 'Cada audiencia comienza mucho antes de entrar a sala', 'Preparación, evidencia y una estrategia procesal clara.', 'El trabajo jurídico responsable parte de escuchar, revisar el expediente y construir una estrategia adaptada a los hechos. Cada caso exige un análisis propio.', 'article', 'website', '/images/elvis-desk.png', '', TRUE, 'published', 'Contenido informativo. No constituye asesoría legal ni garantiza resultados.', NOW()),
  ('conoce-tu-defensa', 'Conoce tus opciones antes de decidir', 'Una consulta oportuna permite ordenar hechos, riesgos y alternativas.', 'La primera consulta sirve para comprender el problema, identificar información urgente y trazar una ruta de acción realista.', 'video', 'tiktok', '/images/elvis-office.png', 'https://www.tiktok.com/@ab.elvisalcivar', FALSE, 'published', 'Los resultados dependen de las circunstancias particulares de cada asunto.', NOW() - INTERVAL '1 day'),
  ('atencion-directa-babahoyo', 'Atención directa en Babahoyo', 'Un espacio profesional para hablar de tu caso con confidencialidad.', 'Agenda una cita y recibe la confirmación de forma inmediata. La información compartida será tratada de manera reservada.', 'photo', 'instagram', '/images/elvis-teal.png', 'https://www.instagram.com/ab.elvisalcivar/', FALSE, 'published', 'La relación abogado-cliente se formaliza únicamente mediante acuerdo expreso.', NOW() - INTERVAL '2 days')
ON CONFLICT (slug) DO NOTHING;
