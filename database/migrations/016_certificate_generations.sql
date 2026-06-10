-- Générations de certificats participants (stockage MinIO)

CREATE TABLE IF NOT EXISTS docgen.certificate_generations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    requested_by_id     INTEGER NOT NULL REFERENCES identity.utilisateurs(id),
    role_filter         VARCHAR(32) NOT NULL DEFAULT 'all',
    certificate_count   INTEGER NOT NULL DEFAULT 0,
    storage_key         VARCHAR(512) NOT NULL,
    filename            VARCHAR(512) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_docgen_certificate_generations_event_id
    ON docgen.certificate_generations(event_id, created_at DESC);
