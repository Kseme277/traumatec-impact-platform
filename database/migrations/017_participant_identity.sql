-- Clé d'identité participant (dédoublonnage + historique multi-événements)
ALTER TABLE events.participants
    ADD COLUMN IF NOT EXISTS identity_key VARCHAR(160);

CREATE INDEX IF NOT EXISTS idx_events_participants_identity_key
    ON events.participants(identity_key)
    WHERE identity_key IS NOT NULL AND identity_key <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_participants_event_identity
    ON events.participants(event_id, identity_key)
    WHERE identity_key IS NOT NULL AND identity_key <> '';
