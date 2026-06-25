-- Supprime tous les jobs de génération de paquets (workflow, revues fichiers en CASCADE).
-- Ne touche pas aux templates catalog ni aux événements.

BEGIN;

DELETE FROM docgen.generation_jobs;

COMMIT;
