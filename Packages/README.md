# Paquets AO Alliance — templates versionnés (ZIP)

## Types supportés

| Type ZIP / dossier | Événement | Thème TIP |
|--------------------|-----------|-----------|
| `ORP_S` | ORP S (1 jour) | `pbo` |
| `OP_C` | Op C | `operatory` |
| `ORP_C` | ORP C (3 jours) | `pbo` |
| `IEC_S` | IEC S | `iec` |
| `NONOP_C` | NonOp C | `operatory` |

## Import (recommandé)

1. **Admin → Documents → Templates → Importer un paquet ZIP**
2. Chaque upload crée une **nouvelle version** (v1, v2, …) pour le type détecté
3. La version importée devient **active** par défaut ; les anciennes restent archivées

## Analyse automatique

À l'import, le système :
- lit les fichiers du ZIP et **classifie** chaque document (`01_` accord, `02_` programme, listes, etc.)
- **détecte le type** de paquet via le fichier `02_*` programme
- extrait les **zones surlignées** des `.docx` et construit un modèle de remplacement (`replacement_model` dans `analysis_json`)

## Créer des ZIP depuis ces dossiers

```bash
python3 scripts/build_package_zips.py
# → package-zips/ORP_S.zip, OP_C.zip, …
```

Puis importer chaque ZIP via l'interface.

## API

- `POST /api/v1/packages/upload` — multipart `file` (.zip), optionnel `package_type`, `activate`
- `GET /api/v1/packages/bundles` — liste des versions
- `POST /api/v1/packages/bundles/{id}/activate` — activer une version

## Migration base

```bash
psql -U tip -d tip -f database/migrations/013_package_bundles.sql
```
