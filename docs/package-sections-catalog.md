# Catalogue des sections à remplacer — tous documents AO

Généré par `scan_all_document_sections.py` — classifier IA : non

## ORP_S — ORP S (1j)

### 01_AOA_Accord collaboration_responsable national v15112024.xlsx (`accord_collaboration`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Procédure de gestion des évènements de l'AOA pour le responsable national de l'évènement (révisé le 11 mars 2024) | `date_range` | replace | date_line |
| Au plus tard 3 mois avant l'événement | `title` | replace | body_text |
| Le responsable national de l'évènement doit soumettre les documents de compte rendu d'événement suivants : | `title` | replace | body_text |
| Nom de l'évènement: Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie | `title` | replace | event_header |
| Lieu de l'évènement: Bangui, RCA | `title` | replace | body_text |
| Date de l'évènement: 29 mai 2026 | `start_date_long` | replace | date_line |
| est d´accord pour collaborer avec l'AO Alliance en appliquant les procédures susmentionnées dans le cadre de l´organisat | `title` | replace | event_header |
| que responsable national de l'événement et de suivre les directives en matière d'hygiène locales pour l'organisation d'é | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |
| Guide per diem de l'AO Alliance | `title` | replace | body_text |

### 02_Modèle_Programme_PBO.doc (`programme`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| 29 mai 2026		   			Bangui, RCA | `lieu` | replace | lieu_line |
| BienvenueCher-re Participant-e au sminaire de lAO Alliance,Nous avons le plaisir de vous accueillir au sminaire de lAO | `title` | replace | event_header |
| Barbara RigassiPrsidente AO Alliance | `title` | replace | event_header |
| Organisation du sminaireAO Alliance Foundationc/o Fiduciar Treuhand AGTheaterweg 11, 7000 ChurSuisse | `title` | replace | event_header |
| 11111111111 111Informations gnralesLieu du sminaireNom de lhtel/lhpital, Bangui, RCABureau  | `title` | replace | event_header |
| InformelleLangue du sminaireFranaisNotesVendredi 29 mai 2026 | `date_range` | replace | date_line |
| Bienvenue Introduction et objectifs du sminaire.Quest-ce que cest la Fondation AO et l'AO Alliance | `title` | replace | event_header |
| propos de lAO Alliance et de lAO Foundation  Prsentation des activits 2026 | `title` | replace | event_header |
| NotesAO Alliance Foundationc/o Fiduciar Treuhand AGTheate | `title` | replace | event_header |
| Sminaire AO AllianceMaintenance et Entretien des Instruments de Traumatologie | `title` | replace | event_header |

### 03_AOA_Formulaire Budget prévisionnel_v20250506.xlsx (`budget`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Formulaire de budget prévisionnel de l'événement | `title` | replace | body_text |
| Responsable national de l'événement: | `title` | replace | body_text |
| Titre de l'événement: | `title` | replace | label_field |
| Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie | `title` | replace | event_header |
| Date de l'événement: | `title` | replace | body_text |
| 29 mai 2026 | `start_date_long` | replace | date_line |
| Lieu de l'événement: | `title` | replace | body_text |
| Bangui RCA | `lieu` | replace | lieu_line |
| Note importante: (1) le budget de l'événement de l'AOA ne doit pas être utilisé pour l'achat de matériel (par exemple: o | `title` | replace | body_text |
| Lieu de l'événement | `title` | replace | body_text |
| En signant et en soumettant ce formulaire de proposition de budget, le responsable de l'événement comprend et accepte l' | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |

### 04_Formulaire pour coordonnees bancaires.docx (`coordonnees_bancaires`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Coordonnées bancaires pour le transfert du budget pour les évènements AO Alliance (AOA) | `title` | replace | document_title |
| Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie | `title` | replace | document_title |
| Bangui, RCA | `lieu` | replace | lieu_line |
| 29 mai 2026 | `start_date_long` | replace | date_line |

### 📄 05_AOA Online Evaluation de l_evenement_1.pdf — **copie**

### 06_Rapport responsable national de l_evenement.docx (`rapport_national`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Rapport du responsable national de l’événement AOA | `title` | replace | body_text |
| Veuillez remplir ce formulaire dans un délai d'un mois après l’événement et le retourner à l'adresse ci-dessous. | `title` | replace | body_text |
| Titre de l’événement : Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie | `title` | replace | label_field |
| Date : 29 mai 2026              Lieu de l’événement : Bangui, RCA | `date_range` | replace | date_lieu_combined |
| Nombre de participants :      Responsable : Bertrand Tékpa | `responsible_person` | replace | label_field |
| Veuillez reporter les noms de tous enseignants. Cochez la case après le nom de ceux que vous recommander pour le prochai | `title` | replace | body_text |
| Voulez-vous recommander un enseignant infirmier(ère) pour un futur événement de formation pour enseignants ? | `title` | replace | body_text |
| Prochaine fois: (Améliorations potentielles de la qualité) Liste des améliorations proposées pour le prochain événement | `title` | replace | body_text |
| AO Alliance Foundationc/o Fiduciar Treuhand AG | `title` | replace | event_header |

