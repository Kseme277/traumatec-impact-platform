#!/usr/bin/env bash
# Déploiement production EC2 — Traumatec Impact Platform
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/traumatec-impact-platform}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
BRANCH="${DEPLOY_BRANCH:-staging}"

echo "==> Prérequis système"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker ubuntu
fi

if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y docker-compose-plugin git ufw
fi

echo "==> Swap (4 Go) si absent"
if ! swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Pare-feu UFW"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3101/tcp
sudo ufw --force enable

echo "==> Code source ($BRANCH)"
sudo mkdir -p "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo git clone -b "$BRANCH" https://github.com/Kseme277/traumatec-impact-platform.git "$APP_DIR"
  sudo chown -R ubuntu:ubuntu "$APP_DIR"
else
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "ERREUR: .env manquant dans $APP_DIR — copiez-le avant de relancer."
  exit 1
fi

_env_get() {
  local key="$1"
  if grep -q "^${key}=" .env 2>/dev/null; then
    grep "^${key}=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
  fi
}

INFRA_BASIC_AUTH_PASSWORD="$(_env_get INFRA_BASIC_AUTH_PASSWORD)"
INFRA_BASIC_AUTH_USER="$(_env_get INFRA_BASIC_AUTH_USER)"

if [ -n "${INFRA_BASIC_AUTH_PASSWORD:-}" ]; then
  INFRA_USER="${INFRA_BASIC_AUTH_USER:-infra}"
  if ! command -v htpasswd >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo apt-get install -y apache2-utils
  fi
  htpasswd -nbB "$INFRA_USER" "$INFRA_BASIC_AUTH_PASSWORD" > infra/nginx/snippets/.htpasswd-infra
  echo "==> Auth infra nginx mise à jour ($INFRA_USER)"
fi

echo "==> Build & démarrage"
$COMPOSE pull --ignore-buildable 2>/dev/null || true
$COMPOSE build --pull
$COMPOSE up -d

echo "==> Attente santé (60s max)"
for i in $(seq 1 12); do
  if curl -sf http://127.0.0.1/health/identity >/dev/null 2>&1; then
    echo "Identity OK"
    break
  fi
  sleep 5
done

echo "==> Migrations SQL"
bash scripts/apply_all_migrations.sh || true

echo "==> Templates AO Alliance (Template → Packages → catalog)"
python3 scripts/sync_template_to_packages.py || true
$COMPOSE exec -T catalog python /app/scripts/bootstrap_packages_db.py --force || true

$COMPOSE ps
echo "==> Déploiement terminé — http://$(curl -sf ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
