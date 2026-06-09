-- Traumatec Impact Platform — schéma multi-services (PostgreSQL 16)
-- Chaque microservice possède son schéma PostgreSQL pour isolation logique.
-- Voir ADR-008 et docs/architecture.md

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS docgen;

-- ---------------------------------------------------------------------------
-- identity-service (Clerk + utilisateurs locaux)
-- ---------------------------------------------------------------------------
CREATE TABLE identity.utilisateurs (
    id                  SERIAL PRIMARY KEY,
    clerk_id            VARCHAR(128) UNIQUE,
    username            VARCHAR(64) UNIQUE,
    email               VARCHAR(255) NOT NULL UNIQUE,
    nom                 VARCHAR(128) NOT NULL,
    prenom              VARCHAR(128) NOT NULL,
    phone               VARCHAR(32),
    role                VARCHAR(32) NOT NULL
                        CHECK (role IN ('administrateur', 'preparateur')),
    est_actif           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    activation_date     TIMESTAMPTZ,
    deactivation_date   TIMESTAMPTZ,
    last_access         TIMESTAMPTZ
);

CREATE INDEX idx_identity_utilisateurs_clerk_id ON identity.utilisateurs(clerk_id);
CREATE INDEX idx_identity_utilisateurs_email ON identity.utilisateurs(email);
CREATE INDEX idx_identity_utilisateurs_role ON identity.utilisateurs(role);

CREATE TABLE identity.audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        INTEGER REFERENCES identity.utilisateurs(id),
    action          VARCHAR(64) NOT NULL,
    entity_type     VARCHAR(64),
    entity_id       VARCHAR(64),
    payload         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_identity_audit_created_at ON identity.audit_logs(created_at DESC);

CREATE TABLE identity.audit_export_config (
    id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    interval_hours  INTEGER NOT NULL DEFAULT 24,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    last_run_at     TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by_id   INTEGER REFERENCES identity.utilisateurs(id)
);

INSERT INTO identity.audit_export_config (id, interval_hours, enabled) VALUES (1, 24, true);

CREATE TABLE identity.audit_export_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key     VARCHAR(512) NOT NULL,
    period_start    TIMESTAMPTZ NOT NULL,
    period_end      TIMESTAMPTZ NOT NULL,
    record_count    INTEGER NOT NULL DEFAULT 0,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_identity_audit_export_files_created ON identity.audit_export_files(created_at DESC);

-- ---------------------------------------------------------------------------
-- catalog-service (templates, jeux certificats, profils)
-- ---------------------------------------------------------------------------
CREATE TABLE catalog.package_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(64) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    document_type       VARCHAR(64) NOT NULL,
    file_path           VARCHAR(512) NOT NULL,
    version             INTEGER NOT NULL DEFAULT 1,
    placeholders        JSONB,
    preparation_themes  JSONB,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_catalog_package_templates_code_version UNIQUE (code, version)
);

CREATE TABLE catalog.certificate_template_sets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(64) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    preparation_theme   VARCHAR(32) CHECK (preparation_theme IN ('operatory', 'pbo', 'iec')),
    event_type          VARCHAR(64),
    is_default          BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalog.certificate_template_steps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_set_id     UUID NOT NULL REFERENCES catalog.certificate_template_sets(id) ON DELETE CASCADE,
    step_number         INTEGER NOT NULL CHECK (step_number IN (1, 2)),
    name                VARCHAR(255) NOT NULL,
    file_path           VARCHAR(512) NOT NULL,
    placeholders        JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_catalog_cert_steps_set_step UNIQUE (template_set_id, step_number)
);

CREATE TABLE catalog.package_bundles (
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

CREATE INDEX idx_package_bundles_type ON catalog.package_bundles(package_type);
CREATE INDEX idx_package_bundles_active ON catalog.package_bundles(package_type, is_active);

CREATE TABLE catalog.event_profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    preparation_theme       VARCHAR(32),
    package_type            VARCHAR(32),
    event_type_label        VARCHAR(64),
    active_bundle_id        UUID REFERENCES catalog.package_bundles(id),
    package_template_ids    JSONB,
    certificate_set_id      UUID REFERENCES catalog.certificate_template_sets(id),
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalog.system_settings (
    key             VARCHAR(128) PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO catalog.system_settings (key, value) VALUES
    ('zip_name_pattern', '{project_number}_{event_name}_{city}_{country}_{date}'),
    ('storage_gc_enabled', 'true'),
    ('storage_gc_retention_days', '14')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- events-service
-- ---------------------------------------------------------------------------
CREATE TABLE events.annual_imports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year            INTEGER NOT NULL,
    filename        VARCHAR(255) NOT NULL,
    imported_by_id  INTEGER NOT NULL REFERENCES identity.utilisateurs(id),
    row_count       INTEGER NOT NULL DEFAULT 0,
    error_report    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events.events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annual_import_id        UUID REFERENCES events.annual_imports(id),
    project_number          VARCHAR(64) NOT NULL,
    title                   VARCHAR(512) NOT NULL,
    event_type              VARCHAR(255),
    preparation_theme       VARCHAR(32) CHECK (preparation_theme IN ('operatory', 'pbo', 'iec')),
    country                 VARCHAR(128),
    city                    VARCHAR(128),
    region                  VARCHAR(128),
    responsible_person      VARCHAR(255),
    project_status          VARCHAR(128),
    start_date              DATE,
    end_date                DATE,
    status                  VARCHAR(32) NOT NULL DEFAULT 'imported'
                            CHECK (status IN ('imported', 'in_progress', 'ready', 'generated', 'error')),
    metadata_json           JSONB,
    budget_json             JSONB,
    certificate_context_json JSONB,
    generation_options_json JSONB,
    certificate_set_id      UUID REFERENCES catalog.certificate_template_sets(id),
    event_profile_id        UUID REFERENCES catalog.event_profiles(id),
    package_template_ids    JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events.participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    full_name       VARCHAR(255) NOT NULL,
    hospital        VARCHAR(255),
    row_number      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events.event_attachments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    attachment_type     VARCHAR(64) NOT NULL,
    file_path           VARCHAR(512) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_events_status ON events.events(status);
CREATE INDEX idx_events_events_project_number ON events.events(project_number);
CREATE INDEX idx_events_participants_event_id ON events.participants(event_id);

-- ---------------------------------------------------------------------------
-- docgen-service
-- ---------------------------------------------------------------------------
CREATE TABLE docgen.generation_jobs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                UUID NOT NULL REFERENCES events.events(id) ON DELETE CASCADE,
    requested_by_id         INTEGER NOT NULL REFERENCES identity.utilisateurs(id),
    status                  VARCHAR(32) NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    rq_job_id               VARCHAR(128),
    zip_path                VARCHAR(512),
    zip_filename            VARCHAR(512),
    zip_purged_at           TIMESTAMPTZ,
    certificate_count       INTEGER NOT NULL DEFAULT 0,
    template_versions_json  JSONB,
    logs_json               JSONB,
    error_message           TEXT,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_docgen_jobs_event_id ON docgen.generation_jobs(event_id);
CREATE INDEX idx_docgen_jobs_status ON docgen.generation_jobs(status);
