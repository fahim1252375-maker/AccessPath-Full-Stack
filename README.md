# AccessPath

**Accessible Campus Navigation & AI-Powered Barrier Reporting System**
*"Every Student Deserves an Accessible Path."*

AccessPath helps students with disabilities, visitors, campus volunteers, moderators, and facilities administrators navigate campuses safely with verified step-free routing, report physical accessibility barriers in English or বাংলা (Bengali), verify conditions on-site, and manage remediation without ever inventing unverified accessible paths.

---

## Key Capabilities

- **Advanced Accessible Routing 2.0 (Dijkstra & A*)**: Priority `MinHeap` optimizer with optional Haversine A* search, hard constraint filtering (blocked edges, live elevator/facility outages, stairs, unverified paths, slopes, clearances), Top-3 distinct alternatives, route diversity/confidence scoring, and `NO_VERIFIED_ACCESSIBLE_ROUTE` safe failure.
- **Accessibility Intelligence & Trust Engine**: Segment-level freshness tracking (`VERIFIED_CURRENT`, `VERIFICATION_EXPIRING`, `STALE`, `UNVERIFIED`, `DISPUTED`, `BLOCKED`, `UNKNOWN`), expiration policies, conflicting-report detection, building verification coverage, and explicit inspection rationales (AI never certifies accessibility).
- **Multi-Floor Indoor Navigation & Waypoints**: Interactive SVG building floor maps (`Ground Floor` ↔ `Second Floor`), accessible elevator transitions, registered QR waypoint lookup (`/api/v1/campuses/:id/qr/:code`), camera permission checks, and labelled Web Bluetooth / WebXR capability probes.
- **Live Campus Accessibility Operations & Class Schedule Planner**: Facility status tracking (elevators, doors, restrooms, construction zones) with subscriber alerts, plus personal class-to-class accessible timetable planning with recommended departure times and tight/unverified transition warnings.
- **Accessible Emergency Evacuation Planner**: Floor-specific evacuation paths, wheelchair-compatible exits, assembly points, safety admin approval workflow, and high-contrast printable evacuation plans (with explicit non-dispatch safety disclosure).
- **Hardened Security & Production Safety**: Cryptographic double-submit CSRF + Origin validation, server-side `userSessions` revocation on logout/password reset/deactivation/role changes, self `campusId` mutation lock + authorized campus transfer requests, SHA-256 single-use password reset/verification tokens, EXIF-stripping image re-encoder (`pngjs` / `jpeg-js`), strict Zod PATCH allowlists, DB backup/restore/integrity checks, and strict production startup guards (no auto-seeding or silent JSON fallback in `NODE_ENV=production`).
- **Accessibility Digital Twin (What-If Simulator)**: Campus admins can compare before/after verified route availability when a segment is hypothetically fixed, closed, or given a proposed ramp. The simulator uses a detached graph copy, preserves verification state, is audit-logged, and never publishes simulated changes.
- **Predictive Maintenance 2.0, GIS & System Observability**: Equipment MTTR & SLA compliance analytics, GeoJSON FeatureCollection export/topology validation/versioned import, `X-Request-Id` tracing, and 7-service readiness monitoring.
- **Quick Search, Shortcuts & Guided Start (4.2)**: `Ctrl/Cmd+K` command palette (pages, quick settings, feature docs; EN / বাংলা), `?` shortcut help with `G`-then-letter navigation, a dashboard welcome checklist, recently-visited links, and swap / recent-route shortcuts in the route planner.
- **Bilingual EN / বাংলা Interface, AI & Offline PWA**: Full `i18next` localization, server-side Gemini AI (`gemini-4-hydrogen` via `@google/genai`) with deterministic mock fallback, offline draft `clientRequestId` deduplication, `graphVersion` staleness detection, and Workbox privacy-safe caching.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and adjust as needed:
```bash
cp .env.example .env
```
- In development (`NODE_ENV=development`), omit `MONGODB_URI` to run with the persistent local JSON store (`data/accesspath-db.json`). In production (`NODE_ENV=production`), `MONGODB_URI` and a strong `JWT_SECRET` (minimum 32 characters) are strictly required.
- Set `GEMINI_API_KEY` to enable live Gemini AI calls; omit it to run in deterministic offline `mock` mode.

### 3. Seed & Run Development Server (Port 3000)
```bash
npm run seed   # Optional: dev server also auto-seeds empty DB when ALLOW_DEMO_SEED=true
npm run dev    # Runs Express API + Vite SPA on http://localhost:3000
```

### 4. Production Build & Start
```bash
npm run build
npm run budget
NODE_ENV=production MONGODB_URI="mongodb+srv://..." JWT_SECRET="<32+ char secret>" npm start
```

