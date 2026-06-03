# ADR-005: React 19 + TailAdmin comme socle frontend

## Status

Accepted

## Date

2026-06-03

## Context

Le cahier des charges retient React 18+, TypeScript, Tailwind CSS, React Hook Form + Zod. Le template TailAdmin (React + Tailwind v4 + Vite) fournit sidebar, dashboard, formulaires et composants UI prêts à adapter pour la Processing Team (BNF-01).

## Options Considered

### Option A: TailAdmin template (renommé `frontend/`)
- Pros: Gain de temps S1, dashboard admin existant, Tailwind v4
- Cons: Nettoyage des pages demo (charts, ecommerce) nécessaire

### Option B: Create React App from scratch
- Pros: Pas de dette template
- Cons: Retard S1, réimplémentation layout

### Option C: Next.js App Router
- Pros: SSR, routing intégré
- Cons: Non spécifié cahier des charges, complexité inutile (SPA suffisante)

## Decision

Nous adoptons le template TailAdmin dans `frontend/` :
- Package renommé `tip-frontend`
- Proxy Vite `/api` → backend FastAPI
- Pages à créer : Dashboard TIP, Fiche événement, Admin templates/certificats, Auth Firebase

## Consequences

- Suppression progressive des pages demo (`/line-chart`, ecommerce widgets)
- Ajout ultérieur : axios, react-hook-form, zod, firebase client SDK
- Structure pages alignée modules cahier des charges (section VI)
