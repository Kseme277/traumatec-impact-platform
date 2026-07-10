# Paquets AO Alliance — templates versionnés (ZIP)

Les **sources** officielles sont dans [`Template/`](../Template/) (`Paquet_Cours/`, `Paquet_Sem/`).
Ce dossier `Packages/{TYPE}/` est le format attendu par le service **catalog** (bootstrap MinIO + PostgreSQL).

## Synchronisation

```bash
python3 scripts/sync_template_to_packages.py
# ou tout-en-un :
bash scripts/deploy_templates.sh
```

| Source `Template/` | Code TIP |
|--------------------|----------|
| `Paquet_Sem/Paquet_Op S` | `OP_S` |
| `Paquet_Sem/Paquet_Sem PBO` | `PBO_S` |
| `Paquet_Sem/Paquet_Sem IEC` | `IEC_S` |
| `Paquet_Cours/Paquet Op C` | `OP_C` |
| `Paquet_Cours/Paquet_ORP C` | `ORP_C` |
| `Paquet_Cours/Paquet_Nonop C` | `NONOP_C` |
| (copie de `OP_C`) | `FET` |

## Types supportés

| Type ZIP / dossier | Format | Durée | Thème TIP |
|--------------------|--------|-------|-----------|
| `OP_S` | Séminaire Op S | 1 jour | `operatory` |
| `PBO_S` | Séminaire PBO S | 1 jour | `pbo` |
| `IEC_S` | Séminaire IEC S | 1 jour | `iec` |
| `FET` | Faculty Education Training | 2 jours | — |
| `OP_C` | Cours Op C | 3 jours | `operatory` |
| `ORP_C` | Cours PBO / ORP C | 3 jours | `pbo` |
| `NONOP_C` | Cours NonOp C | 3 jours | `operatory` |

> `ORP_S` est un ancien code équivalent à `PBO_S` (rétrocompatibilité).

À l'import ZIP, les fichiers de listes `07*` / `08*` dont le jour dépasse la durée du paquet sont exclus automatiquement (1j pour séminaires, 2j pour FET, 3j pour cours).

## Import (recommandé)

1. Sync : `python3 scripts/sync_template_to_packages.py`
2. Migrations : `bash scripts/apply_all_migrations.sh`
3. Bootstrap : `docker compose exec catalog python /app/scripts/bootstrap_packages_db.py --force`
4. Ou UI : **Admin → Documents → Templates → Charger paquets système**

Chaque import crée une **nouvelle version** (v1, v2, …) ; la version importée devient **active**.

## Créer des ZIP (optionnel)

```bash
python3 scripts/build_package_zips.py
# → package-zips/OP_S.zip, PBO_S.zip, …
```

## API

- `POST /api/v1/packages/bootstrap?force=true` — import depuis `Packages/`
- `POST /api/v1/packages/upload` — multipart `file` (.zip)
- `GET /api/v1/packages/bundles` — liste des versions
