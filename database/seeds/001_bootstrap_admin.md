# Bootstrap administrateur — automatique

L'admin initial est **créé automatiquement** au démarrage du service `identity` si :

1. `BOOTSTRAP_ADMIN_EMAIL` est défini dans `.env`
2. Aucun utilisateur avec cet email n'existe déjà en base

## Configuration `.env`

```env
BOOTSTRAP_ADMIN_EMAIL=admin@traumatec.org
BOOTSTRAP_ADMIN_NOM=Nkoa
BOOTSTRAP_ADMIN_PRENOM=Dominique

# Laisser vide pour création + invitation Clerk automatique :
BOOTSTRAP_ADMIN_CLERK_ID=

# OU coller l'ID si l'user existe déjà dans Clerk :
# BOOTSTRAP_ADMIN_CLERK_ID=user_2xxxxxxxxxxxxx
```

## Comportement

| `BOOTSTRAP_ADMIN_CLERK_ID` | `CLERK_SECRET_KEY` | Résultat |
|----------------------------|-------------------|----------|
| vide | défini | Création Clerk + invitation email + insert PostgreSQL |
| `user_xxx` | défini | Insert PostgreSQL + sync `public_metadata.role` |
| vide | absent | Échec — configurer Clerk ou fournir `CLERK_ID` |

## Vérification

```bash
docker compose logs identity | grep -i bootstrap
```

Puis connexion sur http://localhost:8080/connexion

Guide complet : [docs/CONFIGURATION.md](../CONFIGURATION.md)