### 07a_ Liste de présence_Enseignants_Jour1.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie | `title` | replace | document_title |
| Bangui, RCA 29 mai 2026 | `lieu` | replace | lieu_line |
| Liste Enseignants (29 mai 2026) | `weekday_date` | replace | event_header |

### 08a_Liste de présence Participants_Jour1.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie | `title` | replace | document_title |
| Bangui, RCA 29 mai 2026 | `lieu` | replace | lieu_line |
| Liste Participants (29 mai 2026) | `weekday_date` | replace | event_header |

### 09_Liste définitive (enseignants et Participants).xlsx (`liste_definitive`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie | `title` | replace | event_header |
| Bangui, RCA 29 mai 2026 | `lieu` | replace | lieu_line |

### 10_Accusé de réception de paiement en espèces.docx (`accuse_paiement`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie | `title` | replace | document_title |
| Bangui, RCA | `lieu` | replace | lieu_line |
| 29 mai 2026 | `start_date_long` | replace | date_line |
| Date: | `date_range` | replace | date_line |

### 11_Formulaire report des dépenses et vérification finale du budget.xlsx (`rapport_depenses`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Final Cost overview Course "Séminaire AO Alliance—Maintenance et Entretien des Instruments de Traumatologie"; "Bangui, R | `title` | replace | event_header |

### 📄 12_Guide Utilisateur_Rapport final de dépense.pdf — **copie**

### 📄 13a_Logo AO Alliance.png — **copie**

### 📄 13b_AO_Alliance_logo.pdf — **copie**

### 14_AOA_ModèleBadge.doc (`badge`)

_Aucune section détectée automatiquement — revue manuelle._

### 📄 15_Modèle PPT d'AO Alliance à l'usage du corps professoral_16-9.pptx — **copie**

## OP_C — Op C (3j)

### 01_AOA_Accord collaboration_responsable national v15112024.xlsx (`accord_collaboration`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Procédure de gestion des évènements de l'AOA pour le responsable national de l'évènement (révisé le 11 mars 2024) | `date_range` | replace | date_line |
| Au plus tard 3 mois avant l'événement | `title` | replace | body_text |
| Le responsable national de l'évènement doit soumettre les documents de compte rendu d'événement suivants : | `title` | replace | body_text |
| Nom de l'évènement: Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | event_header |
| Lieu de l'évènement: Mbour, Sénégal | `title` | replace | body_text |
| Date de l'évènement: 03 - 05 juin 2026 | `start_date_long` | replace | date_line |
| est d´accord pour collaborer avec l'AO Alliance en appliquant les procédures susmentionnées dans le cadre de l´organisat | `title` | replace | event_header |
| que responsable national de l'événement et de suivre les directives en matière d'hygiène locales pour l'organisation d'é | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |
| Guide per diem de l'AO Alliance | `title` | replace | body_text |

### 02_Modèle Programme_Op C_v2.docx (`programme`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AO Alliance—Principes du Traitement Chirurgical des | `title` | replace | document_title |
| 03 – 05 juin 2026          Mbour, Sénégal | `date_range` | replace | highlight |
| Cher-ère Participant-e au cours de l’AO Alliance, | `title` | replace | highlight |
| Nous avons le plaisir de vous accueillir au cours de l’AO Alliance—Principes du Traitement Chirurgical des Fractures de  | `title` | replace | highlight |
| L'AO Alliance (AOA) est une organisation de développement à but non lucratif qui se consacre à améliorer les soins appor | `title` | replace | document_title |
| L'AOA entretient une étroite collaboration avec l’AO Foundation (AOF) et l’AO Education Institute (AO EI). Les principes | `title` | replace | body_text |
| Les événements de l'AOA peuvent vous être proposés grâce au soutien considérable et dévoué du comité organisateur nation | `title` | replace | body_text |
| Le cours de l’AO Alliance—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes a pour but de  | `title` | replace | document_title |
| AO Alliance Foundationc/o Fiduciar Treuhand AG | `title` | replace | document_title |
| Nom de l’hôtel/hôpital, Mbour, Sénégal | `lieu` | replace | highlight |
| Ouvert à partir de: date et heure | `title` | replace | highlight |
| L’AO Alliance se réserve le droit, pendant ses activités, de filmer, photographier et enregistrer. Les participants doiv | `title` | replace | document_title |
| Mercredi 03 juin 2026 | `date_range` | replace | highlight |
| Jeudi 04 juin 2026 | `date_range` | replace | highlight |
| Vendredi 05 juin 2026 | `date_range` | replace | highlight |
| À propos de l’AO Alliance et de l’AO Foundation | `title` | replace | document_title |
| Fin du cours de l’AO Alliance | `title` | replace | body_text |

