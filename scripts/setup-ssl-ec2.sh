#!/usr/bin/env bash
# Obtient un certificat Let's Encrypt pour tip-platform.hopto.org sur l'EC2 TIP.
set -euo pipefail

DOMAIN="${TIP_DOMAIN:-tip-platform.hopto.org}"
EMAIL="${TIP_SSL_EMAIL:-kseme277@gmail.com}"
APP_DIR="${APP_DIR:-/opt/traumatec-impact-platform}"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

cd "$APP_DIR"
sudo mkdir -p /var/www/certbot
sudo mkdir -p certbot/www
sudo chown -R ubuntu:ubuntu certbot

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "Certificat déjà présent pour ${DOMAIN}"
  exit 0
fi

if ! command -v certbot >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y certbot
fi

echo "==> Arrêt nginx (standalone ACME)"
$COMPOSE stop nginx || true

echo "==> Certbot standalone"
sudo certbot certonly --standalone \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL" \
  --preferred-challenges http

echo "==> Redémarrage nginx avec TLS"
$COMPOSE up -d nginx

echo "==> Renouvellement auto (cron)"
CRON_LINE="0 3 * * * certbot renew --quiet --deploy-hook 'cd ${APP_DIR} && ${COMPOSE} exec -T nginx nginx -s reload'"
( sudo crontab -l 2>/dev/null | grep -F "certbot renew" ) || ( sudo crontab -l 2>/dev/null; echo "$CRON_LINE" ) | sudo crontab -

echo "Certificat OK — https://${DOMAIN}"
