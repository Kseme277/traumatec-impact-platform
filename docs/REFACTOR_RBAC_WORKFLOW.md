# Refactor RBAC & Workflow Paquets — Traumatec Impact Platform

> Document de référence pour ne pas perdre le fil du refactor.  
> Dernière mise à jour : juin 2026.

## Vision métier

Quatre rôles principaux (un utilisateur peut en cumuler plusieurs) :

| Rôle | Code | Connexion TIP | Rôle métier |
|------|------|---------------|-------------|
| **Administrateur** | `administrateur` | Oui | Templates, utilisateurs, audit, tout le reste |
| **Support administratif** | `support_administratif` | Oui | Prépare événements, génère paquets, soumet au contrôle |
| **Contrôle procédure** | `controle_procedure` | Oui | Vérifie chaque fichier du paquet, assigne, valide/rejette |
| **Validateur** | `validateur` | Oui | Validation finale, mailto responsable national |
| **Responsable national** | — | **Non** (acteur externe) | Destinataire email + contact sur l'événement |

### Workflow paquet

```
[généré] → (support soumet) → [submitted]
    → (notif contrôle) → assignation reviewer → [under_procedure_review]
    → revue fichier par fichier → complete OU reject → [procedure_approved | procedure_rejected]
    → (notif validateur) → [under_final_validation]
    → approve OU reject → [approved | validator_rejected]
    → (validateur) mailto responsable national avec lien paquet
```

Chaque transition enregistre : **date/heure**, **acteur** (nom), **commentaire** si rejet.

---

## Checklist implémentation

### Phase 1 — RBAC & workflow (fait)

- [x] Table `identity.user_roles` + multi-rôles Clerk / `hasRole()`
- [x] Tables `package_workflow_steps`, `package_file_reviews`
- [x] API workflow : submit, assign-reviewer, review file, complete/reject procedure, validateur approve/reject
- [x] Notifications in-app (`identity.notifications`)
- [x] Pages `/workflow/controle`, `/workflow/validation`
- [x] Bouton « Soumettre » sur génération
- [x] Dashboards par rôle
- [x] Templates réservés admin
- [x] Liste users lecture seule pour support
- [x] Endpoint `delivery-mailto` pour validateur → responsable national
- [x] Proxy Vite `/api/v1/workflow`, `/api/v1/notifications`
- [x] Sidebar filtrée par rôle (`navByRole.ts`, `buildNavItems.tsx`)
- [x] Routes protégées par rôle (`App.tsx`, `ProtectedRoute`)

### Phase 2 — Événements enrichis (en cours)

- [x] Colonnes DB : `national_responsible_*`, `organizer_responsible_user_id`
- [x] Tables `events.teachers`, `events.event_teachers`
- [x] API `GET/POST/PATCH /api/v1/teachers`
- [x] Règles `event_rules.py` (champs import verrouillés, dates)
- [x] Formulaire : type événement (select), géo cascade pays→région→ville
- [x] Formulaire : responsable organisation (select users support)
- [x] Formulaire : enseignants (multi-select)
  [ ] **Référentiel responsables nationaux** (select, pas texte libre) — API + backfill import
- [ ] UI admin : gérer enseignants + contacts nationaux
- [ ] i18n FR/EN des nouveaux libellés formulaire
- [ ] Sync `database/schema.sql` avec migrations 018+

### Phase 3 — Contrôle & validateur (à faire)

- [ ] Prévisualisation ONLYOFFICE **view** par fichier du paquet (workflow)
- [ ] Lien téléchargement paquet dans mailto validateur
- [ ] i18n statuts workflow (`workflow.status.*`)

### Phase 4 — Qualité & déploiement

- [ ] Tests e2e workflow par rôle
- [ ] Redémarrage Docker après changement deps frontend (`country-state-city`)
- [ ] Vérifier utilisateurs legacy `preparateur` → `support_administratif`

---

## Menu sidebar par rôle

| Entrée | Admin | Support | Contrôle | Validateur |
|--------|:-----:|:-------:|:--------:|:----------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Événements | ✓ | ✓ | — | — |
| Certificats | ✓ | ✓ | — | — |
| ML Predictions | ✓ | — | — | — |
| Notifications | ✓ | ✓ | ✓ | ✓ |
| Templates | ✓ | — | — | — |
| Génération | ✓ | ✓ | — | — |
| Contrôle procédure | ✓ | — | ✓ | — |
| Validation finale | ✓ | — | — | ✓ |
| Utilisateurs (lecture seule) | — | ✓ | — | — |
| Administration | ✓ | — | — | — |
| Profil | ✓ | ✓ | ✓ | ✓ |

---

## Champs événement — qui modifie quoi

### Lecture seule pour support (import Excel)

`project_number`, `event_type`, `country`, `region`, `city`, `start_date`, `end_date`, `project_status`, `responsible_person` (import)

### Éditable par support

- Titre, thème TIP, statut TIP
- **Responsable national** (select référentiel → nom, email, tel)
- **Responsable organisation** (select utilisateur support)
- **Enseignants** (multi-select référentiel)
- Verrouillage si paquet en workflow (`submitted` → `approved`)

### Admin

Tous les champs.

---

## Fichiers clés

| Domaine | Fichiers |
|---------|----------|
| Rôles | `packages/tip-common/tip_common/roles.py`, `security.py` |
| Workflow API | `services/docgen/app/api/v1/workflow.py`, `package_workflow.py` |
| Notifications | `services/identity/app/api/v1/notifications.py` |
| Événements | `services/events/app/api/v1/events.py`, `event_rules.py` |
| Formulaire | `frontend/src/features/events/EvenementForm.tsx` |
| Navigation | `frontend/src/config/navByRole.ts`, `layout/buildNavItems.tsx` |
| Migration SQL | `database/migrations/018_rbac_workflow.sql` |

---

## Dépannage

### Formulaire ancien (champs texte, pas de selects)

Le code source est à jour ; si l'UI affiche l'ancien formulaire :

1. Erreur Vite `country-state-city` → recréer le conteneur frontend :
   ```bash
   docker compose stop frontend
   docker compose rm -f frontend
   docker compose up -d --build frontend
   ```
2. Ou hors Docker : `cd frontend && npm ci && npm run dev`

### `JSON.parse` sur `/api/v1/workflow` ou `/notifications`

Vite doit proxy vers les bons ports (8004 docgen, 8001 identity). Redémarrer `npm run dev` après modification de `vite.config.ts`.

### Cookie `__cfuvid` rejeté sur localhost

Normal avec Clerk en dev local — sans impact fonctionnel.

### Utilisateur contrôle qui voit encore Événements

Vérifier les rôles cumulés sur le compte (`identity.user_roles`). La sidebar affiche l'**union** des menus de tous les rôles assignés.

---

## Prochaines priorités recommandées

1. Référentiel responsables nationaux + select dans le formulaire
2. ONLYOFFICE view dans pages workflow
3. UI admin référentiels (enseignants, contacts nationaux)
4. Tests manuels avec 4 comptes de test (un par rôle)
