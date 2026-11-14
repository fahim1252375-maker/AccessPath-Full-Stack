# AccessPath API Reference (`/api/v1`)

All endpoints return consistent JSON envelopes:
```json
{ "success": true, "data": ... }
```
or on error:
```json
{ "success": false, "error": "Human-readable error message", "details": ... }
```

Authentication uses an `Authorization: Bearer <jwt>` header and/or an `HttpOnly` cookie (`accesspath_token`) backed by server-side `userSessions` revocation checks. Cookie-authenticated state-changing requests enforce double-submit CSRF (`accesspath_csrf` cookie matching `X-CSRF-Token` header) plus strict `Origin` header validation.

---

## Health

- `GET /api/v1/health` — Returns service status and timestamp (public).

## Authentication, Sessions & Campus Transfers (`/api/v1/auth`)

- `POST /api/v1/auth/register` — Register a new user (`student` or `volunteer` self-signup); issues verification token and session.
- `POST /api/v1/auth/login` — Authenticate with email + password; creates tracked `userSession`, sets `accesspath_token` & `accesspath_csrf` cookies.
- `POST /api/v1/auth/logout` *(Auth)* — Revokes active server-side session (`userSessions`) and clears cookies.
- `GET /api/v1/auth/me` *(Auth)* — Returns authenticated user and `AccessibilityPreferences`.
- `PATCH /api/v1/auth/me/preferences` *(Auth)* — Updates language (`en` | `bn`), analytics/location consent, and display name. (`campusId` self-mutation is rejected.)
- `POST /api/v1/auth/transfer-requests` *(Auth)* — Submit an institutionally reviewed request to transfer to another campus.
- `GET /api/v1/auth/transfer-requests` *(Auth / Admin)* — List own transfer requests or campus transfer queue for admins.
- `PATCH /api/v1/auth/transfer-requests/:requestId` *(Campus Admin / Super Admin)* — Approve or reject a campus transfer request (updates user campus & logs audit event).
- `PUT /api/v1/auth/me/accessibility-profile` *(Auth)* — Updates `AccessibilityPreferences`.
- `POST /api/v1/auth/forgot-password` — Generates SHA-256 hashed single-use expiring reset token; dispatches via SMTP when configured or honestly reports unconfigured email provider.
- `POST /api/v1/auth/reset-password` — Validates single-use hashed token & expiry, updates password, and revokes all prior user sessions.
- `POST /api/v1/auth/verify-email` — Consumes SHA-256 verification token and marks email verified.

## Campuses, Trust Engine, Indoor Floors & GIS (`/api/v1/campuses`)

- `GET /api/v1/campuses` — Lists campuses.
- `GET /api/v1/campuses/:id` — Campus details.
- `POST /api/v1/campuses` *(Super Admin)* — Create a new campus.
- `PATCH /api/v1/campuses/:id` *(Campus Admin / Super Admin + Campus Access)* — Update campus metadata.
- `GET /api/v1/campuses/:id/map` *(Optional Auth)* — Full campus graph (`campus` with `graphVersion`, `buildings`, `locations`, `edges`, `announcements`, `emergencyRoutes`).
- `GET /api/v1/campuses/:id/trust` *(Optional Auth)* — Accessibility Intelligence & Trust Engine evaluation across all campus segments (`VERIFIED_CURRENT`..`UNKNOWN`), stale warnings, conflicting reports, and building verification coverage.
- `GET /api/v1/campuses/:id/floors` — Multi-floor building SVG schematics, rooms, corridors, QR waypoints, and clearly labelled demo BLE markers.
- `GET /api/v1/campuses/:id/qr/:code` — Look up a registered indoor/campus QR waypoint node (404 on unregistered tags).
- `GET /api/v1/campuses/:id/gis/export` — Export campus nodes and path edges as a GeoJSON `FeatureCollection`.
- `GET /api/v1/campuses/:id/gis/validate` — Validate topological connectivity, orphan nodes, and WGS84 coordinate bounds.
- `GET /api/v1/campuses/:id/gis/versions` — List versioned `graphVersions` snapshots.
- `POST /api/v1/campuses/:id/gis/import` *(Campus Admin / Super Admin)* — Validate and import GeoJSON `FeatureCollection`, recording a new `graphVersions` snapshot.
- `GET /api/v1/campuses/:id/locations` / `POST` / `PATCH /:locationId` — Manage `LocationNode` records.
- `GET /api/v1/campuses/:id/edges` / `POST` / `PATCH /:edgeId` — Manage `PathEdge` segments with strict allowlisted `.strict()` Zod schema.
- `POST /api/v1/campuses/:id/buildings` / `PATCH /:buildingId` — Add or update buildings.
- `GET /api/v1/campuses/:id/emergency-routes` & `PATCH /:routeId/approve` — Evacuation routes and safety admin approval history.
- `GET /api/v1/campuses/:id/public-portal` — Public accessibility transparency summary.