### 03_AOA_Formulaire Budget prévisionnel_v20250506.xlsx (`budget`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Formulaire de budget prévisionnel de l'événement | `title` | replace | body_text |
| Responsable national de l'événement: | `title` | replace | body_text |
| Titre de l'événement: | `title` | replace | label_field |
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | event_header |
| Date de l'événement: | `title` | replace | body_text |
| 03 - 05 juin 2026 | `start_date_long` | replace | date_line |
| Lieu de l'événement: | `title` | replace | body_text |
| Mbour, Sénégal | `lieu` | replace | lieu_line |
| Note importante: (1) le budget de l'événement de l'AOA ne doit pas être utilisé pour l'achat de matériel (par exemple: o | `title` | replace | body_text |
| Lieu de l'événement | `title` | replace | body_text |
| En signant et en soumettant ce formulaire de proposition de budget, le responsable de l'événement comprend et accepte l' | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |

### 04_Formulaire pour coordonnees bancaires.docx (`coordonnees_bancaires`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Nom de l’événement AOA | `title` | replace | body_text |
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Lieu de l’événement AOA (pays, lieu) | `title` | replace | body_text |
| Mbour, Sénégal | `lieu` | replace | lieu_line |
| Date de l’événement AOA | `title` | replace | body_text |
| 03 – 05 juin 2026 | `start_date_long` | replace | date_line |

### 📄 05_AOA Online Evaluation de l_evenement_1.pdf — **copie**

### 06_Rapport responsable national de l_evenement.docx (`rapport_national`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Rapport du responsable national de l’événement AOA | `title` | replace | body_text |
| Veuillez remplir ce formulaire dans un délai d'un mois après l’événement et le retourner à l'adresse ci-dessous. | `title` | replace | body_text |
| Titre de l’événement : Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | label_field |
| Date : 03 - 05 juin 2026              Lieu de l’événement : Mbour, Sénégal | `date_range` | replace | date_lieu_combined |
| Nombre de participants :      Responsable : Amadou Ndiasse Kassé | `responsible_person` | replace | label_field |
| Veuillez reporter les noms de tous enseignants. Cochez la case après le nom de ceux que vous recommander pour le prochai | `title` | replace | body_text |
| Voulez-vous recommander un enseignant infirmier(ère) pour un futur événement de formation pour enseignants ? | `title` | replace | body_text |
| Prochaine fois: (Améliorations potentielles de la qualité) Liste des améliorations proposées pour le prochain événement | `title` | replace | body_text |
| AO Alliance Foundationc/o Fiduciar Treuhand AG | `title` | replace | event_header |

### 07a_ Liste de présence_Enseignants_Jour1.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Mbour, Sénégal 03 – 05 juin 2026 | `lieu` | replace | lieu_line |
| Liste Enseignants (03 juin, Jour 1) | `weekday_date` | replace | event_header |

### 07b_ Liste de présence_Enseignants_Jour2.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Mbour, Sénégal 03 – 05 juin 2026 | `lieu` | replace | lieu_line |
| Liste Enseignants (04 juin, Jour 2) | `weekday_date` | replace | event_header |

### 07c_ Liste de présence_Enseignants_Jour3.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Mbour, Sénégal 03 – 05 juin 2026 | `lieu` | replace | lieu_line |
| Liste Enseignants (05 juin, Jour 3) | `weekday_date` | replace | event_header |

### 08a_Liste de présence Participants_Jour1.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Mbour, Sénégal 03 – 05 juin 2026 | `lieu` | replace | lieu_line |
| Liste Participants (03 juin, Jour 1) | `weekday_date` | replace | event_header |

### 08b_Liste de présence Participants_Jour2.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Mbour, Sénégal 03 – 05 juin 2026 | `lieu` | replace | lieu_line |
| Liste Participants (04 juin, Jour 2) | `weekday_date` | replace | event_header |

### 08c_Liste de présence Participants_Jour3.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Mbour, Sénégal 03 – 05 juin 2026 | `lieu` | replace | lieu_line |
| Liste Participants (05 juin, Jour 3) | `weekday_date` | replace | event_header |

### 09_Liste définitive (enseignants et Participants) (2).xlsx (`liste_definitive`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | event_header |
| Mbour, Sénégal 03 – 05 juin 2026 | `lieu` | replace | lieu_line |

### 10_Accusé de réception de paiement en espèces_v2.docx (`accuse_paiement`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Mbour, Sénégal | `lieu` | replace | lieu_line |
| 03 – 05 juin 2026 | `start_date_long` | replace | date_line |
| Date: | `date_range` | replace | date_line |

### 11_Formulaire report des dépenses et vérification finale du budget_v2.xlsx (`rapport_depenses`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Final Cost overview "Cours AOA - Principes du Traitement Chirurgical des Fractures de Membres les plus Courantes" ; "Mbo | `title` | replace | event_header |

### 📄 12_Guide Utilisateur_Rapport final de dépense.pdf — **copie**

### 📄 13a_Logo AO Alliance.png — **copie**

### 📄 13b_AO_Alliance_logo.pdf — **copie**

### 14_AOA_ModèleBadge.doc (`badge`)

_Aucune section détectée automatiquement — revue manuelle._

### 📄 15_Modèle PPT d'AO Alliance à l'usage du corps professoral_v20200112.pptx — **copie**

## ORP_C — ORP C (3j)

