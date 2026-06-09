#!/usr/bin/env bash
# Redémarre les API TIP (catalog, docgen, worker) après changement de routes Python.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Redémarrage catalog, docgen, docgen-worker, events, identity…"
docker-compose restart catalog docgen events identity 2>/dev/null || true
docker-compose up -d docgen-worker 2>/dev/null || docker-compose run -d --name tip-docgen-worker docgen-worker 2>/dev/null || true

if ! docker ps --format '{{.Names}}' | grep -q docgen-worker; then
  echo "ATTENTION: docgen-worker absent — lancez: docker-compose up -d docgen-worker"
fi

echo "OK — rechargez le navigateur (F5). En cas d'erreur Clerk: déconnexion puis reconnexion."
