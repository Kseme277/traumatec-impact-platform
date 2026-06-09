-- Profil utilisateur enrichi (username, téléphone, dates d'activation / accès)
ALTER TABLE identity.utilisateurs
    ADD COLUMN IF NOT EXISTS username VARCHAR(64),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS activation_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deactivation_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_utilisateurs_username
    ON identity.utilisateurs (username)
    WHERE username IS NOT NULL;
