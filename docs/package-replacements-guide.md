# Cartographie des remplacements — paquets AO Alliance

Audit généré à partir des fichiers source `Packages/{TYPE}/` (92 documents, 5 types).

**Script de ré-audit :** `python3 scripts/audit_package_replacements.py`  
**Données brutes JSON :** `docs/package-replacement-audit.json`

---

## Clés événement utilisées (contexte docgen)

| Clé | Source événement TIP | Exemple de remplacement |
|-----|----------------------|-------------------------|
| `project_number` | `project_number` | `702294` |
| `title` | `title` | Titre complet AO Alliance |
| `city` | `city` | `Dakar` |
| `country` | `country` | `Sénégal` |
| `lieu` | `city` + `country` | `Dakar, Sénégal` |
| `region` | `region` | Région si renseignée |
| `responsible_person` | `responsible_person` | `Amadou Ndiasse Kassé` |
| `start_date` / `end_date` | dates ISO | `24/10/2026` |
| `start_date_long` / `end_date_long` | dates longues FR | `24 octobre 2026` |
| `date_range` | plage formatée | `03 – 05 juin 2026` ou `24 octobre 2026` (1j) |
| `weekday_date` | jour de la semaine + date | `mardi 24 octobre 2026` |
| `preparation_theme` | thème | `iec`, `pbo`, `operatory` |
| `package_label` | type paquet | `IEC S`, `ORP C`, … |

**À conserver (ne pas remplacer) :** `Prénom Nom`, `Prénom/ Nom`, `adresse@email`, lignes numérotées vides des tableaux.

---

## Vue par rôle de document (commun à tous les types)

### `01_` Accord collaboration (xlsx)
- **Action :** remplacer projet + dates + lieu dans les cellules d'en-tête.
- **Détection auto :** faible (fichier volumineux ~700 Ko, peu de texte en clair).
- **À cibler manuellement :** numéro projet, titre, responsable national, dates, pays.

### `02_` Programme (doc / docx) — document le plus riche
- **Action :** remplacement complet.
- **Zones typiques (surlignées en jaune dans les .docx) :**
  - Ligne d'accroche : `08 – 10 octobre 2026       Brazzaville, Congo`
  - Accueil : `Cher-ère Participant-e au cours de l'AO Alliance,`
  - Corps : titre du cours/séminaire AOA
  - Agenda : `lundi …`, `mardi …` (chaque jour)
  - Intervenants : `Prénom Nom` + `Nom de l'hôtel/hôpital, Pays` → **garder** le format, remplacer hôtel/pays/lieu
- **Fichiers .doc** (ORP_S, IEC_S) : pas de surlignage XML ; recherche binaire `TBD`, dates, `adresse@email`.

| Type | Fichier programme | Extrait modèle observé |
|------|-------------------|------------------------|
| ORP_S | `02_Modèle_Programme_PBO.doc` | Séminaire PBO 1 jour |
| OP_C | `02_Modèle Programme_Op C_v2.docx` | `03 – 05 juin 2026 Mbour, Sénégal` |
| ORP_C | `02_Modèle programme_ORP C_Congo_v2.docx` | `08 – 10 octobre 2026 Brazzaville, Congo` |
| IEC_S | `02_Modèle_Programme_Sem IEC_SEN.doc` | Séminaire IEC 1 jour |
| NONOP_C | `02_Modèle Programme_Nonp C_SEN.docx` | `25 – 27 novembre 2026 Kaffrine, Sénégal` |

### `03_` Budget prévisionnel (xlsx)
- **Action :** projet, dates, lieu dans onglets budget.
- **Détection auto :** faible sans cartographie cellule par cellule.

### `04_` Coordonnées bancaires (docx)
- **Remplacer :** date(s) en en-tête (`29 mai 2026`, `03 – 05 juin 2026`, …).
- **Clé :** `date_range` ou `start_date`.

### `05_` Évaluation en ligne (pdf)
- **Action :** **copie** sans modification.

