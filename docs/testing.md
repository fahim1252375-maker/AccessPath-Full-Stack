# AccessPath Testing & Verification Guide

This guide lists reproducible commands. A test is considered passed only when the command has actually run successfully in the target environment. Source files being present is not execution evidence.

## 1. Install and prepare

```bash
npm install
npx playwright install --with-deps chromium
```

The repository intentionally does not commit generated browser binaries. CI installs the Chromium runtime used by Playwright.

## 2. Unit, integration and component tests

```bash
npm test
```

Current test sources include:

- `backend/tests/routing.test.ts` — routing eligibility, verified-only constraints, alternatives, trust freshness, indoor transitions and emergency-route behavior.
- `backend/tests/api-security.test.ts` — JWT/RBAC, tenant isolation, CSRF, session revocation, report evidence, GIS, observability, operational workflows and the What-If Digital Twin authorization/non-persistence checks.
- `backend/tests/graph-simulation.test.ts` — detached graph simulation, unlocked/lost route comparisons, production graph immutability, and the `unknown/unverified is not verified` invariant.
- `frontend/tests/app.test.ts` — bilingual labels, accessible dialog attributes, focus trapping/restoration, `aria-live`, offline draft idempotency, indoor navigation and timetable UI.
- `frontend/tests/feature-catalog.test.ts` — 214 original feature IDs preserved plus #215 (Module V) and #216–#218 (Module W).
- `frontend/tests/i18n-completeness.test.ts` — recursive English/Bengali resource-key parity.

Do not hard-code a test count in reports: Vitest reports the actual number of tests executed.

### Offline native smoke checks (no npm dependencies required)

```bash
npm run test:simulation
```

This Node 22 native test-runner suite exercises the #215 graph simulator's repair, closure, proposed-ramp, verification-preservation and non-persistence behaviors, and verifies that the catalog preserves feature IDs #1–#214 while appending #215. It is a focused smoke suite, not a replacement for Vitest, API authorization tests, browser E2E, or full semantic TypeScript typechecking.

## 3. Type checking and production build

```bash
npm run lint          # tsc --noEmit
npm run build         # Vite production bundle + PWA generation
npm run budget        # Run after build; checks total JS and isolated vendor-3d chunk budgets
```

`npm run budget` fails if `dist/assets` has no isolated `vendor-3d-*.js` output, total JS exceeds 2.5 MiB, or the Three.js/R3F chunk exceeds 1.2 MiB. Treat these as initial budgets to be calibrated using measured production bundles, not as Lighthouse measurements.

## 4. Browser E2E and automated accessibility

```bash
npx playwright install chromium
npm run test:e2e
```

`e2e/accesspath.spec.ts` covers all five seeded roles, accessible route calculation and announcements, barrier report evidence upload, cross-campus mutation denial, EN/বাংলা and theme switching, WebGL-to-2D fallback, offline draft synchronization, keyboard accordion/dialog behavior, notification announcements, and axe-core scans of key pages. These tests have not been marked passed unless CI or a developer run records success.

The axe checks target WCAG 2.0/2.1/2.2 A/AA rule tags. Automated scans do not replace manual testing with keyboards, screen readers, magnification, cognitive accessibility review, real mobile devices, or disabled-user research. AI output is not accessibility verification.

## 5. Dependency audit and Lighthouse CI

```bash
npm run audit
npm run build
npm run lighthouse:ci
```

`npm audit` needs a resolved dependency lockfile and registry access. Lighthouse CI starts the development server and audits the public landing page and feature directory; its configured accessibility/performance/resource budgets are regression signals, not WCAG certification.

## 6. Docker / CI

```bash
cp .env.example .env
# Set a unique JWT_SECRET (32+ characters) in .env
docker compose up --build
```

GitHub Actions runs install, dependency audit, lint, Vitest, production build, the JavaScript/3D bundle budget, Playwright E2E and Lighthouse CI. CI results are the source of truth for pass/fail.

## 7. Current execution record (2026-11-13)

In the environment used to prepare this change set, dependency installation was retried with a short fetch timeout and still timed out. A direct `npm view vite version` request returned `EAI_AGAIN` while resolving `registry.npmjs.org`. No `node_modules` directory or `package-lock.json` was generated; the archive contains a Bun lockfile, but Bun is not installed in this environment. Commands returned:

| Command | Actual result |
|---|---|
| `npm install --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=15000` | Timed out; registry DNS/network unavailable. |
| `tsc --noEmit` / `npm run lint` | Failed before project checking (exit 2): global TypeScript could not find `@types/node`, `vite/client` or `vite-plugin-pwa/client`. This is not a successful semantic typecheck. |
| `npm test -- --run` | Failed (exit 127): `vitest: not found`. |
| `npm run build` | Failed (exit 127): `vite: not found`. |
| `npm audit --audit-level=high` | Failed (exit 1): `ENOLOCK`, because no npm `package-lock.json` or `npm-shrinkwrap.json` exists. Registry access was also unavailable. |
| `npm run test:simulation` | **Passed: 5/5 native Node tests** covering the #215 simulation scenarios and feature catalog continuity. Does not replace Vitest/API/E2E. |
| Global TypeScript `transpileModule` scan | **Passed syntax-only parsing for all 80 `.ts` / `.tsx` files; 0 syntax diagnostics.** Does not perform semantic typechecking or resolve imports. |
| `node --check scripts/check-bundle-budget.mjs` | Passed (JavaScript syntax only; no production bundle was measured). |
| JSON parse of `package.json` and `lighthouserc.json` | Passed (configuration syntax only). |

axe-core browser scans, Playwright E2E, Lighthouse CI, Docker/Compose build, and full runtime/integration tests were not executed. Docker and Bun are not installed in this environment. The tests and automation configurations are source additions until run in an environment with registry and browser access. Do not describe them as passed on the basis of their presence.

### Offline navigation-feature tests (#216–#218)

`scripts/navigation-features.smoke.test.mjs` covers, without any npm dependencies:

- bearing / compass / turn classification and the English and Bengali direction generators (Bengali digits, `nameBn` preference, elevator floor changes, callouts derived only from route data);
- resilience analysis: single point of failure detection, detour measurement, `HIGH`/`MEDIUM`/`LOW` levels, `found: false` handling, graph immutability and the elevator recommendation;
- share tokens: preference bit-mask round trip, valid verification, tampering / wrong secret / expiry / garbage rejection, TTL clamping.

Shared synthetic fixtures live in `scripts/support/graph-fixtures.mjs`. API-level (Supertest) and browser tests for these endpoints and components still need to be written and run where npm dependencies are installed.
