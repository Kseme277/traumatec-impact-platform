# ADR-008: Architecture microservices modulaire extensible

## Status

Accepted

## Date

2026-06-03

## Context

TIP doit évoluer dans l'écosystème Traumatec : greffer de nouveaux modules (Guides procédures, futurs services métier) sans refondre le cœur DocGen. L'équipe projet (2 devs + PO) développe en parallèle sur des périmètres distincts. Le déploiement reste un VPS unique via Docker Compose.

Contraintes :
- API Gateway unique pour le frontend (`/api/v1/*`)
- Contrats inter-services stables (Pydantic dans `tip_common.contracts`)
- Isolation logique des données (schéma PostgreSQL par service)
- Possibilité future de séparer les bases par service sans changer les contrats HTTP
- **Applications Traumatec externes** (ex. Guides Next.js) : dépôt et stack séparés, SSO Firebase — voir [ADR-009](009-external-apps-nextjs-guides.md)

## Options Considered

### Option A: Monolithe modulaire (ADR-001)
- Pros: Simplicité transactions, un seul déploiement
- Cons: Couplage fort, difficile de greffer un module indépendant (ex. Guides)

### Option B: Microservices HTTP + API Gateway + schémas DB séparés
- Pros: Isolation, développement parallèle, extensibilité
- Cons: Ops plus lourde (mitigée par Docker Compose)

### Option C: Microservices + base de données par service dès V1
- Pros: Isolation maximale
- Cons: Trop complexe pour 4 sprints ; jointures cross-service coûteuses

## Decision

Nous adoptons **microservices HTTP modulaires** avec :

| Service | Port | Schéma PG | Responsabilité |
|---------|------|-----------|----------------|
| `identity` | 8001 | `identity` | Auth Firebase, users, audit |
| `events` | 8002 | `events` | Événements, participants, import Excel |
| `catalog` | 8003 | `catalog` | Templates paquet, jeux certificats, profils |
| `docgen` | 8004 | `docgen` | Génération async + worker RQ |

Composants transverses :
- **`packages/tip-common`** : auth, factory FastAPI, contrats inter-services
- **Nginx** : API Gateway (routage par préfixe URL)
- **PostgreSQL 16** : une instance, schémas isolés (`identity`, `events`, `catalog`, `docgen`)
- **Redis** : file RQ pour DocGen
- **`services/_template/`** : squelette pour un nouveau **microservice Python TIP** (pas pour Guides Next.js)

Communication inter-services :
- **Synchrone** : HTTP interne Docker (`EVENTS_SERVICE_URL`, etc.)
- **Asynchrone** : Redis/RQ pour jobs DocGen lourds
- **Contrats** : modèles Pydantic dans `tip_common/contracts.py`

## Conséquences

- Structure `services/{identity,events,catalog,docgen}/` + `packages/tip-common/`
- Frontend appelle une seule URL gateway (`/api/v1/...`)
- Chaque service expose son propre OpenAPI (`:800x/api/v1/docs`)
- Ajout d'un microservice Python TIP = copier `_template`, route Nginx, service Compose
- Applications **externes** (Guides Next.js) = autre repo, lien URL + Firebase SSO — pas de `services/guides/`

## Greffage

- **Microservice Python TIP** : [services/README.md](../../services/README.md)
- **App externe Next.js** : [ADR-009](009-external-apps-nextjs-guides.md), [ecosystem.md](../ecosystem.md)
