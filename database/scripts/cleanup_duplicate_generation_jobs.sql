-- Supprime les jobs de génération en doublon (même événement).
-- Conserve le job le plus récent par event_id (completed_at, puis created_at).
-- Les tables liées (workflow_steps, file_reviews) sont supprimées en CASCADE.

BEGIN;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY event_id
      ORDER BY completed_at DESC NULLS LAST, created_at DESC
    ) AS rn
  FROM docgen.generation_jobs
  WHERE status = 'completed'
),
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM docgen.generation_jobs
WHERE id IN (SELECT id FROM to_delete);

COMMIT;
