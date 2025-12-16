# Copilot / AI Agent Instructions

Purpose: help AI coding agents become immediately productive in this repository.

- **Big picture:** This repo is a static frontend (root HTML/CSS/JS) with an optional Node/Express backend in `server/` that provides a tiny admin SPA and JSON REST API. The backend serves the static site and the admin UI from the project root and exposes `/api/*` endpoints for content management.

- **Key components**
  - Frontend static files: [index.html](index.html), [portfolio.html](portfolio.html), [admin/index.html](admin/index.html)
  - Admin client: [admin/app.js](admin/app.js) — uses `fetch` to call backend APIs and `FormData` for uploads.
  - Backend: [server/index.js](server/index.js) — Express server, Sequelize (SQLite), file uploads to `/uploads`, and site settings persisted at `server/data/site-settings.json`.
  - Models: [server/models](server/models) (Sequelize definitions for Project, Blog, Review, Service, Skill, TeamMember, User, Contact).

- **How the pieces interact**
  - Admin UI authenticates via `POST /api/login` and receives a session cookie stored by `express-session` (SQLite store). See `requireAuth` middleware in `server/index.js`.
  - Admin client performs CRUD against endpoints like `/api/projects`, `/api/blogs`, `/api/services`, `/api/skills`, `/api/team`, `/api/reviews`, `/api/settings`.
  - Uploads are saved to the `uploads/` folder and exposed at `/uploads/*` by the server.

- **Environment & config**
  - Backend reads `.env` (via `dotenv`). Important env vars: `SESSION_SECRET`, `PORT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `CONTACT_TO`.
  - Mailer is optional — only enabled when SMTP_* vars are present (see `server/index.js`).

- **Run / developer workflows**
  - Install and run backend (in `server/`):

```bash
cd server
npm install
```instructions
# Copilot / AI Agent Instructions

Purpose: make AI coding agents immediately productive in this repository by describing the architecture, conventions, workflows, and concrete examples.

- **Big picture:** This is primarily a static frontend (root HTML/CSS/JS) with an optional Node/Express backend in `server/` that provides a tiny admin SPA and a JSON REST API. The server serves the static site + admin UI and persists content in a Sequelize-backed DB (SQLite by default) and a JSON settings file.

- **Key components (quick list)**
  - Frontend: `index.html`, `portfolio.html`, `about.html`, `contact.html`, `script.js`, `style.css`.
  - Admin UI: `admin/index.html`, `admin/app.js` — minimal SPA using `fetch` + `FormData`, `credentials: 'include'` for cookie auth.
  - Backend: `server/index.js` — Express routes under `/api/*`, uses Sequelize (`server/models`) and stores settings at `server/data/site-settings.json`.
  - Fallback data for offline/dev: `data/fallback/*.json` used by `script.js` when ALLOW_FALLBACK is enabled.

- **How components interact (important details)**
  - Auth: `POST /api/login` sets `req.session.userId` in an `express-session` (SQLite store). Protected endpoints use `requireAuth`.
  - Admin app performs CRUD: `/api/projects`, `/api/blogs`, `/api/services`, `/api/skills`, `/api/team`, `/api/reviews`, `/api/settings`.
  - Uploads: files are saved to `uploads/` by `multer`. Optionally, if `S3_BUCKET` is set, files are uploaded to S3 (see `S3_BASE_URL` for canonical URLs); S3 upload may remove the local file.
  - Frontend fallback behavior: `script.js` has `fetchJsonWithFallback(apiPath, fallbackPath)` with `ALLOW_FALLBACK=false` by default — set true only for local testing; fallback files live in `data/fallback/`.

- **Environment & configuration (concrete list)**
  - General: `.env` via `dotenv`.
  - Server-related env vars you may need to change/test:
    - SESSION_SECRET (recommended to set), SESSION_COOKIE_SECURE (true in production), PORT, CORS_ORIGIN
    - DATABASE_URL (optional) — when set, the app uses Postgres; otherwise SQLite at `server/data/dev.sqlite`.
    - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, CONTACT_TO — enable contact email notifications when present.
    - S3_BUCKET, S3_REGION, S3_BASE_URL — enable optional S3 uploads. `S3_BASE_URL` can be a CloudFront domain.

- **Developer workflows & scripts**
  - Backend:
    - Install & run: cd `server` → `npm install` → `npm run dev` (nodemon) or `npm start` (production).
    - DB sync: `npm run migrate` runs `server/scripts/sync.js` to create tables.
    - Useful windows helpers: `server/start.bat` and `server/start-server.bat` (auto-restarts and logs).
  - Headless tests / automation:
    - `server/scripts/headless-login.js` and `headless-settings-ui.js` use Puppeteer to exercise the admin UI (these include example credentials — review or rotate in production).
    - `server/scripts/safe-settings-roundtrip.js` and `test-settings-save.js` are small validation utilities for settings persistence.

- **Project-specific conventions & patterns**
  - Auth & sessions: cookie-based, `credentials: 'include'` in requests; the admin app expects cookie auth rather than token auth.
  - Admin UI: uses `FormData` for uploads and standard patterns for edit/delete flows; the `api()` helper in `admin/app.js` parses JSON and surfaces server error messages.
  - Settings persistence: `PUT /api/settings` writes a sanitized JSON file at `server/data/site-settings.json` (server validates fields and normalizes platform lists).
  - Contact form: server-side rate limiter (IP-based, 5/min) and a honeypot field `website` to reduce spam; the endpoint returns quickly and sends emails asynchronously (best-effort).

- **Testing & debugging tips**
  - Logs: `server/server-log-out.txt`, `server/server-log-err.txt`, and `server/server-exit-debug.log` (the server appends heartbeat and PID info to the exit log to help diagnose crashes).
  - Health: `GET /api/health` returns `{ ok: true }`.
  - Reproducing frontend fallbacks: in `script.js` toggle `ALLOW_FALLBACK` to `true` to use `data/fallback/*.json` when the API is unavailable.
  - If S3 uploads are enabled, check `S3_BASE_URL` vs generated S3 URL format — server may delete the local file after a successful S3 upload.

- **Common change examples (concrete steps)**
  - Add a new API resource: add Sequelize model in `server/models/`, add CRUD routes in `server/index.js` (follow pattern used for Projects/Blogs/Services), and update `admin/app.js` to call the new endpoints and render UI.
  - Add an upload field: add `<input type="file" name="<fieldname>">` in admin form, use `upload.single('<fieldname>')` in the route, and store `'/uploads/' + path.basename(req.file.path)` or the S3 URL.

- **Notes & security considerations**
  - Headless test scripts contain example credentials — treat them as sensitive and rotate before publishing real deployments.
  - The repo uses SQLite by default for convenience; production should set `DATABASE_URL` to use managed Postgres or other DB.

If you'd like, I can shorten or expand any section, add a quick reference table of env vars, or add one-line examples for adding models/routes. Feedback on any unclear items?

```