### 01_AOA_Accord collaboration_responsable national v15112024.xlsx (`accord_collaboration`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Procédure de gestion des évènements de l'AOA pour le responsable national de l'évènement (révisé le 11 mars 2024) | `date_range` | replace | date_line |
| Au plus tard 3 mois avant l'événement | `title` | replace | body_text |
| Le responsable national de l'évènement doit soumettre les documents de compte rendu d'événement suivants : | `title` | replace | body_text |
| Nom de l'évènement: Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | event_header |
| Lieu de l'évènement: Brazzaville, Congo | `title` | replace | body_text |
| Date de l'évènement: 08 - 10 octobre 2026 | `date_range` | replace | date_line |
| est d´accord pour collaborer avec l'AO Alliance en appliquant les procédures susmentionnées dans le cadre de l´organisat | `title` | replace | event_header |
| que responsable national de l'événement et de suivre les directives en matière d'hygiène locales pour l'organisation d'é | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |
| Guide per diem de l'AO Alliance | `title` | replace | body_text |

### 02_Modèle programme_ORP C_Congo_v2.docx (`programme`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des | `title` | replace | document_title |
| 08 – 10 octobre 2026       Brazzaville, Congo | `date_range` | replace | highlight |
| Cher-ère Participant-e au cours de l’AO Alliance, | `title` | replace | document_title |
| Nous avons le plaisir de vous accueillir au cours de l’AOA—Principes de Chirurgical Traitement des Fractures pour le Per | `title` | replace | highlight |
| L'AO Alliance (AOA) est une organisation de développement à but non lucratif qui se consacre à améliorer les soins appor | `title` | replace | document_title |
| L'AOA entretient une étroite collaboration avec l’AO Foundation (AOF) et l’AO Education Institute (AO EI). Les principes | `title` | replace | body_text |
| Les événements de l'AOA peuvent vous être proposés grâce au soutien considérable et dévoué du comité organisateur nation | `title` | replace | body_text |
| Le cours de l’AO Alliance—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire a pour  | `title` | replace | document_title |
| AO Alliance Foundationc/o Fiduciar Treuhand AG | `title` | replace | document_title |
| Nom de l’hôtel/hôpital, Brazzaville, Congo | `lieu` | replace | highlight |
| Ouvert à partir de: date et heure | `title` | replace | highlight |
| L’AO Alliance se réserve le droit, pendant ses activités, de filmer, photographier et enregistrer. Les participants doiv | `title` | replace | document_title |
| Jeudi 08 octobre 2026 | `date_range` | replace | highlight |
| PBO ou chirurgien | `title` | replace | highlight |
| PBO et chirurgien | `title` | replace | highlight |
| À propos de la Fondation AO Alliance | `title` | replace | document_title |
| Chirurgien | `title` | replace | highlight |
| S’il y avait 2 stations mieux | `title` | replace | highlight |
| Groupe 1 - 2 | `title` | replace | highlight |
| Groupe 3 - 4 | `title` | replace | highlight |
| Vendredi 09 octobre 2026 | `date_range` | replace | highlight |
| Timekeeper | `title` | replace | highlight |
| Samedi 10 octobre 2026 | `date_range` | replace | highlight |
| Time keeper | `title` | replace | highlight |
| Fin du cours de l’AO Alliance | `title` | replace | body_text |

### 03_AOA_Formulaire Budget prévisionnel_v20260423.xlsx (`budget`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Formulaire de budget prévisionnel de l'événement | `title` | replace | body_text |
| Responsable national de l'événement: | `title` | replace | body_text |
| Titre de l'événement: | `title` | replace | label_field |
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | event_header |
| Date de l'événement: | `title` | replace | body_text |
| 08 - 10 octobre 2026 | `start_date_long` | replace | date_line |
| Lieu de l'événement: | `title` | replace | body_text |
| Brazzaville, Congo | `title` | replace | body_text |
| Note importante: (1) le budget de l'événement de l'AOA ne doit pas être utilisé pour l'achat de matériel (par exemple: o | `title` | replace | body_text |
| Lieu de l'événement | `title` | replace | body_text |
| En signant et en soumettant ce formulaire de proposition de budget, le responsable de l'événement comprend et accepte l' | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |

### 04_Formulaire pour coordonnees bancaires.docx (`coordonnees_bancaires`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Coordonnées bancaires pour le transfert du budget pour les évènements AO Alliance (AOA) | `title` | replace | document_title |
| Nom de l’événement AOA | `title` | replace | body_text |
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | document_title |
| Lieu de l’événement AOA (pays, lieu) | `title` | replace | body_text |
| Brazzaville, Congo | `title` | replace | body_text |
| Date de l’événement AOA | `title` | replace | body_text |
| 08 – 10 octobre 2026 | `start_date_long` | replace | date_line |

### 📄 05_AOA Online Evaluation de l_evenement_1.pdf — **copie**

