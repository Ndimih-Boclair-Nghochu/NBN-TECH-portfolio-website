#!/usr/bin/env bash
set -euo pipefail

# check_site.sh — simple smoke tests for site + API
# Usage: ./check_site.sh <site-origin> (e.g., https://dlfji1tg4589l.cloudfront.net)

SITE=${1:-}
if [ -z "$SITE" ]; then
  echo "Usage: $0 <site-origin>"; exit 2
fi

API_BASE=${API_BASE:-$SITE}
echo "Checking site: $SITE"

# 1) homepage
echo -n "Homepage... "
if curl -sSf --max-time 10 "$SITE" >/dev/null; then echo "OK"; else echo "FAIL"; fi

# 2) script.js present
echo -n "script.js... "
if curl -sSf --max-time 10 "$SITE/script.js" >/dev/null; then echo "OK"; else echo "MISSING"; fi

# 3) healthcheck
echo -n "Health endpoint... "
if curl -sSf --max-time 10 "$API_BASE/api/health" | grep -q "ok"; then echo "OK"; else echo "FAIL"; fi

# 4) public GET reviews
echo -n "GET /api/reviews... "
if curl -sSf --max-time 10 "$API_BASE/api/reviews" | jq -r '. | length' >/dev/null 2>&1; then echo "OK"; else echo "FAIL"; fi

# 5) optional admin login test (requires ADMIN_EMAIL and ADMIN_PASSWORD env vars)
if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  echo -n "Admin login (cookie) ... "
  TMPCOOKIE=$(mktemp)
  LOGIN_RES=$(curl -s -c $TMPCOOKIE -w "%{http_code}" -o /tmp/login_res.txt -X POST "$API_BASE/api/login" -H 'Content-Type: application/json' -d '{"email":"'"${ADMIN_EMAIL}"'", "password":"'"${ADMIN_PASSWORD}"'"}')
  if [ "$LOGIN_RES" = "200" ]; then
    # check that a cookie was set (session id)
    if grep -qi "session" $TMPCOOKIE || grep -qi "connect.sid" $TMPCOOKIE; then
      echo "OK (cookie set)"
      # try an authenticated request using cookie jar
      AUTH_TEST=$(curl -s -b $TMPCOOKIE -X GET "$API_BASE/api/projects" -H 'Accept: application/json' || true)
      if [ -n "$AUTH_TEST" ]; then echo "Auth GET /api/projects OK"; else echo "Auth GET failed"; fi
    else
      echo "Login succeeded but no session cookie present (check SameSite/secure and CORS)"
    fi
  else
    echo "Login failed, status=$LOGIN_RES"
    echo "Response body:"; cat /tmp/login_res.txt
  fi
  rm -f $TMPCOOKIE /tmp/login_res.txt
else
  echo "Skipping admin login test (ADMIN_EMAIL/ADMIN_PASSWORD not provided)"
fi
