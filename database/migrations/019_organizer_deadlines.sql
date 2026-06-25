-- Responsable organisation (import), notification admin, échéances workflow
-- psql -U tip -d tip -f database/migrations/019_organizer_deadlines.sql

ALTER TABLE events.events
    ADD COLUMN IF NOT EXISTS generation_ready_notified_at TIMESTAMPTZ;

ALTER TABLE docgen.generation_jobs
    ADD COLUMN IF NOT EXISTS phase_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS phase_due_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_organizer_responsible
    ON events.events(organizer_responsible_user_id);

CREATE INDEX IF NOT EXISTS idx_docgen_jobs_phase_due
    ON docgen.generation_jobs(phase_due_at)
    WHERE phase_due_at IS NOT NULL;
