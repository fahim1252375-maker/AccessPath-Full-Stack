# AccessPath Phase 4 — Reality Audit

**Audit date:** 2026-11-13  
**Scope:** The supplied `accesspath-3.zip` source tree, subsequent source changes in this work session, and its feature registry; this is a static source audit, not a production security assessment.  
**Status meanings:** `VERIFIED` means direct source evidence exists for the capability; it does not imply a live institutional integration or external certification. `PARTIAL` means a scaffold, limited implementation, or incomplete test evidence exists. `MISSING` means the supplied tree does not contain the requested implementation. `BLOCKED` means the requested command could not be executed in this environment.

## Stage 0 — Reality verification

| Requirement | Status | Source evidence / finding |
|---|---|---|
| Existing React + TypeScript + Vite frontend | VERIFIED | `package.json`, `vite.config.ts`, `frontend/src/main.tsx`, `frontend/src/app/App.tsx` |
| Existing Express + Node API | VERIFIED | `server.ts`, `backend/src/app.ts`, `backend/src/routes/*` |
| MongoDB repository with development JSON fallback and production guard | VERIFIED | `backend/src/repositories/db.ts`, `backend/src/config/env.ts` |
| Five roles and server-side RBAC | VERIFIED | `shared/types.ts`, `backend/src/middleware/auth.ts`, `backend/src/jobs/seed.ts` |
| Campus-scoped authorization | PARTIAL | `requireCampusAccess` exists and is used by mutation routes; public read routes such as `GET /campuses/:id/map` are intentionally unauthenticated, so this is not a blanket tenant-isolation layer. Review each endpoint individually. |
| Dijkstra / optional A* accessible routing | VERIFIED | `backend/src/services/routing/dijkstra.ts`; regression source in `backend/tests/routing.test.ts` |
| Trust Engine | VERIFIED | `backend/src/services/trust/trustEngine.ts` |
| Indoor navigation, live facilities, timetable and emergency planning | VERIFIED | `backend/src/routes/campusRoutes.ts`, `backend/src/routes/operationsRoutes.ts`, `frontend/src/pages/student/CampusHubPages.tsx` |
| Gemini adapter and deterministic mock provider | PARTIAL | `backend/src/services/ai/geminiService.ts`, `backend/src/routes/aiRoutes.ts`, `.env.example`; live provider behavior requires credentials and external evaluation was not run. |
| Three.js / React Three Fiber and 2D fallback | VERIFIED | `frontend/src/components/three/LazyCampusScenes.tsx`, `frontend/src/components/three/webglUtils.ts`, `frontend/src/components/maps/CampusMap.tsx` |
| English / বাংলা resources and PWA | VERIFIED | `frontend/src/i18n/index.ts`, `frontend/src/components/accessibility/AccessibilityControls.tsx`, `vite.config.ts`, `public/manifest.json` |
| Existing 214 feature registry and additive extension | VERIFIED | The original #1–#214 records and module assignments are preserved; new feature #215 is appended in Module V. |
| Feature Directory source module | RESTORED / EXTENDED | Two source files imported `frontend/src/data/featureCatalog.ts`, but that file was absent from the ZIP. A typed projection was reconstructed from the original 214 rows, then extended with #215. Detailed fields absent from compact rows are marked unspecified rather than fabricated. |
| Existing Vitest / Supertest suites | PARTIAL | `vitest.config.ts`, `backend/tests/api-security.test.ts`, `backend/tests/routing.test.ts`, `frontend/tests/app.test.ts` exist. They could not be executed because dependencies could not be installed in this environment. |
| Playwright E2E suite for five-role login, routing, upload, tenant denial, preferences, fallback and offline sync | MISSING in supplied archive; added as source | `e2e/accesspath.spec.ts`, `playwright.config.ts` |
| axe-core automated accessibility checks | MISSING in supplied archive; added as source | axe-core Playwright checks are defined in `e2e/accesspath.spec.ts`. They are not reported as passed. |
| Keyboard / screen-reader tests for dialogs, accordions, route results and notifications | PARTIAL; strengthened | `Modal` now moves focus into the dialog, traps Tab / Shift+Tab, restores prior focus and handles Escape. FAQ controls expose `aria-controls` and labelled regions; notification read state is announced. Unit/E2E tests are added but not executed. |
| `npm audit` dependency assessment | BLOCKED | No `package-lock.json` is present; `npm audit --audit-level=high` returned `ENOLOCK`. Direct npm registry access also returned DNS `EAI_AGAIN`; no dependency was silently upgraded or removed without a resolvable audit. CI runs the audit after dependency install. |
| Dockerfile + Compose (app and MongoDB) | ADDED; runtime not verified | `Dockerfile`, `docker-compose.yml`, `.dockerignore`. Container build and health checks were not executed here. |
| GitHub Actions CI | ADDED; run pending | `.github/workflows/ci.yml` includes install, npm audit, lint, unit tests, build, bundle budget, Playwright and Lighthouse. No workflow run is available from this session. |
| Lighthouse CI with JavaScript / 3D bundle budget | ADDED; execution pending | `lighthouserc.json`, `scripts/check-bundle-budget.mjs`, and a separately named `vendor-3d` Vite chunk. The 2.5 MiB total JS / 1.2 MiB 3D chunk limits are configuration budgets, not measured pass results. |

