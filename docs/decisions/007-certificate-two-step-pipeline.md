# ADR-007: Pipeline certificats en deux templates Word

## Status

Accepted

## Date

2026-06-03

## Context

Le cœur métier TIP est le pipeline certificat (section 6.3) : étape 1 injecte les données événement une fois ; étape 2 boucle sur chaque participant. RG-CERT-01 à RG-CERT-05 encadrent la génération. Les placeholders diffèrent entre étapes.

## Options Considered

### Option A: Deux templates Word séquentiels (docxtpl)
- Pros: Conforme modèles AO Alliance, reprise processus manuel existant
- Cons: Deux fichiers à maintenir par jeu

### Option B: Un seul template avec boucle Jinja
- Pros: Un fichier par jeu
- Cons: Non aligné référentiel préparation événements AO Alliance

### Option C: Génération PDF directe sans Word
- Pros: Pas de conversion
- Cons: Perte compatibilité modèles .docx existants

## Decision

Nous implémentons le pipeline **2 passes docxtpl** :
1. **Étape 1** : rendu in-memory (socle non livré seul)
2. **Étape 2** : N certificats (un par participant)
3. Fusion optionnelle → `06_Certificats.pdf` (RG-CERT-05)

Tables : `certificate_template_sets`, `certificate_template_steps` (step_number 1 ou 2).

## Consequences

- Module `services/docgen/certificate_pipeline.py` (Sprint 3)
- Validation prérequis avant enqueue job
- README.txt du ZIP mentionne code jeu et nombre certificats (BF-22)
