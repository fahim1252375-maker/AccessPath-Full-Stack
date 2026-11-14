# AccessPath Feature Registry (218 Features — Modules A to W)

**Truthfulness & Status Legend** (strictly aligned with automated verification & runtime behavior):
- **Implemented and tested**: Real frontend UI + backend logic/API/schema implemented and verified by automated `vitest`/`supertest` tests and/or TypeScript + Vite compilation.
- **Implemented, awaiting integration credentials**: Adapter and admin configuration readiness endpoint implemented; live external execution requires credentials (`GEMINI_API_KEY`, `SMTP_*`, `MONGODB_URI`, OAuth/SSO, etc.).
- **Demo/simulated**: Interactive UI & deterministic fallback backed by synthetic demo campus data (`DEMO CAMPUS — SYNTHETIC DATA`) clearly labelled as simulated/demo.
- **Pending external hardware**: Real browser hardware/API capability check implemented (`Web Bluetooth`, `WebXR`, `MediaDevices` camera); physical beacons, elevators, or signage hardware required in deployment.
- **Not implemented**: Out of current scope.

---

## Module A — Public Portal, Brand & Onboarding (#1–#14)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 1 | Public Mission Landing Page & Interactive 3D Hero | A | Implemented and tested | N/A | Three.js + React Three Fiber | Typechecked & built | Interactive 3D synthetic campus hero with automatic 2D Leaflet fallback |
| 2 | Demo Banner & Synthetic Data Notice | A | Implemented and tested | Implemented and tested | None | Verified in seed + API | Always labels demo records `isDemoData: true` |
| 3 | Interactive 3D & 2D Demo Campus Explorer Preview | A | Implemented and tested | Implemented and tested | Three.js + Leaflet / OSM | Tested (`app.test.ts`) | Automatically falls back to 2D/Low-Bandwidth when WebGL/tiles blocked |
| 4 | About AccessPath & Impact Methodology Page | A | Implemented and tested | N/A | None | Typechecked & built | Avoids unverified impact claims |
| 5 | How It Works (4-Step Workflow) Page | A | Implemented and tested | N/A | None | Typechecked & built | — |
| 6 | Features Directory (218 Interactive Feature Cards & Details) | A | Implemented and tested | N/A | None | Tested (`app.test.ts`) | Searchable Modules A–W & dedicated 20-field `/features/:featureId` view |
| 7 | Accessibility Statement (WCAG 2.2 AA Targets) | A | Implemented and tested | N/A | None | Typechecked & built | Targets AA; no formal certification claim |
| 8 | Help Center & Campus Navigation FAQ | A | Implemented and tested | N/A | None | Typechecked & built | — |
| 9 | Contact & Institutional Onboarding Info Page | A | Implemented and tested | N/A | Optional SMTP | Typechecked & built | Static inquiry guidance when SMTP unconfigured |
| 10 | Privacy Policy & Data Governance Page | A | Implemented and tested | N/A | None | Typechecked & built | — |
| 11 | Terms of Service Page | A | Implemented and tested | N/A | None | Typechecked & built | — |
| 12 | Public Campus Accessibility Transparency Portal | A | Implemented and tested | Implemented and tested | None | API endpoint verified | Aggregates demo campus unless live data added |
| 13 | PWA Manifest & Offline Install Prompt | A | Implemented and tested | N/A | Browser PWA API | VitePWA build verified | iOS Safari requires manual "Add to Home Screen" |
| 14 | Skip-to-Content & Global Live ARIA Announcer | A | Implemented and tested | N/A | None | Typechecked & built | — |

## Module B — Authentication, Sessions & Account Governance (#15–#28)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 15 | Student & Volunteer Account Registration | B | Implemented and tested | Implemented and tested | None | Tested (`authRoutes`) | Self-signup restricted to `student` / `volunteer` |
| 16 | Email + Password Sign-In (bcryptjs + JWT) | B | Implemented and tested | Implemented and tested | None | Tested in `api-security.test.ts` | — |
| 17 | HttpOnly Cookie + Bearer Hybrid Auth | B | Implemented and tested | Implemented and tested | None | Tested in `api-security.test.ts` | — |
| 18 | CSRF Custom Header Check (`X-Requested-With`) | B | Implemented and tested | Implemented and tested | None | Typechecked & built | Enforced on cookie-authenticated mutations |
| 19 | Role-Based Demo Account Quick-Fill | B | Implemented and tested | Implemented and tested | None | Tested in `api-security.test.ts` | Explicit demo password in demo banner only |
| 20 | Sign Out & Cookie Revocation | B | Implemented and tested | Implemented and tested | None | Typechecked & built | Stateless JWT expires per TTL |
| 21 | Forgot Password Token Request | B | Implemented and tested | Implemented and tested | Optional SMTP | Endpoint implemented | Returns demo notice when `EMAIL_PROVIDER=none` |
| 22 | Password Reset Confirmation | B | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 23 | Email Verification Flow | B | Implemented and tested | Implemented and tested | Optional SMTP | Endpoint implemented | Seeded demo accounts pre-verified |
| 24 | 5-Role RBAC (`student`..`super_admin`) | B | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | — |
| 25 | Cross-Campus Tenant Isolation Middleware | B | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | `super_admin` has cross-campus oversight |
| 26 | Auth Rate Limiting (`express-rate-limit`) | B | N/A | Implemented and tested | None | Disabled only in `NODE_ENV=test` | — |
| 27 | Analytics & Location Privacy Consent Toggles | B | Implemented and tested | Implemented and tested | None | Typechecked & built | Opt-in geolocation defaults to `false` |
| 28 | Access Denied (403) & Session Guard Pages | B | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | — |

