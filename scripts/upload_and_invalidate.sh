#!/usr/bin/env bash
set -euo pipefail
# upload_and_invalidate.sh
# Usage: ./scripts/upload_and_invalidate.sh <S3_BUCKET>
# Uploads hero images and optionally invalidates CloudFront when CLOUDFRONT_DIST env var is set.

BUCKET="${1:-${BUCKET:-}}"
if [[ -z "$BUCKET" ]]; then
  echo "Usage: $0 <S3_BUCKET> | or set BUCKET env var" >&2
  exit 1
fi

echo "Uploading hero images to s3://$BUCKET/uploads/..."
./scripts/fetch_and_upload_heroes.sh "$BUCKET"

if [[ -n "${CLOUDFRONT_DIST:-}" ]]; then
  echo "Creating CloudFront invalidation for $CLOUDFRONT_DIST"
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DIST" --paths "/uploads/*" "/script.js" "/index.html"
  echo "Invalidation requested. Check CloudFront console or use aws cloudfront get-invalidation to follow up."
else
  echo "CLOUDFRONT_DIST not set; skipping CloudFront invalidation. Set CLOUDFRONT_DIST env var to auto-invalidate."
fi

echo "Done."