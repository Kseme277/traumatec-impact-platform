# Guide complet — Vidéos de démo TIP

Tout ce que **tu dois faire** pour filmer une démo complète de Traumatec Impact Platform, **y compris l’assistant IA**, sans compter sur un live risqué.

**URL :** https://tip-platform.hopto.org  
**Fil rouge événement :** `702193` — Lomé, Togo, **12–14 août 2026** (déjà en BD, pas encore passé)  
**Fichiers :** dossier `docs/demo/`

---

## A. Ce que TU dois faire (checklist opérationnelle)

### Avant le jour J (obligatoire)

1. [ ] Copier sur le **Bureau** :
   - `tip-demo-participants-702193.xlsx`
   - `tip-demo-participants-702169.xlsx` (secours)
   - `tip-demo-evenements.xlsx` (optionnel — déjà en BD)
2. [ ] Préparer **3 profils navigateur** (Chrome / Firefox) :
   - Support administratif (compte principal)
   - Contrôle procédure (`pmseme@gmail.com` ou `vaneck.minlaa@gmail.com`)
   - Validateur (`etoundilauren@gmail.com`)
   - Option admin : `kseme277@gmail.com`
3. [ ] Dry-run **sans filmer** :
   - Login OK
   - Recherche `702193` → fiche ouverte
   - Bouton **Assistant IA** (✨) ouvre le dialogue
   - Une question IA répond (ex. « Combien d'événements ouverts ? »)
   - Import participants test sur `702193` (ou déjà fait)
   - Génération paquet ou ZIP déjà prêt (plan B)
4. [ ] Couper notifications OS / mail / Slack  
5. [ ] Résolution **1920×1080**, zoom 100 %, thème **clair**  
6. [ ] Micro test 10 s ; OBS / enregistreur prêt  
7. [ ] Vérifier que **Mistral** répond (sinon l’assistant bascule en mode local — moins « wow », mais OK : le dire à l’oral)

### Le jour du tournage

1. [ ] Ouvrir tip-platform.hopto.org déjà connecté Support  
2. [ ] Fichiers Excel à portée (Bureau)  
3. [ ] Tourner **vidéo par vidéo** (liste §B) — 2 prises par chapitre critique  
4. [ ] Ne jamais montrer `.env`, clés Clerk, console Postgres  

### Après

1. [ ] Montage avec chapitres  
2. [ ] Export 1080p H.264  
3. [ ] Nettoyer participants de test sur `702193` si besoin (ou les laisser)

---

## B. Plan des vidéos (tout couvrir)

| # | Titre | Durée | Rôle compte | Objectif |
|---|--------|-------|-------------|----------|
| **V0** | Intro projet | 2–3 min | — (slides) | Problème → TIP → piliers |
| **V1** | Connexion, menu, tutoriel | 3–4 min | Support | Auth Clerk + découverte UI |
| **V2** | Assistant IA (dédiée) | 4–5 min | Support / Admin | Dialogue Mistral + commandes |
| **V3** | Événements (données live) | 3–4 min | Support | Fiche `702193` déjà en BD |
| **V4** | Participants & certificats | 4–5 min | Support | Import Excel → certificats |
| **V5** | Génération paquets + IA classification | 4–5 min | Support | ZIP + thème / NVIDIA |
| **V6** | Workflow contrôle → validation | 5–7 min | Contrôle + Validateur | Circuit qualité |
| **V7** | Prédictions ML | 2–3 min | Admin / Support si visible | Risque budget / affluence |
| **V8** | Administration & GuideHub | 3–4 min | Admin | Users, templates, audit, guides |
| **V9** | Closing | 1 min | — | Bénéfices + URL + équipe |

**Montage unique recommandé :** ~18–22 min (couper V7/V8 si trop long → 14–16 min).

---

## C. Fil rouge données (prod)

| | |
|--|--|
| Projet | **`702193`** |
| Titre | `2026_Course_Nonoperative_Fracture_Management_Lomé_Togo` |
| Dates | 12–14 août 2026 |
| Lieu | Lome, Togo |
| Thème | `operatory` |
| Responsable | Dominique Nkoa |
| Budget | 17 640 CHF |
| Import participants | [`tip-demo-participants-702193.xlsx`](./tip-demo-participants-702193.xlsx) |
| Emails | Utilisateurs + enseignants **réels** de la plateforme |

Alternatives : `702169` (PBO Bobo, 12 sept) · `702288` (IEC Mbankomo Cameroun, 31 oct).

---

## D. Scripts détaillés — ce que tu fais à l’écran

### V0 — Intro (hors appli)

**Dire :**
1. AO Alliance / TRAUMATEC : formations, paquets documentaires lourds.  
2. Avant : copie manuelle Word/Excel, certificats un par un.  
3. TIP : import plan → événements → certificats → paquets → workflow qualité + **assistant IA**.  
4. Annoncer les chapitres.

---

### V1 — Connexion, menus, tutoriel

| Temps | Tu fais | Tu dis |
|-------|---------|--------|
| 0:00 | Page `/signin` → login Support | « Auth sécurisée Clerk, app fermée sur invitation. » |
| 0:40 | Dashboard | « Tableau de bord adapté au rôle. » |
| 1:10 | Survol menu | Événements, Certificats, Documents, Notifications, Profil… |
| 1:40 | **Ctrl+K** (recherche globale) | « Recherche pages, événements, utilisateurs. » |
| 2:10 | Bouton ✨ / Assistant → tape **`Lance le tutoriel d'utilisation`** | « Tutoriel guidé intégré. » |
| 2:30–3:30 | Avancer 3–4 étapes du tutoriel puis Passer | Montrer dashboard, événements, certificats rapidement |

---

### V2 — Assistant IA (vidéo dédiée — à ne pas sauter)

Ouvre le panneau flottant **Assistant TIP** (bouton ✨ en bas à droite).

#### Partie 1 — Dialogue libre (Mistral + données BD)

Tape **une par une** (laisse la réponse s’afficher ~5–10 s) :

| # | Phrase exacte à taper | Ce que ça montre |
|---|----------------------|------------------|
| 1 | `Combien d'événements ouverts et quel budget total ?` | Métriques live (totaux, budget CHF) |
| 2 | `Quels événements au Cameroun en 2026 ?` | Recherche BD (ex. Mbankomo `702288`) |
| 3 | `Où en sont les paquets en workflow ?` | Snapshot workflow jobs |
| 4 | `Parle-moi de l'événement 702193 à Lomé` | Recherche par n° projet / lieu |

**Dire :** « L’assistant s’appuie sur Mistral et un **contexte JSON réel** de PostgreSQL — il ne invente pas les chiffres. »

#### Partie 2 — Commandes rapides (cliquer les puces ou taper)

| # | Commande | Effet attendu |
|---|----------|---------------|
| 5 | `Liste les événements à venir` | Liste / navigation |
| 6 | `Ouvre la page événements` | Navigation |
| 7 | `Ouvre la génération documents` | Navigation Documents |
| 8 | `Analyse le budget de l'événement 702193` ou `… Lomé 2026` | Analyse budget événement |
| 9 | `Génère le paquet pour Lomé` ou `… 702193` | **Attention :** peut lancer une vraie génération — OK si tu veux le montrer ici *ou* le garder pour V5 |

Si plusieurs événements matchent → choisir **702193** dans la liste.

#### Partie 3 — Admin only (compte administrateur)

Reconnecte-toi en **admin** (`kseme277@gmail.com`) pour :

| Commande | Effet |
|----------|--------|
| `aide` | Liste complète des commandes |
| `Ouvre la page utilisateurs` | Navigation admin |
| `Ouvre le stockage MinIO` | Page stockage |
| *(ne pas faire en live si risqué)* `Lance le nettoyage MinIO` / `Génère l'export d'audit` | Montrer la puce, **ne pas exécuter** sauf dry-run OK |

**Plan B IA :** si Mistral timeout → une note « Mode local » apparaît ; enchaîne quand même sur métriques / recherche (le fallback local fonctionne).

**Aussi montrer :** depuis **Ctrl+K**, taper une question puis « Demander à l’assistant ».

---

### V3 — Événements (déjà en BD)

| Temps | Tu fais | Tu dis |
|-------|---------|--------|
| 0:00 | Menu **Événements** | « Plan annuel déjà chargé depuis AID Impact / Projects.xlsx. » |
| 0:30 | Recherche **`702193`** | Ouvre la fiche |
| 1:00 | Défiler : dates, Lome, budget, Nkoa, thème operatory | « Événement futur — prêt pour certificats et paquet. » |
| 2:00 | Badge type de paquet / classification si visible | « Suggestion de type de paquet (règles ou NVIDIA). » |
| 2:30 | Montrer 1 autre futur : `702288` Mbankomo | Ancrage Cameroun |
| 3:00 | *(Option)* Import `tip-demo-evenements.xlsx` | « Même format plan annuel — lignes déjà en prod. » |

---

### V4 — Participants & certificats

| Temps | Tu fais | Tu dis |
|-------|---------|--------|
| 0:00 | **Certificats** | |
| 0:20 | Sélectionner **`702193` Lomé** | Bien vérifier le bon événement |
| 0:45 | Importer `tip-demo-participants-702193.xlsx` | « Emails réels utilisateurs et enseignants TIP. » |
| 1:30 | Montrer 12 personnes, filtres Participant / Enseignant | |
| 2:15 | Générer certificats | Job asynchrone Redis/RQ |
| 3:00 | Télécharger / ouvrir un certificat | Preuve visuelle |
| 3:45 | *(Option)* Douala/Bobo fichier `702169` | Si temps |

**Ne pas modifier** le préfixe `12 août` ni `Lome` dans le Excel (matching date + lieu).

---

### V5 — Génération paquets (+ IA classification)

| Temps | Tu fais | Tu dis |
|-------|---------|--------|
| 0:00 | **Documents → Génération** | |
| 0:30 | Choisir `702193` | Vérifier thème operatory / type paquet (OP_C…) |
| 1:00 | Montrer suggestion de paquet (badge **NVIDIA** si présent, sinon règles) | « Classification assistée du type de paquet. » |
| 1:30 | Lancer **Générer** | Progression job |
| 2:30 | Télécharger ZIP, ouvrir 2–3 fichiers | Accord, programme, budget… |
| 3:30 | Bouton **Soumettre** au contrôle | Enchaîne V6 |

**Plan B :** ZIP déjà généré la veille → montrer historique + téléchargement, puis soumettre.

---

### V6 — Workflow qualité (2–3 comptes)

#### Support (fin V5)
Soumettre le paquet.

#### Contrôle procédure
1. Login contrôle (`pmseme@gmail.com` / `vaneck.minlaa@gmail.com`)  
2. Menu **Contrôle procédure** + notifications  
3. Ouvrir le dossier `702193`  
4. Revue **fichier par fichier** (ONLYOFFICE si dispo)  
5. Approuver / terminer le contrôle  

#### Validateur
1. Login `etoundilauren@gmail.com`  
2. **Validation finale** → Approuver  
3. **Mailto** responsable national (Dominique Nkoa / `dnkoa@ao-alliance.org`)  

**Dire :** « Circuit qualité tracé dans TIP, plus uniquement hors application. »

---

### V7 — Prédictions ML

1. Menu **Prédictions** (si visible selon rôle) ou widget dashboard  
2. Sélectionner un événement à venir (`702193` ou autre)  
3. Montrer jauges risque budgétaire / affluence  

**Dire :** « Aide à la décision sur le risque et la participation attendue. »

---

### V8 — Administration & GuideHub (compte admin)

| Écran | Chemin | Montrer |
|-------|--------|---------|
| Utilisateurs | `/admin/utilisateurs` | Invitations, multi-rôles |
| Référentiels | `/admin/referentiels` | Enseignants, contacts nationaux |
| Types de paquets | catalogue | OP_C, OP_S, PBO, IEC, FET |
| Templates | `/documents/templates` | ZIP versionnés, ONLYOFFICE |
| Audit | `/admin/audit` | Traçabilité |
| Stockage | `/admin/stockage` | MinIO |
| GuideHub | `/admin/guidehub` ou widget guides | Pont SSO vers procédures |

**Option IA admin :** rouvrir l’assistant → `Ouvre la page utilisateurs`.

---

### V9 — Closing

- Récap : import → IA → certificats → paquets → workflow  
- URL + équipe (Bilogue Seme, Nganomo, coordination Nkoa)  

---

## E. Assistant IA — fiche mémo (à avoir sous les yeux)

### Où le trouver
- Bouton flottant **✨** (bas droite)  
- Ou **Ctrl+K** → « Demander à l’assistant »

### Capacités
| Mode | Techno | Usage démo |
|------|--------|------------|
| Dialogue | **Mistral** + contexte BD | Questions métriques / recherche |
| Fallback | Mode local | Si API down |
| Commandes | Parser d’actions | Générer, naviguer, lister, admin |
| Tutoriel | Commande dédiée | Onboarding UI |
| Classification paquet | Règles + option **NVIDIA NIM** | Badge sur fiche / génération |
| Scan templates | Mistral (import ZIP admin) | Mention en V8 si tu importes un template |

### Phrases sûres pour la caméra (copier-coller)

```
Combien d'événements ouverts et quel budget total ?
Quels événements au Cameroun en 2026 ?
Où en sont les paquets en workflow ?
Parle-moi de l'événement 702193
Liste les événements à venir
Ouvre la page événements
Ouvre la génération documents
Analyse le budget de l'événement 702193
Lance le tutoriel d'utilisation
aide
```

### À éviter en live (sauf dry-run OK)
- `Clôture l'événement …` (irréversible métier)  
- `Bloque le compte de …`  
- `Lance le nettoyage MinIO`  
- Création utilisateur avec faux email  

---

## F. Ordre de tournage recommandé (journée type)

| Matin | Après-midi |
|-------|------------|
| Dry-run complet 30 min | V5 génération + V6 workflow (plus long) |
| V0 slides | V7 + V8 admin |
| V1 + **V2 IA** (frais) | V9 closing |
| V3 + V4 import participants | Montage |

---

## G. Anti-aléas (récap)

| Risque | Parade |
|--------|--------|
| IA Mistral lente / KO | Fallback local + phrases métriques déjà testées |
| Génération longue | ZIP pré-généré la veille |
| Mauvais événement sélectionné | Toujours vérifier `702193` à l’écran |
| Matching participants échoue | Ne pas éditer `12 août` / `Lome` dans l’Excel |
| Session Clerk expire | Rester connecté / rafraîchir avant REC |
| ONLYOFFICE lent | Montrer liste fichiers sans ouvrir tous les docs |
| Compte mauvais rôle | 3 profils navigateur nommés clairement |

---

## H. Fichiers `docs/demo/`

| Fichier | Usage |
|---------|--------|
| [`GUIDE_VIDEO_DEMO.md`](./GUIDE_VIDEO_DEMO.md) | Ce guide |
| [`tip-demo-participants-702193.xlsx`](./tip-demo-participants-702193.xlsx) | Import Certificats sur Lomé |
| [`tip-demo-participants-702169.xlsx`](./tip-demo-participants-702169.xlsx) | Secours PBO Bobo |
| [`tip-demo-evenements.xlsx`](./tip-demo-evenements.xlsx) | Extrait 6 événements futurs déjà en BD |

---

## I. Navigations utiles

| Écran | URL |
|-------|-----|
| Sign-in | `/signin` |
| Dashboard | `/dashboard` |
| Événements | `/evenements` |
| Certificats | `/certificats` |
| Génération | `/documents/generation` |
| Templates | `/documents/templates` |
| Contrôle | `/workflow/controle` |
| Validation | `/workflow/validation` |
| Prédictions | `/predictions` (selon rôle) |
| Users admin | `/admin/utilisateurs` |
| Audit | `/admin/audit` |

---

*Données prod tip-platform.hopto.org · Événement fil rouge 702193 · Assistant Mistral + commandes TIP.*