### `06_` Rapport responsable national (docx)
- **Remplacer :**
  - `Titre de l'événement : …` → `title`
  - `Date : … Lieu de l'événement : …` → `date_range` + `lieu`
  - `Responsable : …` → `prepared_by` (nom de l'utilisateur ayant généré le paquet)
  - `Nombre de participants :` → `participants_expected` (si renseigné)
- **Conserver :** grilles numérotées enseignants/participants (cases à cocher).

### `07a/b/c_` Listes présence enseignants (docx)
- **En-tête (header/footer, pas surligné) :**
  - Ligne 1 : titre complet du séminaire/cours → `title`
  - Ligne 2 : `Ville, Pays date` ou `Ville, Pays JJ – JJ mois AAAA` → `lieu` + `date_range`
  - Sous-titre jour : `Liste Enseignants (29 mai 2026)` → `weekday_date` ou date du jour N
- **Corps :** tableau vide → **ne pas toucher** (saisie manuelle sur place).

| Type | Fichiers inclus |
|------|-----------------|
| **1 jour** (IEC_S, ORP_S) | `07a` uniquement |
| **3 jours** (OP_C, ORP_C, NONOP_C) | `07a`, `07b`, `07c` |

### `08a/b/c_` Listes présence participants (docx)
- Même logique que `07_` (même en-tête événement).
- **1 jour :** `08a` seulement. **3 jours :** `08a`, `08b`, `08c`.

### `09_` Liste définitive (xlsx)
- **Remplacer :** métadonnées projet en tête de feuille si présentes.
- **Conserver :** colonnes noms / pays / hôpital (vides).

### `10_` Accusé réception paiement (docx)
- **Remplacer :** date(s) dans le corps (`date_range`).

### `11_` Report dépenses (xlsx)
- **Remplacer :** projet, dates, lieu dans cellules d'identification.

### `12_` Guide utilisateur (pdf)
- **Action :** **copie**.

### `13a/b_` Logos (png / pdf)
- **Action :** **copie**.

### `14_` Modèle badge (doc)
- **Remplacer :** `TBD`, ville, pays si présents (binaire).

### `15_` Présentation PPT (pptx)
- **Action :** **copie** (personnalisation manuelle optionnelle).

---

## Synthèse par type de paquet

### IEC_S — Séminaire IEC, 1 jour (16 fichiers, 11 à personnaliser)

| Fichier | Remplacements attendus |
|---------|------------------------|
| 01 accord | projet, titre, responsable, dates, lieu |
| 02 programme `.doc` | titre IEC, date 1j, lieu, emails modèle |
| 03 budget | métadonnées projet |
| 04 coord. bancaires | `24 octobre 2026` → date événement |
| 05 pdf | copie |
| 06 rapport national | titre séminaire IEC, date, Dakar→lieu, responsable |
| **07a** enseignants J1 | en-tête : titre + `Dakar, Sénégal 24 octobre 2026` |
| **08a** participants J1 | idem en-tête |
| 09 liste définitive | en-tête xlsx |
| 10 accusé | date |
| 11 report dépenses | métadonnées |
| 12–13 logos | copie |
| 14 badge | lieu si TBD |
| 15 pptx | copie |

**Pas de 07b/c ni 08b/c** (filtre durée 1 jour dans docgen).

---

### ORP_S — Séminaire ORP PBO, 1 jour (16 fichiers, 11 à personnaliser)

Même structure que IEC_S. Exemples observés :
- En-tête présence : `Bangui, RCA 29 mai 2026`
- Programme : `02_Modèle_Programme_PBO.doc` (binaire, pas de surlignages XML)

---

### OP_C — Cours opératoire, 3 jours (20 fichiers, 15 à personnaliser)

| Spécificité | Détail |
|-------------|--------|
| Programme | `03 – 05 juin 2026 Mbour, Sénégal` + lignes hôpital |
| Présences | 6 fichiers (07a–c, 08a–c) avec date plage en en-tête |
| Accusé | variante `_v2.docx` |

---

### ORP_C — Cours ORP PBO, 3 jours (20 fichiers, 15 à personnaliser)

| Spécificité | Détail |
|-------------|--------|
| Programme | `08 – 10 octobre 2026 Brazzaville, Congo` |
| Présences | 6 listes J1–J3 |

---

### NONOP_C — Cours non opératoire, 3 jours (20 fichiers, 15 à personnaliser)

| Spécificité | Détail |
|-------------|--------|
| Programme | `25 – 27 novembre 2026 Kaffrine, Sénégal` |
| Présences | 6 listes J1–J3 |

---

## Mécanismes de remplacement docgen (implémentés)

1. **docxtpl** : variables `{{ title }}`, `{{ city }}`, `{{ start_date }}`, …
2. **Par rôle de document** (`document_role_replace.py` + `docx_xml_replace.py`) : en-têtes présences, rapport national, dates/lieu selon `07a`/`06_`/…
3. **Texte surligné jaune** : dates, lieu, hôtel (`highlight_replace.py`)
4. **Texte brut** : `TBD`, placeholders `[PROJECT_NUMBER]`, …
5. **Analyse IA par fichier** (`replacement_fields` dans `placeholders` JSON)
6. **Excel** : cellules + logique rôle (`accord_collaboration`, `budget`, …)
7. **`.doc` legacy** : remplacement binaire + paires IA

---

## Points d'attention

1. **Listes de présence** : le texte à changer est dans l'**en-tête** Word, pas dans le corps (pas de surlignage jaune) — l'audit doit scanner `word/header*.xml`.
2. **Fichiers xlsx lourds** (01, 03) : nécessitent une cartographie cellule par cellule pour une couverture à 100 %.
3. **Programmes .doc** (IEC_S, ORP_S) : conversion ou analyse binaire limitée ; prévoir revue manuelle ou migration `.docx`.
4. **Paquets 1 jour** : exclure automatiquement les fichiers `Jour 2` / `Jour 3` à la génération.
