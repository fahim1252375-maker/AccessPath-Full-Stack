# Changelog

## 4.2.0

### Added — Usability & productivity
- **Quick search / command palette** (`CommandPalette`, `data/quickNav.ts`): press `Ctrl/Cmd + K` or `/` anywhere in the workspace to jump to any page, run a quick action (theme, high contrast, text size, language, reduced motion, low bandwidth, AI assistant) or open one of the 200+ feature docs. Results are role-aware, searchable in English, বাংলা and common Bangla-in-English-letters spellings, and fully keyboard / screen-reader operable (combobox + listbox pattern).
- **Keyboard shortcuts** (`GlobalShortcuts`): `?` opens a help dialog; `G` then a letter jumps to a page (`G D` dashboard, `G P` planner, `G M` map, `G R` report, ...). Shortcuts are paused while typing or when a dialog is open.
- **Welcome guide** on the dashboard (`WelcomeChecklist`): a 5-step getting-started checklist with a progress bar that ticks itself off as the user explores; can be hidden and restarted from quick search. Bilingual.
- **Recently visited** shortcuts and a time-of-day greeting (EN / বাংলা) on the dashboard.
- **Route planner**: one-click *Swap & recalculate*, plus *Recent routes* chips (last 5 successful routes) to repeat a trip instantly.
- **Toasts** (`Toaster`): short, polite-live confirmations for quick actions and shortcuts.
- **Workspace polish** (`RouteTracker`, `BackToTopButton`): every page gets a proper document title, scrolls to the top and moves focus to the main region on navigation (with a screen-reader announcement), a floating *Back to top* button on long pages, and Escape closes the mobile navigation drawer.
- Tests: `frontend/tests/quick-nav.test.ts` (9 tests for search ranking, role filtering, path matching and greetings).

### Notes
- New UI state (`useUiStore`) persists only recent pages, recent routes and welcome-guide progress in `localStorage`; no tokens, reports or personal data.

## 4.1.0

### Added — Module W: Navigation Assistance & Route Resilience
- **#216 Bilingual turn-by-turn directions** (`shared/directions.ts`, `POST /api/v1/routes/directions`, `DirectionsPanel`): English / বাংলা steps with relative turns, elevator and ramp steps, accessibility callouts, a speakable script, read-aloud with voice selection (`en-US` / `bn-BD`), speech rate, copy and a language toggle. Runs fully offline from a cached route.
- **#217 Route resilience analysis** (`resilience.ts`, `POST /api/v1/routes/resilience`, `RouteResilienceCard`): finds single points of failure on the primary route and measures the detour if each segment closes.
- **#218 Signed shareable route links** (`routeShare.ts`, `POST /routes/share`, `GET /routes/shared/:token`, `SharedRoutePage`): stateless HMAC-signed expiring links that recalculate the route from live data; no database change, no personal data in the link.
- Offline test suite `scripts/navigation-features.smoke.test.mjs` (17 tests) and shared fixtures.

### Fixed
- Auth: unexpected database/configuration errors during token validation now return `503` instead of `401`, so users are no longer logged out by transient outages.
- Auth: JWT algorithm is pinned to HS256 on sign and verify; tokens without a session id (never revocable) are rejected; localhost origins are only trusted outside production.
- IDs: replaced `Date.now()` / `Math.random()` id generation (collision-prone, non-cryptographic) with `newId()`; evidence filenames use the same generator.
- Favorites: `POST /routes/favorites` now checks campus access and that the location exists in that campus, and validates the body with Zod.
- Route preference overrides no longer risk resetting a signed-in user's saved profile with schema defaults (`routePreferencesOverrideSchema`).
- Planner: calculation errors are shown instead of becoming unhandled rejections; endpoints that do not exist in the selected campus fall back to its first locations; save/feedback failures are reported.
- Tests: `app.test.ts` asserted 214 features / 21 modules while the catalog had more; assertions now derive from `FEATURE_COUNT`.

### Changed
- `server.ts`: Vite is imported lazily (production no longer needs it), graceful `SIGTERM`/`SIGINT` shutdown, `unhandledRejection` logging.
- `package.json`: test, type and build tooling moved to `devDependencies`; `tsx` (needed by `npm start`) moved to `dependencies`; new `typecheck`, `format`, `format:check` scripts; `test:simulation` runs every `scripts/*.smoke.test.mjs`.
- Docker: runtime image prunes dev dependencies; `HEALTHCHECK` (image) and `healthcheck` / `init` / `stop_grace_period` (compose).
- Frontend: route-level code splitting (`React.lazy` + `Suspense` inside the layouts), API client timeout (20 s) and clear network-error messages, feature counts derived from the catalog instead of hard-coded `215`.
- Formatting: added `.prettierrc.json`, `.prettierignore`, `.editorconfig`; the minified smoke test was rewritten in readable form.
