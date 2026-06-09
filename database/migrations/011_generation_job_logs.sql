-- Migration : journal de génération des paquets documentaires
-- psql -U tip -d tip -f database/migrations/011_generation_job_logs.sql

ALTER TABLE docgen.generation_jobs
    ADD COLUMN IF NOT EXISTS logs_json JSONB;
