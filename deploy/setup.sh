#!/bin/bash

# ENVITATION - VPS Setup Script
# Run this on the VPS with: sudo bash setup.sh

set -e

DOMAIN="envitation.politekniksorowako.ac.id"
APP_DIR="/home/nasrulhamid/envitation"
BACKEND_PORT=3006

echo "============================================"
echo "  ENVITATION - VPS Setup"
echo "============================================"
echo ""

# Step 1: Install pm2 if not installed
echo "[1/5] Checking pm2..."
if ! command -v pm2 &> /dev/null; then
  echo "Installing pm2..."
  npm install -g pm2
else
  echo "pm2 already installed."
fi

# Step 2: Setup nginx config
echo ""
echo "[2/5] Setting up nginx..."
NGINX_CONF="/etc/nginx/sites-available/envitation"
NGINX_LINK="/etc/nginx/sites-enabled/envitation"

# Create certbot directory
mkdir -p /var/www/certbot

# Copy nginx config
cp "$APP_DIR/nginx-config.conf" "$NGINX_CONF"
ln -sf "$NGINX_CONF" "$NGINX_LINK"

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx

echo "Nginx configured."

# Step 3: Request SSL certificate
echo ""
echo "[3/5] Requesting SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email || {
  echo ""
  echo "Certbot may have failed. You can run manually:"
  echo "  certbot --nginx -d $DOMAIN"
}

# Reload nginx after SSL
systemctl reload nginx

# Step 4: Start backend with pm2
echo ""
echo "[4/5] Starting backend with pm2..."
cd "$APP_DIR/src/backend-sqlite"

# Stop existing process if running
pm2 stop envitation-backend 2>/dev/null || true
pm2 delete envitation-backend 2>/dev/null || true

# Start backend
pm2 start server.js --name envitation-backend

# Save pm2 process list
pm2 save

# Setup pm2 startup
pm2 startup systemd -u nasrulhamid --hp /home/nasrulhamid 2>/dev/null || true

echo "Backend started."
pm2 status

# Step 5: Verify
echo ""
echo "[5/5] Verification..."
echo ""
echo "Testing API endpoint..."
curl -s -o /dev/null -w "API Status: %{http_code}\n" http://127.0.0.1:$BACKEND_PORT/ || echo "API not responding yet"

echo ""
echo "============================================"
echo "  SETUP COMPLETE!"
echo "============================================"
echo ""
echo "  Frontend:  https://$DOMAIN/frontend/index.html"
echo "  Admin:     https://$DOMAIN/frontend/admin.html"
echo "  E-Card:    https://$DOMAIN/frontend/ecard.html"
echo "  API:       https://$DOMAIN/api/"
echo ""
echo "  Backend:   pm2 status"
echo "  Nginx:     systemctl status nginx"
echo "  SSL:       certbot certificates"
echo ""
echo "============================================"
