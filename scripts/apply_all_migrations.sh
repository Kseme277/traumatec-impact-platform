#!/usr/bin/env bash
# Applique toutes les migrations SQL TIP (idempotentes : IF NOT EXISTS).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="${COMPOSE:-docker compose}"
PG_SERVICE="${PG_SERVICE:-postgres}"
PG_USER="${POSTGRES_USER:-tip}"
PG_DB="${POSTGRES_DB:-tip}"

echo "==> Migrations → service $PG_SERVICE ($PG_DB)"
mapfile -t FILES < <(ls -1 "$ROOT"/database/migrations/*.sql | sort)
for f in "${FILES[@]}"; do
  name="$(basename "$f")"
  echo "→ $name"
  $COMPOSE exec -T "$PG_SERVICE" psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 < "$f"
done
echo "OK — ${#FILES[@]} migration(s) appliquée(s)."
