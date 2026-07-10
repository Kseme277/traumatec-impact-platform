#!/usr/bin/env bash
# Sync Template/ → Packages/ puis bootstrap catalog (MinIO + PostgreSQL).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="${COMPOSE:-docker compose}"

cd "$ROOT"
echo "==> Sync Template → Packages"
python3 scripts/sync_template_to_packages.py

echo "==> Bootstrap paquets (catalog)"
$COMPOSE exec -T catalog python /app/scripts/bootstrap_packages_db.py --force

echo "==> Terminé — vérifier Documents → Templates dans l'UI."
