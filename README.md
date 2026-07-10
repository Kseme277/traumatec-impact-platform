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
├── Template/                  # Sources AO Alliance (Word/Excel/PDF)
├── Packages/                  # Paquets syncés Template → OP_S, OP_C… (généré)
├── database/
│   ├── schema.sql             # Init PostgreSQL
│   └── migrations/            # Évolutions SQL idempotentes
├── infra/                     # Nginx, Prometheus, Grafana
├── docs/                      # Configuration, architecture, ADR
└── docker-compose.yml
```

## Démarrage local (complet)

```bash
cp .env.example .env
# Renseigner Clerk, mots de passe Postgres/MinIO — voir docs/CONFIGURATION.md

docker compose up --build -d

# 1) Migrations SQL (si base déjà créée avant les dernières migrations)
bash scripts/apply_all_migrations.sh

# 2) Sync Template/ → Packages/{TYPE}/ puis import catalog (MinIO + DB)
bash scripts/deploy_templates.sh

# 3) (Optionnel) Importer le plan annuel réel
#    UI : Événements → Importer Projects.xlsx  (fichier Projects.xlsx à la racine)
#    ou télécharger le modèle mis en forme :
#    GET /api/v1/imports/annual-plan/template  → tip-import-evenements.xlsx
```

| URL | Description |
|-----|-------------|
| http://localhost:8080 | Gateway Nginx (frontend + API) |
| http://localhost:8080/signin | Connexion TIP |
| http://localhost:8025 | Mailpit — emails dev |
| http://localhost:9001 | MinIO Console — documents |
| http://localhost:9090 | Prometheus |
| http://localhost:3001 | Grafana — dashboard TIP |

> Premier build Docker : ~3 Go. Les builds suivants utilisent le cache.

## Templates documentaires

| Étape | Commande / UI |
|-------|----------------|
| Sources | Dossier [`Template/`](Template/) |
| Sync vers codes TIP | `python3 scripts/sync_template_to_packages.py` |
| Bootstrap catalog | `docker compose exec catalog python /app/scripts/bootstrap_packages_db.py --force` |
| UI | Documents → Templates → Charger paquets système |

Détail des types : [`Packages/README.md`](Packages/README.md) · Parcours import : [`docs/import-templates-flow.md`](docs/import-templates-flow.md)

## Modèles Excel téléchargeables

| Modèle | Endpoint | Usage |
|--------|----------|--------|
| `tip-import-evenements.xlsx` | `GET /api/v1/imports/annual-plan/template` | Plan annuel (format Projects.xlsx) |
| `tip-import-participants-certificats.xlsx` | `GET /api/v1/participants/import-template` | Liste participants / certificats |

Les fichiers générés ont une mise en forme TIP (bandeau, en-têtes, exemples, listes déroulantes, feuille Aide).

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

## Production EC2

```bash
bash scripts/deploy-ec2.sh
# Après up : sync + bootstrap templates (inclus dans le script)
```

## Greffer un module

| Type | Guide |
|------|-------|
| Microservice Python TIP | [services/README.md](services/README.md) |
| App externe (Guides Next.js) | [docs/ecosystem.md](docs/ecosystem.md) |

## Documentation

- **[Configuration Clerk, .env et démarrage](docs/CONFIGURATION.md)**
- [Architecture microservices](docs/architecture.md)
- [Schéma base de données](database/README.md)
- [Parcours d'import](docs/import-templates-flow.md)
- [ADR](docs/decisions/)
