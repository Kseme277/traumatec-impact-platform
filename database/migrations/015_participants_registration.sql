-- Inscriptions participants (export plateforme AO Alliance events.ao-alliance.org)

ALTER TABLE events.participants
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS statut VARCHAR(128),
    ADD COLUMN IF NOT EXISTS certificate_role VARCHAR(32) NOT NULL DEFAULT 'participant',
    ADD COLUMN IF NOT EXISTS registration_meta JSONB,
    ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_events_participants_certificate_role
    ON events.participants(event_id, certificate_role);