## Module C — Accessibility Profile & Inclusive UI Controls (#29–#42)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 29 | Wheelchair Mode Constraint Preset | C | Implemented and tested | Implemented and tested | None | Tested in `routing.test.ts` | Excludes stairs, `<1.2m` width, rough surfaces |
| 30 | Step-Free Navigation Constraint | C | Implemented and tested | Implemented and tested | None | Tested in `routing.test.ts` | — |
| 31 | Limited Mobility Constraint | C | Implemented and tested | Implemented and tested | None | Tested in `dijkstra.ts` | — |
| 32 | Ramp Required Constraint | C | Implemented and tested | Implemented and tested | None | Tested in `dijkstra.ts` | Requires `rampVerified === true` on slopes >5% |
| 33 | Operational Elevator Required Constraint | C | Implemented and tested | Implemented and tested | None | Tested in `dijkstra.ts` | Excludes non-operational elevators |
| 34 | Stairs Avoidance Constraint | C | Implemented and tested | Implemented and tested | None | Tested in `routing.test.ts` | — |
| 35 | Smooth Surface & Wide Path Preferences | C | Implemented and tested | Implemented and tested | None | Tested in `dijkstra.ts` | — |
| 36 | Low-Gradient (`<=5%`) & Well-Lit Preferences | C | Implemented and tested | Implemented and tested | None | Tested in `dijkstra.ts` | — |
| 37 | Visual Assistance & Voice Read-Aloud Mode | C | Implemented and tested | Implemented and tested | Web Speech API | Typechecked & built | Depends on browser TTS voice availability |
| 38 | Dual Dark/Light & High-Contrast Theme Switcher | C | Implemented and tested | N/A | None | Tested (`app.test.ts`) | WCAG AA+ dark (`#071827`) & light (`#F4F8FB`) plus high-contrast mode |
| 39 | Typography Scaling (`normal` / `large` / `xl`) | C | Implemented and tested | N/A | None | Typechecked & built | — |
| 40 | Reduced Motion Toggle & OS Media Honor | C | Implemented and tested | N/A | None | Typechecked & built | Pauses Framer Motion & Three.js `frameloop` cleanly |
| 41 | Bilingual EN / বাংলা UI Switcher | C | Implemented and tested | Implemented and tested | None | Tested in `app.test.ts` | Core UI & dictionaries covered |
| 42 | Low-Bandwidth / Text-Only Map Mode | C | Implemented and tested | N/A | None | Typechecked & built | Replaces map tiles and 3D WebGL with structured tables |

## Module D — Campus Map, Buildings & Explorer (#43–#56)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 43 | Interactive 3D Campus Explorer & 2D Leaflet Map | D | Implemented and tested | Implemented and tested | Three.js + OSM / Leaflet | Typechecked & built | Automatic 2D Leaflet fallback when WebGL unsupported |
| 44 | Color & Pattern-Coded Path Segments | D | Implemented and tested | Implemented and tested | None | Typechecked & built | Distinguishes open, caution, blocked, unverified |
| 45 | Campus Building Directory & Search | D | Implemented and tested | Implemented and tested | None | Typechecked & built | — |
| 46 | Building Detail Page (Restrooms, Elevators, Ramps) | D | Implemented and tested | Implemented and tested | None | Typechecked & built | — |
| 47 | Accessible Location Node Filtering | D | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 48 | Bilingual Node Names (EN + বাংলা) | D | Implemented and tested | Implemented and tested | None | Seed & search verified | — |
| 49 | Save / Remove Favorite Campus Places | D | Implemented and tested | Implemented and tested | None | Endpoints implemented | Requires authenticated session |
| 50 | Active Campus Announcements Banner | D | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 51 | Blocked Path & Closure Alert Markers | D | Implemented and tested | Implemented and tested | None | Tested (`edge_13` blocked) | — |
| 52 | Offline Cached Map Graph Snapshot | D | Implemented and tested | N/A | Zustand / localStorage | Typechecked & built | Caches last loaded campus map |
| 53 | Accessibility Score Per Building | D | Implemented and tested | Implemented and tested | None | Computed in analytics | Deterministic formula over verified attributes |
| 54 | Printable Route & Map Print Stylesheet | D | Implemented and tested | N/A | Browser Print API | CSS rules verified | — |
| 55 | Campus Switcher / Multi-Campus Discovery | D | Implemented and tested | Implemented and tested | None | Endpoint implemented | Demo ships with 1 synthetic campus by default |
| 56 | Opt-In Geolocation Centering | D | Implemented and tested | N/A | Browser Geolocation API | Typechecked & built | Only activates on explicit user click |

