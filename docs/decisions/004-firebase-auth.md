# ADR-004: Authentification Firebase Auth

## Status

Superseded by [ADR-010](010-clerk-auth-closed-app.md)

## Date

2026-06-03

## Context

BF-01 exige une connexion sécurisée via Firebase. L'exigence transverse prévoit un SSO futur avec la plateforme Guides procédures. TIP ne stocke pas de mots de passe localement. Les rôles métier (préparateur, administrateur) sont gérés côté application dans PostgreSQL.

## Options Considered

### Option A: Firebase Auth + Admin SDK (backend)
- Pros: Conforme cahier des charges, SSO Guides possible, JWT standard
- Cons: Dépendance Google Cloud, configuration credentials serveur

### Option B: Auth maison (JWT + bcrypt)
- Pros: Autonomie totale
- Cons: Hors périmètre, duplication avec Guides, charge sécurité

### Option C: Keycloak self-hosted
- Pros: SSO enterprise
- Cons: Complexité ops disproportionnée pour le projet

## Decision

Nous choisissons **Firebase Auth** :
- Frontend : Firebase Client SDK (connexion utilisateur)
- Backend : validation du token ID via Firebase Admin SDK dans `core/security.py`
- Table `users` : mapping `firebase_uid` → `role` (preparator | admin)

## Consequences

- Variables `FIREBASE_PROJECT_ID` et credentials service account
- Endpoints protégés par `HTTPBearer` + dépendances `get_current_user` / `require_admin`
- Matrice droits section 6.5 appliquée au niveau API
