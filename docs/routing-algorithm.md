# AccessPath Accessible Routing Engine 2.0

Routing is implemented in `backend/src/services/routing/dijkstra.ts` (`calculateAccessibleRoutes`) integrated with `backend/src/services/trust/trustEngine.ts`.

## Step 1: Hard Accessibility Constraint Filtering (`evaluateEdgeEligibility`)

Before any shortest-path optimization runs, every `PathEdge` is evaluated against the user's `AccessibilityPreferences` and live campus operational data:

1. **Blocked / Temporary Closures**: Any edge with `status === 'blocked'` or `temporaryClosure === true` is unconditionally excluded.
2. **Live Facility Outages**: Any edge or endpoint connected to a `LiveFacilityStatus` with `status === 'outage'` or `'closed'` (e.g., elevator outage on `edge_19` or construction zone) is immediately excluded.
3. **Verification & Trust Requirement**: Under strict accessibility profiles (`wheelchairMode`, `stepFreeMode`, `limitedMobilityMode`, `rampRequired`, `elevatorRequired`, `stairsAvoidance`) or `emergencyMode`, edges with `verificationStatus` of `'unverified'`, `'unknown'`, or `'disputed'` are excluded unless the user explicitly opts into `allowUnverifiedFallback: true`.
4. **Stairs Exclusion**: Edges with `hasStairs: true` are rejected whenever `wheelchairMode`, `stepFreeMode`, `stairsAvoidance`, `limitedMobilityMode`, or `emergencyMode` is enabled.
5. **Ramp Verification**: Slopes above `5%` require either `rampAvailable` (`rampVerified === true`) or `elevatorAvailable` when `stepFreeMode`, `rampRequired`, or `emergencyMode` is enabled.
6. **Operational Elevator Check**: Multi-floor transitions check `elevatorOperational === true`. Non-operational elevators are excluded.
7. **Physical Clearances & Surfaces**:
   - `wheelchairMode` / `emergencyMode`: Requires `widthMeters >= 1.2`, rejects `'unpaved_rough'` and `'cobblestone'`, and rejects `slopePercent > 8.5`.
   - `widePathPreference`: Requires `widthMeters >= 1.5`.
   - `lowGradientPreference`: Requires `slopePercent <= 5`.
   - `smoothSurfacePreference`: Rejects `'cobblestone'` and `'unpaved_rough'`.

## Step 2: Binary `MinHeap` Dijkstra / Optional A* & Freshness Scoring

Eligible edges form a directed adjacency graph (including reverse edges when `bidirectional: true`). Search uses a binary `MinHeap` priority queue supporting:
- **Dijkstra** (`algorithm: 'dijkstra'`, heuristic = `0`)
- **A* Search** (`algorithm: 'astar'`, admissible Haversine coordinate distance heuristic to destination)

Multi-objective edge cost modifies physical `distanceMeters` by:
- `status === 'caution'` -> `1.35x`
- `wellLitPreference && lighting === 'poor'` -> `2.5x` (`1.3x` for `'moderate'`)
- `lowGradientPreference || wheelchairMode` -> `+ slopePercent * 4`
- `smoothSurfacePreference && surface === 'brick_paver'` -> `1.2x`
- **Trust Freshness Weighting**: `STALE` (`1.25x`), `VERIFICATION_EXPIRING` (`1.08x`), or explicit fallback `UNVERIFIED` (`1.6x`) never overrides hard exclusions.

## Step 3: Top-K Diverse Routes, Trust Explanations & Safe Failure

- Iterative edge penalization (`3.5x` + overlap checks) surfaces up to **`topK: 3`** distinct accessible route alternatives, each annotated with `confidenceScore`, `diversityScore`, `trustSummary`, `segmentTrusts`, and exact per-segment verification timestamps.
- When `allowUnverifiedFallback: true` includes unverified edges, route metadata marks `verificationSummary: 'unverified_included'` with explicit warnings and **never** claims a 100% verified route.
- If no connected path satisfies all hard constraints, the engine returns `found: false` with `reasonCode: 'NO_VERIFIED_ACCESSIBLE_ROUTE'` and explicit `blockingFactors` — **never** inventing unverified or stepped shortcuts.