## Stage 1 — Accessibility digital twin and decision support

| Requirement | Status | Source evidence / finding |
|---|---|---|
| What-if graph simulator on a graph copy | PARTIAL; native smoke-tested | `backend/src/services/routing/graphSimulation.ts`, `POST /api/v1/admin/accessibility-twin/simulate`, and `/app/admin/accessibility-twin`. Simulates fixed/closed/proposed-ramp actions over a detached graph copy; strict route comparisons preserve verification. Five Node-native smoke tests passed; Vitest and API authorization tests remain unexecuted. Scope is one edge and at most 25 selected route pairs. |
| Verified-segment isochrone / reachability analysis | MISSING | No time-bounded reachability service existed. |
| Open-barrier investment prioritizer with explainable score and data gate | MISSING | No prioritization service existed. |
| Coverage score and export report | PARTIAL | Existing trust coverage and analytics exist in `backend/src/services/trust/trustEngine.ts` and `backend/src/routes/analyticsRoutes.ts`; configurable reference standards and compliance export are not evidenced. |
| Reachability / equity heatmap | MISSING | No heatmap/dashboard evidence found. |

**Stage 1 scope delivered in this change set:** Feature #215 is the What-If Digital Twin. Isochrone/reachability, investment prioritization, configurable coverage exports and heatmaps remain missing and are not represented as implemented.

## Stage 2 — Multi-profile and sensory/cognitive routing

| Requirement | Status | Source evidence / finding |
|---|---|---|
| Wheelchair / step-free / limited-mobility core profiles | VERIFIED | `shared/types.ts`, `backend/src/services/routing/dijkstra.ts` |
| Low-vision, sensory-friendly, fatigue-aware, cognitive/easy-read and hearing profiles | MISSING | These profiles and their route attributes are not defined in the supplied types. |
| Source- and timestamp-backed sensory edge attributes | MISSING | `PathEdgeDTO` lacks these fields. |
| Unknown attributes treated conservatively | PARTIAL | Unknown/unverified edge verification states are excluded in strict routing; no regression coverage exists for the proposed sensory attributes because those attributes do not exist. |
| Bengali / English spoken directions | PARTIAL | Browser TTS exists in `SmartRoutePlannerPage.tsx`; landmark-rich bilingual instructions and a text fallback evaluation are not evidenced. |

## Stage 3 — Walk-and-verify field mode

