-- Migration : profils paquets AO Alliance (type événement + fichiers complets)
-- psql -U tip -d tip -f database/migrations/012_package_profiles.sql

ALTER TABLE catalog.event_profiles
    ADD COLUMN IF NOT EXISTS package_type VARCHAR(32),
    ADD COLUMN IF NOT EXISTS event_type_label VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_catalog_event_profiles_package_type
    ON catalog.event_profiles(package_type);
