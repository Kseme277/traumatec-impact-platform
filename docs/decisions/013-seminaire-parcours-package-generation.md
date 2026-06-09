# ADR-013: Parcours séminaires et génération de paquets documentaires

## Status

Accepted

## Date

2026-06-03

## Context

Les modèles Word des programmes séminaires vivent dans `Seminaires/` (PBO, Operatory/Op, IEC). Chaque événement TIP porte un `preparation_theme` (`pbo`, `operatory`, `iec`). Il faut importer ces fichiers une fois, les exposer comme parcours ordonnés par étape, puis produire un ZIP paquet par événement prêt.

## Decision

1. **Catalog** : scan récursif `Seminaires/{PBO,Op,IEC}/`, archivage traçabilité `templates/seminaires/sources/{batch}/{dossier}/…` (sous-dossiers inclus), templates actifs `templates/seminaires/{theme}/{CODE}.ext`.
2. **Profils** : un `event_profiles` actif par thème, `package_template_ids` ordonnés par étape.
3. **API** : `GET /api/v1/parcours/`, `POST /api/v1/profiles/seed-seminaires` (admin).
4. **Docgen** : job RQ fusionne chaque `.docx` via **docxtpl** (variables `{{ project_number }}`, `{{ title }}`, `{{ city }}`, `{{ start_date }}`, alias FR `numero_projet`, `ville`, `date_debut`, etc.) puis ZIP + copie sous `generations/events/{event_id}/{job_id}/` ; certificats (ADR-007) hors scope initial.
5. **Génération** : si `preparation_theme` absent → UI demande le thème (enregistrement événement) ; API renvoie 422 si lancement sans thème.
6. **Frontend** : pages Documents → parcours + import admin + génération avec suivi job et téléchargement ZIP.

## Workflow (étapes utilisateur)

| Étape | Acteur | Action |
|-------|--------|--------|
| 1 | Admin | Démarrer stack (Postgres, MinIO, catalog, docgen, worker Redis). |
| 2 | Admin | Documents → Templates → **Importer les séminaires** (ou script `scripts/seed_seminaire_templates.py`). |
| 3 | Préparateur | Vérifier les parcours (liste des étapes par thème). |
| 4 | Préparateur | Événement : statut **Prêt** ; thème sur la fiche ou à la génération si absent. |
| 5 | Préparateur | Documents → Génération → choisir thème si demandé → générer → télécharger le ZIP. |

## Consequences

- Fichiers `.doc` conservés tels quels (pas de conversion docx).
- Sous-dossiers archivés dans MinIO ; pour le parcours actif, un seul fichier par étape (priorité au chemin le plus court).
- Sans seed catalog, docgen échoue avec message explicite.
