/**
 * Compact AccessPath feature directory, sourced from FEATURE_REGISTRY.md.
 * Detailed fields not itemized by the registry are deliberately marked as
 * undocumented here instead of being fabricated.
 */
type FeatureRow = readonly [
  number, string, string, string, string, string, string, string
];

const MODULE_NAMES: Record<string, string> = {
  "A": "Public Portal, Brand & Onboarding",
  "B": "Authentication, Sessions & Account Governance",
  "C": "Accessibility Profile & Inclusive UI Controls",
  "D": "Campus Map, Buildings & Explorer",
  "E": "Weighted-Graph Accessible Routing Engine",
  "F": "Barrier Reporting, Evidence & Community Feedback",
  "G": "Gemini AI Assistance & Guardrails",
  "H": "Volunteer Verification & Moderation",
  "I": "Campus Admin Graph Editor, Maintenance & Governance",
  "J": "Analytics, Predictive Insights & Exports",
  "K": "Integrations, Notifications & Advanced Hardware Hub",
  "L": "DevOps, Persistence, Quality & Documentation",
  "M": "Security Hardening, CSRF, Session Revocation & Production Safety",
  "N": "Accessibility Intelligence & Trust Engine",
  "O": "Multi-Floor Indoor Navigation & Waypoints",
  "P": "Live Campus Accessibility Operations",
  "Q": "Smart Campus Day & Class Schedule Planner",
  "R": "Accessible Emergency Evacuation Planner",
  "S": "Advanced Routing Engine 2.0",
  "T": "Predictive Maintenance 2.0",
  "U": "Offline Reliability 2.0, GIS & System Observability",
  "V": "Accessibility Digital Twin & Decision Support",
  "W": "Navigation Assistance & Route Resilience"
};

