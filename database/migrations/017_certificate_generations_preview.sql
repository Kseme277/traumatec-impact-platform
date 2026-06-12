-- Aperçu ONLYOFFICE : premier certificat d'une génération ZIP

ALTER TABLE docgen.certificate_generations
    ADD COLUMN IF NOT EXISTS preview_storage_key VARCHAR(512),
    ADD COLUMN IF NOT EXISTS preview_filename VARCHAR(512);