## Module E — Weighted-Graph Accessible Routing Engine (#57–#72)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 57 | Hard Constraint Filtering Before Optimization | E | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | — |
| 58 | Weighted-Graph Dijkstra Shortest Path | E | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | — |
| 59 | Never-Invent-Safe-Path Policy (`NO_VERIFIED_ACCESSIBLE_ROUTE`) | E | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | — |
| 60 | Primary + Distinct Alternative Verified Route | E | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | — |
| 61 | Human-Readable Blocking Factor Explanations | E | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | — |
| 62 | Dynamic Rerouting on Temporary Closures | E | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | — |
| 63 | Unverified Segment Exclusion (`edge_22`, `edge_26`) | E | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | Optional explicit unverified fallback flag |
| 64 | Slope, Surface, Lighting & Width Cost Weights | E | Implemented and tested | Implemented and tested | None | Implemented in `dijkstra.ts` | — |
| 65 | Turn-by-Turn Step Instructions & Badges | E | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | — |
| 66 | Estimated Distance & Travel Time (`isEstimate: true`) | E | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | Assumes nominal walking/wheelchair speed |
| 67 | Constraint Applied Transparency Chips | E | Implemented and tested | Implemented and tested | None | Tested (`app.test.ts`) | — |
| 68 | Voice Read-Aloud Step Guidance | E | Implemented and tested | N/A | Web Speech Synthesis | Typechecked & built | Requires browser TTS support |
| 69 | Save Route to Account | E | Implemented and tested | Implemented and tested | None | Endpoint implemented | Requires login |
| 70 | Route Calculation History Tracking | E | Implemented and tested | Implemented and tested | None | Endpoint implemented | Logged when authenticated |
| 71 | Post-Route Accessibility Rating & Feedback | E | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 72 | Direct "Navigate Here" Links from Explorer/QR | E | Implemented and tested | Implemented and tested | None | Typechecked & built | — |

## Module F — Barrier Reporting, Evidence & Community Feedback (#73–#88)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 73 | Structured Barrier Report Submission Form | F | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | — |
| 74 | Bilingual Report Input (English & বাংলা) | F | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | — |
| 75 | 11 Barrier Categories & 4 Priority Tiers | F | Implemented and tested | Implemented and tested | None | Zod schema validated | — |
| 76 | Evidence Image Upload (`multer`, PNG/JPEG/WEBP <= 5MB) | F | Implemented and tested | Implemented and tested | Local `/uploads` disk | Rejection tested in `api-security.test.ts` | Needs persistent volume/S3 in multi-node cloud |
| 77 | Server-Side Filename Sanitization & MIME Filtering | F | N/A | Implemented and tested | None | Tested (`api-security.test.ts`) | — |
| 78 | Offline Barrier Report Draft Queue & Sync | F | Implemented and tested | N/A | localStorage | Typechecked & built | Syncs when user clicks/returns online |
| 79 | Reporter Privacy Masking (`reporterId: 'anonymous'`) | F | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | Staff roles still see audit trace |
| 80 | Report Lifecycle Status Workflow (11 States) | F | Implemented and tested | Implemented and tested | None | Implemented in routes & UI | — |
| 81 | Report Timeline Audit Trail | F | Implemented and tested | Implemented and tested | None | Recorded on transitions | — |
| 82 | Community Report Upvoting (Idempotent Toggle) | F | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 83 | Report Discussion Comments | F | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 84 | Report Dispute Flagging | F | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 85 | Post-Resolution Verification Feedback | F | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 86 | Duplicate Report Linking | F | Implemented and tested | Implemented and tested | None | Supported in status PATCH | — |
| 87 | Voice-to-Text Barrier Description Draft | F | Implemented and tested | N/A | Browser SpeechRecognition | Typechecked & built | Chrome/Edge supported; text fallback always shown |
| 88 | Filterable My Reports & Community Reports Views | F | Implemented and tested | Implemented and tested | None | Typechecked & built | — |

