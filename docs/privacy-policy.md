# AccessPath Privacy & Data Governance Policy

## 1. Data Minimization & Role Privacy

- **Reporter Identity Masking**: Public listings (`GET /api/v1/reports`) and individual public views mask `reporterId` as `'anonymous'` and expose only a non-identifying alias (`Campus Student`, `Accessibility Volunteer`, etc.). Only authorized campus moderators and administrators see internal accountability metadata.
- **No Unconsented GPS Tracking**: Location awareness is opt-in (`consentLocation: false` by default). Users can compute accessible routes and browse maps without enabling live geolocation.
- **Analytics Consent**: `consentAnalytics` is explicit and user-configurable under Account & Personal Settings (`PATCH /api/v1/auth/me/preferences`).
- **Accessibility Profile Privacy**: Accessibility preferences (`wheelchairMode`, `visualAssistanceMode`, etc.) are stored strictly to personalize route calculations and UI adaptations, and are never sold or shared with third-party ad networks.

## 2. Uploaded Evidence & File Hygiene

- Barrier evidence uploads accept only `image/png`, `image/jpeg`, and `image/webp` up to 5 MB via `multer` filtering in `backend/src/routes/reportRoutes.ts`.
- Uploaded filenames are server-generated (`evidence_<timestamp>_<random>.<ext>`); client-supplied paths are discarded to prevent path traversal.
- Users are advised not to upload photos containing recognizable faces, student ID cards, or private medical documents.

## 3. Authentication & Session Security

- Passwords are salted and hashed with `bcryptjs` (cost factor 10).
- Sessions issue signed JWTs stored in `HttpOnly`, `SameSite=Lax` cookies (`accesspath_token`) alongside optional `Authorization: Bearer` tokens for API clients.
- State-changing requests relying on cookie auth must present `X-Requested-With: AccessPath`.
