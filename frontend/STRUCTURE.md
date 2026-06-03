# Frontend — structure TIP

Le template TailAdmin est réorganisé par **features métier** (cahier des charges section VI).

## Arborescence cible

```
src/
├── api/                    # Client HTTP, hooks React Query (S1+)
├── config/                 # Constantes, routes, rôles
├── features/
│   ├── auth/               # BF-01 — Connexion Firebase, guards
│   ├── dashboard/          # BF-03 — Indicateurs, liste événements, filtres
│   ├── events/             # BF-04..BF-11 — Fiche événement, participants
│   ├── admin/              # BF-17..BF-21 — Templates, certificats, users, audit
│   └── generations/        # BF-12..BF-16 — Lancement, suivi, téléchargement ZIP
├── layout/                 # AppLayout, sidebar, header (TailAdmin)
├── components/             # UI générique (form, table, modal…)
├── context/                # Theme, sidebar
├── pages/                  # Pages demo TailAdmin (à retirer progressivement)
└── types/                  # Types TypeScript alignés API OpenAPI
```

## Mapping pages → routes TIP (Sprint 1–4)

| Route | Feature | Besoins |
|-------|---------|---------|
| `/` | dashboard | BF-03 |
| `/events/:id` | events | BF-04, BF-08 |
| `/admin/templates` | admin | BF-17 |
| `/admin/certificate-sets` | admin | BF-18 |
| `/admin/users` | admin | BF-20 |
| `/admin/audit` | admin | BF-21 |
| `/signin` | auth | BF-01 |

## Conventions

- Formulaires : React Hook Form + Zod (à ajouter S1)
- Auth : Firebase Client SDK → header `Authorization: Bearer <token>`
Le frontend communique via le **API Gateway Nginx** (`/api/v1/*`), jamais directement avec les ports 8001–8004 en production.
