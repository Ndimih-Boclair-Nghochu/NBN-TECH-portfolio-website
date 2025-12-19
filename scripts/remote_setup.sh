#!/usr/bin/env bash
set -euo pipefail

# remote_setup.sh
# Usage (on remote host): sudo ./remote_setup.sh
# Provides: install deps, ensure .env has required vars for CORS & sessions, reset admin pw, restart pm2

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
ENV_FILE="$SERVER_DIR/.env"

echo "Running remote setup in $SERVER_DIR"

# Ensure node deps installed
if [ -f "$SERVER_DIR/package.json" ]; then
  echo "Installing server dependencies..."
  (cd "$SERVER_DIR" && npm ci --no-audit --no-fund)
fi

# Create .env if missing
if [ ! -f "$ENV_FILE" ]; then
  echo "Creating $ENV_FILE"
  cat > "$ENV_FILE" <<EOF
# Environment variables for server
PORT=3000
SESSION_SECRET=${SESSION_SECRET:-change_this_session_secret}
SESSION_COOKIE_SAMESITE=${SESSION_COOKIE_SAMESITE:-none}
SESSION_COOKIE_SECURE=${SESSION_COOKIE_SECURE:-true}
CORS_ORIGIN=${CORS_ORIGIN:-}
S3_BUCKET=${S3_BUCKET:-}
S3_REGION=${S3_REGION:-us-east-1}
S3_BASE_URL=${S3_BASE_URL:-}
# Optional: SMTP_* to enable contact emails
EOF
else
  echo "$ENV_FILE already exists -- leaving in place (you can edit it manually)"
fi

# Optional: reset admin password if environment vars provided
if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo "Resetting admin password for $ADMIN_EMAIL"
  (cd "$SERVER_DIR" && ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node reset_admin_password.js)
fi

# Restart server (pm2 preferred)
PM2_NAME=${PM2_NAME:-nbn-backend}
if command -v pm2 >/dev/null 2>&1; then
  echo "Restarting server with pm2 (name: $PM2_NAME)"
  cd "$SERVER_DIR"
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_NAME"
  else
    pm2 start npm --name "$PM2_NAME" -- start
  fi
  pm2 save
else
  echo "pm2 not found. Starting node in background using nohup"
  nohup node "$SERVER_DIR/index.js" &> /tmp/nbn-backend.log &
  echo "Logs: /tmp/nbn-backend.log"
fi

# Lightweight health check
echo "Waiting 2s for server to come up..."
sleep 2
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:3000/api/health}
if curl -sSf --max-time 5 "$HEALTH_URL" >/dev/null; then
  echo "Health OK: $HEALTH_URL"
else
  echo "Health check failed for $HEALTH_URL" >&2
  echo "Check logs: pm2 logs $PM2_NAME (if pm2) or /tmp/nbn-backend.log"
  exit 2
fi

echo "Remote setup finished"