const FEATURE_ROWS: readonly FeatureRow[] = [
  [
    1,
    "A",
    "Public Mission Landing Page & Interactive 3D Hero",
    "Implemented and tested",
    "N/A",
    "Three.js + React Three Fiber",
    "Typechecked & built",
    "Interactive 3D synthetic campus hero with automatic 2D Leaflet fallback"
  ],
  [
    2,
    "A",
    "Demo Banner & Synthetic Data Notice",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Verified in seed + API",
    "Always labels demo records `isDemoData: true`"
  ],
  [
    3,
    "A",
    "Interactive 3D & 2D Demo Campus Explorer Preview",
    "Implemented and tested",
    "Implemented and tested",
    "Three.js + Leaflet / OSM",
    "Tested (`app.test.ts`)",
    "Automatically falls back to 2D/Low-Bandwidth when WebGL/tiles blocked"
  ],
  [
    4,
    "A",
    "About AccessPath & Impact Methodology Page",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "Avoids unverified impact claims"
  ],
  [
    5,
    "A",
    "How It Works (4-Step Workflow) Page",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    6,
    "A",
    "Features Directory (218 Interactive Feature Cards & Details)",
    "Implemented and tested",
    "N/A",
    "None",
    "Tested (`app.test.ts`)",
    "Searchable Modules A–W & dedicated 20-field `/features/:featureId` view"
  ],
  [
    7,
    "A",
    "Accessibility Statement (WCAG 2.2 AA Targets)",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "Targets AA; no formal certification claim"
  ],
  [
    8,
    "A",
    "Help Center & Campus Navigation FAQ",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    9,
    "A",
    "Contact & Institutional Onboarding Info Page",
    "Implemented and tested",
    "N/A",
    "Optional SMTP",
    "Typechecked & built",
    "Static inquiry guidance when SMTP unconfigured"
  ],
  [
    10,
    "A",
    "Privacy Policy & Data Governance Page",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    11,
    "A",
    "Terms of Service Page",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    12,
    "A",
    "Public Campus Accessibility Transparency Portal",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "API endpoint verified",
    "Aggregates demo campus unless live data added"
  ],
  [
    13,
    "A",
    "PWA Manifest & Offline Install Prompt",
    "Implemented and tested",
    "N/A",
    "Browser PWA API",
    "VitePWA build verified",
    "iOS Safari requires manual \"Add to Home Screen\""
  ],
  [
    14,
    "A",
    "Skip-to-Content & Global Live ARIA Announcer",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    15,
    "B",
    "Student & Volunteer Account Registration",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`authRoutes`)",
    "Self-signup restricted to `student` / `volunteer`"
  ],
  [
    16,
    "B",
    "Email + Password Sign-In (bcryptjs + JWT)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `api-security.test.ts`",
    "—"
  ],
  [
    17,
    "B",
    "HttpOnly Cookie + Bearer Hybrid Auth",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `api-security.test.ts`",
    "—"
  ],
  [
    18,
    "B",
    "CSRF Custom Header Check (`X-Requested-With`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "Enforced on cookie-authenticated mutations"
  ],
  [
    19,
    "B",
    "Role-Based Demo Account Quick-Fill",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `api-security.test.ts`",
    "Explicit demo password in demo banner only"
  ],
  [
    20,
    "B",
    "Sign Out & Cookie Revocation",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "Stateless JWT expires per TTL"
  ],
  [
    21,
    "B",
    "Forgot Password Token Request",
    "Implemented and tested",
    "Implemented and tested",
    "Optional SMTP",
    "Endpoint implemented",
    "Returns demo notice when `EMAIL_PROVIDER=none`"
  ],
  [
    22,
    "B",
    "Password Reset Confirmation",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    23,
    "B",
    "Email Verification Flow",
    "Implemented and tested",
    "Implemented and tested",
    "Optional SMTP",
    "Endpoint implemented",
    "Seeded demo accounts pre-verified"
  ],
  [
    24,
    "B",
    "5-Role RBAC (`student`..`super_admin`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "—"
  ],
  [
    25,
    "B",
    "Cross-Campus Tenant Isolation Middleware",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "`super_admin` has cross-campus oversight"
  ],
  [
    26,
    "B",
    "Auth Rate Limiting (`express-rate-limit`)",
    "N/A",
    "Implemented and tested",
    "None",
    "Disabled only in `NODE_ENV=test`",
    "—"
  ],
  [
    27,
    "B",
    "Analytics & Location Privacy Consent Toggles",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "Opt-in geolocation defaults to `false`"
  ],
  [
    28,
    "B",
    "Access Denied (403) & Session Guard Pages",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "—"
  ],
  [
    29,
    "C",
    "Wheelchair Mode Constraint Preset",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `routing.test.ts`",
    "Excludes stairs, `<1.2m` width, rough surfaces"
  ],
  [
    30,
    "C",
    "Step-Free Navigation Constraint",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `routing.test.ts`",
    "—"
  ],
  [
    31,
    "C",
    "Limited Mobility Constraint",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `dijkstra.ts`",
    "—"
  ],
  [
    32,
    "C",
    "Ramp Required Constraint",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `dijkstra.ts`",
    "Requires `rampVerified === true` on slopes >5%"
  ],
  [
    33,
    "C",
    "Operational Elevator Required Constraint",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `dijkstra.ts`",
    "Excludes non-operational elevators"
  ],
  [
    34,
    "C",
    "Stairs Avoidance Constraint",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `routing.test.ts`",
    "—"
  ],
  [
    35,
    "C",
    "Smooth Surface & Wide Path Preferences",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `dijkstra.ts`",
    "—"
  ],
  [
    36,
    "C",
    "Low-Gradient (`<=5%`) & Well-Lit Preferences",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `dijkstra.ts`",
    "—"
  ],
  [
    37,
    "C",
    "Visual Assistance & Voice Read-Aloud Mode",
    "Implemented and tested",
    "Implemented and tested",
    "Web Speech API",
    "Typechecked & built",
    "Depends on browser TTS voice availability"
  ],
  [
    38,
    "C",
    "Dual Dark/Light & High-Contrast Theme Switcher",
    "Implemented and tested",
    "N/A",
    "None",
    "Tested (`app.test.ts`)",
    "WCAG AA+ dark (`#071827`) & light (`#F4F8FB`) plus high-contrast mode"
  ],
  [
    39,
    "C",
    "Typography Scaling (`normal` / `large` / `xl`)",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    40,
    "C",
    "Reduced Motion Toggle & OS Media Honor",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "Pauses Framer Motion & Three.js `frameloop` cleanly"
  ],
  [
    41,
    "C",
    "Bilingual EN / বাংলা UI Switcher",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested in `app.test.ts`",
    "Core UI & dictionaries covered"
  ],
  [
    42,
    "C",
    "Low-Bandwidth / Text-Only Map Mode",
    "Implemented and tested",
    "N/A",
    "None",
    "Typechecked & built",
    "Replaces map tiles and 3D WebGL with structured tables"
  ],
  [
    43,
    "D",
    "Interactive 3D Campus Explorer & 2D Leaflet Map",
    "Implemented and tested",
    "Implemented and tested",
    "Three.js + OSM / Leaflet",
    "Typechecked & built",
    "Automatic 2D Leaflet fallback when WebGL unsupported"
  ],
  [
    44,
    "D",
    "Color & Pattern-Coded Path Segments",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "Distinguishes open, caution, blocked, unverified"
  ],
  [
    45,
    "D",
    "Campus Building Directory & Search",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    46,
    "D",
    "Building Detail Page (Restrooms, Elevators, Ramps)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    47,
    "D",
    "Accessible Location Node Filtering",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    48,
    "D",
    "Bilingual Node Names (EN + বাংলা)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Seed & search verified",
    "—"
  ],
  [
    49,
    "D",
    "Save / Remove Favorite Campus Places",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoints implemented",
    "Requires authenticated session"
  ],
  [
    50,
    "D",
    "Active Campus Announcements Banner",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    51,
    "D",
    "Blocked Path & Closure Alert Markers",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`edge_13` blocked)",
    "—"
  ],
  [
    52,
    "D",
    "Offline Cached Map Graph Snapshot",
    "Implemented and tested",
    "N/A",
    "Zustand / localStorage",
    "Typechecked & built",
    "Caches last loaded campus map"
  ],
  [
    53,
    "D",
    "Accessibility Score Per Building",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Computed in analytics",
    "Deterministic formula over verified attributes"
  ],
  [
    54,
    "D",
    "Printable Route & Map Print Stylesheet",
    "Implemented and tested",
    "N/A",
    "Browser Print API",
    "CSS rules verified",
    "—"
  ],
  [
    55,
    "D",
    "Campus Switcher / Multi-Campus Discovery",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "Demo ships with 1 synthetic campus by default"
  ],
  [
    56,
    "D",
    "Opt-In Geolocation Centering",
    "Implemented and tested",
    "N/A",
    "Browser Geolocation API",
    "Typechecked & built",
    "Only activates on explicit user click"
  ],
  [
    57,
    "E",
    "Hard Constraint Filtering Before Optimization",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "—"
  ],
  [
    58,
    "E",
    "Weighted-Graph Dijkstra Shortest Path",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "—"
  ],
  [
    59,
    "E",
    "Never-Invent-Safe-Path Policy (`NO_VERIFIED_ACCESSIBLE_ROUTE`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "—"
  ],
  [
    60,
    "E",
    "Primary + Distinct Alternative Verified Route",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "—"
  ],
  [
    61,
    "E",
    "Human-Readable Blocking Factor Explanations",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "—"
  ],
  [
    62,
    "E",
    "Dynamic Rerouting on Temporary Closures",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "—"
  ],
  [
    63,
    "E",
    "Unverified Segment Exclusion (`edge_22`, `edge_26`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "Optional explicit unverified fallback flag"
  ],
  [
    64,
    "E",
    "Slope, Surface, Lighting & Width Cost Weights",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in `dijkstra.ts`",
    "—"
  ],
  [
    65,
    "E",
    "Turn-by-Turn Step Instructions & Badges",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "—"
  ],
  [
    66,
    "E",
    "Estimated Distance & Travel Time (`isEstimate: true`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "Assumes nominal walking/wheelchair speed"
  ],
  [
    67,
    "E",
    "Constraint Applied Transparency Chips",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`app.test.ts`)",
    "—"
  ],
  [
    68,
    "E",
    "Voice Read-Aloud Step Guidance",
    "Implemented and tested",
    "N/A",
    "Web Speech Synthesis",
    "Typechecked & built",
    "Requires browser TTS support"
  ],
  [
    69,
    "E",
    "Save Route to Account",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "Requires login"
  ],
  [
    70,
    "E",
    "Route Calculation History Tracking",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "Logged when authenticated"
  ],
  [
    71,
    "E",
    "Post-Route Accessibility Rating & Feedback",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    72,
    "E",
    "Direct \"Navigate Here\" Links from Explorer/QR",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    73,
    "F",
    "Structured Barrier Report Submission Form",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "—"
  ],
  [
    74,
    "F",
    "Bilingual Report Input (English & বাংলা)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "—"
  ],
  [
    75,
    "F",
    "11 Barrier Categories & 4 Priority Tiers",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Zod schema validated",
    "—"
  ],
  [
    76,
    "F",
    "Evidence Image Upload (`multer`, PNG/JPEG/WEBP <= 5MB)",
    "Implemented and tested",
    "Implemented and tested",
    "Local `/uploads` disk",
    "Rejection tested in `api-security.test.ts`",
    "Needs persistent volume/S3 in multi-node cloud"
  ],
  [
    77,
    "F",
    "Server-Side Filename Sanitization & MIME Filtering",
    "N/A",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "—"
  ],
  [
    78,
    "F",
    "Offline Barrier Report Draft Queue & Sync",
    "Implemented and tested",
    "N/A",
    "localStorage",
    "Typechecked & built",
    "Syncs when user clicks/returns online"
  ],
  [
    79,
    "F",
    "Reporter Privacy Masking (`reporterId: 'anonymous'`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Staff roles still see audit trace"
  ],
  [
    80,
    "F",
    "Report Lifecycle Status Workflow (11 States)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in routes & UI",
    "—"
  ],
  [
    81,
    "F",
    "Report Timeline Audit Trail",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Recorded on transitions",
    "—"
  ],
  [
    82,
    "F",
    "Community Report Upvoting (Idempotent Toggle)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    83,
    "F",
    "Report Discussion Comments",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    84,
    "F",
    "Report Dispute Flagging",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    85,
    "F",
    "Post-Resolution Verification Feedback",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    86,
    "F",
    "Duplicate Report Linking",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Supported in status PATCH",
    "—"
  ],
  [
    87,
    "F",
    "Voice-to-Text Barrier Description Draft",
    "Implemented and tested",
    "N/A",
    "Browser SpeechRecognition",
    "Typechecked & built",
    "Chrome/Edge supported; text fallback always shown"
  ],
  [
    88,
    "F",
    "Filterable My Reports & Community Reports Views",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    89,
    "G",
    "Server-Side `@google/genai` SDK Integration (`gemini-4-hydrogen`)",
    "N/A",
    "Implemented, awaiting integration credentials",
    "`GEMINI_API_KEY`",
    "Fallback tested; live needs key",
    "Runs deterministic `mock` when key missing"
  ],
  [
    90,
    "G",
    "Structured JSON Schema Report Classification & Missing Info",
    "Implemented and tested",
    "Implemented and tested",
    "Optional `GEMINI_API_KEY`",
    "Tested (`api-security.test.ts`)",
    "Always sets `requiresHumanVerification: true` & surfaces missing details"
  ],
  [
    91,
    "G",
    "Automatic EN / বাংলা / Mixed Language Detection",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "—"
  ],
  [
    92,
    "G",
    "Bilingual AI Translation Endpoint & UI",
    "Implemented and tested",
    "Implemented and tested",
    "Optional `GEMINI_API_KEY`",
    "Endpoint implemented",
    "Offline mock tags demo translation prefix"
  ],
  [
    93,
    "G",
    "AI Duplicate Barrier Detection",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "Uses lexical overlap scoring"
  ],
  [
    94,
    "G",
    "AI Barrier Photo Analysis (`inlineData`)",
    "Implemented and tested",
    "Implemented, awaiting integration credentials",
    "Optional `GEMINI_API_KEY`",
    "Endpoint implemented",
    "Returns human-review queue prompt in mock mode"
  ],
  [
    95,
    "G",
    "AccessPath AI Companion & NL Dijkstra Routing",
    "Implemented and tested",
    "Implemented and tested",
    "Optional `GEMINI_API_KEY`",
    "Tested (`api-security.test.ts`)",
    "Grounded strictly on live campus DB context & Dijkstra routing"
  ],
  [
    96,
    "G",
    "Grounded \"No Hallucination / No Emergency Dispatch\" Guardrails",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Enforced in prompt & mock",
    "—"
  ],
  [
    97,
    "G",
    "Executive Analytics Summary & AI Analytics Q&A",
    "Implemented and tested",
    "Implemented and tested",
    "Optional `GEMINI_API_KEY`",
    "Tested (`api-security.test.ts`)",
    "Role-restricted to moderator/admin across campus scope"
  ],
  [
    98,
    "G",
    "AI Timeout & Retry Resilience Wrapper",
    "N/A",
    "Implemented and tested",
    "None",
    "Implemented in `geminiService.ts`",
    "Falls back cleanly to deterministic mock"
  ],
  [
    99,
    "G",
    "`AIInteraction` Observability & Latency Logging",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Schema & `/ai/logs` route built",
    "Logs metadata without PII payloads"
  ],
  [
    100,
    "G",
    "AI Provider Status Endpoint (`gemini` vs `mock`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    101,
    "G",
    "Never-Mutate-Map-Without-Human-Review Policy",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Enforced in design & tests",
    "—"
  ],
  [
    102,
    "G",
    "Suggested Location & Route Deep-Link from Assistant",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in drawer UI",
    "—"
  ],
  [
    103,
    "H",
    "Volunteer Verification Queue (`/app/volunteer`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint & UI implemented",
    "—"
  ],
  [
    104,
    "H",
    "On-Site Field Confirmation Decisions (5 Outcomes)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "—"
  ],
  [
    105,
    "H",
    "Separation of Volunteer Check vs Authoritative Graph Mutation",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`appliedToGraph: false`)",
    "Only moderator/admin alters map edges"
  ],
  [
    106,
    "H",
    "Verification History Audit View",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    107,
    "H",
    "Moderator Report Triage Dashboard",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint & UI implemented",
    "—"
  ],
  [
    108,
    "H",
    "One-Click Report Status Transition & Edge Blocking",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    109,
    "H",
    "Duplicate Report Resolution & Merging",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    110,
    "H",
    "Disputed Report Review Workflow",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    111,
    "H",
    "In-App Notification on Report Verification/Resolution",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in routes",
    "—"
  ],
  [
    112,
    "H",
    "Verification Evidence Notes & Timestamps",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    113,
    "H",
    "Map Update Recommendation Queue",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`verificationRoutes`)",
    "—"
  ],
  [
    114,
    "H",
    "Automated Audit Log Entry on Moderation Decisions",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in `audit.ts`",
    "—"
  ],
  [
    115,
    "I",
    "Campus Operations Dashboard (`/app/admin`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint & UI implemented",
    "—"
  ],
  [
    116,
    "I",
    "Interactive Path Edge Verification & Closure Toggle",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint & UI implemented",
    "—"
  ],
  [
    117,
    "I",
    "Add New Campus Location Node",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    118,
    "I",
    "Edit Location Accessibility Flags (Elevator/Ramp/Restroom)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    119,
    "I",
    "Add / Edit Campus Path Edge Segment",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    120,
    "I",
    "Add / Update Campus Building Metadata",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    121,
    "I",
    "Maintenance Work Order Creation",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    122,
    "I",
    "Maintenance Status Progression & Auto-Unblock Option",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    123,
    "I",
    "Campus Announcements Publisher",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "Broadcasts in-app notifications"
  ],
  [
    124,
    "I",
    "Campus User Role Management (`student`..`campus_admin`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "RBAC tested",
    "—"
  ],
  [
    125,
    "I",
    "User Account Activation / Suspension Toggle",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    126,
    "I",
    "Audit Logs Explorer (`/app/admin/audit-logs`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint & UI implemented",
    "—"
  ],
  [
    127,
    "I",
    "Emergency Evacuation Route Approval Toggle",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint & UI implemented",
    "Only safety admin can mark approved"
  ],
  [
    128,
    "I",
    "Super Admin Multi-Institution Governance (`/app/super-admin`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "RBAC tested (`403` for admin)",
    "—"
  ],
  [
    129,
    "I",
    "Institution Onboarding Endpoint",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    130,
    "I",
    "Student Accessibility Dashboard KPI Overview",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    131,
    "J",
    "Accessibility Analytics Overview Dashboard",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint & UI implemented",
    "—"
  ],
  [
    132,
    "J",
    "Category & Status Breakdown Charts (`recharts`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Typechecked & built",
    "—"
  ],
  [
    133,
    "J",
    "Per-Building Accessibility Readiness Score",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Computed in `analyticsRoutes`",
    "Formula-based index, not legal certification"
  ],
  [
    134,
    "J",
    "Barrier Hotspot Heatmap Coordinate Summary",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Computed in `analyticsRoutes`",
    "—"
  ],
  [
    135,
    "J",
    "Filter Analytics by Category & Building",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    136,
    "J",
    "Statistical Predictive Maintenance Insights",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Computed in `analyticsRoutes`",
    "Gated on `>=5` reports; explicitly marked statistical estimate"
  ],
  [
    137,
    "J",
    "Sanitized CSV Report Export (`GET /api/v1/analytics/export`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint & download verified",
    "Escapes CSV formulas/quotes; flags `DemoSeedData`"
  ],
  [
    138,
    "J",
    "Print-Friendly Accessibility Report View",
    "Implemented and tested",
    "N/A",
    "Browser Print API",
    "Typechecked & built",
    "—"
  ],
  [
    139,
    "J",
    "Public Transparency Summary Endpoint",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    140,
    "J",
    "AI-Assisted Executive Trends Summary",
    "Implemented and tested",
    "Implemented and tested",
    "Optional `GEMINI_API_KEY`",
    "Endpoint implemented",
    "Deterministic summary when key absent"
  ],
  [
    141,
    "K",
    "In-App Notifications Feed & Unread Badge",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint & UI implemented",
    "—"
  ],
  [
    142,
    "K",
    "Mark Notification Read",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Endpoint implemented",
    "—"
  ],
  [
    143,
    "K",
    "SMTP Email Delivery Adapter & Readiness Test",
    "Implemented and tested",
    "Implemented, awaiting integration credentials",
    "`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`",
    "Honest refusal tested in adapter",
    "Refuses fake sends when `EMAIL_PROVIDER=none`"
  ],
  [
    144,
    "K",
    "Integrations Registry (`12` Adapters) & Test Endpoint",
    "Implemented and tested",
    "Implemented, awaiting integration credentials",
    "Various external keys",
    "Endpoint implemented",
    "Reports real configuration state"
  ],
  [
    145,
    "K",
    "QR Code Waypoint Lookup (`/app/advanced`)",
    "Demo/simulated",
    "Implemented and tested",
    "Printed QR tags",
    "Typechecked & built",
    "Seeded demo QR tags (`AP-QR-LIBW`, etc.)"
  ],
  [
    146,
    "K",
    "Camera Permission Check for QR Scanning",
    "Pending external hardware",
    "N/A",
    "Device Camera / HTTPS",
    "Typechecked & built",
    "Manual QR code fallback always active"
  ],
  [
    147,
    "K",
    "Web Bluetooth Beacon Capability Check",
    "Pending external hardware",
    "N/A",
    "Web Bluetooth + BLE Beacons",
    "Typechecked & built",
    "Clearly marks simulated mode if unsupported"
  ],
  [
    148,
    "K",
    "WebXR AR Overlay Capability Detection",
    "Pending external hardware",
    "N/A",
    "WebXR AR Device",
    "Typechecked & built",
    "Automatically falls back to 2D routing"
  ],
  [
    149,
    "K",
    "Multi-Floor Indoor Elevator Nodes & Transitions",
    "Demo/simulated",
    "Implemented and tested",
    "Institutional CAD/BMS",
    "Seed & routing verified",
    "Uses synthetic indoor demo levels"
  ],
  [
    150,
    "K",
    "Live Elevator Telemetry Feed Adapter",
    "Demo/simulated",
    "Implemented, awaiting integration credentials",
    "Campus BMS API",
    "Integration registry",
    "Static demo status until BMS connected"
  ],
  [
    151,
    "K",
    "University SSO / OIDC Adapter Descriptor",
    "Demo/simulated",
    "Implemented, awaiting integration credentials",
    "Institutional IdP",
    "Integration registry",
    "Email/password auth active by default"
  ],
  [
    152,
    "K",
    "Facilities CMMS Work-Order Webhook Descriptor",
    "Demo/simulated",
    "Implemented, awaiting integration credentials",
    "External CMMS API",
    "Integration registry",
    "Internal maintenance queue active locally"
  ],
  [
    153,
    "K",
    "Google Maps Geocoding Adapter Descriptor",
    "Demo/simulated",
    "Implemented, awaiting integration credentials",
    "`GOOGLE_MAPS_API_KEY`",
    "Integration registry",
    "Uses Leaflet + OpenStreetMap by default"
  ],
  [
    154,
    "K",
    "Campus Shuttle / Transit Accessibility Adapter",
    "Demo/simulated",
    "Implemented, awaiting integration credentials",
    "GTFS / Transit API",
    "Integration registry",
    "Placeholder descriptor awaiting feed"
  ],
  [
    155,
    "L",
    "19 Mongoose Schemas & Compound Indexes",
    "N/A",
    "Implemented and tested",
    "MongoDB (`MONGODB_URI`)",
    "Typechecked & compiled",
    "Falls back to JSON store when `MONGODB_URI` unset"
  ],
  [
    156,
    "L",
    "Dual-Mode Repository (`Mongoose` / Local JSON / Memory)",
    "N/A",
    "Implemented and tested",
    "None",
    "Tested across all 17 Vitest tests",
    "Local JSON single-process only"
  ],
  [
    157,
    "L",
    "Idempotent Synthetic Demo Seeder (`npm run seed`)",
    "N/A",
    "Implemented and tested",
    "None",
    "Tested in `routing` & `api-security`",
    "Clearly flagged `DEMO CAMPUS — SYNTHETIC DATA`"
  ],
  [
    158,
    "L",
    "Zod Request Body Validation Middleware",
    "N/A",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "—"
  ],
  [
    159,
    "L",
    "Helmet Security Headers & Safe Error Masking",
    "N/A",
    "Implemented and tested",
    "None",
    "Tested in `app.ts`",
    "Stack traces hidden in `production`"
  ],
  [
    160,
    "L",
    "Vitest + Supertest Automated Test Suite (17 Tests)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Executed & passed (17/17)",
    "Live Gemini network calls not tested without key"
  ],
  [
    161,
    "L",
    "VitePWA Service Worker & Workbox API Caching",
    "Implemented and tested",
    "N/A",
    "Browser Service Worker",
    "Built via `vite build`",
    "Requires HTTPS or localhost"
  ],
  [
    162,
    "L",
    "Programmatic PWA PNG & Maskable Icon Pipeline",
    "N/A",
    "Implemented and tested",
    "None",
    "Executed (`generate-pwa-icons.ts`)",
    "—"
  ],
  [
    163,
    "L",
    "Comprehensive Technical Docs (`/docs/*`)",
    "N/A",
    "Implemented and tested",
    "None",
    "Verified on disk",
    "—"
  ],
  [
    164,
    "L",
    "Open-Source MIT License & Deployment Guide",
    "N/A",
    "Implemented and tested",
    "None",
    "Verified on disk",
    "—"
  ],
  [
    165,
    "M",
    "Block Self `campusId` Mutation on Profile Patch",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Users must submit a Campus Transfer Request"
  ],
  [
    166,
    "M",
    "Authorized Campus Transfer Request & Admin Review",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Updates user session & audit log on approval"
  ],
  [
    167,
    "M",
    "Cryptographic Double-Submit CSRF & Origin Validation",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Enforced on cookie-authenticated mutations"
  ],
  [
    168,
    "M",
    "Server-Side Session Revocation (`userSessions`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Revokes tokens on logout, password reset, deactivation & role change"
  ],
  [
    169,
    "M",
    "Production Secret Guard (`JWT_SECRET >= 32` chars)",
    "N/A",
    "Implemented and tested",
    "None",
    "Enforced in `env.ts`",
    "Blocks startup in `NODE_ENV=production` with weak default secret"
  ],
  [
    170,
    "M",
    "SHA-256 Single-Use Expiring Reset & Verification Tokens",
    "Implemented and tested",
    "Implemented and tested",
    "Optional SMTP",
    "Implemented in `authRoutes.ts`",
    "Returns honest unconfigured notice if `EMAIL_PROVIDER=none`"
  ],
  [
    171,
    "M",
    "Image Re-Encoding Sanitizer (`pngjs` / `jpeg-js`) & EXIF Strip",
    "N/A",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Strips EXIF/GPS metadata and rejects spoofed polyglot payloads"
  ],
  [
    172,
    "M",
    "Authenticated Campus-Scoped Evidence Retrieval & Quota",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Unauthenticated `/api/v1/reports/:id/evidence/:file` returns `401`"
  ],
  [
    173,
    "M",
    "Strict Allowlisted Zod Schemas on Admin PATCH Routes",
    "N/A",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Uses `.strict()` to reject unexpected keys (`400`)"
  ],
  [
    174,
    "M",
    "Endpoint-Specific Rate Limiting on AI & Auth Routes",
    "N/A",
    "Implemented and tested",
    "None",
    "Disabled only in `NODE_ENV=test`",
    "—"
  ],
  [
    175,
    "M",
    "Production Fail-Fast (No Auto Demo Seed, No Silent JSON Fallback)",
    "N/A",
    "Implemented and tested",
    "`MONGODB_URI`",
    "Tested (`api-security.test.ts`)",
    "Throws fatal error in `NODE_ENV=production` without valid MongoDB"
  ],
  [
    176,
    "M",
    "Database JSON Backup, Restore & Integrity Verification",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Restricted to `super_admin` and recorded in `auditLogs`"
  ],
  [
    177,
    "N",
    "7-State Edge Trust Classifier (`VERIFIED_CURRENT`..`UNKNOWN`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "Uses 30-day default expiration and expiring threshold windows"
  ],
  [
    178,
    "N",
    "Conflicting Community Evidence & Disputed Segment Detection",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in `trustEngine.ts`",
    "Elevates unresolved/conflicting reports to `DISPUTED`"
  ],
  [
    179,
    "N",
    "Building-Level Verification Coverage Metrics",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Displayed in Admin Analytics",
    "Deterministic rollup over campus segments"
  ],
  [
    180,
    "N",
    "Per-Route Trust Summary, Inspection Age & Recommendation Rationale",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "AI confidence never certifies accessibility"
  ],
  [
    181,
    "N",
    "Unverified Fallback Explicit Warnings (Never Claims 100% Verified)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "Requires explicit user opt-in"
  ],
  [
    182,
    "N",
    "Admin Segment Trust Queue & One-Click Re-Verify Action",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in `AdminOperationsPages.tsx`",
    "Audited with verifier role and expiry timestamp"
  ],
  [
    183,
    "O",
    "Interactive Multi-Floor SVG Building Maps (`FloorPlanDTO`)",
    "Demo/simulated",
    "Implemented and tested",
    "Institutional CAD/BIM",
    "Tested (`app.test.ts`, `routing.test.ts`)",
    "Seeded schematics clearly labelled `DEMO CAMPUS — SYNTHETIC DATA`"
  ],
  [
    184,
    "O",
    "Floor Switcher, Current-Floor Indicator & Room Links (`/app/indoor`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`app.test.ts`)",
    "—"
  ],
  [
    185,
    "O",
    "Indoor Elevator & Ramp Multi-Floor Transition Routing",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "—"
  ],
  [
    186,
    "O",
    "Registered QR Waypoint Verification Lookup (`/qr/:code`)",
    "Implemented and tested",
    "Implemented and tested",
    "Printed QR tags",
    "Tested (`app.test.ts`)",
    "Queries registered campus nodes; rejects unknown codes"
  ],
  [
    187,
    "O",
    "Hardware Adapter Probe (Camera, Web Bluetooth, WebXR AR)",
    "Pending external hardware",
    "N/A",
    "Device Sensors / BLE",
    "Typechecked & built",
    "Simulated BLE markers labelled `Demo Sim`; manual fallback active"
  ],
  [
    188,
    "P",
    "Live Status Board for Elevators, Doors, Restrooms & Construction",
    "Demo/simulated",
    "Implemented and tested",
    "Institutional BMS / IoT",
    "Endpoint & UI implemented",
    "Displays provider sync status (`demo_simulated` vs `live`)"
  ],
  [
    189,
    "P",
    "Facility Outage Alert Subscriptions (`/operations/live-status/subscribe`)",
    "Implemented and tested",
    "Implemented and tested",
    "Optional Web Push",
    "Implemented in `operationsRoutes.ts`",
    "Creates in-app notifications automatically"
  ],
  [
    190,
    "P",
    "Live Outage Exclusion During Route Calculation",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "Outage on elevator excludes vertical transition edge (`edge_19`)"
  ],
  [
    191,
    "P",
    "Authority-Validated Status Mutation & Subscriber Broadcast",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented & audited",
    "Only moderator/admin can publish status updates"
  ],
  [
    192,
    "Q",
    "Personal Class Timetable CRUD (`/app/schedule`)",
    "Implemented and tested",
    "Implemented and tested",
    "Optional Institutional SIS API",
    "Tested (`api-security.test.ts`, `app.test.ts`)",
    "Manual CRUD active; SIS sync adapter external"
  ],
  [
    193,
    "Q",
    "Class-to-Class Accessible Route Transition Generation",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Uses verified constraint-filtered routing engine"
  ],
  [
    194,
    "Q",
    "Recommended Departure Time & Buffer Calculations",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`app.test.ts`)",
    "—"
  ],
  [
    195,
    "Q",
    "Tight Schedule & Unverified Transition Warnings",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in `operationsRoutes.ts`",
    "Never auto-switches to unverified shortcuts"
  ],
  [
    196,
    "R",
    "Floor-Specific Emergency Assembly & Exit Directory (`/app/emergency`)",
    "Implemented and tested",
    "Implemented and tested",
    "Campus Safety Team",
    "Tested (`routing.test.ts`)",
    "Explicitly states demo status & no emergency responder dispatch"
  ],
  [
    197,
    "R",
    "Wheelchair-Compatible Evacuation Path Verification",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in `CampusHubPages.tsx`",
    "Excludes stairs and unapproved exits"
  ],
  [
    198,
    "R",
    "Institution Admin Safety Approval Workflow & History",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "Seeded routes include both approved & unapproved examples"
  ],
  [
    199,
    "R",
    "High-Contrast Printable Evacuation Plan Sheet",
    "Implemented and tested",
    "N/A",
    "Browser Print API",
    "Implemented with print CSS",
    "—"
  ],
  [
    200,
    "S",
    "Binary `MinHeap` Priority Queue & Optional A* Haversine Search",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "Parity verified between Dijkstra & A* optimal distance"
  ],
  [
    201,
    "S",
    "Top-K (`topK: 3`) Diverse Alternative Verified Routes",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "Evaluates path overlap diversity ratios"
  ],
  [
    202,
    "S",
    "Freshness-Weighted Multi-Objective Edge Scoring",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Implemented in `dijkstra.ts`",
    "Never overrides hard accessibility filters"
  ],
  [
    203,
    "S",
    "Route Confidence & Diversity Indicators",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`routing.test.ts`)",
    "—"
  ],
  [
    204,
    "T",
    "Equipment Incident History (`equipmentIncidents` Collection)",
    "Implemented and tested",
    "Implemented and tested",
    "Optional CMMS Webhook",
    "Seeded & queried in engine",
    "—"
  ],
  [
    205,
    "T",
    "Mean Time to Repair (MTTR) & SLA Compliance Metrics",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Computed in `predictiveEngine.ts`",
    "Displayed in Admin Analytics dashboard"
  ],
  [
    206,
    "T",
    "Recurring Equipment Failure Detection",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Computed in `predictiveEngine.ts`",
    "Flags assets with repeated downtime events"
  ],
  [
    207,
    "T",
    "Sample-Size Gated Building Risk & Outage Forecast",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Gated in `predictiveEngine.ts`",
    "Marks insufficient-data buildings transparently"
  ],
  [
    208,
    "U",
    "`graphVersion` Stale Cache Detection & Warning",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Synced via `/campuses/:id/map`",
    "Alerts user when cached offline map predates server graph"
  ],
  [
    209,
    "U",
    "Idempotent `clientRequestId` Offline Draft Deduplication",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`app.test.ts`, `reportRoutes.ts`)",
    "Prevents duplicate reports on flaky reconnects"
  ],
  [
    210,
    "U",
    "Workbox Auth/Private Endpoint Exclusion Rules",
    "Implemented and tested",
    "N/A",
    "Browser Service Worker",
    "Configured in `vite.config.ts`",
    "Auth, admin, schedule, AI & evidence routes use `NetworkOnly`"
  ],
  [
    211,
    "U",
    "GeoJSON FeatureCollection Export, Validation & Safe Import",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Tested (`api-security.test.ts`)",
    "Validates coordinates, required fields & connectivity before write"
  ],
  [
    212,
    "U",
    "Versioned Graph Change History (`graphVersions`)",
    "Implemented and tested",
    "Implemented and tested",
    "None",
    "Logged on seed & GIS import",
    "Tracks campus graph schema snapshots"
  ],
  [
    213,
    "U",
    "Request Correlation ID (`X-Request-Id`) & Structured Error Buffers",
    "N/A",
    "Implemented and tested",
    "None",
    "Implemented in `observability.ts`",
    "Bounded in-memory ring buffers exposed to admins"
  ],
  [
    214,
    "U",
    "7-Service Readiness & Dependency Dashboard (`/app/admin`)",
    "Implemented and tested",
    "Implemented and tested",
    "Optional External Keys",
    "Tested (`api-security.test.ts`)",
    "Reports DB, JWT, CSRF, AI, SMTP, Storage & Image Sanitizer state"
  ],
  [
    215,
    "V",
    "What-If Accessibility Digital Twin (Non-Persistent Graph Simulation)",
    "Implemented; native smoke-tested; full suite pending",
    "Implemented; native smoke-tested; full suite pending",
    "Existing campus graph and verified routing engine",
    "Native Node smoke suite passed 5/5 including repair, closure, unverified ramp, immutability and catalog continuity; Vitest/API/E2E remain unexecuted",
    "Evaluates one selected segment across up to 25 route pairs on a detached graph copy. Never writes simulated state to the production graph or promotes verification. Human review and an authorized graph edit remain required."
  ],
  [
    216,
    "W",
    "Bilingual Turn-by-Turn Accessible Directions with Read-Aloud (EN / বাংলা)",
    "Implemented; source-reviewed; browser run pending",
    "Implemented; offline smoke-tested",
    "Browser Web Speech API (optional; text is always available)",
    "Offline smoke tests (`scripts/navigation-features.smoke.test.mjs`)",
    "Directions are derived only from verified route data; Bengali read-aloud needs a bn-BD voice installed on the device, otherwise the text is shown without audio"
  ],
  [
    217,
    "W",
    "Route Resilience & Single-Point-of-Failure Analysis",
    "Implemented; source-reviewed; browser run pending",
    "Implemented; offline smoke-tested",
    "Existing campus graph and verified routing engine",
    "Offline smoke tests (`scripts/navigation-features.smoke.test.mjs`)",
    "Tests one closure at a time on a detached graph copy using verified accessible segments only; a graph-model estimate, not a guarantee of physical availability"
  ],
  [
    218,
    "W",
    "Signed Expiring Shareable Route Links (Live Recalculation)",
    "Implemented; source-reviewed; browser run pending",
    "Implemented; offline smoke-tested",
    "Server `JWT_SECRET` (HMAC key derivation)",
    "Offline smoke tests (`scripts/navigation-features.smoke.test.mjs`)",
    "Links carry only origin, destination and boolean constraints (never personal data or free-text notes), expire after 1 hour to 7 days and cannot be revoked individually"
  ]
];

