#!/usr/bin/env bash
set -euo pipefail
# fetch_and_upload_heroes.sh
# Usage: ./scripts/fetch_and_upload_heroes.sh <S3_BUCKET> [--no-upload]
# Downloads hero images from Unsplash (or other URLs) and uploads to the given S3 bucket
# with proper Content-Type and Cache-Control headers for fast delivery. Requires: curl, aws cli, cwebp (optional)

BUCKET="$1"
NO_UPLOAD=false
if [[ "${2:-}" == "--no-upload" ]]; then NO_UPLOAD=true; fi

# Map of filename (base) -> source URL (curated professional images)
declare -A IMAGES
IMAGES[hero-home]='https://images.unsplash.com/photo-1521790367033-1b24042c0e20'
IMAGES[hero-contact]='https://images.unsplash.com/photo-1494790108377-be9c29b29330'
IMAGES[hero-portfolio]='https://images.unsplash.com/photo-1498050108023-c5249f4df085'
IMAGES[hero-blogs]='https://images.unsplash.com/photo-1515378791036-0648a3ef77b2'
IMAGES[hero-services]='https://images.unsplash.com/photo-1519389950473-47ba0277781c'

# Widths to generate
WIDTHS=(480 800 1200 1600)
WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

echo "Working dir: $WORKDIR"
cd "$WORKDIR"

for key in "${!IMAGES[@]}"; do
  base_url=${IMAGES[$key]}
  echo "Processing $key -> $base_url"
  for w in "${WIDTHS[@]}"; do
    h=$(python - <<PY
w=${w}
# approximate 16:9 (0.5625)
h=int(w*0.5625)
print(h)
PY
)
    jpg_name="${key}-${w}.jpg"
    webp_name="${key}-${w}.webp"
    src="${base_url}?w=${w}&h=${h}&fit=crop&auto=format&q=80"
    echo "  Downloading ${src} -> ${jpg_name}"
    curl -sSf -L "${src}" -o "${jpg_name}"
    if command -v cwebp >/dev/null 2>&1; then
      echo "  Generating webp ${webp_name}"
      cwebp -q 80 "${jpg_name}" -o "${webp_name}"
    else
      echo "  cwebp not found, generating webp via convert if available"
      if command -v convert >/dev/null 2>&1; then
        convert "${jpg_name}" "${webp_name}"
      else
        echo "  No webp converter found; webp will not be available for ${jpg_name}"
      fi
    fi

    if [ "$NO_UPLOAD" = false ]; then
      echo "  Uploading to s3://${BUCKET}/uploads/${jpg_name}"
      aws s3 cp "${jpg_name}" "s3://${BUCKET}/uploads/${jpg_name}" --acl public-read --content-type image/jpeg --cache-control "public, max-age=31536000, immutable"
      if [ -f "${webp_name}" ]; then
        echo "  Uploading to s3://${BUCKET}/uploads/${webp_name}"
        aws s3 cp "${webp_name}" "s3://${BUCKET}/uploads/${webp_name}" --acl public-read --content-type image/webp --cache-control "public, max-age=31536000, immutable"
      fi
    fi
  done
done

echo "Done. If you ran without --no-upload, uploaded files are available under s3://${BUCKET}/uploads/"

echo "Tip: update your page <picture> sources to point to /uploads/<filename> on your site to serve from your domain and get best performance."