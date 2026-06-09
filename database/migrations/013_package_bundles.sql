-- Migration : paquets templates versionnés (upload ZIP)
-- psql -U tip -d tip -f database/migrations/013_package_bundles.sql

CREATE TABLE IF NOT EXISTS catalog.package_bundles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_type        VARCHAR(32) NOT NULL,
    version             INTEGER NOT NULL,
    label               VARCHAR(255) NOT NULL,
    source_zip_name     VARCHAR(512),
    zip_path            VARCHAR(512) NOT NULL,
    file_count          INTEGER NOT NULL DEFAULT 0,
    analysis_json       JSONB,
    is_active           BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by_id      INTEGER,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_package_bundles_type_version UNIQUE (package_type, version)
);

CREATE INDEX IF NOT EXISTS idx_package_bundles_type ON catalog.package_bundles(package_type);
CREATE INDEX IF NOT EXISTS idx_package_bundles_active ON catalog.package_bundles(package_type, is_active);

ALTER TABLE catalog.event_profiles
    ADD COLUMN IF NOT EXISTS active_bundle_id UUID REFERENCES catalog.package_bundles(id);
