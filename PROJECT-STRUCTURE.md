# AccessPath — Combined Full-Stack Project

This archive contains the frontend and backend in one project root. Install dependencies once from this directory.

## Main structure

- `frontend/` — React + TypeScript UI, pages, components, localization, styles and client services.
- `backend/` — Express API, authentication/RBAC, routing, trust engine, data repositories, validation and services.
- `shared/` — Shared TypeScript contracts used by both sides.
- `src/main.tsx` — Vite browser entry point; it mounts `frontend/src/main.tsx`.
- `server.ts` — Single Node entry point; it mounts the Express API and serves the Vite app in development or the built SPA in production.
- `docs/`, `e2e/`, `scripts/` — Documentation, browser tests and project scripts.

## Run from this directory

```bash
npm install
cp .env.example .env
npm run dev
```

The development server defaults to port `3000`. For Docker, configure `.env` and run `docker compose up --build`.

## Checks

```bash
npm run test:simulation
npm run lint
npm test
npm run build
npm run test:e2e
```

`npm run test:simulation` is the offline Node 22 smoke suite. Full dependency-based checks still require a successful dependency installation; consult `docs/audit-phase4.md` for the honest execution status.
