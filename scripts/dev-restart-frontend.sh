#!/usr/bin/env bash
# Redémarre Vite dans Docker pour prendre en compte vite.config.ts / variables d'env.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Redémarrage du conteneur frontend (Vite)…"
docker-compose restart frontend

echo "Attente du serveur sur :5173…"
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${FRONTEND_PORT:-5173}/" >/dev/null 2>&1; then
    echo "OK — ouvrez http://localhost:${FRONTEND_PORT:-5173}"
    exit 0
  fi
  sleep 1
done

echo "Le frontend ne répond pas encore. Logs :" >&2
docker-compose logs --tail=40 frontend
exit 1
