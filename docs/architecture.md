# AccessPath System Architecture

## 1. High-Level Overview

AccessPath is a full-stack web and Progressive Web Application (PWA) built with React 19, TypeScript, Express, MongoDB/Mongoose (with a dev/test-only persistent local JSON fallback; production enforces `MONGODB_URI`), Leaflet, and Google Gemini AI (`@google/genai`).

```
+-------------------------------------------------------------------+
|                   Browser / PWA (React + Vite)                    |
|  - Public Portal, Auth, Student/Volunteer/Admin/SuperAdmin UI     |
|  - Indoor Multi-Floor SVG Maps, Live Status, Class Schedule       |
|  - Emergency Evacuation Planner + Voice/High-Contrast/i18n        |
|  - Zustand State + idempotent Offline Drafts + graphVersion Cache |
|  - VitePWA Service Worker (NetworkOnly for Auth/Private Routes)   |
+---------------------------------+---------------------------------+
                                  | HTTPS / JSON / Cookie + Bearer + CSRF
                                  v
+-------------------------------------------------------------------+
|                   Express API Server (server.ts)                  |
|  - X-Request-Id Tracing, Helmet, CORS, Per-Route Rate Limiting    |
|  - JWT + Server Session Revocation + Double-Submit CSRF + Origin  |
|  - Campus Isolation + Strict Allowlisted Zod PATCH Schemas        |
|  - Re-encoded EXIF-Stripped Evidence Storage (/api/v1/reports/..) |
+----------+----------------------+------------------------+--------+
           |                      |                        |
           v                      v                        v
+------------------+   +--------------------+   +-------------------+
| Routing & Trust  |   | Gemini & Analytics |   | Repository Layer  |
| - MinHeap + A*   |   | - @google/genai    |   | - Mongoose (27    |
| - Top-3 Diverse  |   | - Pred Maint 2.0   |   |   collections)    |
| - 7-State Trust  |   | - GeoJSON GIS      |   | - Backup/Restore  |
| - Live Outages   |   | - Observability    |   | - Dev-only JSON   |
+------------------+   +--------------------+   +-------------------+
```

## 2. Directory Structure

- `shared/types.ts` — Shared TypeScript DTOs, roles, trust states, floor plans, live facilities, schedule classes, incidents, and GIS/observability contracts.
- `frontend/src/` — React application:
  - `pages/public/` — Landing page, About, How It Works, Features, Accessibility Statement, Explore Demo, Help Center, Contact, Privacy, Terms, Public Data Portal.
  - `pages/auth/` — Sign In (with explicit demo role autofill buttons), Sign Up, Forgot/Reset Password, Verify Email, Access Denied.
  - `pages/student/` — Dashboard, Campus Explorer & Place Details, Interactive Leaflet Map, Smart Route Planner (Dijkstra/A*, Top-3 alternatives, Trust explanations), `CampusHubPages.tsx` (Indoor Navigation, Live Campus Status, Smart Class Schedule Planner, Emergency Evacuation Planner), Profile & Campus Transfer workflow, Report Submission & Tracking, Saved/History, Notifications, Settings, Advanced Hardware Hub.
  - `pages/volunteer/` — Verification Queue, Field Confirmation, Map Update Recommendations.
  - `pages/admin/` — Admin Operations Dashboard, Trust & Freshness Verification Queue, Campus Transfer Approvals, GIS GeoJSON Tools, Observability Readiness Grid, Campus Map Graph Editor, Maintenance Scheduling, Analytics & Predictive Maintenance 2.0, Audit Logs, Super Admin Multi-Campus Governance & DB Integrity/Backup.
  - `store/useAppStore.ts` — Persisted client preferences, authentication token, `graphVersion`-tagged cached map, idempotent `clientRequestId` offline drafts.
- `backend/src/` — Express REST API & Domain Services:
  - `config/env.ts` — Validated runtime configuration including production JWT secret and DB enforcement.
  - `models/mongooseModels.ts` — 27 Mongoose schemas with indexes.
  - `repositories/db.ts` — Repository supporting Mongoose (required in production) and dev/test JSON fallback, plus backup export, restore, and integrity verification.
  - `services/trust/trustEngine.ts` — 7-state Accessibility Intelligence & Trust Engine (`VERIFIED_CURRENT` .. `UNKNOWN`).
  - `services/routing/dijkstra.ts` — Binary `MinHeap` + optional A* Haversine routing, Top-K alternatives, live outage filtering, diversity & confidence scoring.
  - `services/maintenance/predictiveEngine.ts` — Equipment MTTR, SLA compliance, recurring failure, and building risk index engine.
  - `services/gis/geojsonService.ts` — GeoJSON FeatureCollection export, topology/coordinate validation, safe import, and version history.
  - `services/security/imageSanitizer.ts` — Magic-byte validation + `pngjs`/`jpeg-js` decode/re-encode pipeline stripping EXIF/GPS metadata.
  - `services/ai/geminiService.ts` — Server-side Gemini wrapper restricted to authorized campus scope with retry, timeout, and deterministic fallback.
  - `services/integrations/adapters.ts` — External integration descriptors & Nodemailer/SMTP honest readiness checks.
  - `middleware/auth.ts` — JWT parsing + `userSessions` revocation checks, double-submit CSRF (`accesspath_csrf` / `X-CSRF-Token`), Origin validation, `requireRole`, `requireCampusAccess`.
  - `schemas/validators.ts` — Strict `.strict()` Zod validation schemas for all mutations and administrative PATCH routes.
  - `utils/observability.ts` — `X-Request-Id` correlation middleware, error/failed-job buffers, and 7-service readiness checks.
  - `routes/` — Domain routers mounted under `/api/v1/*` (`auth`, `campuses`, `routes`, `reports`, `verifications`, `ai`, `analytics`, `admin`, `operations`).
  - `jobs/seed.ts` — Synthetic demo campus seeder strictly disabled when `NODE_ENV=production` or `ALLOW_DEMO_SEED=false`.

## 3. Security & Trust Boundaries

1. **Secrets & Production Fail-Safe**: `NODE_ENV=production` enforces strong `JWT_SECRET`, requires `MONGODB_URI` (no silent local JSON fallback), and blocks automatic demo seeding.
2. **Tenant Isolation & Campus Transfer**: Users cannot mutate `campusId` directly via profile updates; institutional campus transfers require an explicit `CampusTransferRequest` reviewed by administrators. Evidence files, AI duplicate checks, and analytics strictly enforce campus authorization.
3. **Authoritative Map & Trust Integrity**: Volunteers and AI suggestions never mutate `PathEdge` records directly or certify accessibility. Routes transparently state edge verification ages, conflicts, and unverified fallbacks.
4. **Honest External Capabilities**: Unconfigured SMTP returns errors rather than simulating emails; simulated indoor beacons, live demo BMS feeds, and emergency plan exports carry explicit safety disclosures.