## Accessible Route Planning (`/api/v1/routes`)

- `POST /api/v1/routes/calculate` *(Optional Auth)* — Constraint-filtered Dijkstra or A* routing supporting `topK` (up to 3 distinct routes), live facility outage exclusion, freshness weighting, confidence & diversity scores, and explicit `trustSummary`.
- `POST /api/v1/routes/directions` *(Optional Auth)* — **#216** Same inputs as `/calculate` plus `language` (`en` | `bn`). Returns the calculated routes and, for each, localized turn-by-turn `directions` (relative turns from lat/lng bearings, elevator/ramp steps, slope/width/surface/lighting/verification callouts and a speakable `script`).
- `POST /api/v1/routes/resilience` *(Optional Auth)* — **#217** Re-runs the strict verified router once per segment of the primary route with that segment closed on a detached graph copy. Returns a 0–100 `score`, a `HIGH`/`MEDIUM`/`LOW` `level`, per-segment detour or `critical` (no alternative) flags and localized recommendations. Never mutates stored data.
- `POST /api/v1/routes/share` *(Optional Auth)* — **#218** Mints an HMAC-signed, expiring token (`ttlHours` 1–168, default 48) that encodes only origin, destination, algorithm and boolean constraints. Returns `{ token, path, createdAt, expiresAt }`.
- `GET /api/v1/routes/shared/:token` *(Public)* — **#218** Verifies the token (`404` invalid, `410` expired), recalculates the route from live campus data and returns it with `directions` in both languages. Sent with `Cache-Control: no-store`.
- `GET /api/v1/routes/history` / `GET /favorites` / `POST /favorites` *(requires `campusId` access; the location must exist in that campus)* / `DELETE /favorites/:locationNodeId` / `PATCH /:id/save` / `GET /:id` / `POST /:id/feedback` *(Auth)*.

## Barrier Reports (`/api/v1/reports`)

- `GET /api/v1/reports` *(Optional Auth, paginated)* — Campus-scoped report list with `reporterId: 'anonymous'` masking for non-staff callers.
- `GET /api/v1/reports/:id` *(Optional Auth)* — Single report details with cross-campus private isolation.
- `POST /api/v1/reports` *(Auth)* — Submit barrier report supporting idempotent `clientRequestId` offline draft deduplication.
- `POST /api/v1/reports/:id/evidence` *(Auth)* — Multipart image upload validated by magic bytes, decoded & re-encoded via `pngjs`/`jpeg-js` (stripping EXIF/GPS metadata), enforcing authorization & per-user quotas before persistence.
- `GET /api/v1/reports/:id/evidence/:filename` *(Auth + Campus Access)* — Authenticated, campus-scoped evidence download.
- `PATCH /api/v1/reports/:id/status` *(Moderator / Campus Admin / Super Admin)* — Status transitions with allowlisted schema.
- `POST /api/v1/reports/:id/comments` / `upvote` / `dispute` / `resolution-feedback` *(Auth + Campus Access)*.

