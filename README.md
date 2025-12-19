# Portfolio Template

A modern, fully responsive portfolio website built with HTML, CSS, and JavaScript.

Features
- Clean, professional design with Amazon-inspired color accents (orange & blue).
- Mobile-first responsive layout with smooth animations and polished UI components.
- Sections for About, Skills, Portfolio (project showcase), and Contact (demo form).
- Smooth scrolling and accessible navigation with a responsive hamburger menu.

How to use
1. Open `index.html` in your browser to preview locally.

```powershell
Start-Process .\index.html
```

2. Replace placeholder text and images in `index.html` with your content.
3. Customize colors in `style.css` (CSS variables at the top).

Deploy
- Host on GitHub Pages by pushing this repository to a GitHub repo and enabling Pages in the repo settings.

Contributing
- Edit files locally, then `git add`, `git commit -m "your message"`, and `git push`.

License
- Use freely for personal or portfolio use.

---
Generated and styled by a portfolio helper script. Update with your own content and images.

## 🔁 Automated deployment (S3 + CloudFront + EC2 backend)

A convenience script is provided at `scripts/deploy.sh` to:
- Install server dependencies and (re)start the backend (pm2 if available, otherwise background `node`).
- Optionally rewrite frontend `window.API_BASE` values to point at your `BACKEND_URL`.
- Sync static frontend files to an S3 bucket and optionally create a CloudFront invalidation.

Usage example (run on your deployment host or locally if you have AWS CLI configured):

```bash
# Example exports
export S3_BUCKET=your-frontend-bucket-name
export CLOUDFRONT_ID=YOUR_DISTRIBUTION_ID
export BACKEND_URL=http://1.2.3.4:3000
# Dry-run
DRY_RUN=1 ./scripts/deploy.sh
# Real run
./scripts/deploy.sh
```

Notes
- The script tries to detect the instance public IP from EC2 metadata when `BACKEND_URL` is not set.
- The script will skip S3 upload if `S3_BUCKET` is not set.
- You must have AWS CLI configured with permissions to upload to the bucket and create CloudFront invalidations.
- Review `scripts/deploy.sh` before running it in production.

---

## 🔁 CI: GitHub Actions (deploy automation)

A GitHub Actions workflow is included at `.github/workflows/deploy.yml` to build and deploy the frontend to S3 and optionally create a CloudFront invalidation (and optionally deploy the backend via SSH).

What to add to your repository (Secrets)
- **AWS_ACCESS_KEY_ID** and **AWS_SECRET_ACCESS_KEY** — credentials with least-privilege permissions (S3 PutObject, CloudFront CreateInvalidation). Prefer using an EC2 instance role or OIDC where possible.
- **AWS_REGION** — e.g. `us-east-1`
- **S3_BUCKET** — the frontend bucket name
- **CLOUDFRONT_DISTRIBUTION_ID** — optional; when set the workflow will create an invalidation
- **BACKEND_URL** — optional; if set the workflow will rewrite `window.API_BASE` occurrences to this value before upload

(If you want the backend deployment step) add the SSH secrets:
- **SSH_HOST**, **SSH_USER**, **SSH_PRIVATE_KEY**, **SSH_PORT** (optional), **BACKEND_DIR** (optional)

How it runs
- On push to `main`, the job installs dependencies, runs `npm run build` (if present), optionally replaces `window.API_BASE` with `BACKEND_URL`, uploads the build (or repo root if no build) to `s3://$S3_BUCKET`, and invalidates CloudFront if `CLOUDFRONT_DISTRIBUTION_ID` is present.

Security notes
- Do not commit credentials to the repository. Use GitHub repository secrets or attach an IAM role to your runner instance.
- Rotate or revoke credentials immediately if exposed.

Cross-origin & session notes (admin login issues)
- If your frontend is served from S3/CloudFront (different origin) and your backend is on a separate origin, you must set `BACKEND_URL` (GitHub Action secret) so the CI will rewrite `window.API_BASE` to the backend origin during deploy.
- For cookie-based admin sessions to work across origins, set these server env vars on the backend host (and use HTTPS):
  - `CORS_ORIGIN` — set to your frontend origin (e.g., `https://dlfji1tg4589l.cloudfront.net`)
  - `SESSION_COOKIE_SAMESITE=none` and `SESSION_COOKIE_SECURE=true` — required when `window.API_BASE` points to a different origin so browsers accept cross-site cookies.
  - Optionally set `SESSION_COOKIE_DOMAIN` if you need a specific cookie domain.
- The server now logs session cookie configuration and basic API requests to help debugging.

If you want, I can add a small health-check step to the workflow that calls `/api/health` and a smoke test that attempts an admin login in a headless step. Which would you prefer?
