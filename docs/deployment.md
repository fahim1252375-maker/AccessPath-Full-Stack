# AccessPath Deployment & Operations Guide

## 1. Environment Variables

Copy `.env.example` to `.env` and configure production values:

| Variable | Required | Default / Notes |
|---|---|---|
| `PORT` | Yes | `3000` (required in AI Studio preview & standard single-server deploy) |
| `NODE_ENV` | Yes | `development` or `production` |
| `APP_URL` | Prod | Origin allowed by CORS (e.g. `https://accesspath.example.edu`) |
| `JWT_SECRET` | **Prod** | Long random signing secret (server rejects production startup without non-default secret if strictly enforced; dev falls back only in non-prod) |
| `MONGODB_URI` | Prod | MongoDB Atlas / MongoDB connection string. Omit for local JSON fallback (`data/accesspath-db.json`). |
| `AI_PROVIDER` | Optional | `gemini` (auto-activates when `GEMINI_API_KEY` is present) or `mock` |
| `GEMINI_API_KEY` | Optional | Server-side Google Gemini API key (never expose as `VITE_*`) |
| `SEED_DEMO_PASSWORD` | Optional | Password used by `npm run seed` for demo accounts (defaults `AccessPathDemo!2026` in demo mode) |
| `EMAIL_PROVIDER` | Optional | `none` or `smtp` (with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) |
| `GOOGLE_MAPS_API_KEY` | Optional | Optional external geocoding integration |

## 2. Local Development

```bash
npm install
npm run seed          # Optional: pre-seed synthetic demo campus data
npm run dev           # Starts Express + Vite middleware on http://localhost:3000
```

## 3. Production Build & Start

```bash
npm run build         # Builds Vite SPA + PWA Service Worker into dist/
NODE_ENV=production npm start   # Runs node server.ts serving dist/ and /api/v1/* on PORT
```

*Requires Node.js >= 22.18 (verified on Node v22.23.2 with native TypeScript type stripping) or `tsx`.*

## 4. Docker Compose (Application + MongoDB)

```bash
cp .env.example .env
# Set a unique JWT_SECRET (32+ random characters) in .env
docker compose up --build
```

The Compose file starts the Express/Vite production container and MongoDB 7, waits for the database health check, persists MongoDB data, and mounts the uploads directory. Before production use, review `APP_URL`, MongoDB credentials/network policy, secure cookie settings, TLS, backups and secrets management. Do not commit `.env`.

## 5. CI / Quality Gates

`.github/workflows/ci.yml` defines dependency installation/audit, TypeScript typecheck, Vitest, Vite build, bundle budget, Playwright Chromium E2E and Lighthouse CI. A green workflow run is required before calling these gates passed. The current preparation environment could not install npm dependencies, so it did not produce a passing CI-equivalent result.

## 6. Docker / Cloud Hosting Notes

- Persist `/app/uploads` (or configure an external S3-compatible object storage adapter) so uploaded barrier evidence photos survive container restarts.
- Use MongoDB Atlas with TLS and IP allowlisting in production.
- Place behind HTTPS reverse proxy (Nginx / Cloud Load Balancer / Cloud Run) so `Secure` cookies and PWA Service Worker installation work across browsers.
