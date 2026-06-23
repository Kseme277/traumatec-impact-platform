-- Nettoie les paquets « approved » qui encombrent la file validateur (tests / doublons).
-- Remet workflow_status à « generated » ; conserve fichiers MinIO et historique des étapes.

BEGIN;

WITH reset AS (
  UPDATE docgen.generation_jobs
  SET workflow_status = 'generated',
      assigned_reviewer_id = NULL,
      assigned_validator_id = NULL
  WHERE status = 'completed'
    AND workflow_status = 'approved'
  RETURNING id
)
DELETE FROM docgen.package_file_reviews
WHERE generation_job_id IN (SELECT id FROM reset);

COMMIT;
