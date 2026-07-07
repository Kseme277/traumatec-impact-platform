# CAHIER DES CHARGES TECHNIQUE

**Cas d'étude :** AO Alliance / TRAUMATEC  
**Application :** Traumatec Impact Platform (TIP) — également désignée AOA-DocGen dans le périmètre AO Alliance

**Rédigé par :**
- BILOGUE SEME Eric Kevin
- NGANOMO Aimé

**Sous la coordination de :**
- M. NKOA Dominique

**Version :** 2.0 — alignée sur l'implémentation réelle (juillet 2026)  
**Production :** https://tip-platform.hopto.org  
**Branche de référence :** `staging`

---

## Table des matières

1. [Introduction](#i-introduction)
2. [Présentation générale du projet](#ii-présentation-générale-du-projet)
3. [Description du contexte](#iii-description-du-contexte)
4. [Définition du problème](#iv-définition-du-problème)
5. [Objectifs visés](#v-objectifs-visés)
6. [Spécification fonctionnelle détaillée](#vi-spécification-fonctionnelle-détaillée)
7. [Solution et choix techniques](#vii-solution-et-choix-techniques)
8. [Présentation de l'équipe projet](#viii-présentation-de-léquipe-projet)
9. [Ressources utilisées](#ix-ressources-utilisées)
10. [Conclusion](#x-conclusion)

---

## I. Introduction

Dans le secteur de la médecine d'urgence et de la traumatologie clinique, l'organisation de séminaires, de cours pratiques, d'ateliers de sensibilisation (IEC) et de programmes de formation (Faculty Education Training) constitue un levier essentiel pour standardiser les protocoles de soins et renforcer les compétences des professionnels de santé sur le terrain. Chaque session mobilise une chaîne administrative lourde : accords de collaboration, programmes, budgets prévisionnels, listes d'émargement, certificats de participation, fiches bancaires et pièces de conformité à destination des bailleurs de fonds.

AO Alliance, en partenariat avec TRAUMATEC / HOSPITEC Cameroun, coordonne ces événements à l'échelle internationale. La préparation des dossiers s'appuie sur un référentiel de modèles de préparation des événements (documents Word et Excel structurés par type d'activité : Opératoire, PBO, IEC, etc.). Avant TIP, la production effective de ces paquets reposait sur des gestes manuels : duplication des modèles, ressaisie des mêmes informations, copie des noms sur les certificats, conversion PDF une à une, compression ZIP à la main, stockage dispersé.

Le présent document est le **cahier des charges révisé** du projet **Traumatec Impact Platform (TIP)**. Il décrit le cadre métier du produit **tel qu'il est implémenté et déployé**, en distinguant clairement le périmètre livré de ce qui reste hors application ou en évolution.

> **Note de version :** La première rédaction (mai–juin 2026) retenait un monolithe FastAPI, l'authentification Firebase et un circuit de contrôle/validation **entièrement manuel hors application**. L'implémentation actuelle diffère sur ces points majeurs : architecture **microservices modulaires**, authentification **Clerk**, workflow de contrôle et validation **intégré dans TIP**, pont SSO vers **GuideHub**, et édition documentaire via **ONLYOFFICE**.

Ce document s'organise en dix parties. Les sections II et III présentent le projet et son contexte. La section IV formalise le problème et les besoins. La section V en déduit les objectifs. La section VI détaille la spécification fonctionnelle par module. La section VII décrit la solution technique, les choix technologiques et la planification. Les sections VIII à IX couvrent l'équipe et les ressources. La section X conclut.

**Suite documentaire (livrables ISI) :**

| Code | Document | Fichier |
|------|----------|---------|
| L-01 | Cahier des charges | **Ce document** |
| L-02 | Cahier d'analyse | [CAHIER_D_ANALYSE.md](CAHIER_D_ANALYSE.md) |
| L-03 | Cahier de conception | [CAHIER_DE_CONCEPTION.md](CAHIER_DE_CONCEPTION.md) |

Le cahier d'analyse modélise les besoins (UML : cas d'utilisation, classes, séquences système). Le cahier de conception décrit l'architecture technique, le déploiement et les diagrammes de conception.

**Diagrammes UML (PlantUML → PNG) :** sources dans `docs/diagrams/` — voir [diagrams/README.md](diagrams/README.md).

| Livrable | Dossier images | Diagrammes clés |
|----------|----------------|-----------------|
| L-02 Analyse | `docs/diagrams/analyse/` | Cas d'utilisation, classes, objets, 5 séquences système |
| L-03 Conception | `docs/diagrams/conception/` | Composants, classes de conception, déploiement, workflow |

---

## II. Présentation générale du projet

### 2.1 Intitulé et portée

Le projet **Traumatec Impact Platform (TIP)** consiste à concevoir, déployer et exploiter un progiciel web métier destiné à automatiser la génération des paquets documentaires des événements de formation gérés par TRAUMATEC pour le compte d'AO Alliance.

La portée couvre les **cours**, les **séminaires** (Opératoire, PBO, IEC), les programmes **Faculty Education Training (FET)** et les **catégories personnalisées** ajoutées par l'administrateur. Pour chaque événement, le paquet typique comprend un accord de collaboration, un programme, un budget prévisionnel, des listes d'émargement et des certificats de participation. Les modèles sources proviennent du référentiel de préparation des événements ; la plateforme assure l'injection automatique des données saisies ou importées.

### 2.2 Trois piliers fonctionnels

Le produit repose sur trois piliers interconnectés, enrichis par un quatrième volet workflow.

| Pilier | Contenu implémenté |
|--------|-------------------|
| **Gestion et suivi des événements** | Import annuel du plan (`Projects.xlsx` / modèle TIP), fiche événement, participants, pièces jointes, tableau de bord par rôle, référentiels (responsables nationaux, enseignants) |
| **Automatisation documentaire (DocGen)** | Injection dynamique dans les modèles `.docx` et `.xlsx`, pipeline certificats en deux passes (données événement puis un certificat par participant), assemblage ZIP, stockage MinIO |
| **Administration et traçabilité** | Templates de paquet (ZIP versionnés), catalogue catégories/types, utilisateurs multi-rôles, journal d'audit, paramétrage stockage, pont GuideHub |
| **Workflow qualité (ajout post-cahier initial)** | Soumission, contrôle procédure fichier par fichier, validation finale, notifications in-app, remise au responsable national |

### 2.3 Positionnement dans l'écosystème Traumatec

TIP n'est pas un outil isolé. Elle complète l'écosystème Traumatec.

| Plateforme | Rôle principal | Utilisateur type |
|------------|----------------|------------------|
| **TIP (ce projet)** | Produire les paquets documentaires, piloter le workflow qualité | Support administratif, contrôleur procédure, validateur, administrateur |
| **Guides procédures (GuideHub)** | Consulter les procédures, administrer le contenu guide | Coordinateurs, responsables nationaux |

**Intégration GuideHub (implémentée) :** un pont JWT sécurisé permet à un utilisateur authentifié sur TIP d'accéder à GuideHub sans ressaisir ses identifiants. Le mécanisme repose sur un ticket opaque à usage unique (Redis) consommé par `guidehub-handoff.html`, avec proxy Nginx dédié (port 3101). La configuration est accessible depuis **Administration → Liaison GuideHub**.

**Circuit qualité AO Alliance (implémenté dans TIP) :** après génération du ZIP, le support administratif **soumet** le paquet dans l'application. Un **contrôleur de procédure** réalise une revue fichier par fichier (avec prévisualisation ONLYOFFICE). Un **validateur** apporte la validation finale. Le validateur peut ensuite ouvrir un **mailto** prérempli vers le responsable national (acteur externe sans compte TIP). Ce circuit est désormais **tracé et notifié dans l'application**, et non plus exclusivement manuel par courriel.

### 2.4 Périmètre inclus et exclus

#### Inclus (état juillet 2026)

- Authentification **Clerk** (application fermée, invitations admin)
- Quatre rôles applicatifs cumulables : administrateur, support administratif, contrôle procédure, validateur
- Import annuel Excel, modèles téléchargeables événements et participants
- Tableau de bord différencié par rôle
- Fiche événement enrichie (géolocalisation, enseignants, responsable organisation)
- Association des thèmes de préparation (Op, PBO, IEC) et types de paquet
- Templates de paquet (bundles ZIP versionnés, activation, ONLYOFFICE)
- Catalogue admin catégories + types de paquet personnalisés
- Import participants, génération asynchrone du ZIP, historique des générations
- Workflow contrôle procédure + validation finale in-app
- Administration des modèles, utilisateurs, référentiels, audit, stockage
- Pont SSO GuideHub (optionnel selon configuration)
- Assistant IA (Mistral) et scan optionnel des variables à l'import ZIP
- Observabilité Prometheus / Grafana
- Déploiement Docker Compose sur EC2 (HTTPS Let's Encrypt)

#### Exclus ou non prioritaires

- Portail d'inscription public (application fermée)
- QR Code, chatbot métier dédié, signature électronique qualifiée (eIDAS)
- Envoi automatique serveur du paquet au responsable national (remplacé par mailto + notifications)
- Génération PDF systématique (les PDF existants sont copiés ; la sortie principale est Office)
- BI avancée en production (module analytics/prédictions présent mais réservé admin, hors flux principal)
- Module « AID IMPACT » autonome (l'analyse budgétaire est partiellement couverte par l'assistant IA)

### 2.5 Parties prenantes

| Partie prenante | Rôle | Attente principale |
|-----------------|------|-------------------|
| AO Alliance | Commanditaire, normes documentaires | Paquets conformes aux modèles, rapides, bien nommés, circuit qualité tracé |
| M. NKOA Dominique | Product Owner TRAUMATEC | Import annuel, templates, recette, pilotage backlog |
| Support administratif (ex-Processing Team) | Usage quotidien | Simplicité, gain de temps, dashboard clair, soumission fluide |
| Contrôleur de procédure | Contrôle in-app | File de revue, prévisualisation documents, traçabilité |
| Validateur | Validation finale in-app | File de validation, remise au responsable national |
| Responsable national | Acteur externe | Réception du dossier validé (email / partage) |
| TRAUMATEC / HOSPITEC | Opérateur, hébergement | Données maîtrisées (EC2, PostgreSQL, MinIO) |

---

## III. Description du contexte

### 3.1 Contexte académique

Ce projet s'inscrit dans le cursus de quatrième année de l'Institut Saint-Jean (ISI), année académique 2025–2026. Il répond aux exigences d'un travail de fin de cycle : cahier des charges, cahier d'analyse, cahier de conception, code source, tests et soutenance.

L'encadrement est double : un encadrant académique (méthode, qualité documentaire, respect des livrables) et un encadrant professionnel, M. NKOA Dominique, qui valide le périmètre métier en tant que Product Owner. Le projet est mené en SCRUM sur quatre sprints d'une semaine, avec livraisons incrémentales jusqu'au déploiement production sur EC2.

### 3.2 Contexte sociétal

La prise en charge des traumatismes d'urgence demeure un défi majeur, notamment dans les pays à ressources limitées. La formation continue et la justification des dépenses auprès des financeurs exigent des dossiers administratifs complets et homogènes. En réduisant le temps consacré à la paperasse et les erreurs de ressaisie — en particulier sur les certificats — TIP libère du temps pour l'activité clinique et pédagogique.

### 3.3 Contexte technologique

Les organisations médicales adoptent progressivement des solutions web maîtrisées plutôt que des dossiers dispersés. La génération de documents Office à partir de modèles est une problématique mature : bibliothèques open source (`docxtpl`, `openpyxl`), files d'attente asynchrones (Redis, RQ), authentification déléguée (**Clerk**), base relationnelle PostgreSQL, stockage objet MinIO et hébergement VPS/EC2 pour la souveraineté des données.

Le développement s'effectue sous Linux avec Docker Compose pour la reproductibilité. L'édition collaborative des modèles s'appuie sur **ONLYOFFICE Document Server**. L'intelligence artificielle (API Mistral, option NVIDIA NIM) assiste l'import de templates et l'assistant de commandes.

---

## IV. Définition du problème

### Processus actuel (avant TIP)

Recherche de l'événement dans `Projects.xlsx` → ouverture manuelle des modèles → ressaisie des mêmes données dans chaque document → copie manuelle du nom de chaque participant sur le certificat → conversion PDF et ZIP à la main → transmission par courriel → contrôle et validation manuels hors outil.

### Processus cible (implémenté)

1. **Configurer** les catégories/types de paquet et importer les ZIP templates (admin).
2. **Importer** le plan annuel (`tip-import-evenements.xlsx`).
3. **Compléter** la fiche événement (métadonnées, responsables, enseignants).
4. **Importer** les participants (`tip-import-participants-certificats.xlsx`).
5. **Générer** le paquet en un clic (job asynchrone DocGen).
6. **Télécharger** le ZIP, puis **soumettre** au workflow qualité.
7. **Contrôler** (contrôleur procédure) et **valider** (validateur) dans TIP.
8. **Remettre** au responsable national (mailto + canaux habituels).

### 4.1 Besoins fonctionnels

Les besoins fonctionnels (BF) sont numérotés selon l'ordre d'utilisation. La priorité est indiquée : Critique, Élevée ou Moyenne. La colonne **État** reflète l'implémentation actuelle.

| ID | Besoin fonctionnel | Priorité | État |
|----|-------------------|----------|------|
| BF-01 | Connexion sécurisée (Clerk, invitations admin) | Critique | ✅ Livré |
| BF-02 | Import annuel du fichier Projects.xlsx / modèle TIP | Critique | ✅ Livré |
| BF-03 | Tableau de bord : indicateurs, liste événements, filtres par rôle | Critique | ✅ Livré |
| BF-04 | Consultation et édition de la fiche événement | Critique | ✅ Livré |
| BF-05 | Association du thème de préparation (Op, PBO, IEC) et type de paquet | Critique | ✅ Livré |
| BF-06 | Sélection / inférence des templates niveau événement | Critique | ✅ Livré |
| BF-07 | Jeux de templates certificats (étape 1 + étape 2) | Critique | ✅ Partiel (API + pipeline ; UI admin simplifiée) |
| BF-08 | Formulaire unique : métadonnées, budget, contexte certificat | Critique | ✅ Livré |
| BF-09 | Import en masse des participants (Excel) | Élevée | ✅ Livré |
| BF-10 | Téléversement des images (programme, signatures, photo responsable) | Critique | ✅ Livré |
| BF-11 | Options de génération (sources, fusion certificats) | Élevée | ✅ Partiel (fusion certificats ; PDF non généré systématiquement) |
| BF-12 | Lancement de la génération asynchrone du paquet | Critique | ✅ Livré |
| BF-13 | Suivi du statut de génération | Critique | ✅ Livré |
| BF-14 | Téléchargement sécurisé du ZIP | Critique | ✅ Livré |
| BF-15 | Nommage automatique du ZIP (convention AO Alliance) | Critique | ✅ Livré |
| BF-16 | Historique des générations par événement | Élevée | ✅ Livré |
| BF-17 | Administration des templates paquet (ZIP, versions, ONLYOFFICE) | Critique | ✅ Livré |
| BF-18 | Administration des jeux de templates certificats | Critique | ⚠️ Partiel |
| BF-19 | Profils d'événement réutilisables | Moyenne | ⚠️ API catalogue ; usage limité en UI |
| BF-20 | Gestion des comptes et rôles (multi-rôles) | Critique | ✅ Livré |
| BF-21 | Journal d'audit (import, génération, téléchargement) | Moyenne | ✅ Livré |
| BF-22 | Fichier README automatique dans le ZIP | Élevée | ✅ Livré |
| BF-23 | Workflow soumission → contrôle procédure → validation finale | Critique | ✅ Livré (ajout post-cahier initial) |
| BF-24 | Notifications in-app sur les transitions workflow | Élevée | ✅ Livré |
| BF-25 | Administration catégories et types de paquet personnalisés | Élevée | ✅ Livré |
| BF-26 | Pont SSO / handoff vers GuideHub | Moyenne | ✅ Livré (optionnel) |
| BF-27 | Modèles Excel téléchargeables (événements, participants) | Élevée | ✅ Livré |
| BF-28 | Assistant IA (commandes naturelles, analyse) | Moyenne | ✅ Livré |
| BF-29 | Référentiels responsables nationaux et enseignants | Élevée | ✅ Livré |
| BF-30 | Édition ONLYOFFICE des templates et certificats | Élevée | ✅ Livré |

**Règles du pipeline certificat (implémentées) :**

| Code | Règle |
|------|-------|
| RG-CERT-01 | Génération impossible sans données événement complètes |
| RG-CERT-02 | Génération impossible sans au moins un participant (pour les certificats) |
| RG-CERT-03 | L'étape 1 (événement) s'exécute une fois par job |
| RG-CERT-04 | L'étape 2 (participant) produit un certificat par ligne importée |
| RG-CERT-05 | Fusion optionnelle des certificats dans le ZIP |

### 4.2 Besoins non fonctionnels

| ID | Catégorie | Exigence | Critère | État |
|----|-----------|----------|---------|------|
| BNF-01 | Ergonomie | Interface intuitive pour non-techniciens (TailAdmin, i18n FR/EN) | Validation équipe métier | ✅ |
| BNF-02 | Performance | Génération paquet standard (≤ 50 certificats) | < 15 s côté worker (objectif) | ✅ Cible |
| BNF-03 | Performance | Chargement tableau de bord | < 2 s (≤ 500 événements) | ✅ Cible |
| BNF-04 | Sécurité | HTTPS, Clerk JWT, contrôle d'accès par rôles | Audit configuration EC2 | ✅ |
| BNF-05 | Robustesse | Pipeline DocGen asynchrone (Redis/RQ) | Pas de blocage UI | ✅ |
| BNF-06 | Traçabilité | Historique générations, workflow, audit | Rétention configurable | ✅ |
| BNF-07 | Évolutivité | Microservices modulaires (identity, events, catalog, docgen) | Découplage par domaine | ✅ |
| BNF-08 | Maintenabilité | API typée, OpenAPI par service | Swagger `/api/v1/docs` | ✅ |
| BNF-09 | Portabilité | Docker Compose identique dev / prod | Reproductibilité | ✅ |
| BNF-10 | Compatibilité | Navigateurs modernes | Chrome, Firefox, Edge, Safari (n-2) | ✅ |
| BNF-11 | Observabilité | Métriques Prometheus, dashboards Grafana | Monitoring interne | ✅ |
| BNF-12 | Stockage | Fichiers sur MinIO (S3-compatible) | Persistance hors disque conteneur | ✅ |

### 4.3 Entrées du système

- Plan annuel (`Projects.xlsx` ou modèle `tip-import-evenements.xlsx`)
- Données complémentaires de la fiche événement
- Liste des participants (`tip-import-participants-certificats.xlsx`)
- Fichiers templates de paquet (bundles ZIP : accord, programme, budget, émargement, certificats…)
- Jeux de templates certificats (deux fichiers Word : étape événement + étape participant)
- Visuels (programme, signatures, photo du responsable national)
- Référentiels : responsables nationaux, enseignants

### 4.4 Sorties (livrables produits)

Arborescence type du paquet ZIP :

```
[Numéro_Projet]_[Nom_Événement]_[Ville]_[Pays]_[YYYYMMDD].zip
├── 01_Accord_de_collaboration.docx
├── 02_Programme.docx
├── 03_Budget_previsionnel.xlsx
├── 04_Liste_emargement.pdf          (si présent dans le bundle)
├── 06_Certificats/                  (ou fusion selon options)
├── README.txt
└── 05_Sources/                      (si option activée)
```

Le fichier `README.txt` résume les métadonnées de l'événement, la date de génération, l'auteur, les versions des templates et le nombre de certificats produits.

Le paquet soumis au workflow conserve également un **historique des revues** (fichier par fichier) et les **transitions d'état** horodatées dans la base DocGen.

---

## V. Objectifs visés

### 5.1 Objectifs stratégiques

- Réduire de plus de 95 % le temps de constitution manuelle d'un paquet.
- Atteindre une saisie unique des données événement et zéro copier-coller des noms sur les certificats.
- Uniformiser les livrables (charte, champs obligatoires, nommage).
- Centraliser le patrimoine documentaire et les métadonnées dans PostgreSQL et MinIO.
- **Tracer** le circuit qualité (contrôle + validation) dans l'application.

### 5.2 Objectifs fonctionnels

- Permettre au **support administratif** de générer un ZIP complet depuis le tableau de bord sans ouvrir Word manuellement.
- Permettre à l'**administrateur** d'importer le plan annuel, maintenir les templates et le catalogue types/catégories.
- Permettre au **contrôleur procédure** et au **validateur** d'exercer leurs missions dans TIP avec notifications.
- Conserver un historique traçable des générations (auteur, date, versions de modèles, états workflow).
- Afficher sur le tableau de bord l'état de préparation (participants, génération, workflow) avant et après soumission.

---

## VI. Spécification fonctionnelle détaillée

### 6.1 Module support administratif (ex-Processing Team)

Ce module est destiné au rôle `support_administratif`. L'utilisateur ne voit que **ses événements** (ceux dont il est responsable organisation), sauf s'il cumule le rôle administrateur.

#### 6.1.1 Tableau de bord et navigation

- Page d'accueil après connexion, adaptée au rôle.
- Cartes d'indicateurs : événements, paquets générés, files workflow (à soumettre, en contrôle, etc.).
- Liste paginée des événements avec filtres (type, pays, période, statut, recherche textuelle).
- Panneau d'activité récente (générations, soumissions).
- Navigation latérale filtrée par rôle (`navByRole.ts`).

**Routes principales :** `/dashboard`, `/evenements`, `/certificats`, `/documents/generation`

#### 6.1.2 Formulaire unique d'événement

La fiche événement regroupe les données nécessaires à la génération :

- Champs issus de l'import Excel (certains verrouillés après import)
- Métadonnées et budget
- Sélection géographique (pays → région → ville)
- Responsable organisation (utilisateur support)
- Responsable national (référentiel)
- Enseignants (multi-select depuis référentiel)
- Type / thème de préparation et inférence du type de paquet
- Import participants avec rapport d'erreurs
- Pièces jointes et visuels

#### 6.1.3 Génération et téléchargement

- Bouton « Générer le paquet » → job asynchrone Redis/RQ.
- Suivi du statut : en file, en cours, terminé, erreur.
- Téléchargement sécurisé du ZIP depuis MinIO.
- Historique des versions générées pour l'événement.
- Bouton **« Soumettre au contrôle »** avec choix du contrôleur procédure.

#### 6.1.4 Intégration Guides

- Lien contextuel vers GuideHub via handoff sécurisé (ticket Redis → JWT).
- Configuration admin : `/admin/guidehub`.
- Proxy Nginx `:3101` pour le flux handoff.

### 6.2 Module administrateur

Réservé au rôle `administrateur` (accès total, y compris routes `/admin/*`).

#### 6.2.1 Gestion des templates

- Page **Documents → Templates** (`/documents/templates`).
- Import de bundles ZIP par type de paquet (versions, activation d'une seule version active par type).
- Scan des variables `{{ }}` et texte surligné à l'import ; option analyse Mistral.
- Édition ONLYOFFICE des fichiers template.
- Lien vers la page dédiée **catégories et types** (sans encombrer la page templates).

#### 6.2.2 Catalogue catégories et types de paquet

- Page **Administration → Types de paquets** (`/admin/referentiels/types-paquets`).
- Onglet **Catégories** : catégories système (Cours, Séminaire, Faculty) + catégories personnalisées CRUD.
- Onglet **Types** : types personnalisés (code, libellé, titre, thème, durée) rattachés à une catégorie.
- Types système (Op C, PBO S, IEC S, FET, etc.) fournis en lecture seule.

#### 6.2.3 Gestion des jeux de templates certificats

- API catalogue `certificate-sets` (deux templates Word par jeu).
- Association possible sur l'événement (`certificate_set_id`).
- Pipeline DocGen en deux passes (ADR-007).
- *Évolution :* interface admin dédiée des jeux certificats à enrichir.

#### 6.2.4 Gestion des profils et utilisateurs

- **Utilisateurs** (`/admin/utilisateurs`) : invitation Clerk, multi-rôles, activation.
- **Référentiels** (`/admin/referentiels`) : responsables nationaux, enseignants, synchronisation depuis imports certificats.
- **Profils d'événement** : API catalogue (templates + jeu certificats) — usage UI limité.

#### 6.2.5 Paramétrage et audit

- **Audit** (`/admin/audit`) : journal des actions, export planifié vers MinIO.
- **Stockage** (`/admin/stockage`) : politique de rétention, purge, graphiques.
- **GuideHub** (`/admin/guidehub`) : identifiants pont SSO.

### 6.3 Module workflow qualité

*Ce module n'existait pas dans le cahier des charges initial ; il est pleinement implémenté.*

#### 6.3.1 États du workflow

```
generated → submitted → under_procedure_review
    → procedure_approved | procedure_rejected
    → under_final_validation
    → approved | validator_rejected
```

- Rejet procédure ou validateur : le support peut corriger et resoumettre.
- Chaque transition enregistre date, acteur et commentaire éventuel.

#### 6.3.2 Contrôle procédure

- File `/workflow/controle` pour le rôle `controle_procedure`.
- Assignation du contrôleur, revue **fichier par fichier** avec commentaires.
- Prévisualisation ONLYOFFICE (mode lecture ; édition si paquet modifiable).
- Notifications in-app à chaque étape.

#### 6.3.3 Validation finale

- File `/workflow/validation` pour le rôle `validateur`.
- Approbation ou rejet avec commentaire.
- Endpoint `delivery-mailto` : ouverture d'un courriel prérempli vers le responsable national.

### 6.4 Module certificats (pipeline à deux templates)

Cœur métier différenciant de TIP pour la production des certificats.

#### 6.4.1 Règles métier

| Code | Règle |
|------|-------|
| RG-CERT-01 | Impossible de générer les certificats sans configuration adéquate |
| RG-CERT-02 | Impossible sans au moins un participant |
| RG-CERT-03 | Étape 1 (événement) exécutée une fois par job |
| RG-CERT-04 | Étape 2 (participant) en boucle sur le socle étape 1 |
| RG-CERT-05 | Fusion optionnelle des certificats dans le ZIP |

**Placeholders étape 1 (exemples) :** titre, dates, ville, pays, numéro de projet, signataire, date de délivrance.  
**Placeholders étape 2 (exemples) :** nom complet du participant, formation sanitaire.

#### 6.4.2 Fonctionnalités associées

- Page **Certificats** : sélection événement, import participants, génération, statistiques.
- Modèle Excel téléchargeable : `GET /api/v1/participants/import-template`.
- Édition ONLYOFFICE des certificats générés.
- Enregistrement du nombre de certificats sur le job DocGen.

### 6.5 Module Génération Documentaire (DocGen)

Le service `docgen` orchestre la production du paquet complet via workers RQ.

| Code | Fonctionnalité | État |
|------|----------------|------|
| D-01 | File d'attente Redis et workers RQ | ✅ |
| D-02 | Injection des templates paquet (niveau événement) | ✅ |
| D-03 | Pipeline certificat en deux passes | ✅ |
| D-04 | Insertion des visuels (signatures, programme) | ✅ |
| D-05 | Conversion PDF si option active | ⚠️ Libs présentes ; copie PDF privilégiée |
| D-06 | Fusion PDF des certificats | ⚠️ Partiel |
| D-07 | Assemblage ZIP et génération README | ✅ |
| D-08 | Persistance statut job et erreurs explicites | ✅ |
| D-09 | Workflow status `generated` à la fin du job | ✅ |
| D-10 | Garbage collector stockage planifié | ✅ |

### 6.6 Module analytics (complémentaire)

- Service `analytics` : prédictions / corrélations sur les événements.
- Page `/predictions` réservée administrateur (hors menu principal).
- Non critique pour le flux documentaire principal.

### 6.7 Droits d'accès par acteur

| Fonctionnalité | Support admin. | Contrôle proc. | Validateur | Administrateur |
|----------------|:--------------:|:--------------:|:----------:|:--------------:|
| Tableau de bord | ✅ (périmètre) | ✅ | ✅ | ✅ |
| Import Excel annuel | ❌ | ❌ | ❌ | ✅ |
| Fiche événement / participants | ✅ (périmètre) | ❌ | ❌ | ✅ |
| Générer / télécharger ZIP | ✅ | ❌ | ❌ | ✅ |
| Soumettre au workflow | ✅ | ❌ | ❌ | ✅ |
| File contrôle procédure | ❌ | ✅ | ❌ | ✅ |
| File validation finale | ❌ | ❌ | ✅ | ✅ |
| Historique générations | ✅ | ✅ | ✅ | ✅ |
| Gérer templates paquet | ❌ | ❌ | ❌ | ✅ |
| Gérer catégories/types | ❌ | ❌ | ❌ | ✅ |
| Gérer utilisateurs | ❌ (lecture seule annuaire) | ❌ | ❌ | ✅ |
| Journal d'audit | ❌ | ❌ | ❌ | ✅ |
| Référentiels | ❌ | ❌ | ❌ | ✅ |

**Responsable national :** pas de compte TIP ; destinataire du mailto et contact sur la fiche événement.

---

## VII. Solution et choix techniques

### 7.1 Description globale

La solution est une **application web microservices modulaires** orchestrée par **Docker Compose** et exposée via une **passerelle Nginx** :

```
Navigateur (HTTPS)
    → Nginx (API Gateway + frontend statique + proxy Clerk + GuideHub)
        → identity   (:8001)  — auth, users, audit, notifications, GuideHub bridge
        → events     (:8002)  — événements, imports, participants, teachers
        → catalog    (:8003)  — templates, bundles, types, certificats, profils
        → docgen     (:8004)  — génération, workflow, worker RQ
        → analytics  (:8005)  — prédictions (admin)
    → PostgreSQL 16 (schémas identity, events, catalog, docgen)
    → Redis 7 (file RQ + tickets handoff)
    → MinIO (stockage S3 des documents)
    → ONLYOFFICE (édition collaborative)
```

L'utilisateur accède à l'application par navigateur. Le client React communique en REST/JSON. Chaque service valide les jetons **Clerk** (JWKS). DocGen enfile les jobs dans Redis ; le worker `docgen-worker` produit les documents et enregistre le ZIP sur MinIO.

**Déploiement production :** instance EC2 Ubuntu (`tip-platform.hopto.org`), certificat Let's Encrypt, compose `docker-compose.yml` + `docker-compose.prod.yml`, script `scripts/deploy-ec2.sh`.

### 7.2 Matrice des choix technologiques

| Domaine | Technologie retenue | Justification |
|---------|---------------------|---------------|
| Interface client | React 19, TypeScript, Tailwind CSS 4, TailAdmin | Écosystème moderne, typage strict, UI responsive |
| Routage | React Router 7 | SPA avec routes protégées par rôle |
| Formulaires | React Hook Form + Zod | Validation alignée sur l'API |
| API backend | FastAPI (Python 3.11+), Pydantic v2 | Async natif, OpenAPI intégré |
| Architecture | Microservices modulaires (ADR-008) | Découplage identity / events / catalog / docgen |
| Bibliothèque partagée | `tip-common` | Auth, config, storage S3, rôles, métriques |
| Base de données | PostgreSQL 16 (multi-schéma) | Intégrité relationnelle, JSON pour métadonnées |
| File de tâches | Redis 7 + RQ 2.x | Génération asynchrone légère |
| Stockage fichiers | MinIO (S3 API) | Objets versionnés, compatible cloud |
| Édition documents | ONLYOFFICE Document Server 8.0.1 | Édition Word/Excel in-browser |
| Sécurité | Clerk (JWT/JWKS) + invitations | Auth déléguée, app fermée |
| Pont GuideHub | JWT bridge + ticket Redis | SSO sans mot de passe en double |
| Moteur DocGen | docxtpl, openpyxl, python-docx | Injection Office en mémoire |
| PDF | WeasyPrint, PyPDF2 (dépendances) | Présentes ; usage limité en production |
| IA | Mistral API, NVIDIA NIM (optionnel) | Assistant, scan import, classification événement |
| Observabilité | Prometheus + Grafana | Santé services, métriques |
| Passerelle | Nginx 1.27 Alpine | Reverse proxy, TLS, routage `/api/v1/*` |
| Déploiement | Docker Compose, EC2 | Reproductibilité, maîtrise des coûts |

> **Écart avec la rédaction initiale :** Firebase Auth, monolithe unique et exclusion du workflow in-app ont été **abandonnés** au profit de Clerk, microservices et workflow intégré (voir ADR-010, ADR-008, `docs/REFACTOR_RBAC_WORKFLOW.md`).

### 7.3 Démarche d'intervention et planification

#### 7.3.1 Cadre Agile : SCRUM

- **Product Owner / Scrum Master :** Dominique Nkoa
- **Équipe :** Aimé Nganomo (Frontend & UI), Kevin Seme (Backend & architecture système)
- Cycle : 4 sprints d'une semaine + itérations post-soutenance (RBAC, workflow, prod EC2)

#### 7.3.2 Planification des sprints et jalons

| Sprint | Période | Objectifs principaux | Livrables |
|--------|---------|---------------------|-----------|
| S1 | J1 – J7 | Auth, import Excel, tableau de bord | Démo S1 |
| S2 | J8 – J14 | Fiche événement, participants, admin templates | Démo S2 |
| S3 | J15 – J21 | DocGen paquet + certificats 2 étapes | Démo S3 |
| S4 | J22 – J28 | Historique, audit, déploiement | Tests, soutenance |
| Post-S4 | Juin–Juil. 2026 | RBAC 4 rôles, workflow, GuideHub, prod HTTPS, catalogue types | Releases `staging` |

| Document | Période | Contenu |
|----------|---------|---------|
| L-01 Cahier des charges | Mai – juillet 2026 | Présent document (v2 alignée implémentation) |
| L-02 Cahier d'analyse | Juillet 2026 | UML analyse — [CAHIER_D_ANALYSE.md](CAHIER_D_ANALYSE.md) |
| L-03 Cahier de conception | Juillet 2026 | Architecture — [CAHIER_DE_CONCEPTION.md](CAHIER_DE_CONCEPTION.md) |
| L-04 Code source | Sprints 1 à 4 + itérations | Monorepo GitHub `traumatec-impact-platform` |
| L-05 Schéma BDD | Continu | `database/schema.sql` + migrations |
| L-09 Rapport de tests | Sprint 4 | Scénarios manuels ; e2e workflow à compléter |

**Jalons :** validation cahier des charges → démos sprint → déploiement EC2 → HTTPS `tip-platform.hopto.org` → workflow qualité en production.

---

## VIII. Présentation de l'équipe projet

### Dominique Nkoa — Product Owner (PO)

- **Spécificités :** Cadrage fonctionnel, priorisation backlog, recette métier, interface Processing Team et direction TRAUMATEC.
- **Rôle :** Garant de la valeur métier. Définition des user stories, validation des livrables, arbitrages sur le workflow qualité et les templates AO Alliance.

### Aimé Nganomo — Ingénieur Frontend & Intégration UI

- **Spécificités :** React, TypeScript, Tailwind, composants TailAdmin, i18n FR/EN.
- **Rôle :** Interface unifiée, tableaux de bord par rôle, pages workflow, certificats, formulaires événement, intégration Clerk côté client.

### Kevin Seme — Ingénieur Backend & Architecte Système

- **Spécificités :** FastAPI, PostgreSQL, Docker Compose, Redis/RQ, intégrations Clerk / MinIO / ONLYOFFICE / Mistral.
- **Rôle :** Découpage microservices, API Gateway, pipeline DocGen, workflow, déploiement EC2, sécurité et observabilité.

---

## IX. Ressources utilisées

### 9.1 Ressources matérielles

**Postes de travail développeurs**

- Processeur : 4 cœurs / 8 threads minimum (compilations Docker + TypeScript parallèles).
- RAM : 16 Go recommandés (plusieurs conteneurs : Postgres, Redis, MinIO, 4 services FastAPI, frontend, OnlyOffice).
- Stockage : SSD NVMe 256 Go+.

**Infrastructure réseau**

- Connexion stable pour images Docker, dépendances npm/pip, API Clerk et Mistral.

**Serveur production (EC2)**

| Caractéristique | Valeur déployée |
|-----------------|-----------------|
| Fournisseur | AWS EC2 |
| Instance | `i-0c5e617127fac865c` (Traumatec-server) |
| OS | Ubuntu 24.04 |
| vCPU / RAM | 2 vCPU, ~4 Go RAM (+ swap 4 Go) |
| Stockage | ~30 Go SSD |
| Domaine | `tip-platform.hopto.org` (HTTPS) |
| Pare-feu | UFW : SSH, 80, 443, 3101 |

### 9.2 Ressources logicielles

| Composant | Version / rôle |
|-----------|----------------|
| Docker & Docker Compose | Conteneurisation identique dev/prod |
| Nginx | Passerelle API, TLS, proxy GuideHub |
| FastAPI + uvicorn | Microservices backend |
| PostgreSQL 16 | Persistance relationnelle |
| Redis 7 | Broker RQ + cache handoff |
| MinIO | Stockage documents S3 |
| RQ | Workers génération documentaire |
| React 19 + Vite 6 | Frontend SPA |
| Clerk | Authentification et invitations |
| ONLYOFFICE 8.0.1 | Édition Word/Excel |
| docxtpl / openpyxl | Injection templates |
| Mistral API | Assistant et scan import |
| Prometheus / Grafana | Monitoring |
| Git / GitHub | Versionnement, branche `staging` |
| Visual Studio Code | IDE |

---

## X. Conclusion

Ce cahier des charges révisé pose les fondations **alignées sur l'implémentation réelle** de Traumatec Impact Platform (AOA-DocGen) : automatiser la production des paquets documentaires à partir des modèles de préparation, piloter les événements et les certificats, et **intégrer le circuit qualité** (contrôle procédure et validation finale) dans l'application.

Par rapport à la rédaction initiale, les évolutions majeures sont :

1. **Architecture microservices** (identity, events, catalog, docgen, analytics) au lieu d'un monolithe exclusif.
2. **Authentification Clerk** et application fermée, à la place de Firebase.
3. **Quatre rôles applicatifs** et workflow in-app, au lieu d'un simple couple préparateur/administrateur avec validation hors outil.
4. **Pont GuideHub** opérationnel (handoff JWT sécurisé).
5. **Administration dédiée** des catégories et types de paquet, ONLYOFFICE, modèles Excel d'import.
6. **Déploiement production** sur EC2 avec HTTPS.

Le problème des ressaisies multiples et des certificats copiés à la main est traduit en trente besoins fonctionnels et douze exigences non fonctionnelles. La spécification organise le produit en modules support, administrateur, workflow, certificats et DocGen.

Les livrables d'analyse et de conception sont disponibles : **[Cahier d'analyse L-02](CAHIER_D_ANALYSE.md)** (UML analyse, diagrammes dans `docs/diagrams/analyse/`) et **[Cahier de conception L-03](CAHIER_DE_CONCEPTION.md)** (architecture, classes de conception, maquettes, diagrammes dans `docs/diagrams/conception/`). La phase d'implémentation et de recette se poursuit sur la branche `staging` avec déploiement production EC2.

---

## Signatures

| Qualité / Rôle | Nom | Date |
|----------------|-----|------|
| Auteur (Étudiant) | BILOGUE SEME Eric Kevin | Juillet 2026 |
| Auteur | NGANOMO Aimé | Juillet 2026 |
| Product Owner / Encadrant Pro | M. NKOA Dominique | Juillet 2026 |
| Encadrant Académique | Saint-Jean Ingénieur | Juillet 2026 |

---

## Annexes — références techniques

| Document | Chemin |
|----------|--------|
| Cahier d'analyse L-02 | `docs/CAHIER_D_ANALYSE.md` |
| Cahier de conception L-03 | `docs/CAHIER_DE_CONCEPTION.md` |
| Diagrammes UML (PNG) | `docs/diagrams/analyse/`, `docs/diagrams/conception/` |
| Index diagrammes | `docs/diagrams/README.md` |
| Architecture (synthèse) | `docs/architecture.md` |
| Configuration | `docs/CONFIGURATION.md` |
| RBAC & workflow | `docs/REFACTOR_RBAC_WORKFLOW.md` |
| Parcours d'import | `docs/import-templates-flow.md` |
| ADR Clerk | `docs/decisions/010-clerk-auth-closed-app.md` |
| ADR Microservices | `docs/decisions/008-microservices-modular-architecture.md` |
| ADR Certificats 2 passes | `docs/decisions/007-certificate-two-step-pipeline.md` |
| Déploiement EC2 | `scripts/deploy-ec2.sh` |
| Production | https://tip-platform.hopto.org |