### 06_Rapport responsable national de l_evenement.docx (`rapport_national`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Rapport du responsable national de l’événement AOA | `title` | replace | body_text |
| Veuillez remplir ce formulaire dans un délai d'un mois après l’événement et le retourner à l'adresse ci-dessous. | `title` | replace | body_text |
| Titre de l’événement : Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | label_field |
| Date : 08 - 10 octobre 2026              Lieu de l’événement : Brazzaville, Congo | `date_range` | replace | date_lieu_combined |
| Nombre de participants :      Responsable : Kevin Bouhelo-Pam | `responsible_person` | replace | label_field |
| Veuillez reporter les noms de tous enseignants. Cochez la case après le nom de ceux que vous recommander pour le prochai | `title` | replace | body_text |
| Voulez-vous recommander un enseignant infirmier(ère) pour un futur événement de formation pour enseignants ? | `title` | replace | body_text |
| Prochaine fois: (Améliorations potentielles de la qualité) Liste des améliorations proposées pour le prochain événement | `title` | replace | body_text |
| AO Alliance Foundationc/o Fiduciar Treuhand AG | `title` | replace | event_header |

### 07a_ Liste de présence_Enseignants_Jour1.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | document_title |
| Brazzaville, Congo 08 – 10 octobre 2026 | `lieu` | replace | lieu_line |
| Liste enseignants (08 octobre, Jour 1) | `weekday_date` | replace | event_header |

### 07b_ Liste de présence_Enseignants_Jour2.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | document_title |
| Brazzaville, Congo 08 – 10 octobre 2026 | `lieu` | replace | lieu_line |
| Liste enseignants (09 octobre, Jour 2) | `weekday_date` | replace | event_header |

### 07c_ Liste de présence_Enseignants_Jour3.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | document_title |
| Brazzaville, Congo 08 – 10 octobre 2026 | `lieu` | replace | lieu_line |
| Liste enseignants (10 octobre, Jour 3) | `weekday_date` | replace | event_header |

### 08a_Liste de présence Participants_Jour1.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | document_title |
| Brazzaville, Congo 08 – 10 octobre 2026 | `lieu` | replace | lieu_line |
| Liste participants (08 octobre, Jour 1) | `weekday_date` | replace | event_header |

### 08b_Liste de présence Participants_Jour2.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | document_title |
| Brazzaville, Congo 08 – 10 octobre 2026 | `lieu` | replace | lieu_line |
| Liste participants (09 octobre, Jour 2) | `weekday_date` | replace | event_header |

### 08c_Liste de présence Participants_Jour3.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | document_title |
| Brazzaville, Congo 08 – 10 octobre 2026 | `lieu` | replace | lieu_line |
| Liste participants (10 octobre, Jour 3) | `weekday_date` | replace | event_header |

### 09_Liste définitive (enseignants et Participants).xlsx (`liste_definitive`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | event_header |
| Brazzaville, Congo 08 - 10 octobre 2026 | `lieu` | replace | lieu_line |

### 10_Accusé de réception de paiement en espèces.docx (`accuse_paiement`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire | `title` | replace | document_title |
| Brazzaville, Congo | `title` | replace | body_text |
| 08 - 10 octobre 2026 | `start_date_long` | replace | date_line |
| Date: | `date_range` | replace | date_line |

### 11_Formulaire Report des dépenses et vérification finale du budget_v2.xlsx (`rapport_depenses`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Final Cost overview "Cours AOA—Principes du Traitement Chirurgical des Fractures pour le Personnel de Bloc Opératoire";  | `title` | replace | event_header |

### 📄 12_Guide Utilisateur_Rapport final de dépense.pdf — **copie**

### 📄 13a_Logo AO Alliance.png — **copie**

### 📄 13b_AO_Alliance_logo.pdf — **copie**

### 14_AOA_ModèleBadge.doc (`badge`)

_Aucune section détectée automatiquement — revue manuelle._

### 📄 15_Modèle PPT d'AO Alliance à l'usage du corps professoral_v20200112.pptx — **copie**

## IEC_S — IEC S (1j)

### 01_AOA_Accord collaboration_responsable national v15112024.xlsx (`accord_collaboration`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Procédure de gestion des évènements de l'AOA pour le responsable national de l'évènement (révisé le 11 mars 2024) | `date_range` | replace | date_line |
| Au plus tard 3 mois avant l'événement | `title` | replace | body_text |
| Le responsable national de l'évènement doit soumettre les documents de compte rendu d'événement suivants : | `title` | replace | body_text |
| Nom de l'évènement: Séminaire AO Alliance—Information,Éducation et Communication (IEC): Problématique de Prise en Charge | `title` | replace | event_header |
| Lieu de l'évènement: Dakar, Sénégal | `title` | replace | body_text |
| Date de l'évènement: 24 octobre 2026 | `start_date_long` | replace | date_line |
| est d´accord pour collaborer avec l'AO Alliance en appliquant les procédures susmentionnées dans le cadre de l´organisat | `title` | replace | event_header |
| que responsable national de l'événement et de suivre les directives en matière d'hygiène locales pour l'organisation d'é | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |
| Guide per diem de l'AO Alliance | `title` | replace | body_text |

