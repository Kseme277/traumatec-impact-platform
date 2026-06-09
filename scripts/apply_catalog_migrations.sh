#!/usr/bin/env bash
# Applique les migrations catalogue (012, 013) — requis pour /api/v1/packages/*
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_CONTAINER="${PG_CONTAINER:-traumatec-impact-platform_postgres_1}"

for f in 012_package_profiles.sql 013_package_bundles.sql; do
  echo "→ $f"
  docker exec -i "$PG_CONTAINER" psql -U tip -d tip < "$ROOT/database/migrations/$f"
done

echo "OK — redémarrez catalog : docker-compose restart catalog"