## Module G — Gemini AI Assistance & Guardrails (#89–#102)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 89 | Server-Side `@google/genai` SDK Integration (`gemini-4-hydrogen`) | G | N/A | Implemented, awaiting integration credentials | `GEMINI_API_KEY` | Fallback tested; live needs key | Runs deterministic `mock` when key missing |
| 90 | Structured JSON Schema Report Classification & Missing Info | G | Implemented and tested | Implemented and tested | Optional `GEMINI_API_KEY` | Tested (`api-security.test.ts`) | Always sets `requiresHumanVerification: true` & surfaces missing details |
| 91 | Automatic EN / বাংলা / Mixed Language Detection | G | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | — |
| 92 | Bilingual AI Translation Endpoint & UI | G | Implemented and tested | Implemented and tested | Optional `GEMINI_API_KEY` | Endpoint implemented | Offline mock tags demo translation prefix |
| 93 | AI Duplicate Barrier Detection | G | Implemented and tested | Implemented and tested | None | Endpoint implemented | Uses lexical overlap scoring |
| 94 | AI Barrier Photo Analysis (`inlineData`) | G | Implemented and tested | Implemented, awaiting integration credentials | Optional `GEMINI_API_KEY` | Endpoint implemented | Returns human-review queue prompt in mock mode |
| 95 | AccessPath AI Companion & NL Dijkstra Routing | G | Implemented and tested | Implemented and tested | Optional `GEMINI_API_KEY` | Tested (`api-security.test.ts`) | Grounded strictly on live campus DB context & Dijkstra routing |
| 96 | Grounded "No Hallucination / No Emergency Dispatch" Guardrails | G | Implemented and tested | Implemented and tested | None | Enforced in prompt & mock | — |
| 97 | Executive Analytics Summary & AI Analytics Q&A | G | Implemented and tested | Implemented and tested | Optional `GEMINI_API_KEY` | Tested (`api-security.test.ts`) | Role-restricted to moderator/admin across campus scope |
| 98 | AI Timeout & Retry Resilience Wrapper | G | N/A | Implemented and tested | None | Implemented in `geminiService.ts` | Falls back cleanly to deterministic mock |
| 99 | `AIInteraction` Observability & Latency Logging | G | Implemented and tested | Implemented and tested | None | Schema & `/ai/logs` route built | Logs metadata without PII payloads |
| 100 | AI Provider Status Endpoint (`gemini` vs `mock`) | G | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 101 | Never-Mutate-Map-Without-Human-Review Policy | G | Implemented and tested | Implemented and tested | None | Enforced in design & tests | — |
| 102 | Suggested Location & Route Deep-Link from Assistant | G | Implemented and tested | Implemented and tested | None | Implemented in drawer UI | — |

## Module H — Volunteer Verification & Moderation (#103–#114)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 103 | Volunteer Verification Queue (`/app/volunteer`) | H | Implemented and tested | Implemented and tested | None | Endpoint & UI implemented | — |
| 104 | On-Site Field Confirmation Decisions (5 Outcomes) | H | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | — |
| 105 | Separation of Volunteer Check vs Authoritative Graph Mutation | H | Implemented and tested | Implemented and tested | None | Tested (`appliedToGraph: false`) | Only moderator/admin alters map edges |
| 106 | Verification History Audit View | H | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 107 | Moderator Report Triage Dashboard | H | Implemented and tested | Implemented and tested | None | Endpoint & UI implemented | — |
| 108 | One-Click Report Status Transition & Edge Blocking | H | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 109 | Duplicate Report Resolution & Merging | H | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 110 | Disputed Report Review Workflow | H | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 111 | In-App Notification on Report Verification/Resolution | H | Implemented and tested | Implemented and tested | None | Implemented in routes | — |
| 112 | Verification Evidence Notes & Timestamps | H | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 113 | Map Update Recommendation Queue | H | Implemented and tested | Implemented and tested | None | Tested (`verificationRoutes`) | — |
| 114 | Automated Audit Log Entry on Moderation Decisions | H | Implemented and tested | Implemented and tested | None | Implemented in `audit.ts` | — |

## Module I — Campus Admin Graph Editor, Maintenance & Governance (#115–#130)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 115 | Campus Operations Dashboard (`/app/admin`) | I | Implemented and tested | Implemented and tested | None | Endpoint & UI implemented | — |
| 116 | Interactive Path Edge Verification & Closure Toggle | I | Implemented and tested | Implemented and tested | None | Endpoint & UI implemented | — |
| 117 | Add New Campus Location Node | I | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 118 | Edit Location Accessibility Flags (Elevator/Ramp/Restroom) | I | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 119 | Add / Edit Campus Path Edge Segment | I | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 120 | Add / Update Campus Building Metadata | I | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 121 | Maintenance Work Order Creation | I | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 122 | Maintenance Status Progression & Auto-Unblock Option | I | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 123 | Campus Announcements Publisher | I | Implemented and tested | Implemented and tested | None | Endpoint implemented | Broadcasts in-app notifications |
| 124 | Campus User Role Management (`student`..`campus_admin`) | I | Implemented and tested | Implemented and tested | None | RBAC tested | — |
| 125 | User Account Activation / Suspension Toggle | I | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 126 | Audit Logs Explorer (`/app/admin/audit-logs`) | I | Implemented and tested | Implemented and tested | None | Endpoint & UI implemented | — |
| 127 | Emergency Evacuation Route Approval Toggle | I | Implemented and tested | Implemented and tested | None | Endpoint & UI implemented | Only safety admin can mark approved |
| 128 | Super Admin Multi-Institution Governance (`/app/super-admin`) | I | Implemented and tested | Implemented and tested | None | RBAC tested (`403` for admin) | — |
| 129 | Institution Onboarding Endpoint | I | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 130 | Student Accessibility Dashboard KPI Overview | I | Implemented and tested | Implemented and tested | None | Typechecked & built | — |

