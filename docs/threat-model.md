# AccessPath STRIDE Threat Model

**Scope:** Web client, Express API, MongoDB/local development repository, uploaded report evidence, AI provider boundary, campus graph and offline draft synchronization. This is an initial engineering threat model, not a penetration-test report.

## Assets

- Account credentials, JWTs, session identifiers and CSRF tokens.
- Campus-scoped user records, route history, accessibility profile preferences and consent flags.
- Report text, photo evidence, verification records and campus graph data.
- AI prompts/provider responses and institution integration secrets.
- Offline drafts and cached campus graph snapshots.

## Trust boundaries

1. Browser to API (cookie / bearer token, CORS, CSRF and rate limiting).
2. Authenticated user to campus tenant boundary (role checks and `requireCampusAccess`).
3. User-supplied report/photo text to AI provider.
4. API to MongoDB or local JSON development store.
5. Server to institutional integrations and optional notification providers.
6. Browser offline cache to later synchronization.

## STRIDE review

| Threat | Example | Existing controls | Required follow-up |
|---|---|---|---|
| Spoofing | Stolen bearer token or forged session | JWT validation, persisted session `jti`, revocation, bcrypt password hashes | Add anomaly-based session risk controls, stronger account lockout/backoff and passkeys/TOTP only after threat-reviewed implementation. |
| Tampering | Forged campus graph edits or modified report status | Role middleware, Zod validation, audit logs, admin-only graph mutations | Review every write route for campus scope, object ownership and immutable audit evidence; add mutation property tests. |
| Repudiation | User denies changing an edge or approving a report | `auditLogs`, actor identity and timestamps on audited operations | Ensure all sensitive workflow transitions emit append-only audit events and externalized retention. |
| Information disclosure | Cross-campus records, private evidence, disability accommodation details, AI prompt data | Campus checks on protected routes, protected evidence download path, no public `/uploads` static directory, consent fields | Audit every read endpoint; add field-level encryption and strict accommodation-specific permissions before adding that workflow. |
| Denial of service | Login brute force, large uploads, expensive AI calls or graph calculation | Express rate limits, body size limits, image sanitization | Add per-user/per-tenant AI quotas, endpoint-specific resource ceilings, load tests and durable rate-limit storage. |
| Elevation of privilege | Moderator or volunteer reaches admin-only actions | Five-role `requireRole` checks and frontend route guards | Server guards remain authoritative; add explicit negative tests for every role and tenant pair. |

## AI and untrusted-content boundary

Treat report descriptions, image/OCR text, imported files, user prompts and retrieved records as untrusted data. Never treat embedded instructions as system policy. Do not include reporter secrets or unnecessary personal data in provider prompts. Validate provider outputs against schemas; label mock-provider responses and any generated classifications as assistance, not accessibility verification. Human review remains authoritative.

## Operational requirements

- Store JWT, AI, SMTP, VAPID, MongoDB and integration secrets only in environment/secret-manager configuration; never commit `.env` files.
- Use HTTPS in production; set secure cookies and a restricted origin allowlist.
- Keep production on MongoDB; local JSON storage is single-process development-only behavior.
- Verify backup restore procedures, retention jobs, dependency audit and CI scans before institutional deployment.
- Log request IDs and security-relevant state changes without logging credentials, tokens, sensitive accommodation content or raw uploaded images.

## Known limitations

This document was created from static source inspection. No external penetration test, DAST scan, formal privacy review, restore exercise or load test was executed in this environment. The accommodation workflow is not present; its sensitive fields must not be added without a dedicated authorization and encryption design.
