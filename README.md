# Traumatec Impact Platform (TIP)

Plateforme web d'automatisation des paquets documentaires AO Alliance / TRAUMATEC.

**Stack :** Microservices FastAPI · PostgreSQL 16 · Redis/RQ · MinIO · React 19 · Nginx Gateway · Clerk · Prometheus · Grafana · Docker Compose

## Structure du monorepo

```
traumatec-impact-platform/
├── packages/tip-common/       # Bibliothèque partagée (auth, config, storage S3, métriques)
├── services/
│   ├── identity/              # Auth Clerk, users, audit, emails SMTP   (:8001)
│   ├── events/                # Événements, imports, participants       (:8002)
│   ├── catalog/               # Templates, certificats, profils         (:8003)
│   ├── docgen/                # Génération + worker RQ                  (:8004)
│   └── _template/             # Squelette nouveau microservice
├── frontend/                  # React 19 + TailAdmin + Clerk
├── database/schema.sql        # Schémas PostgreSQL par service
├── infra/
│   ├── nginx/                 # API Gateway
│   ├── prometheus/            # Scrape config
│   └── grafana/               # Dashboard & provisioning
├── docs/                      # Configuration, architecture, ADR
└── docker-compose.yml
```

## Démarrage local

```bash
cp .env.example .env
# Renseigner Clerk, mots de passe Postgres/MinIO — voir docs/CONFIGURATION.md
docker compose up --build
```


| URL                                                                    | Description                    |
| ---------------------------------------------------------------------- | ------------------------------ |
| [http://localhost:8080](http://localhost:8080)                         | Gateway Nginx (frontend + API) |
| [http://localhost:8080/signin](http://localhost:8080/signin)           | Connexion TIP                  |
| [http://localhost:8025](http://localhost:8025)                         | Mailpit — emails dev           |
| [http://localhost:9001](http://localhost:9001)                         | MinIO Console — documents      |
| [http://localhost:9090](http://localhost:9090)                         | Prometheus                     |
| [http://localhost:3001](http://localhost:3001)                         | Grafana — dashboard TIP        |
| [http://localhost:8001/api/v1/docs](http://localhost:8001/api/v1/docs) | OpenAPI identity               |
| [http://localhost:8002/api/v1/docs](http://localhost:8002/api/v1/docs) | OpenAPI events                 |
| [http://localhost:8003/api/v1/docs](http://localhost:8003/api/v1/docs) | OpenAPI catalog                |
| [http://localhost:8004/api/v1/docs](http://localhost:8004/api/v1/docs) | OpenAPI docgen                 |


> Premier build Docker : comptez ~3 Go de téléchargement (images + dépendances). Les builds suivants utilisent le cache.

## Dev local (un service Python)

```bash
pip install -e packages/tip-common
pip install -r services/events/requirements.txt
uvicorn app.main:app --app-dir services/events --reload --port 8002
```

Frontend hors Docker :

```bash
cd frontend && cp .env.example .env && npm install && npm run dev
```

## Greffer un module


| Type                         | Guide                                                |
| ---------------------------- | ---------------------------------------------------- |
| Microservice Python TIP      | [services/README.md](services/README.md)             |
| App externe (Guides Next.js) | [docs/ecosystem.md](docs/ecosystem.md) — autre dépôt |


Guides : projet Next.js séparé, SSO Clerk commun, lien `VITE_GUIDES_URL` depuis TIP.

## Documentation

- **[Configuration Clerk, .env et démarrage](docs/CONFIGURATION.md)**
- [Architecture microservices](docs/architecture.md)
- [Schéma base de données](database/README.md)
- [ADR](docs/decisions/)