## Module J — Analytics, Predictive Insights & Exports (#131–#140)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 131 | Accessibility Analytics Overview Dashboard | J | Implemented and tested | Implemented and tested | None | Endpoint & UI implemented | — |
| 132 | Category & Status Breakdown Charts (`recharts`) | J | Implemented and tested | Implemented and tested | None | Typechecked & built | — |
| 133 | Per-Building Accessibility Readiness Score | J | Implemented and tested | Implemented and tested | None | Computed in `analyticsRoutes` | Formula-based index, not legal certification |
| 134 | Barrier Hotspot Heatmap Coordinate Summary | J | Implemented and tested | Implemented and tested | None | Computed in `analyticsRoutes` | — |
| 135 | Filter Analytics by Category & Building | J | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 136 | Statistical Predictive Maintenance Insights | J | Implemented and tested | Implemented and tested | None | Computed in `analyticsRoutes` | Gated on `>=5` reports; explicitly marked statistical estimate |
| 137 | Sanitized CSV Report Export (`GET /api/v1/analytics/export`) | J | Implemented and tested | Implemented and tested | None | Endpoint & download verified | Escapes CSV formulas/quotes; flags `DemoSeedData` |
| 138 | Print-Friendly Accessibility Report View | J | Implemented and tested | N/A | Browser Print API | Typechecked & built | — |
| 139 | Public Transparency Summary Endpoint | J | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 140 | AI-Assisted Executive Trends Summary | J | Implemented and tested | Implemented and tested | Optional `GEMINI_API_KEY` | Endpoint implemented | Deterministic summary when key absent |

## Module K — Integrations, Notifications & Advanced Hardware Hub (#141–#154)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 141 | In-App Notifications Feed & Unread Badge | K | Implemented and tested | Implemented and tested | None | Endpoint & UI implemented | — |
| 142 | Mark Notification Read | K | Implemented and tested | Implemented and tested | None | Endpoint implemented | — |
| 143 | SMTP Email Delivery Adapter & Readiness Test | K | Implemented and tested | Implemented, awaiting integration credentials | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Honest refusal tested in adapter | Refuses fake sends when `EMAIL_PROVIDER=none` |
| 144 | Integrations Registry (`12` Adapters) & Test Endpoint | K | Implemented and tested | Implemented, awaiting integration credentials | Various external keys | Endpoint implemented | Reports real configuration state |
| 145 | QR Code Waypoint Lookup (`/app/advanced`) | K | Demo/simulated | Implemented and tested | Printed QR tags | Typechecked & built | Seeded demo QR tags (`AP-QR-LIBW`, etc.) |
| 146 | Camera Permission Check for QR Scanning | K | Pending external hardware | N/A | Device Camera / HTTPS | Typechecked & built | Manual QR code fallback always active |
| 147 | Web Bluetooth Beacon Capability Check | K | Pending external hardware | N/A | Web Bluetooth + BLE Beacons | Typechecked & built | Clearly marks simulated mode if unsupported |
| 148 | WebXR AR Overlay Capability Detection | K | Pending external hardware | N/A | WebXR AR Device | Typechecked & built | Automatically falls back to 2D routing |
| 149 | Multi-Floor Indoor Elevator Nodes & Transitions | K | Demo/simulated | Implemented and tested | Institutional CAD/BMS | Seed & routing verified | Uses synthetic indoor demo levels |
| 150 | Live Elevator Telemetry Feed Adapter | K | Demo/simulated | Implemented, awaiting integration credentials | Campus BMS API | Integration registry | Static demo status until BMS connected |
| 151 | University SSO / OIDC Adapter Descriptor | K | Demo/simulated | Implemented, awaiting integration credentials | Institutional IdP | Integration registry | Email/password auth active by default |
| 152 | Facilities CMMS Work-Order Webhook Descriptor | K | Demo/simulated | Implemented, awaiting integration credentials | External CMMS API | Integration registry | Internal maintenance queue active locally |
| 153 | Google Maps Geocoding Adapter Descriptor | K | Demo/simulated | Implemented, awaiting integration credentials | `GOOGLE_MAPS_API_KEY` | Integration registry | Uses Leaflet + OpenStreetMap by default |
| 154 | Campus Shuttle / Transit Accessibility Adapter | K | Demo/simulated | Implemented, awaiting integration credentials | GTFS / Transit API | Integration registry | Placeholder descriptor awaiting feed |

