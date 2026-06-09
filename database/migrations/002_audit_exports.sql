-- Migration : exports d'audit planifiés (MinIO)
-- psql -U tip -d tip -f database/migrations/002_audit_exports.sql

CREATE TABLE IF NOT EXISTS identity.audit_export_config (
    id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    interval_hours  INTEGER NOT NULL DEFAULT 24,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    last_run_at     TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by_id   INTEGER REFERENCES identity.utilisateurs(id)
);

INSERT INTO identity.audit_export_config (id, interval_hours, enabled)
VALUES (1, 24, true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS identity.audit_export_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key     VARCHAR(512) NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    record_count    INTEGER NOT NULL DEFAULT 0,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_audit_export_files_created
    ON identity.audit_export_files(created_at DESC);
