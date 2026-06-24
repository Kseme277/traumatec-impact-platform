-- Référence : la synchronisation des enseignants certificats → référentiel
-- s'effectue via l'API POST /v1/teachers/sync-from-participants (admin)
-- ou automatiquement à chaque import d'inscriptions (rôle enseignant).
--
-- Exemple (avec token admin) :
--   curl -X POST http://localhost:8080/v1/teachers/sync-from-participants \
--     -H "Authorization: Bearer $TOKEN"

SELECT 'Use POST /v1/teachers/sync-from-participants or Referentiels → Importer depuis les certificats' AS hint;