## Module L — DevOps, Persistence, Quality & Documentation (#155–#164)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 155 | 19 Mongoose Schemas & Compound Indexes | L | N/A | Implemented and tested | MongoDB (`MONGODB_URI`) | Typechecked & compiled | Falls back to JSON store when `MONGODB_URI` unset |
| 156 | Dual-Mode Repository (`Mongoose` / Local JSON / Memory) | L | N/A | Implemented and tested | None | Tested across all 17 Vitest tests | Local JSON single-process only |
| 157 | Idempotent Synthetic Demo Seeder (`npm run seed`) | L | N/A | Implemented and tested | None | Tested in `routing` & `api-security` | Clearly flagged `DEMO CAMPUS — SYNTHETIC DATA` |
| 158 | Zod Request Body Validation Middleware | L | N/A | Implemented and tested | None | Tested (`api-security.test.ts`) | — |
| 159 | Helmet Security Headers & Safe Error Masking | L | N/A | Implemented and tested | None | Tested in `app.ts` | Stack traces hidden in `production` |
| 160 | Vitest + Supertest Automated Test Suite (17 Tests) | L | Implemented and tested | Implemented and tested | None | Executed & passed (17/17) | Live Gemini network calls not tested without key |
| 161 | VitePWA Service Worker & Workbox API Caching | L | Implemented and tested | N/A | Browser Service Worker | Built via `vite build` | Requires HTTPS or localhost |
| 162 | Programmatic PWA PNG & Maskable Icon Pipeline | L | N/A | Implemented and tested | None | Executed (`generate-pwa-icons.ts`) | — |
| 163 | Comprehensive Technical Docs (`/docs/*`) | L | N/A | Implemented and tested | None | Verified on disk | — |
| 164 | Open-Source MIT License & Deployment Guide | L | N/A | Implemented and tested | None | Verified on disk | — |

## Module M — Security Hardening, CSRF, Session Revocation & Production Safety (#165–#176)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 165 | Block Self `campusId` Mutation on Profile Patch | M | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | Users must submit a Campus Transfer Request |
| 166 | Authorized Campus Transfer Request & Admin Review | M | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | Updates user session & audit log on approval |
| 167 | Cryptographic Double-Submit CSRF & Origin Validation | M | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | Enforced on cookie-authenticated mutations |
| 168 | Server-Side Session Revocation (`userSessions`) | M | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | Revokes tokens on logout, password reset, deactivation & role change |
| 169 | Production Secret Guard (`JWT_SECRET >= 32` chars) | M | N/A | Implemented and tested | None | Enforced in `env.ts` | Blocks startup in `NODE_ENV=production` with weak default secret |
| 170 | SHA-256 Single-Use Expiring Reset & Verification Tokens | M | Implemented and tested | Implemented and tested | Optional SMTP | Implemented in `authRoutes.ts` | Returns honest unconfigured notice if `EMAIL_PROVIDER=none` |
| 171 | Image Re-Encoding Sanitizer (`pngjs` / `jpeg-js`) & EXIF Strip | M | N/A | Implemented and tested | None | Tested (`api-security.test.ts`) | Strips EXIF/GPS metadata and rejects spoofed polyglot payloads |
| 172 | Authenticated Campus-Scoped Evidence Retrieval & Quota | M | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | Unauthenticated `/api/v1/reports/:id/evidence/:file` returns `401` |
| 173 | Strict Allowlisted Zod Schemas on Admin PATCH Routes | M | N/A | Implemented and tested | None | Tested (`api-security.test.ts`) | Uses `.strict()` to reject unexpected keys (`400`) |
| 174 | Endpoint-Specific Rate Limiting on AI & Auth Routes | M | N/A | Implemented and tested | None | Disabled only in `NODE_ENV=test` | — |
| 175 | Production Fail-Fast (No Auto Demo Seed, No Silent JSON Fallback) | M | N/A | Implemented and tested | `MONGODB_URI` | Tested (`api-security.test.ts`) | Throws fatal error in `NODE_ENV=production` without valid MongoDB |
| 176 | Database JSON Backup, Restore & Integrity Verification | M | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | Restricted to `super_admin` and recorded in `auditLogs` |

