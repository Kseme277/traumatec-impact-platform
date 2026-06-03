# ADR-002: PostgreSQL 16 comme base relationnelle principale

## Status

Accepted

## Date

2026-06-03

## Context

TIP centralise événements, participants, templates, jobs de génération et journal d'audit. Les relations sont fortes (événement → participants, événement → jeu certificats, job → événement). Les budgets et rapports d'import nécessitent l'intégrité ACID. Le cahier des charges impose PostgreSQL 16 hébergé sur VPS TRAUMATEC.

## Options Considered

### Option A: PostgreSQL 16
- Pros: ACID, JSONB pour métadonnées flexibles, mature, conforme cahier des charges
- Cons: Gestion connexions (pool asyncpg)

### Option B: MongoDB
- Pros: Schéma flexible
- Cons: Relations complexes, pas adapté aux jointures événement/participants

### Option C: SQLite (dev only)
- Pros: Simplicité locale
- Cons: Non retenu en production VPS, pas de concurrence workers

## Decision

Nous choisissons **PostgreSQL 16** avec :
- SQLAlchemy 2 async + Alembic pour les migrations
- Colonnes JSONB pour `metadata_json`, `budget_json`, `error_report`
- Schéma documenté dans `database/schema.sql` (L-04)

## Consequences

- Service `postgres` dans Docker Compose
- Pool de connexions via `asyncpg`
- Migrations versionnées dans `backend/alembic/`
- Rétention audit ≥ 12 mois gérée par politique applicative (BNF-06)
