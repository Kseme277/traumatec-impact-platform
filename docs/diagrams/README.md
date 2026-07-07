# Diagrammes UML — Traumatec Impact Platform

Diagrammes rédigés en **PlantUML** avec lignes **orthogonales** (segments droits, sans courbes) via `docs/diagrams/_common.puml`.

## Structure

| Dossier | Contenu | Document |
|---------|---------|----------|
| `analyse/` | Cas d'utilisation, classes d'analyse, objets, séquences **système** (2 lignes de vie) | [CAHIER_D_ANALYSE.md](../CAHIER_D_ANALYSE.md) |
| `conception/` | Composants, classes de conception, déploiement, machine d'états workflow | [CAHIER_DE_CONCEPTION.md](../CAHIER_DE_CONCEPTION.md) |

## Fichiers PNG exportés

### Analyse (L-02)

| Image | Source PlantUML |
|-------|-----------------|
| `analyse/tip-use-case.png` | `use-case.puml` |
| `analyse/tip-class-analysis.png` | `class-diagram.puml` |
| `analyse/tip-object-diagram.png` | `object-diagram.puml` |
| `analyse/tip-seq-auth.png` | `sequence-authentification.puml` |
| `analyse/tip-seq-import-plan.png` | `sequence-importer-plan.puml` |
| `analyse/tip-seq-generer-paquet.png` | `sequence-generer-paquet.puml` |
| `analyse/tip-seq-workflow.png` | `sequence-soumettre-workflow.puml` |
| `analyse/tip-seq-utilisateur.png` | `sequence-gerer-utilisateur.puml` |

### Conception (L-03)

| Image | Source PlantUML |
|-------|-----------------|
| `conception/tip-components.png` | `components.puml` — identity-service, events-service, base de données, Redis, MinIO |
| `conception/tip-class-design.png` | `class-design.puml` |
| `conception/tip-deployment.png` | `deployment.puml` |
| `conception/tip-workflow-states.png` | `workflow-states.puml` |

## Régénérer les images PNG

```bash
# Télécharger PlantUML (une fois)
curl -fsSL -o /tmp/plantuml.jar \
  "https://github.com/plantuml/plantuml/releases/download/v1.2024.8/plantuml-1.2024.8.jar"

# Exporter tous les diagrammes
java -jar /tmp/plantuml.jar -tpng docs/diagrams/analyse/*.puml
java -jar /tmp/plantuml.jar -tpng docs/diagrams/conception/*.puml
```

Les séquences **techniques** multi-composants (Frontend, Nginx, microservices) restent documentées en Mermaid dans [architecture.md](../architecture.md) pour la lisibilité du déploiement.
