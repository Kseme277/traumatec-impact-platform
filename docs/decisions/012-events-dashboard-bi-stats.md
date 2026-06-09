# ADR-012: Agrégations BI sur GET /events/stats

## Status

Accepted

## Date

2026-06-03

## Context

Après ADR-011, les événements portent des colonnes financières et de participation. Le tableau de bord doit afficher des KPI et graphiques sans requêter 3 500 lignes côté client.

Contraintes :
- Volume actuel ~3,5k lignes — agrégation en mémoire acceptable à court terme.
- Un seul endpoint déjà consommé par `useEvents().loadStats()`.
- Cohérence avec les statuts AO normalisés (`Open`, `Closed`, `Cancelled`).

## Options Considered

### Option A : Agrégation Python dans `/events/stats` (scan complet)
- Pros : zéro migration, réutilise le hook existant, déploiement immédiat
- Cons : O(n) à chaque chargement dashboard ; limite ~10k lignes

### Option B : Vues matérialisées PostgreSQL + refresh post-import
- Pros : requêtes SQL rapides, scalable
- Cons : invalidation après import, complexité ops

### Option C : Endpoint dédié `/events/bi` + cache Redis
- Pros : séparation des concerns
- Cons : surface API et infra supplémentaires hors scope

## Decision

Nous choisissons **Option A** pour l’itération courante :

1. Extension de `DashboardStatsResponse` : `financial`, `participants`, `by_project_status`, `by_region` (top 12).
2. Section UI `EventsBiDashboardSection` partagée entre dashboards admin et préparateur.
3. Graphiques ApexCharts : donut statut AO, barres régions, types et carte pays existants.

Si le volume dépasse ~10k ou la latence `/stats` devient visible, nous migrerons vers **Option B** (voir conséquences).

## Consequences

- Les KPI CHF restent vides tant qu’un réimport post-migration 010 n’a pas été fait.
- Le client ne calcule plus de sommes financières localement.
- `by_region` tronqué à 12 entrées pour lisibilité graphique.
- Référence code : `services/events/app/api/v1/events.py` (`dashboard_stats`).

## References

- [ADR-011](011-events-excel-full-import-and-bi-prep.md)
- `frontend/src/features/events/EventsBiDashboardSection.tsx`
