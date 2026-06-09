#!/usr/bin/env bash
# Relance nginx après un docker-compose restart (évite "host not found in upstream").
set -euo pipefail
cd "$(dirname "$0")/.."

docker rm -f traumatec-impact-platform_nginx_1 2>/dev/null || true
docker-compose up -d nginx
sleep 2
if curl -sf "http://127.0.0.1:${NGINX_PORT:-8080}/health/identity" >/dev/null; then
  echo "nginx OK sur le port ${NGINX_PORT:-8080}"
else
  echo "nginx non joignable — utilisez VITE_API_PROXY_TARGET=direct dans .env (racine)" >&2
  exit 1
fi
