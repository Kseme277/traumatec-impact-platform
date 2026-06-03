# ADR-009: Applications externes à stack propre (ex. Guides Next.js)

## Status

Accepted

## Date

2026-06-03

## Context

L'écosystème Traumatec comprend plusieurs produits. **TIP** (ce dépôt) couvre DocGen et la Processing Team. **Guides procédures** est un projet complémentaire, développé séparément en **Next.js** — pas en Python/FastAPI.

Le cahier des charges prévoit :
- Un lien contextuel TIP → Guides (évolution ultérieure)
- SSO commun via **Firebase Auth** (sans ré-authentification)
- Guides **hors périmètre** du code TIP

Il faut distinguer deux modes d'extension :

| Type | Exemple | Où ça vit | Stack |
|------|---------|-----------|-------|
| Module backend TIP | futur service métier Python | `services/` dans ce repo | FastAPI |
| Application Traumatec | Guides procédures | **Autre dépôt** | Next.js |

## Options Considered

### Option A: Guides comme microservice FastAPI dans `services/guides/`
- Pros: Un seul docker-compose, gateway unifié
- Cons: Mauvais alignement équipe/stack ; Guides déjà prévu en Next.js

### Option B: Application Next.js séparée + Firebase SSO
- Pros: Indépendance tech, déploiement autonome, équipes parallèles
- Cons: Deux frontends à maintenir ; pas de transactions DB partagées (acceptable)

### Option C: Monorepo avec Next.js dans `apps/guides/`
- Pros: Un seul repo Git
- Cons: Hors scope actuel TIP ; mélange cycles de release

## Decision

**Guides reste une application Next.js dans un dépôt séparé.** TIP ne l'implémente pas et ne duplique pas son backend.

Intégration prévue :

1. **Authentification** — même projet Firebase ; le JWT émis pour TIP est valide côté Guides (et inversement) une fois le SSO configuré
2. **Navigation** — lien sortant depuis TIP (`VITE_GUIDES_URL`) vers l'URL Guides ; pas d'iframe obligatoire
3. **API** — Guides possède sa propre API (Next.js Route Handlers ou backend dédié) ; **pas** de route `/api/v1/guides` dans le gateway TIP
4. **Données** — base propre à Guides ; pas de schéma `guides` dans PostgreSQL TIP
5. **Déploiement** — VPS ou hébergement séparé (Vercel, autre conteneur) ; optionnellement reverse proxy commun (`guides.traumatec.org` vs `tip.traumatec.org`)

Les **nouveaux modules Python métier** liés à DocGen restent greffables via `services/_template/` (voir [services/README.md](../../services/README.md)).

## Conséquences

- Ne pas créer `services/guides/` dans ce repo
- Documenter `VITE_GUIDES_URL` dans `.env.example` pour le lien UI
- `identity-service` reste la source de vérité des rôles TIP ; Guides gère ses propres rôles si besoin, synchronisés via Firebase UID
- Contrats inter-produits : OpenAPI ou payloads JSON documentés, pas de couplage SQL cross-app

## Voir aussi

- [ADR-008](008-microservices-modular-architecture.md) — microservices **internes** TIP
- [docs/ecosystem.md](../ecosystem.md) — vue écosystème Traumatec
