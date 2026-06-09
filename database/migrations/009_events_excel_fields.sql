-- Champs Projects.xlsx AO Alliance + reset des événements importés

ALTER TABLE events.events
    ADD COLUMN IF NOT EXISTS responsible_person VARCHAR(255),
    ADD COLUMN IF NOT EXISTS region VARCHAR(128),
    ADD COLUMN IF NOT EXISTS project_status VARCHAR(128);

DELETE FROM events.events;
DELETE FROM events.annual_imports;
