# ADR-011: Import Excel complet et préparation BI dashboard

## Status

Accepted

## Date

2026-06-03

## Context

Le fichier **Projects.xlsx** (AO Alliance) contient 17 colonnes structurantes, dont des champs financiers et de participation non persistés jusqu’ici. Seuls titre, numéro de projet, dates, statut, localisation et responsable étaient mappés en colonnes SQL.

La roadmap produit exige :
1. **Conserver 100 % des colonnes Excel** pour alimenter un futur tableau de bord BI (KPI, graphiques, cartes).
2. **UX d’import** dédiée : bouton → modal avec zone d’upload, progression et aide (pas une carte pleine page sur la liste événements).

Contraintes :
- Schéma PostgreSQL `events` déjà partagé (ADR-008).
- Import annuel = purge puis réinsertion (pas de doublons).
- Volume ~3 500 lignes — parsing synchrone avec job async existant.

## Options Considered

### Option A : Tout dans `metadata_json` uniquement
- Pros : une migration minimale, flexible pour colonnes futures
- Cons : agrégations BI (SUM montants, filtres région) plus lentes et requêtes SQL verbeuses

### Option B : Colonnes typées BI + snapshot JSON complet
- Pros : KPI SQL/API simples ; snapshot `metadata_json.excel` garde l’intégralité du fichier (y compris colonnes inconnues)
- Cons : migration + mapping à maintenir quand le fichier Excel évolue

### Option C : Table fille `event_excel_fields` (EAV)
- Pros : schéma ultra flexible
- Cons : complexité requêtes, hors scope équipe actuelle

## Decision

Nous choisissons **Option B** :

1. **Migration `010_events_excel_bi_fields.sql`** : `cost_center`, `participants_expected`, `participants_real`, `amount_chf`, `payments_done_chf`, `percent_paid`, `balance_to_pay_chf`.
2. **`metadata_json`** sur chaque événement :
   ```json
   {
     "source": "projects.xlsx",
     "excel": { "Title": "…", "Amount (CHF)": 12000, … }
   }
   ```
   Clés = libellés exacts de la ligne d’en-tête Excel.
3. **Parser** (`excel_import.py`) : map colonnes connues + snapshot intégral par ligne.
4. **Frontend** : bouton « Importer Projects.xlsx » ouvrant un **modal** (pattern `useModal` + `Modal`), dropzone et barre de progression inchangées côté API.

Le dashboard BI (graphiques, KPI) est décrit dans [ADR-012](012-events-dashboard-bi-stats.md) : agrégations `/events/stats` étendues + section `EventsBiDashboardSection`.

## Consequences

- Réimport obligatoire après déploiement pour remplir les nouveaux champs.
- Taille JSONB par ligne augmente légèrement ; acceptable pour ~3,5k lignes.
- Les endpoints `EventResponse` exposent les champs BI et `metadata_json` pour debug / exports futurs.
- Nouvelle colonne Excel non mappée : automatiquement dans `metadata_json.excel` sans changement code.
- UI import retirée de la page liste (modal uniquement) — parcours plus clair pour l’admin.

## References

- [ADR-008](008-microservices-modular-architecture.md) — service `events`
- `services/events/app/services/excel_import.py`
- `frontend/src/features/events/EventsImportModal.tsx`
