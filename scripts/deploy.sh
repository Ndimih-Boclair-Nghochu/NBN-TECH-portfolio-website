#!/usr/bin/env bash
set -euo pipefail

# deploy.sh — deploy static frontend to S3 + optionally invalidate CloudFront, and start/restart backend
# Usage: S3_BUCKET=your-bucket CLOUDFRONT_ID=YOUR_ID BACKEND_URL=http://x.x.x.x:3000 ./scripts/deploy.sh

# Config (can be overridden by environment)
SERVER_DIR="server"
SERVER_FILE="$SERVER_DIR/index.js"
FRONTEND_PATH="${FRONTEND_PATH:-$(pwd)}"
PORT="${PORT:-3000}"
S3_BUCKET="${S3_BUCKET:-}"
CLOUDFRONT_ID="${CLOUDFRONT_ID:-}"
BACKEND_URL="${BACKEND_URL:-}"
DO_DRY_RUN=${DRY_RUN:-0}

echo "🔧 Deploy script starting"

test -f "$SERVER_FILE" || { echo "Error: server file $SERVER_FILE not found" >&2; exit 2; }

# Resolve public IP (metadata) when possible
if [ -z "$BACKEND_URL" ]; then
  if command -v curl >/dev/null 2>&1; then
    META_IP=$(curl -s --max-time 2 http://169.254.169.254/latest/meta-data/public-ipv4 || true)
    if [ -n "$META_IP" ]; then
      BACKEND_URL="http://$META_IP:$PORT"
      echo "ℹ️ Discovered instance public IP: $META_IP — using BACKEND_URL=$BACKEND_URL"
    fi
  fi
fi

if [ -z "$BACKEND_URL" ]; then
  echo "⚠️ BACKEND_URL not set and metadata lookup failed. Set BACKEND_URL env or run on the target host." >&2
fi

# 1) Ensure server deps
cd "$SERVER_DIR"
if [ -f package.json ]; then
  echo "➡️ Installing server dependencies (npm install)"
  if [ "$DO_DRY_RUN" -eq 1 ]; then echo "(dry-run) npm install"; else npm install; fi
fi
cd - >/dev/null

# 2) Ensure CORS is present and server listens on 0.0.0.0 — this project already has CORS and binds to 0.0.0.0 when available.

# 3) Start / restart server
if command -v pm2 >/dev/null 2>&1; then
  echo "➡️ Restarting server with pm2"
  if [ "$DO_DRY_RUN" -eq 1 ]; then echo "(dry-run) pm2 restart $SERVER_FILE || pm2 start $SERVER_FILE --name portfolio-server"; else pm2 restart "$SERVER_FILE" || pm2 start "$SERVER_FILE" --name portfolio-server; fi
else
  echo "➡️ pm2 not found; starting node in background (nohup)"
  if [ "$DO_DRY_RUN" -eq 1 ]; then echo "(dry-run) nohup node $SERVER_FILE &> server.log &"; else nohup node "$SERVER_FILE" &> server.log & fi
fi

# 4) Replace frontend API references (optional)
if [ -n "$BACKEND_URL" ]; then
  echo "➡️ Rewriting frontend API references to $BACKEND_URL"
  # Update common places: contact.html, script.js, admin/app.js
  FILES=("$FRONTEND_PATH/contact.html" "$FRONTEND_PATH/index.html" "$FRONTEND_PATH/script.js" "$FRONTEND_PATH/admin/app.js")
  for f in "${FILES[@]}"; do
    if [ -f "$f" ]; then
      echo "  - Updating $f"
      if [ "$DO_DRY_RUN" -eq 1 ]; then
        echo "(dry-run) sed -i 's|window.API_BASE = \'.*\'|window.API_BASE = \"$BACKEND_URL\";|g' $f"
      else
        # replace both single-quoted and double-quoted patterns, keep final semicolon
        sed -i "s|window.API_BASE = '\\([^']*\\)';|window.API_BASE = '$BACKEND_URL';|g" "$f" || true
        sed -i "s|window.API_BASE = \"\\([^"]*\\)\";|window.API_BASE = \"$BACKEND_URL\";|g" "$f" || true
      fi
    fi
  done
fi

# 5) Build frontend if package.json has build
if [ -f "$FRONTEND_PATH/package.json" ] && grep -q '"build"' "$FRONTEND_PATH/package.json"; then
  echo "➡️ Building frontend (npm run build)"
  (cd "$FRONTEND_PATH" && if [ "$DO_DRY_RUN" -eq 1 ]; then echo "(dry-run) npm run build"; else npm run build; fi)
fi

# 6) Deploy to S3 (if configured)
if [ -n "$S3_BUCKET" ]; then
  echo "➡️ Syncing frontend to S3://$S3_BUCKET"
  EXCLUDE_ARGS=(--exclude "server/*" --exclude ".git/*" --exclude "node_modules/*")
  if [ "$DO_DRY_RUN" -eq 1 ]; then
    echo "(dry-run) aws s3 sync $FRONTEND_PATH s3://$S3_BUCKET --delete ${EXCLUDE_ARGS[*]}"
  else
    aws s3 sync "$FRONTEND_PATH" "s3://$S3_BUCKET" --delete "${EXCLUDE_ARGS[@]}"
  fi
  if [ -n "$CLOUDFRONT_ID" ]; then
    echo "➡️ Creating CloudFront invalidation for $CLOUDFRONT_ID"
    if [ "$DO_DRY_RUN" -eq 1 ]; then
      echo "(dry-run) aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths '/*'"
    else
      aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_ID" --paths '/*' >/dev/null
    fi
  fi
else
  echo "⚠️ S3_BUCKET not set — skipping frontend upload"
fi

# 7) Done
echo "✅ Deploy finished"
if [ -n "$BACKEND_URL" ]; then echo "Your site should point at $BACKEND_URL for API calls (check contact form)"; fi
if [ -n "$S3_BUCKET" ]; then echo "Frontend uploaded to s3://$S3_BUCKET"; fi

exit 0
