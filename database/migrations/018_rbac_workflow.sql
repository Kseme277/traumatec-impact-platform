-- RBAC multi-rôles + workflow paquets + notifications

CREATE TABLE IF NOT EXISTS identity.user_roles (
    user_id     INTEGER NOT NULL REFERENCES identity.utilisateurs(id) ON DELETE CASCADE,
    role        VARCHAR(32) NOT NULL
                CHECK (role IN ('administrateur', 'support_administratif', 'controle_procedure', 'validateur', 'preparateur')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role)
);

INSERT INTO identity.user_roles (user_id, role)
SELECT u.id,
       CASE WHEN u.role = 'preparateur' THEN 'support_administratif' ELSE u.role END
FROM identity.utilisateurs u
ON CONFLICT DO NOTHING;

ALTER TABLE identity.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;
ALTER TABLE identity.utilisateurs
    ADD CONSTRAINT utilisateurs_role_check
    CHECK (role IN ('administrateur', 'preparateur', 'support_administratif', 'controle_procedure', 'validateur'));

UPDATE identity.utilisateurs SET role = 'support_administratif' WHERE role = 'preparateur';

CREATE TABLE IF NOT EXISTS identity.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     INTEGER NOT NULL REFERENCES identity.utilisateurs(id) ON DELETE CASCADE,
    type        VARCHAR(64) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    link        VARCHAR(512),
    payload_json JSONB,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_notifications_user_created
    ON identity.notifications(user_id, created_at DESC);

ALTER TABLE docgen.generation_jobs
    ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(32) NOT NULL DEFAULT 'generated',
    ADD COLUMN IF NOT EXISTS assigned_reviewer_id INTEGER REFERENCES identity.utilisateurs(id),
    ADD COLUMN IF NOT EXISTS assigned_validator_id INTEGER REFERENCES identity.utilisateurs(id);

UPDATE docgen.generation_jobs
SET workflow_status = 'approved'
WHERE status = 'completed' AND workflow_status = 'generated';

CREATE TABLE IF NOT EXISTS docgen.package_workflow_steps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_job_id   UUID NOT NULL REFERENCES docgen.generation_jobs(id) ON DELETE CASCADE,
    step                VARCHAR(64) NOT NULL,
    action              VARCHAR(64) NOT NULL,
    actor_id            INTEGER REFERENCES identity.utilisateurs(id),
    actor_name          VARCHAR(255),
    comment             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_workflow_steps_job
    ON docgen.package_workflow_steps(generation_job_id, created_at);

CREATE TABLE IF NOT EXISTS docgen.package_file_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generation_job_id   UUID NOT NULL REFERENCES docgen.generation_jobs(id) ON DELETE CASCADE,
    template_id         UUID,
    template_code       VARCHAR(128) NOT NULL,
    file_path           VARCHAR(512),
    status              VARCHAR(32) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
    comment             TEXT,
    reviewed_by_id      INTEGER REFERENCES identity.utilisateurs(id),
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (generation_job_id, template_code)
);

CREATE INDEX IF NOT EXISTS idx_package_file_reviews_job
    ON docgen.package_file_reviews(generation_job_id);