## Module N — Accessibility Intelligence & Trust Engine (#177–#182)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 177 | 7-State Edge Trust Classifier (`VERIFIED_CURRENT`..`UNKNOWN`) | N | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | Uses 30-day default expiration and expiring threshold windows |
| 178 | Conflicting Community Evidence & Disputed Segment Detection | N | Implemented and tested | Implemented and tested | None | Implemented in `trustEngine.ts` | Elevates unresolved/conflicting reports to `DISPUTED` |
| 179 | Building-Level Verification Coverage Metrics | N | Implemented and tested | Implemented and tested | None | Displayed in Admin Analytics | Deterministic rollup over campus segments |
| 180 | Per-Route Trust Summary, Inspection Age & Recommendation Rationale | N | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | AI confidence never certifies accessibility |
| 181 | Unverified Fallback Explicit Warnings (Never Claims 100% Verified) | N | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | Requires explicit user opt-in |
| 182 | Admin Segment Trust Queue & One-Click Re-Verify Action | N | Implemented and tested | Implemented and tested | None | Implemented in `AdminOperationsPages.tsx` | Audited with verifier role and expiry timestamp |

## Module O — Multi-Floor Indoor Navigation & Waypoints (#183–#187)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 183 | Interactive Multi-Floor SVG Building Maps (`FloorPlanDTO`) | O | Demo/simulated | Implemented and tested | Institutional CAD/BIM | Tested (`app.test.ts`, `routing.test.ts`) | Seeded schematics clearly labelled `DEMO CAMPUS — SYNTHETIC DATA` |
| 184 | Floor Switcher, Current-Floor Indicator & Room Links (`/app/indoor`) | O | Implemented and tested | Implemented and tested | None | Tested (`app.test.ts`) | — |
| 185 | Indoor Elevator & Ramp Multi-Floor Transition Routing | O | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | — |
| 186 | Registered QR Waypoint Verification Lookup (`/qr/:code`) | O | Implemented and tested | Implemented and tested | Printed QR tags | Tested (`app.test.ts`) | Queries registered campus nodes; rejects unknown codes |
| 187 | Hardware Adapter Probe (Camera, Web Bluetooth, WebXR AR) | O | Pending external hardware | N/A | Device Sensors / BLE | Typechecked & built | Simulated BLE markers labelled `Demo Sim`; manual fallback active |

## Module P — Live Campus Accessibility Operations (#188–#191)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 188 | Live Status Board for Elevators, Doors, Restrooms & Construction | P | Demo/simulated | Implemented and tested | Institutional BMS / IoT | Endpoint & UI implemented | Displays provider sync status (`demo_simulated` vs `live`) |
| 189 | Facility Outage Alert Subscriptions (`/operations/live-status/subscribe`) | P | Implemented and tested | Implemented and tested | Optional Web Push | Implemented in `operationsRoutes.ts` | Creates in-app notifications automatically |
| 190 | Live Outage Exclusion During Route Calculation | P | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | Outage on elevator excludes vertical transition edge (`edge_19`) |
| 191 | Authority-Validated Status Mutation & Subscriber Broadcast | P | Implemented and tested | Implemented and tested | None | Implemented & audited | Only moderator/admin can publish status updates |

## Module Q — Smart Campus Day & Class Schedule Planner (#192–#195)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 192 | Personal Class Timetable CRUD (`/app/schedule`) | Q | Implemented and tested | Implemented and tested | Optional Institutional SIS API | Tested (`api-security.test.ts`, `app.test.ts`) | Manual CRUD active; SIS sync adapter external |
| 193 | Class-to-Class Accessible Route Transition Generation | Q | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | Uses verified constraint-filtered routing engine |
| 194 | Recommended Departure Time & Buffer Calculations | Q | Implemented and tested | Implemented and tested | None | Tested (`app.test.ts`) | — |
| 195 | Tight Schedule & Unverified Transition Warnings | Q | Implemented and tested | Implemented and tested | None | Implemented in `operationsRoutes.ts` | Never auto-switches to unverified shortcuts |

## Module R — Accessible Emergency Evacuation Planner (#196–#199)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 196 | Floor-Specific Emergency Assembly & Exit Directory (`/app/emergency`) | R | Implemented and tested | Implemented and tested | Campus Safety Team | Tested (`routing.test.ts`) | Explicitly states demo status & no emergency responder dispatch |
| 197 | Wheelchair-Compatible Evacuation Path Verification | R | Implemented and tested | Implemented and tested | None | Implemented in `CampusHubPages.tsx` | Excludes stairs and unapproved exits |
| 198 | Institution Admin Safety Approval Workflow & History | R | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | Seeded routes include both approved & unapproved examples |
| 199 | High-Contrast Printable Evacuation Plan Sheet | R | Implemented and tested | N/A | Browser Print API | Implemented with print CSS | — |

## Module S — Advanced Routing Engine 2.0 (#200–#203)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 200 | Binary `MinHeap` Priority Queue & Optional A* Haversine Search | S | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | Parity verified between Dijkstra & A* optimal distance |
| 201 | Top-K (`topK: 3`) Diverse Alternative Verified Routes | S | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | Evaluates path overlap diversity ratios |
| 202 | Freshness-Weighted Multi-Objective Edge Scoring | S | Implemented and tested | Implemented and tested | None | Implemented in `dijkstra.ts` | Never overrides hard accessibility filters |
| 203 | Route Confidence & Diversity Indicators | S | Implemented and tested | Implemented and tested | None | Tested (`routing.test.ts`) | — |

