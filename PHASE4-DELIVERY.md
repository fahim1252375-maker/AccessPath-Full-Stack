# AccessPath Phase 4 — Delivery Notes

This is an additive continuation of the supplied AccessPath source tree. Existing modules and feature IDs #1–#214 are retained. Feature #215 adds an admin-only, non-persistent Accessibility Digital Twin simulator.

## Added in this delivery

- Restored the missing typed Feature Directory projection from the supplied `FEATURE_REGISTRY.md` rows and extended it to include #215.
- Added #215 API, role/campus authorization, Zod validation, detached graph-copy simulation, bilingual admin UI, and regression test source.
- The simulator supports hypothetical `fixed`, `closed`, and `ramp_added` actions. It uses the existing strict verified-route engine, preserves the original graph, and never treats a simulated ramp as verified.
- Improved modal keyboard focus behavior and accessible announcement semantics in the existing UI.
- Added Playwright E2E and axe-core test source, Docker/Compose, GitHub Actions CI, Lighthouse CI budget configuration, STRIDE threat-model notes, and updated project docs.
- Added `npm run test:simulation`, an offline Node 22 native smoke suite; it passed 5/5 tests for the Digital Twin and feature catalog continuity.

## Honest verification status

See [`docs/audit-phase4.md`](docs/audit-phase4.md) for requirement-by-requirement source evidence and the command log. All 80 TypeScript/TSX files passed a syntax-only parser scan (0 syntax diagnostics), and `npm run test:simulation` passed 5/5 native Node tests. These results do not replace semantic typechecking or the Vitest/API/E2E suites. Full `tsc --noEmit`, Vitest, production build and `npm audit` remain blocked: npm registry DNS returned `EAI_AGAIN`, no `node_modules` or npm package lock exists, and the required Vite/Vitest/Node type packages are unavailable. Playwright/axe and Lighthouse have not run. See `docs/audit-phase4.md` for exact command outcomes.

## Run locally

1. Install dependencies with your package manager (`npm install` or `bun install`).
2. Configure `.env` using `.env.example`.
3. Run `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, and `npm run audit`.
4. For containerized development, run `docker compose up --build`.

The supplied source does not establish deployment, institutional integration credentials, physical accessibility verification, WCAG certification, legal compliance, or AI accuracy.