### 02_Modèle_Programme_Sem IEC_SEN.doc (`programme`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| 24 octobre 2026	        		Dakar, Sngal | `lieu` | replace | lieu_line |
| BienvenueCher-re Participant-e au sminaire de lAO Alliance,Nous avons le plaisir de vous accueillir au Sminaire de lAO | `title` | replace | event_header |
| Barbara RigassiPrsidenteAO Alliance | `title` | replace | event_header |
| But du sminaireLe sminaire de lAO AllianceInformation, ducation et Communication a pour but d'instruire les diffrents g | `title` | replace | event_header |
| Collge denseignantsTous les enseignants choisis ont suivi une formation rpondant aux objectifs du sminaire.Responsabl | `title` | replace | event_header |
| 11111111111 111Informations gnralesLieu du sminaireNom de lhtel/lhpital, Dakar, SngalBureau  | `title` | replace | event_header |
| InformelleLangue du sminaireFranaisNotesSamedi 24 octobre 2026 | `date_range` | replace | date_line |
| Samedi 24 octobre 2026 | `start_date_long` | replace | date_line |
| propos de lAO Alliance et de lAO Foundation  Prsentation des activits 2026 | `title` | replace | event_header |
| NotesAO Alliance Foundationc/o Fiduciar Treuhand AG | `title` | replace | event_header |
| Sminaire AO AllianceInformation, ducation et   Communication (IEC): Problmatique de Prise en Charge des    Fractures   | `title` | replace | event_header |

### 03_AOA_Formulaire Budget prévisionnel_v20260423.xlsx (`budget`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Formulaire de budget prévisionnel de l'événement | `title` | replace | body_text |
| Responsable national de l'événement: | `title` | replace | body_text |
| Titre de l'événement: | `title` | replace | label_field |
| Séminaire AO Alliance—Information, Éducation et Communication (IEC): Problématique de Prise en Charge des Fractures à l´ | `title` | replace | event_header |
| Date de l'événement: | `title` | replace | body_text |
| 24 octobre 2026 | `start_date_long` | replace | date_line |
| Lieu de l'événement: | `title` | replace | body_text |
| Dakar, Sénégal | `lieu` | replace | lieu_line |
| Note importante: (1) le budget de l'événement de l'AOA ne doit pas être utilisé pour l'achat de matériel (par exemple: o | `title` | replace | body_text |
| Lieu de l'événement | `title` | replace | body_text |
| En signant et en soumettant ce formulaire de proposition de budget, le responsable de l'événement comprend et accepte l' | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |

### 04_Formulaire pour coordonnees bancaires.docx (`coordonnees_bancaires`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Nom de l’événement AOA | `title` | replace | body_text |
| Séminaire AO Alliance—Information, Éducation et Communication (IEC): Problématique de Prise en Charge des Fractures à l´ | `title` | replace | document_title |
| Lieu de l’événement AOA (pays, lieu) | `title` | replace | body_text |
| Dakar, Sénégal | `lieu` | replace | lieu_line |
| Date de l’événement AOA | `title` | replace | body_text |
| 24 octobre 2026 | `start_date_long` | replace | date_line |

### 📄 05_AOA Online Evaluation de l_evenement_1.pdf — **copie**

### 06_Rapport responsable national de l_evenement.docx (`rapport_national`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Rapport du responsable national de l’événement AOA | `title` | replace | body_text |
| Veuillez remplir ce formulaire dans un délai d'un mois après l’événement et le retourner à l'adresse ci-dessous. | `title` | replace | body_text |
| Titre de l’événement : Séminaire AO Alliance—Information, Éducation et Communication (IEC): Problématique de Prise en Ch | `title` | replace | label_field |
| Date : 24 ocobre 2026              Lieu de l’événement : Dakar, Sénégal | `date_range` | replace | date_lieu_combined |
| Nombre de participants :      Responsable : Amadou Ndiasse Kassé | `responsible_person` | replace | label_field |
| Veuillez reporter les noms de tous enseignants. Cochez la case après le nom de ceux que vous recommander pour le prochai | `title` | replace | body_text |
| Voulez-vous recommander un enseignant infirmier(ère) pour un futur événement de formation pour enseignants ? | `title` | replace | body_text |
| Prochaine fois: (Améliorations potentielles de la qualité) Liste des améliorations proposées pour le prochain événement | `title` | replace | body_text |
| AO Alliance Foundationc/o Fiduciar Treuhand AG | `title` | replace | event_header |

### 07a_ Liste de présence d' Enseignants_Jour 1.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Séminaire AO Alliance—Information, Éducation et Communication (IEC): Problématique de Prise en Charge des Fractures à l´ | `title` | replace | document_title |
| Dakar, Sénégal 24 octobre 2026 | `lieu` | replace | lieu_line |

### 08a_Liste de présence Participants_Jour 1.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Séminaire AO Alliance—Information, Éducation et Communication (IEC): Problématique de Prise en Charge des Fractures à l´ | `title` | replace | document_title |
| Dakar, Sénégal 24 octobre 2026 | `lieu` | replace | lieu_line |

### 09_Liste définitive (enseignants et Participants).xlsx (`liste_definitive`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Séminaire AO Alliance—Information, Éducation et Communication (IEC): Problématique de Prise en Charge des Fractures à l´ | `title` | replace | event_header |
| Dakar, Sénégal 24 octobre 2026 | `lieu` | replace | lieu_line |

