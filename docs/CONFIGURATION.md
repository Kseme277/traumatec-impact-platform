# Configuration TIP — Clerk, .env et démarrage

Guide pas à pas pour configurer **Traumatec Impact Platform** en local ou sur VPS.

---

## 1. Prérequis

- Docker Compose v2
- Compte [Clerk](https://dashboard.clerk.com) (gratuit en dev)
- Node 20+ (dev frontend hors Docker)

---

## 2. Configurer Clerk

### 2.1 Créer l'application

1. [dashboard.clerk.com](https://dashboard.clerk.com) → **Create application**
2. Nom : `Traumatec Impact Platform`
3. Désactiver l'inscription publique :
   - **Configure** → **Restrictions** → désactiver **Sign-up**

### 2.2 Activer les connexions

**Configure** → **SSO connections** :

| Provider | Action |
|----------|--------|
| **Email + Password** | Activé (connexion formulaire TIP) |
| **Google** | Activer OAuth |
| **X (Twitter)** | Activer OAuth |

Clerk associe automatiquement Google/X au compte existant si **l'email est identique** à celui créé par l'admin.

### 2.3 URLs de redirection (OAuth)

**Configure** → **Paths** :

| Champ | Valeur dev |
|-------|------------|
| Sign-in URL | `http://localhost:5173/signin` |
| Sign-up URL | `http://localhost:5173/signin` |
| After sign-in | `http://localhost:5173/` |

**Configure** → **Domains** → Allowed redirect URLs :

```
http://localhost:5173/sso-callback
http://localhost:8080/sso-callback
```

### 2.4 Récupérer les clés API

**Configure** → **API Keys** :

| Clé | Variable .env |
|-----|---------------|
| Publishable key (`pk_test_...`) | `VITE_CLERK_PUBLISHABLE_KEY` |
| Secret key (`sk_test_...`) | `CLERK_SECRET_KEY` |

**Configure** → **Domains** → votre domaine Clerk, ex. `secure-xxx.clerk.accounts.dev` :

```env
CLERK_JWKS_URL=https://secure-xxx.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://secure-xxx.clerk.accounts.dev
```

### 2.4.1 Connexion (mot de passe, OAuth, accès refusé)

| Situation | Cause | Action |
|-----------|--------|--------|
| *The verification strategy is not valid for this account* | Le compte Clerk n'a pas encore de mot de passe (création admin avec invitation) | Ouvrir le **lien d'invitation** → `/accept-invitation` → définir le mot de passe, **ou** se connecter avec **Google / X** (même email que l'invitation) |
| **Accès refusé** après OAuth | Email TIP ≠ email Clerk (ex. faute sur le domaine) | TIP lie automatiquement les emails **proches** (même identifiant local, domaine similaire) et synchronise `clerk_id` + email. À la création admin, le formulaire **vérifie Clerk** et propose l'email exact |
| Mot de passe oublié | Compte déjà activé | `/reset-password` |

**Clerk Dashboard** → **User & authentication** → **Email, password** : activer *Password* pour les comptes invités.

### 2.5 Emails Traumatec (Mailpit + webhook Clerk)

TIP envoie les emails **au nom de Traumatec** (`noreply@traumatec.org`) sans boîte mail réelle, via un relais SMTP open source.

**Développement — [Mailpit](https://github.com/axllent/mailpit)** (inclus dans Docker) :

| Port | Usage |
|------|--------|
| `1025` | SMTP (identity → Mailpit) |
| **http://localhost:8025** | Lire invitations et codes reset |

**Invitations** : TIP envoie un HTML Traumatec (Clerk `notify: false`). Visible dans Mailpit après création d'utilisateur.

**Mot de passe oublié** : pour capturer le code dans Mailpit :

1. Clerk → **Customization** → **Emails** → **Reset password** → désactiver **Delivered by Clerk**
2. Clerk → **Webhooks** → `https://URL-PUBLIQUE/api/webhooks/clerk` → `email.created`
3. `.env` : `CLERK_WEBHOOK_SECRET=whsec_...`

En local, tunnel (ngrok / Cloudflare) vers `http://localhost:8080`.

**Production** : remplacer Mailpit par **Postal** ou **Stalwart** sur `traumatec.org` (SPF/DKIM).

**Couleurs** : les templates HTML reprennent la palette TailAdmin du site (`brand-500`, `brand-950`, gris…) définie dans `frontend/src/index.css` et dupliquée côté backend dans `services/identity/app/services/brand_tokens.py`. Si vous changez le thème du site, mettez à jour ce fichier.

### Parcours email à la création d'un utilisateur

1. **Admin** remplit le formulaire → `POST /api/admin/users/create`
2. **Identity** appelle **Clerk API** : création user (`skip_password_requirement`) + invitation (`notify: false` — Clerk n'envoie pas d'email)
3. Clerk renvoie une **URL d'activation** (`invitation.url`)
4. **Identity** génère le HTML (couleurs TIP) et l'envoie via **SMTP** → Mailpit (dev) ou Postal (prod)
5. L'invité clique **Activer mon compte** → `/accept-invitation` → définit son mot de passe → connecté

Même logique au **bootstrap admin** au premier démarrage et via **Renvoyer** dans l'admin utilisateurs.

---

## 3. Fichier `.env` (racine du projet)

```bash
cp .env.example .env
```

Exemple complet :

```env
# --- PostgreSQL ---
POSTGRES_DB=tip
POSTGRES_USER=tip
POSTGRES_PASSWORD=tip_dev_password
POSTGRES_PORT=5432

# --- Clerk (backend identity-service) ---
CLERK_SECRET_KEY=sk_test_VOTRE_CLE
CLERK_JWKS_URL=https://VOTRE-DOMAINE.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://VOTRE-DOMAINE.clerk.accounts.dev

# --- Admin par défaut (créé au 1er démarrage) ---
BOOTSTRAP_ADMIN_EMAIL=admin@traumatec.org
BOOTSTRAP_ADMIN_NOM=Nkoa
BOOTSTRAP_ADMIN_PRENOM=Dominique
# Option A : Clerk crée l'user + envoie l'invitation (laisser vide)
BOOTSTRAP_ADMIN_CLERK_ID=
# Option B : user déjà créé dans Clerk → coller user_xxx
# BOOTSTRAP_ADMIN_CLERK_ID=user_2abc...

# --- Frontend (passé au conteneur frontend) ---
VITE_CLERK_PUBLISHABLE_KEY=pk_test_VOTRE_CLE
VITE_API_BASE_URL=/api
VITE_GUIDES_URL=http://localhost:3000

# --- Gateway ---
NGINX_PORT=8080
FRONTEND_PORT=5173
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
```

### Admin bootstrap — 2 options

| Option | Quand l'utiliser | Variables |
|--------|------------------|-----------|
| **A — Automatique** | Premier démarrage, Clerk crée + invite | `BOOTSTRAP_ADMIN_EMAIL`, `NOM`, `PRENOM` + `CLERK_SECRET_KEY` |
| **B — Manuel Clerk** | User déjà créé dans le dashboard Clerk | + `BOOTSTRAP_ADMIN_CLERK_ID=user_xxx` |

Au démarrage, `identity-service` vérifie si l'email existe en base ; sinon il crée l'admin.

---

## 4. Fichier `frontend/.env` (dev hors Docker)

```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_VOTRE_CLE
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8080
VITE_GUIDES_URL=http://localhost:3000
```

---

## 5. Lancer la stack

```bash
docker compose up --build
```

| URL | Usage |
|-----|--------|
| http://localhost:8080 | Gateway (recommandé) |
| http://localhost:5173 | Frontend Vite direct |
| http://localhost:8080/signin | **Page de connexion TIP** (template TailAdmin + Clerk) |
| http://localhost:8025 | **Mailpit** — emails dev (invitations, reset) |
| http://localhost:9001 | **MinIO Console** — documents (templates, générations, uploads) |
| http://localhost:9090 | **Prometheus** — collecte métriques |
| http://localhost:3001 | **Grafana** — dashboard TIP (login = `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`) |

> **Clerk en dev** :
> - **`http://localhost:5173`** (Vite) : pas de proxy Clerk — le SDK parle directement à `*.clerk.accounts.dev` (ajoutez `http://localhost:5173` dans Clerk → Allowed origins).
> - **`http://localhost:8080`** (nginx) : proxy `/__clerk` actif.
> - Évitez **`https://localhost:5173`** : Vite n’a pas de certificat TLS sur ce port.

### Observabilité (Prometheus + Grafana)

- Chaque microservice FastAPI expose `/metrics` (débit, latence, erreurs HTTP).
- **Prometheus** scrape aussi PostgreSQL, Redis, MinIO et les conteneurs Docker (cAdvisor).
- **Grafana** charge automatiquement le dashboard *Traumatec Impact Platform — Vue d'ensemble* (dossier **Traumatec TIP**).

| Port | Usage |
|------|--------|
| `9090` | Prometheus UI |
| `3001` | Grafana (évite le conflit avec Guides sur `3000`) |
| `8089` | cAdvisor (métriques conteneurs) |

### MinIO (stockage documents)

Les fichiers (templates Word, PDF générés, imports) sont stockés dans **MinIO** (S3-compatible), bucket `tip-documents` :

| Préfixe | Usage |
|---------|--------|
| `templates/` | Modèles catalog |
| `generations/` | Sorties docgen |
| `uploads/` | Fichiers importés (events) |

| Port | Usage |
|------|--------|
| `9000` | API S3 (services Docker) |
| **http://localhost:9001** | Console web (login = `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`) |

Variables `.env` : `STORAGE_BACKEND=minio` (défaut) ou `local` pour revenir au dossier `./storage`.

---

## 6. Parcours utilisateur

### Connexion (`/signin`)

Page TailAdmin + Clerk headless :

- Email + mot de passe
- Google OAuth
- X OAuth
- **Mot de passe oublié** → `/reset-password` (code par email)

Pas d'inscription publique. Les invités activent leur compte via le lien reçu par email → `/accept-invitation`.

### Tableaux de bord (selon rôle)

| Rôle | Dashboard | Menu extra |
|------|-----------|------------|
| **preparateur** | Métriques événements, actions rapides | Événements, Guides |
| **administrateur** | Métriques admin + lien utilisateurs | + Administration |

Les **deux rôles** voient :

- Lien **Guides procédures** (sidebar + carte dashboard) → `VITE_GUIDES_URL`
- Menu profil / déconnexion

### Créer d'autres utilisateurs

Admin connecté → **Administration → Utilisateurs** → formulaire d'invitation. Email Traumatec visible dans Mailpit (dev) ou boîte destinataire (prod).

---

## 7. Paquets documentaires (séminaires)

Les modèles Word sont dans `Seminaires/` (dossiers `PBO`, `Op`, `IEC`). Le service **catalog** les importe vers MinIO ; **docgen** assemble le ZIP.

| Étape | Qui | Action |
|-------|-----|--------|
| 1 | Admin | `docker compose up` (incl. `catalog`, `docgen`, `docgen-worker`, MinIO, Redis) |
| 2 | Admin | **Documents → Templates** → *Importer les séminaires* (ou `python scripts/seed_seminaire_templates.py`) |
| 3 | Tous | Vérifier les parcours (étapes par thème PBO / Operatory / IEC) |
| 4 | Préparateur | Statut **Prêt** ; thème sur la fiche ou choisi à la génération si absent |
| 5 | Préparateur | **Documents → Génération** → *Enregistrer le thème et générer* → télécharger |

Traçabilité MinIO : sources `templates/seminaires/sources/{lot}/PBO|Op|IEC/…` ; paquets `generations/events/{event_id}/{job_id}/`.

Détails : [ADR-013](decisions/013-seminaire-parcours-package-generation.md).

---

## 8. SSO avec Guides (Next.js)

Les deux apps partagent le **même projet Clerk**. Le rôle est stocké dans `public_metadata.role` à la création (`administrateur` | `preparateur`).

Guides (autre repo) lit ce metadata pour autoriser l'accès.

---

## 9. Dépannage

| Problème | Solution |
|----------|----------|
| « VITE_CLERK_PUBLISHABLE_KEY est requis » | Renseigner `frontend/.env` ou variables Docker frontend |
| « Compte non autorisé sur TIP » | User Clerk OK mais absent de `identity.utilisateurs` → admin doit le créer |
| « Compte désactivé » | Toggle admin ou `est_actif = false` |
| OAuth échoue | Vérifier redirect URLs `/sso-callback` dans Clerk |
| Bootstrap admin absent | Vérifier logs `identity` : `BOOTSTRAP_ADMIN_EMAIL` + `CLERK_SECRET_KEY` |
| Invitation non reçue | Vérifier Mailpit http://localhost:8025 ; logs `identity` ; `SMTP_ENABLED=true` |
| Code reset absent | Configurer webhook Clerk `email.created` + désactiver envoi Clerk sur template reset |
| Guides ne s'ouvre pas | Définir `VITE_GUIDES_URL` et rebuild frontend |

---

## 10. Variables — référence rapide

| Variable | Service | Description |
|----------|---------|-------------|
| `CLERK_SECRET_KEY` | identity | API backend Clerk |
| `CLERK_JWKS_URL` | identity | Validation JWT |
| `CLERK_ISSUER` | identity | Issuer JWT |
| `BOOTSTRAP_ADMIN_*` | identity | Admin initial |
| `VITE_CLERK_PUBLISHABLE_KEY` | frontend | SDK Clerk client |
| `VITE_GUIDES_URL` | frontend | Lien module Guides |
| `VITE_API_BASE_URL` | frontend | Préfixe API (`/api`) |
| `APP_PUBLIC_URL` | identity | URL publique TIP (liens invitation) |
| `SMTP_*` | identity | Relais email Traumatec (Mailpit en dev) |
| `CLERK_WEBHOOK_SECRET` | identity | Signature webhook `email.created` |
| `MAILPIT_UI_PORT` | docker | Interface web Mailpit (8025) |
| `STORAGE_BACKEND` | catalog, events, docgen | `minio` ou `local` |
| `MINIO_*` | catalog, events, docgen | Connexion bucket documents |
| `MINIO_CONSOLE_PORT` | docker | Console MinIO (9001) |
| `PROMETHEUS_PORT` | docker | UI Prometheus (9090) |
| `GRAFANA_PORT` | docker | UI Grafana (3001) |
| `GRAFANA_ADMIN_*` | grafana | Identifiants admin Grafana |
| `CADVISOR_PORT` | docker | Métriques conteneurs (8089) |