| Requirement | Status | Source evidence / finding |
|---|---|---|
| Volunteer verification and human approval queue | PARTIAL | `backend/src/routes/verificationRoutes.ts`, `frontend/src/pages/volunteer/VolunteerPages.tsx`; a complete guided geolocation field workflow was not found. |
| Browser geolocation accuracy and guided segment checklist | MISSING | No dedicated volunteer field mode evidence found. |
| Optional orientation-derived slope estimate | MISSING | No orientation sensor measurement workflow found. |
| Offline field queue, conflict-aware sync, anti-abuse plausibility checks | PARTIAL | Report draft idempotency exists in `frontend/src/store/useAppStore.ts`, `frontend/src/pages/student/StudentUtilityPages.tsx`, `backend/src/routes/reportRoutes.ts`; this is not a field verification queue. |

## Stage 4 — Accommodation requests and live help

| Requirement | Status | Source evidence / finding |
|---|---|---|
| Accommodation request workflow with sensitive-field encryption and least privilege | MISSING | No dedicated accommodation request model or route found. |
| Consent-based volunteer live-help request with timeout and abuse report | MISSING | No live-help workflow found. |
| In-app notifications | VERIFIED | `backend/src/utils/audit.ts`, notification routes and `frontend/src/pages/student/StudentUtilityPages.tsx` |
| Web Push capability/configuration disclosure | PARTIAL | VAPID configuration keys exist in `backend/src/config/env.ts`; end-to-end Web Push service setup and delivery proof were not found. |

## Stage 5 — Grounded AI, safety and evaluation

| Requirement | Status | Source evidence / finding |
|---|---|---|
| Campus-scoped embedding index / real retrieval | MISSING | `geminiService.ts` contains prompt and retrieval helpers but no tenant-scoped embeddings index is evidenced. |
| Server-authorized tool-calling agent with provenance | PARTIAL | AI API routes and server-side services exist; the complete authorized tool-calling/provenance flow is not established by the source tree. |
| Prompt injection defense, PII redaction and output schema validation | PARTIAL | AI service guardrails and Zod request schemas exist; a complete end-to-end PII redaction and adversarial evaluation harness is not evidenced. |
| Versioned bilingual AI evaluation harness | MISSING | No versioned benchmark dataset and reproducible evaluation runner found. |
| Measured AI usage dashboard | PARTIAL | AI interactions and admin analytics infrastructure exist; actual measured token/latency/error reporting needs verification. |
| Bengali speech-to-text and speech output | PARTIAL | Browser speech recognition/TTS paths exist; browser capability fallback and language coverage are not independently tested. |

## Stage 6 — Institutional integration and open standards

| Requirement | Status | Source evidence / finding |
|---|---|---|
| OIDC adapter descriptor | PARTIAL | `backend/src/services/integrations/adapters.ts`; descriptor/configuration is not live SSO. |
| WebAuthn passkeys, optional TOTP, CSV admin import, session UI | MISSING | No evidence found for these workflows. |
| ICS import and Moodle/LTI adapter interface | MISSING | Timetable CRUD exists; file import/adaptor interface was not found. |
| OpenAPI 3 + Swagger UI, scoped API keys and signed webhooks | MISSING | `docs/api-reference.md` is prose documentation; no OpenAPI spec, key lifecycle or signed webhook subsystem found. |
| OpenSidewalks / IndoorGML / GTFS-pathways export | PARTIAL | GeoJSON export/import exists in `backend/src/services/gis/geojsonService.ts`; the requested compatibility exports were not found. |
| Event accessibility planner | MISSING | No event planner workflow found. |

## Stage 7 — Privacy, security and operations

