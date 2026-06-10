# Paquets AO Alliance — templates versionnés (ZIP)

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

1. **Admin → Documents → Templates → Charger paquets système**
2. Ou : `python3 scripts/bootstrap_packages_db.py` (depuis le conteneur catalog ou en local avec BDD)
3. Chaque import crée une **nouvelle version** (v1, v2, …) ; la version importée devient **active**

## Créer des ZIP depuis ces dossiers (optionnel)

```bash
python3 scripts/build_package_zips.py
# → package-zips/OP_S.zip, PBO_S.zip, IEC_S.zip, OP_C.zip, …
```

### FET = copie OP_C (listes J1–J2 conservées à l'import)

```bash
rsync -a --delete Packages/OP_C/ Packages/FET/
```

## API

- `POST /api/v1/packages/bootstrap?force=true` — import depuis `Packages/`
- `POST /api/v1/packages/upload` — multipart `file` (.zip)
- `GET /api/v1/packages/bundles` — liste des versions
