# Microservices TIP (backend Python)

Architecture **microservices FastAPI** internes au produit TIP — voir [ADR-008](../docs/decisions/008-microservices-modular-architecture.md).

> **Guides procédures** n'est **pas** un service ici : c'est une app **Next.js** dans un autre dépôt. Voir [docs/ecosystem.md](../docs/ecosystem.md) et [ADR-009](../docs/decisions/009-external-apps-nextjs-guides.md).

## Services actuels (ce repo)

```
services/
├── identity/     → /api/v1/auth, /users, /audit        (port 8001)
├── events/       → /api/v1/events, /imports, /participants (8002)
├── catalog/      → /api/v1/templates, /certificate-sets, /profiles (8003)
├── docgen/       → /api/v1/generations + worker RQ     (8004)
└── _template/    → Squelette nouveau microservice Python TIP
```

## Greffer un microservice Python TIP (ex. `notifications`)

Utiliser `_template` **uniquement** pour des extensions **backend DocGen / métier TIP** en FastAPI.

### 1. Créer le service

```bash
cp -r services/_template services/notifications
```

Adapter `config.py`, `main.py`, `Dockerfile`, `requirements.txt`.

### 2. Schéma PostgreSQL

```sql
CREATE SCHEMA IF NOT EXISTS notifications;
```

### 3. Nginx + Docker Compose

Ajouter upstream, `location /api/v1/notifications`, service Compose — voir sections détaillées ci-dessous.

### 4. Contrats

Payloads stables dans `packages/tip-common/tip_common/contracts.py`.

---

### API Gateway (Nginx)

```nginx
upstream tip_notifications {
    server notifications:8005;
}

location ~ ^/api/v1/notifications(/|$) {
    proxy_pass http://tip_notifications;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### Docker Compose

```yaml
notifications:
  build:
    context: .
    dockerfile: services/notifications/Dockerfile
  environment:
    DB_SCHEMA: notifications
    SERVICE_NAME: notifications
  ports:
    - "8005:8005"
  depends_on:
    postgres:
      condition: service_healthy
```

---

## Ce qu'on ne fait pas ici

| Cas | Où le faire |
|-----|-------------|
| Guides procédures (Next.js) | Autre dépôt, stack Next.js |
| Frontend métier Guides | `app/` Next.js du projet Guides |
| API Guides | Route Handlers Next.js ou API dédiée Guides |

## Bibliothèque partagée

```bash
pip install -e packages/tip-common
```

## Dev local

```bash
pip install -e packages/tip-common
pip install -r services/events/requirements.txt
uvicorn app.main:app --app-dir services/events --reload --port 8002
```