## Live Accessibility Operations & Class Schedule (`/api/v1/operations`)

- `GET /api/v1/operations/live-status` *(Optional Auth)* — Live or institutionally simulated status for campus elevators, accessible restrooms, auto doors, ramps, and construction zones (`providerStatus`, `lastSyncAt`, user subscriptions).
- `POST /api/v1/operations/live-status/subscribe` *(Auth)* — Toggle alert subscription for a facility.
- `PATCH /api/v1/operations/live-status/:facilityId` *(Moderator / Campus Admin / Super Admin)* — Publish validated facility status change, automatically notify subscribed users, and record audit event.
- `GET /api/v1/operations/schedule` / `POST /schedule` / `DELETE /schedule/:id` *(Auth)* — Personal class timetable management.
- `GET /api/v1/operations/schedule/day-plan?day=Mon` *(Auth)* — Build verified class-to-class accessible routing plan with recommended departure times, buffer times, and tight/unverified warnings.

## Volunteer Verification (`/api/v1/verifications`), AI (`/api/v1/ai`), Analytics (`/api/v1/analytics`) & Admin (`/api/v1/admin`)

- `GET /api/v1/verifications/queue`, `/history`, `POST /api/v1/verifications` — On-site confirmations (`appliedToGraph: false`).
- `GET /api/v1/ai/status`, `POST /classify-report`, `/translate`, `/detect-duplicates`, `/summarize`, `/analyze-image`, `/assistant`, `GET /logs` — Per-endpoint rate-limited Gemini endpoints restricted to authorized campus scope.
- `GET /api/v1/analytics/overview` & `GET /api/v1/analytics/export` — Building accessibility scores, Predictive Maintenance 2.0 (MTTR, SLA compliance, recurring equipment failures, risk scores), and sanitized CSV downloads.
- `GET /api/v1/admin/dashboard`, `GET/PATCH /users`, `GET/POST/PATCH /maintenance`, `GET /notifications`, `PATCH /notifications/:id/read`, `GET/POST /announcements`, `POST /notifications/email`, `GET /integrations`, `POST /integrations/:key/test`, `GET /audit-logs`, `GET/POST /institutions`.
- `GET /api/v1/admin/system/observability` *(Campus Admin / Super Admin)* — 7-service health readiness check, recent error buffer, and failed job queue.
- `GET /api/v1/admin/system/integrity` / `GET /system/backup` / `POST /system/restore` *(Super Admin)* — Database schema integrity audit, full JSON backup export, and validated restore.


## Accessibility Digital Twin (Phase 4)

### `POST /api/v1/admin/accessibility-twin/simulate`

- **Authentication:** Bearer/session authentication required.
- **Roles:** `campus_admin` and `super_admin` only. Campus admins are restricted to their own campus by `requireCampusAccess`.
- **Request:** `{ campusId, edgeId, action, routePairs, preferences? }`, where `action` is `fixed`, `closed`, or `ramp_added`; `routePairs` contains 1–25 `{ fromNodeId, toNodeId }` entries from the same campus. The optional preferences object accepts the current `AccessibilityPreferences` flags. Unknown request fields are rejected by strict Zod validation.
- **Behavior:** Runs the existing strict verified-route engine before/after a hypothetical change on a detached edge array. `fixed` clears simulated closure flags but does not modify verification; `ramp_added` keeps `rampVerified=false`; `closed` blocks only the simulated edge. Live outages and report evidence are kept in the comparison context.
- **Response:** `simulationOnly: true`, `verificationPreserved: true`, route-pair before/after details, unlocked/lost/unchanged route lists, affected buildings, change snapshots, notes and timestamp.
- **Persistence:** No graph edge, location, campus graph version or live status is mutated. A limited audit log entry records who ran the simulation and which edge/action was evaluated.
- **Limits:** One edge and up to 25 route pairs per request; no multi-edge batch, GIS heatmap, construction approval or legal compliance determination.