## Module T — Predictive Maintenance 2.0 (#204–#207)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 204 | Equipment Incident History (`equipmentIncidents` Collection) | T | Implemented and tested | Implemented and tested | Optional CMMS Webhook | Seeded & queried in engine | — |
| 205 | Mean Time to Repair (MTTR) & SLA Compliance Metrics | T | Implemented and tested | Implemented and tested | None | Computed in `predictiveEngine.ts` | Displayed in Admin Analytics dashboard |
| 206 | Recurring Equipment Failure Detection | T | Implemented and tested | Implemented and tested | None | Computed in `predictiveEngine.ts` | Flags assets with repeated downtime events |
| 207 | Sample-Size Gated Building Risk & Outage Forecast | T | Implemented and tested | Implemented and tested | None | Gated in `predictiveEngine.ts` | Marks insufficient-data buildings transparently |

## Module U — Offline Reliability 2.0, GIS & System Observability (#208–#214)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 208 | `graphVersion` Stale Cache Detection & Warning | U | Implemented and tested | Implemented and tested | None | Synced via `/campuses/:id/map` | Alerts user when cached offline map predates server graph |
| 209 | Idempotent `clientRequestId` Offline Draft Deduplication | U | Implemented and tested | Implemented and tested | None | Tested (`app.test.ts`, `reportRoutes.ts`) | Prevents duplicate reports on flaky reconnects |
| 210 | Workbox Auth/Private Endpoint Exclusion Rules | U | Implemented and tested | N/A | Browser Service Worker | Configured in `vite.config.ts` | Auth, admin, schedule, AI & evidence routes use `NetworkOnly` |
| 211 | GeoJSON FeatureCollection Export, Validation & Safe Import | U | Implemented and tested | Implemented and tested | None | Tested (`api-security.test.ts`) | Validates coordinates, required fields & connectivity before write |
| 212 | Versioned Graph Change History (`graphVersions`) | U | Implemented and tested | Implemented and tested | None | Logged on seed & GIS import | Tracks campus graph schema snapshots |
| 213 | Request Correlation ID (`X-Request-Id`) & Structured Error Buffers | U | N/A | Implemented and tested | None | Implemented in `observability.ts` | Bounded in-memory ring buffers exposed to admins |
| 214 | 7-Service Readiness & Dependency Dashboard (`/app/admin`) | U | Implemented and tested | Implemented and tested | Optional External Keys | Tested (`api-security.test.ts`) | Reports DB, JWT, CSRF, AI, SMTP, Storage & Image Sanitizer state |



## Module V — Accessibility Digital Twin & Decision Support (#215)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 215 | What-If Accessibility Digital Twin (Non-Persistent Graph Simulation) | V | Implemented; native smoke-tested; full suite pending | Implemented; native smoke-tested; full suite pending | Existing campus graph and verified routing engine | Native Node smoke suite passed 5/5 including repair, closure, unverified ramp, immutability and catalog continuity; Vitest/API/E2E remain unexecuted | Evaluates one selected segment across up to 25 route pairs on a detached graph copy. Never writes simulated state to the production graph or promotes verification. Human review and an authorized graph edit remain required. |


## Module W — Navigation Assistance & Route Resilience (#216–#218)

| # | Feature Name | Module | Frontend Status | Backend Status | Integration Dependency | Testing Status | Limitations |
|---|---|---|---|---|---|---|---|
| 216 | Bilingual Turn-by-Turn Accessible Directions with Read-Aloud (EN / বাংলা) | W | Implemented; source-reviewed; browser run pending | Implemented; offline smoke-tested | Browser Web Speech API (optional; text is always available) | Offline smoke tests (`scripts/navigation-features.smoke.test.mjs`) | Directions are derived only from verified route data; Bengali read-aloud needs a bn-BD voice installed on the device, otherwise the text is shown without audio |
| 217 | Route Resilience & Single-Point-of-Failure Analysis | W | Implemented; source-reviewed; browser run pending | Implemented; offline smoke-tested | Existing campus graph and verified routing engine | Offline smoke tests (`scripts/navigation-features.smoke.test.mjs`) | Tests one closure at a time on a detached graph copy using verified accessible segments only; a graph-model estimate, not a guarantee of physical availability |
| 218 | Signed Expiring Shareable Route Links (Live Recalculation) | W | Implemented; source-reviewed; browser run pending | Implemented; offline smoke-tested | Server `JWT_SECRET` (HMAC key derivation) | Offline smoke tests (`scripts/navigation-features.smoke.test.mjs`) | Links carry only origin, destination and boolean constraints (never personal data or free-text notes), expire after 1 hour to 7 days and cannot be revoked individually |
