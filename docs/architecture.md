# Architecture — Traumatec Impact Platform

## Vue d'ensemble (microservices)

```mermaid
flowchart TB
    subgraph client [Navigateur]
        FE[React Frontend]
    end

    subgraph gateway [API Gateway]
        NGINX[Nginx :80]
    end

    subgraph services [Microservices FastAPI]
        ID[identity :8001]
        EV[events :8002]
        CA[catalog :8003]
        DG[docgen :8004]
    end

    subgraph async [Async]
        W[RQ Worker]
    end

    subgraph infra [Infrastructure]
        PG[(PostgreSQL 16)]
        REDIS[(Redis 7)]
        STORAGE[storage/]
    end

    FB[Firebase Auth]

    FE --> NGINX
    NGINX -->|/api/v1/auth,users,audit| ID
    NGINX -->|/api/v1/events,imports,participants| EV
    NGINX -->|/api/v1/templates,certificate-sets,profiles| CA
    NGINX -->|/api/v1/generations| DG
    NGINX -->|/*| FE
    FE --> FB
    ID --> FB
    ID --> PG
    EV --> PG
    CA --> PG
    DG --> PG
    EV -.->|HTTP interne| CA
    DG -.->|HTTP interne| EV
    DG -.->|HTTP interne| CA
    DG --> REDIS
    W --> REDIS
    W --> PG
    W --> STORAGE
    CA --> STORAGE
    DG --> STORAGE
```

## Écosystème Traumatec (hors repo)

**Guides procédures** = application **Next.js séparée** (autre dépôt, autre stack). Intégration avec TIP via **Firebase SSO** + lien URL — pas via un microservice Python.

```mermaid
flowchart LR
    TIP[TIP React + FastAPI] --> FB[Firebase Auth]
    GUIDES[Guides Next.js] --> FB
    TIP -.->|VITE_GUIDES_URL| GUIDES
```

Détails : [ecosystem.md](ecosystem.md) · [ADR-009](decisions/009-external-apps-nextjs-guides.md)

## Isolation des données (schémas PostgreSQL)

| Schéma | Service | Tables |
|--------|---------|--------|
| `identity` | identity | users, audit_logs |
| `catalog` | catalog | package_templates, certificate_*, event_profiles, system_settings |
| `events` | events | annual_imports, events, participants, event_attachments |
| `docgen` | docgen | generation_jobs |

Les clés étrangères cross-schéma (ex. `events.events.certificate_set_id → catalog.*`) restent valides dans une instance PostgreSQL unique. Une migration future vers des bases séparées remplacera ces FK par des appels API.

## Routage API Gateway

| Préfixe URL | Service |
|-------------|---------|
| `/api/v1/auth`, `/users`, `/audit` | identity |
| `/api/v1/events`, `/imports`, `/participants` | events |
| `/api/v1/templates`, `/certificate-sets`, `/profiles` | catalog |
| `/api/v1/generations` | docgen |

Le frontend n'appelle **jamais** les ports 8001–8004 directement en production : tout passe par Nginx (`:8080`).

## Package partagé `tip-common`

```
packages/tip-common/tip_common/
├── app_factory.py    # create_service_app()
├── config.py         # BaseServiceSettings + URLs inter-services
├── security.py       # Firebase JWT, rôles
├── contracts.py      # Contrats Pydantic inter-modules
└── database.py       # SQLAlchemy helpers
```

## Étendre le système

| Besoin | Approche |
|--------|----------|
| Nouvelle brique **backend TIP** (Python) | `services/_template/` → [services/README.md](../services/README.md) |
| Nouveau **produit Traumatec** (ex. Guides) | **Autre dépôt**, stack libre (Next.js) → [ecosystem.md](ecosystem.md) |

Ne pas greffer Next.js dans le `docker-compose.yml` TIP.

## Pipeline DocGen

```mermaid
sequenceDiagram
    participant U as Préparateur
    participant GW as Nginx
    participant DG as docgen-service
    participant EV as events-service
    participant Q as Redis/RQ
    participant W as Worker

    U->>GW: POST /api/v1/generations/events/{id}
    GW->>DG: forward
    DG->>EV: GET event + participants (HTTP interne)
    DG->>Q: enqueue run_docgen_job
    DG-->>U: job_id
    Q->>W: run_docgen_job
    W->>W: pipeline 2 étapes certificats + ZIP
    U->>GW: GET /generations/{id}/download
    GW->>DG: forward
```

## Décisions documentées

- [ADR-009 — Apps externes Next.js (Guides)](decisions/009-external-apps-nextjs-guides.md)
- [Écosystème Traumatec](ecosystem.md)

## Hors périmètre TIP

- Workflow validation in-app
- Module contrôle conformité automatisé