const NOT_ITEMIZED =
  "Not separately itemized in FEATURE_REGISTRY.md. Review the corresponding implementation and documentation before relying on this detail.";

export const FEATURE_CATALOG = FEATURE_ROWS.map(
  ([number, module, name, frontendStatus, backendStatus, integration, testCoverage, limitations]) => {
    const fullyVerified =
      frontendStatus === "Implemented and tested" &&
      (backendStatus === "Implemented and tested" || backendStatus === "N/A");

    return {
      id: `F${String(number).padStart(3, "0")}`,
      number,
      module,
      moduleName: MODULE_NAMES[module] ?? `Module ${module}`,
      name,
      purpose: `Capability documented in the repository Feature Registry: ${name}.`,
      detailedExplanation: `Registry summary for ${name}. Frontend: ${frontendStatus}. Backend: ${backendStatus}. See FEATURE_REGISTRY.md for the source summary.`,
      targetUser: NOT_ITEMIZED,
      permissions: "Review backend authorization and campus-scoping rules; a per-feature permission matrix is not included in the registry.",
      frontendRoute: "See the application route configuration.",
      backendEndpoint: "See docs/api-reference.md; a feature-to-endpoint mapping is not included in the registry row.",
      databaseEntities: [] as string[],
      workflowSteps: [NOT_ITEMIZED],
      inputs: "Feature-specific inputs are defined in the corresponding UI and API implementation.",
      validationRules: "Review backend/src/schemas/validators.ts and the relevant route for active validation rules.",
      expectedOutputs: "Feature-specific outputs are defined by the relevant UI and API implementation.",
      errorStates: "Review the relevant API route and UI for supported error and recovery states.",
      loadingAndEmptyStates: "Loading and empty states are defined in the relevant UI components.",
      securityChecks: "Review the repository threat model and the relevant authentication, authorization, and campus-scoping middleware.",
      aiInvolvement: "The registry row does not specify AI involvement for this feature.",
      hardwareOrIntegrationDependency: integration,
      actualStatus: fullyVerified ? "Implemented and tested" : `Frontend: ${frontendStatus}; Backend: ${backendStatus}`,
      testCoverage,
      limitations,
      frontendStatus,
      backendStatus,
    };
  }
);

export const FEATURE_COUNT = FEATURE_CATALOG.length;

export const MODULE_METADATA = Object.fromEntries(
  Object.entries(MODULE_NAMES).map(([code, name]) => [
    code,
    { name, count: FEATURE_ROWS.filter((row) => row[1] === code).length },
  ])
) as Record<string, { name: string; count: number }>;

export const MODULE_RANGE = Object.keys(MODULE_METADATA).join("–");

export function getFeatureById(featureId: string) {
  const normalized = featureId.trim().toUpperCase();
  return FEATURE_CATALOG.find((feature) => feature.id === normalized);
}