| Requirement | Status | Source evidence / finding |
|---|---|---|
| Privacy notice / consent preferences | PARTIAL | `docs/privacy-policy.md`, profile consent fields and `frontend/src/pages/student/StudentUtilityPages.tsx`; no full self-service privacy centre/data export/deletion flow was found. |
| Field-level encryption for accommodation/profile data | MISSING | No field-level encryption/key-rotation service found. |
| Security headers, rate limits, session revocation and audit logs | VERIFIED | `backend/src/app.ts`, `backend/src/middleware/auth.ts`, `backend/src/utils/audit.ts` |
| STRIDE threat model | MISSING in supplied archive; added | `docs/threat-model.md` |
| OpenTelemetry-compatible tracing and feature flags | PARTIAL | `backend/src/utils/observability.ts` provides correlation IDs and in-memory telemetry; OpenTelemetry exporter and durable feature-flag service not found. |
| Scheduled backup and tested restore | PARTIAL | Backup/restore endpoints exist in admin routes; an automated scheduled job and independently executed restore test were not evidenced. |
| k6 load tests with real results | MISSING | No k6 scripts or measured load report found. |
| Capacitor native readiness and PMTiles self-hosting | MISSING | No Capacitor or PMTiles configuration found. |

## Stage 8 — UX, documentation and registry

| Requirement | Status | Source evidence / finding |
|---|---|---|
| Dark/light theme, focus controls, skip link, ARIA live region, 2D fallback | VERIFIED / PARTIAL | `AccessibilityControls.tsx`, `PublicLayout.tsx`, `webglUtils.ts`; automated audits were not executable during this run. Modal focus trapping and accordion relationships were improved. |
| EN / বাংলা completeness test | PARTIAL; test source added | `frontend/tests/i18n-completeness.test.ts` recursively compares resource keys; the new Digital Twin interface has English and Bengali labels. The test has not been executed. |
| Searchable feature directory and feature registry | PARTIAL, import blocker fixed | `FEATURE_REGISTRY.md` preserves the original 214 rows and appends #215 in Module V. The missing `featureCatalog.ts` was reconstructed and extended. The 215-record integrity test source has not been executed. |
| Updated README, architecture, API, DB, testing, threat model and AI disclosure | PARTIAL; selected docs updated | README, testing/deployment instructions, API reference and STRIDE threat model were updated. Remaining stages need feature-specific schema/operational documentation as they are implemented. |

## Commands and execution evidence (updated 2026-11-13)

| Command / check | Result |
|---|---|
| `npm install --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=15000` | **BLOCKED** — timed out; `npm view vite version` separately returned DNS `EAI_AGAIN` for `registry.npmjs.org`. No `node_modules` or npm lockfile was created. A Bun lockfile is present, but Bun is not installed. |
| `tsc --noEmit` / `npm run lint` | **BLOCKED** — exit 2 before semantic project checking: global TypeScript could not find `@types/node`, `vite/client` and `vite-plugin-pwa/client`. |
| `npm test -- --run` | **BLOCKED** — exit 127, `vitest: not found`. |
| `npm run build` | **BLOCKED** — exit 127, `vite: not found`. |
| `npm audit --audit-level=high` | **BLOCKED** — exit 1, `ENOLOCK` because no npm package lock exists; network/DNS access was also unavailable. |
| `npm run test:simulation` | **PASSED** — native Node runner: 5 tests, 5 passed, 0 failed. Covered graph-copy repair, verification preservation, proposed ramp remains unverified, simulated closure, and all 215 catalog IDs. |
| Global TypeScript `transpileModule` syntax pass | **PASSED** — all 80 `.ts` / `.tsx` files parsed with 0 syntax diagnostics. This is syntax-only, not semantic typechecking. |
| `node --check scripts/check-bundle-budget.mjs` | **PASSED** — script syntax only; no built bundle budget was executed. |
| `npm run test:e2e` / axe-core | **NOT RUN** — Playwright test runner and browser dependencies are not installed. |
| Lighthouse CI | **NOT RUN** — dependencies and built site are unavailable. |
| Docker / Compose | **NOT RUN** — Docker is not installed in this environment. |

**Truthful conclusion:** This audit confirms source-level evidence and records gaps. It does not certify WCAG conformance, tenant isolation across every endpoint, security, live integrations, AI accuracy, deployment, or runtime behavior. Run the CI workflow in an environment with package-registry and browser access to obtain execution evidence.