### 10_Accusé de réception de paiement en espèces.docx (`accuse_paiement`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Séminaire AO Alliance—Information, Éducation et Communication (IEC): Problématique de Prise en Charge des Fractures à l´ | `title` | replace | document_title |
| Dakar, Sénégal | `lieu` | replace | lieu_line |
| 24 octobre 2026 | `start_date_long` | replace | date_line |
| Date : | `date_range` | replace | date_line |

### 11_Formulaire report des dépenses et vérification finale du budget.xlsx (`rapport_depenses`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Final Cost overview Course "Séminaire AO Alliance—Information, Éducation et Communication (IEC): Problématique de Prise  | `title` | replace | event_header |

### 📄 12_Guide Utilisateur_Rapport final de dépense.pdf — **copie**

### 📄 13a_Logo AO Alliance.png — **copie**

### 📄 13b_AO_Alliance_logo.pdf — **copie**

### 14_AOA_ModèleBadge.doc (`badge`)

_Aucune section détectée automatiquement — revue manuelle._

### 📄 15_Modèle PPT d'AO Alliance à l'usage du corps professoral_16-9.pptx — **copie**

## NONOP_C — NonOp C (3j)

### 01_AOA_Accord collaboration_responsable national v15112024.xlsx (`accord_collaboration`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Procédure de gestion des évènements de l'AOA pour le responsable national de l'évènement (révisé le 11 mars 2024) | `date_range` | replace | date_line |
| Au plus tard 3 mois avant l'événement | `title` | replace | body_text |
| Le responsable national de l'évènement doit soumettre les documents de compte rendu d'événement suivants : | `title` | replace | body_text |
| Nom de l'évènement: Cours AOA—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | event_header |
| Lieu de l'évènement: Kaffrine, Sénégal | `title` | replace | body_text |
| Date de l'évènement: 25 - 27 novembre 2026 | `date_range` | replace | date_line |
| est d´accord pour collaborer avec l'AO Alliance en appliquant les procédures susmentionnées dans le cadre de l´organisat | `title` | replace | event_header |
| que responsable national de l'événement et de suivre les directives en matière d'hygiène locales pour l'organisation d'é | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |
| Guide per diem de l'AO Alliance | `title` | replace | body_text |

### 02_Modèle Programme_Nonp C_SEN.docx (`programme`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AO Alliance—Principes du Traitement Non-Opératoire | `title` | replace | document_title |
| 25 – 27 novembre 2026  Kaffrine, Sénégal | `date_range` | replace | highlight |
| Cher-ère Participant-e au cours de l’AO Alliance, | `title` | replace | document_title |
| Nous avons le plaisir de vous accueillir au cours de l’AO Alliance – Principes du Traitement Non-Opératoire des Fracture | `title` | replace | document_title |
| Kaffrine, Sénégal. | `title` | replace | highlight |
| L'AO Alliance (AOA) est une organisation de développement à but non lucratif qui se consacre à améliorer les soins appor | `title` | replace | document_title |
| L'AOA entretient une étroite collaboration avec l’AO Foundation (AOF) et l’AO Education Institute (AO EI). Les principes | `title` | replace | body_text |
| Les événements de l'AOA peuvent vous être proposés grâce au soutien considérable et dévoué du comité organisateur nation | `title` | replace | body_text |
| Le cours de l’AO Alliance—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes a pour but  | `title` | replace | document_title |
| Nom de l’hôpital, Pays | `lieu` | replace | highlight |
| AO Alliance Foundationc/o Fiduciar Treuhand AG | `title` | replace | document_title |
| Nom de l’hôtel/hôpital, Kaffrine, Sénégal | `lieu` | replace | highlight |
| Inscriptions: date et heure | `title` | replace | highlight |
| L’AO Alliance se réserve le droit, pendant ses activités, de filmer, photographier et enregistrer. Les participants doiv | `title` | replace | document_title |
| Mercredi 25 novembre 2026 | `date_range` | replace | highlight |
| Jeudi 26 novembre 2026 | `date_range` | replace | highlight |
| Vendredi 27 novembre 2026 | `date_range` | replace | highlight |
| À propos de l´AO Alliance et de l’AO Foundation | `title` | replace | document_title |
| Fin du cours de l’AO Alliance | `title` | replace | body_text |

### 03_AOA_Formulaire Budget prévisionnel_v20260423.xlsx (`budget`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Formulaire de budget prévisionnel de l'événement | `title` | replace | body_text |
| Responsable national de l'événement: | `title` | replace | body_text |
| Titre de l'événement: | `title` | replace | label_field |
| Cours AOA—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | event_header |
| Date de l'événement: | `title` | replace | body_text |
| 25 - 27 novembre 2026 | `start_date_long` | replace | date_line |
| Lieu de l'événement: | `title` | replace | body_text |
| Kaffrine, Sénégal | `title` | replace | body_text |
| Note importante: (1) le budget de l'événement de l'AOA ne doit pas être utilisé pour l'achat de matériel (par exemple: o | `title` | replace | body_text |
| Lieu de l'événement | `title` | replace | body_text |
| En signant et en soumettant ce formulaire de proposition de budget, le responsable de l'événement comprend et accepte l' | `title` | replace | body_text |
| Date: | `date_range` | replace | date_line |

