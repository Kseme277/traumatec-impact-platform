# ADR-010: Authentification Clerk (application fermée)

## Status

Accepted — supersedes [ADR-004](004-firebase-auth.md) (Firebase)

## Date

2026-06-03

## Context

TIP est une **application fermée** : aucune inscription publique. L'administrateur crée les comptes (email, nom, prénom, rôle) ; Clerk envoie l'invitation. Les utilisateurs se connectent via formulaire personnalisé (email/mot de passe, Google OAuth, X OAuth). Le rôle métier est stocké dans PostgreSQL (`identity.utilisateurs`) et réplié dans `public_metadata` Clerk pour le SSO Guides (Next.js).

## Options Considered

### Option A: Firebase Auth (ADR-004)
- Pros: Déjà mentionné au cahier des charges initial
- Cons: Invitations admin, OAuth X, metadata SSO Guides moins alignés avec stack Next.js Guides

### Option B: Clerk
- Pros: Invitations natives, OAuth Google/X, JWT RS256, `public_metadata` partagé avec Guides, SDK headless React
- Cons: Service SaaS, configuration dashboard requise

### Option C: Auth.js maison
- Pros: Contrôle total
- Cons: Charge sécurité, hors délai projet

## Decision

Nous adoptons **Clerk** :

| Couche | Rôle |
|--------|------|
| Clerk | Identité, OAuth, invitations, mots de passe |
| PostgreSQL `identity.utilisateurs` | Rôles, statut actif, autorisation TIP |
| identity-service | Validation JWT + routes admin |

Flux :
1. Admin → `POST /api/admin/users/create` → PostgreSQL + Clerk API (`skip_password_requirement`) + invitation
2. User → connexion Clerk (headless UI)
3. API → JWT Bearer → vérif JWKS → lookup `clerk_id` → check `est_actif`

Rôles : `administrateur` | `preparateur`

## Conséquences

- Désactiver sign-up public dans le dashboard Clerk
- Activer Google et X OAuth ; **account linking par email exact** (comportement Clerk par défaut)
- Variables : `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `CLERK_ISSUER`, `VITE_CLERK_PUBLISHABLE_KEY`
- Guides Next.js lit `public_metadata.role` depuis le même projet Clerk

## Configuration Clerk (checklist)

1. Désactiver « Sign up » public
2. Activer Google + X OAuth
3. Copier Publishable Key → frontend, Secret Key → identity-service
4. JWKS URL : `https://<votre-domaine-clerk>/.well-known/jwks.json`
5. Issuer : `https://<votre-domaine-clerk>`
