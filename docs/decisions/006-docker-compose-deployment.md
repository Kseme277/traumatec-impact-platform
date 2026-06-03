# ADR-006: Docker Compose pour dev et production VPS

## Status

Accepted

## Date

2026-06-03

## Context

BNF-09 exige Docker Compose identique dev/prod. L'équipe développe sous Linux ou Windows WSL2. Le déploiement cible est un VPS Linux (2 vCPU, 4–8 Go RAM) avec PostgreSQL, Redis, API, worker, frontend et reverse proxy HTTPS.

## Options Considered

### Option A: Docker Compose multi-services
- Pros: Reproductibilité, conforme cahier des charges, un `docker compose up`
- Cons: Consommation RAM locale (~6 conteneurs)

### Option B: Installation bare-metal sur VPS
- Pros: Pas de overhead conteneur
- Cons: Dérive dev/prod, non conforme BNF-09

### Option C: Kubernetes
- Pros: Orchestration avancée
- Cons: Disproportionné pour le périmètre académique

## Decision

Nous déployons via **Docker Compose** avec les services :

| Service | Rôle |
|---------|------|
| `postgres` | PostgreSQL 16 (schémas identity, events, catalog, docgen) |
| `redis` | Broker RQ |
| `identity` | Microservice auth/users/audit |
| `events` | Microservice événements/participants |
| `catalog` | Microservice templates/certificats |
| `docgen` | Microservice génération |
| `docgen-worker` | Worker RQ |
| `frontend` | React Vite |
| `nginx` | API Gateway (routage `/api/v1/*` par module) |

Volumes persistants : `pgdata`, `storage/`.

## Conséquences

- Fichiers : `docker-compose.yml`, `services/*/Dockerfile`, `infra/nginx/nginx.conf`
- Point d'entrée unique : Nginx `:8080`
- Healthchecks par service : `/health` et `/health/{service}` via gateway
- Greffage module : ajouter un service Compose + upstream Nginx

## Voir aussi

- [ADR-008](008-microservices-modular-architecture.md)