### 04_Formulaire pour coordonnees bancaires.docx (`coordonnees_bancaires`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Nom de l’événement AOA | `title` | replace | body_text |
| Cours AOA—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Lieu de l’événement AOA (pays, lieu) | `title` | replace | body_text |
| Kaffrine, Sénégal | `title` | replace | body_text |
| Date de l’événement AOA | `title` | replace | body_text |
| 25 – 27 novembre 2026 | `start_date_long` | replace | date_line |

### 📄 05_AOA Online Evaluation de l_evenement_1.pdf — **copie**

### 06_Rapport responsable national de l_evenement.docx (`rapport_national`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Rapport du responsable national de l’événement AOA | `title` | replace | body_text |
| Veuillez remplir ce formulaire dans un délai d'un mois après l’événement et le retourner à l'adresse ci-dessous. | `title` | replace | body_text |
| Titre de l’événement : Cours AOA—Principes du Traitement Non-Opératoire des Fractures de | `title` | replace | label_field |
| Date : 25 - 27 novembre 2026                  Lieu de l’événement : Kaffrine, Sénégal | `date_range` | replace | date_lieu_combined |
| Nombre de participants :      Responsable : Amadou Ndiasse Kassé | `responsible_person` | replace | label_field |
| Veuillez reporter les noms de tous enseignants. Cochez la case après le nom de ceux que vous recommander pour le prochai | `title` | replace | body_text |
| Voulez-vous recommander un enseignant infirmier(ère) pour un futur événement de formation pour enseignants ? | `title` | replace | body_text |
| Prochaine fois: (Améliorations potentielles de la qualité) Liste des améliorations proposées pour le prochain événement | `title` | replace | body_text |
| AO Alliance (AOA) | `title` | replace | body_text |

### 07a_ Liste de présence_Enseignants_Jour1.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AO Alliance—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Kaffrine, Sénégal 25 – 27 novembre 2026 | `lieu` | replace | lieu_line |
| Liste Enseignants (25 novembre, Jour 1) | `weekday_date` | replace | event_header |

### 07b_ Liste de présence_Enseignants_Jour2.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AO Alliance—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Kaffrine, Sénégal 25 – 27 novembre 2026 | `lieu` | replace | lieu_line |
| Liste Enseignants (26 novembre, Jour 2) | `weekday_date` | replace | event_header |

### 07c_ Liste de présence_Enseignants_Jour3.docx (`presence_enseignants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AO Alliance—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Kaffrine, Sénégal 25 – 27 novembre 2026 | `lieu` | replace | lieu_line |
| Liste Enseignants (27 novembre, Jour 3) | `weekday_date` | replace | event_header |

### 08a_Liste de présence Participants_Jour1.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AO Alliance—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Kaffrine, Sénégal 25 – 27 novembre 2026 | `lieu` | replace | lieu_line |
| Liste Participants (25 novembre, Jour 1) | `weekday_date` | replace | event_header |

### 08b_Liste de présence Participants_Jour2.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AO Alliance—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Kaffrine, Sénégal 25 – 27 novembre 2026 | `lieu` | replace | lieu_line |
| Liste Participants (26 novembre, Jour 2) | `weekday_date` | replace | event_header |

### 08c_Liste de présence Participants_Jour3.docx (`presence_participants`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AO Alliance—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Kaffrine, Sénégal 25 – 27 novembre 2026 | `lieu` | replace | lieu_line |
| Liste Participants (27 novembre, Jour 3) | `weekday_date` | replace | event_header |

### 09_Liste définitive (enseignants et Participants).xlsx (`liste_definitive`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | event_header |
| Kaffrine, Sénégal 25 – 27 novembre 2026 | `lieu` | replace | lieu_line |

### 10_Accusé de réception de paiement en espèces.docx (`accuse_paiement`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Cours AOA—Principes du Traitement Non-Opératoire des Fractures de Membres les plus Courantes | `title` | replace | document_title |
| Kaffrine, Sénégal | `title` | replace | body_text |
| 25 – 27 novembre 2026 | `start_date_long` | replace | date_line |
| Date: | `date_range` | replace | date_line |

### 11_Formulaire report des dépenses et vérification finale du budget.xlsx (`rapport_depenses`)

| Section | Clé | Stratégie | Format IA |
|---------|-----|-----------|-----------|
| Final Cost overview Course "Cours AOA—Principes du Traitement Non-Opératoire des fractures de Membres les plus Courantes | `title` | replace | event_header |

### 📄 12_Guide Utilisateur_Rapport final de dépense.pdf — **copie**

### 📄 13a_Logo AO Alliance.png — **copie**

### 📄 13b_AO_Alliance_logo.pdf — **copie**

### 14_AOA_ModèleBadge.doc (`badge`)

_Aucune section détectée automatiquement — revue manuelle._

### 📄 15_Modèle PPT d'AO Alliance à l'usage du corps professoral.pptx — **copie**