### 5. Docker Compose (App + MongoDB)
```bash
cp .env.example .env
# Set a strong, unique JWT_SECRET in .env
docker compose up --build
```

---

## Synthetic Demo Campus & Accounts

When the database is empty in non-production environments, AccessPath seeds a clearly labelled **DEMO CAMPUS — SYNTHETIC DATA** (*Demo North Courtyard Campus*, 14 location nodes, 26 weighted path edges, 8 buildings, 4 indoor floor plans, 5 live facility monitors, 5 equipment incidents, sample reports, verifications, maintenance tasks, and emergency routes).

Demo accounts use the password configured via `SEED_DEMO_PASSWORD` (default in demo mode: `AccessPathDemo!2026`):

| Role | Email |
|---|---|
| Student | `student.demo@accesspath.example.edu` |
| Volunteer | `volunteer.demo@accesspath.example.edu` |
| Moderator | `moderator.demo@accesspath.example.edu` |
| Campus Admin | `admin.demo@accesspath.example.edu` |
| Super Admin | `superadmin.demo@accesspath.example.edu` |

*(Quick-fill buttons are available on `/auth/signin` for testing.)*

---

## Verification, Testing & Linting

```bash
npm test                 # Vitest, Supertest and Testing Library
npm run test:simulation  # Offline Node 22 smoke tests: #215 simulator, #216–#218 navigation features, 218-feature catalog
npm run typecheck        # tsc --noEmit (alias of lint)
npm run format           # Prettier write (npm run format:check to verify only)
npm run lint             # tsc --noEmit
npm run build            # Production Vite + PWA bundle
npm run budget           # Total JS and vendor-3d chunk size budgets
npm run test:e2e         # Playwright + axe-core browser suite
npm run audit            # npm audit (requires lockfile + registry access)
npm run lighthouse:ci    # Lighthouse CI on the public landing and feature pages
```

The offline `test:simulation` command passes 22 native Node tests (4 simulator, 1 catalog, 17 navigation-feature tests) in the preparation environment. Full Vitest, typecheck, build and dependency audit remain blocked because npm registry DNS resolution failed and this archive has no npm lockfile. See [`docs/audit-phase4.md`](./docs/audit-phase4.md) and [`docs/testing.md`](./docs/testing.md) for exact execution status. No blocked check is represented as passed.

---

## Documentation & Registry

- [`FEATURE_REGISTRY.md`](./FEATURE_REGISTRY.md) — Feature status matrix; the original #1–#214 records remain; #215 is in Module V and #216–#218 are in Module W
- [`docs/architecture.md`](./docs/architecture.md) — System, security & trust-boundary architecture
- [`docs/api-reference.md`](./docs/api-reference.md) — Complete REST API `/api/v1/*` endpoints
- [`docs/database-schema.md`](./docs/database-schema.md) — 27 Mongoose/repository collections & indexes
- [`docs/routing-algorithm.md`](./docs/routing-algorithm.md) — Hard filtering, Trust weighting, MinHeap Dijkstra & A*
- [`docs/ai-disclosure.md`](./docs/ai-disclosure.md) — Gemini usage, privacy & human-in-the-loop rules
- [`docs/accessibility-methodology.md`](./docs/accessibility-methodology.md) — Inclusive design & truthfulness standards
- [`docs/privacy-policy.md`](./docs/privacy-policy.md) — Data minimization & reporter anonymity
- [`docs/deployment.md`](./docs/deployment.md) — Environment variables, production guards & cloud deployment
- [`docs/testing.md`](./docs/testing.md) — Unit, integration, E2E, accessibility, bundle and Lighthouse verification commands
- [`docs/audit-phase4.md`](./docs/audit-phase4.md) — Reality audit and honest Phase 4 implementation status
- [`docs/threat-model.md`](./docs/threat-model.md) — STRIDE threat model and remaining controls

---

## Known Limitations

- **External Integrations**: SMTP email dispatch, live campus BMS elevator telemetry, University OIDC SSO, and external CMMS webhooks are implemented as readiness-checked adapters awaiting institutional credentials.
- **Hardware Modules**: Web Bluetooth beacons, WebXR AR overlays, and camera QR scanning depend on physical campus hardware and browser capability permissions; deterministic demo markers and manual QR inputs are clearly labelled.
- **No Legal Certification Claim**: Building scores, Trust Engine badges, emergency evacuation printouts, and WCAG 2.2 AA UI targets are operational tools, not formal ADA/DDA certifications or emergency service dispatch systems.

---

## License

MIT — see [`LICENSE`](./LICENSE).
