# AccessPath Database Schema

AccessPath defines 27 domain collections via Mongoose schemas in `backend/src/models/mongooseModels.ts` and an identical repository interface in `backend/src/repositories/db.ts`.

When `MONGODB_URI` is configured, data persists in MongoDB Atlas / MongoDB Server with the defined unique and compound indexes. In `NODE_ENV=production`, `MONGODB_URI` is strictly required (startup fails fatally rather than silently falling back to local JSON). In development/test without `MONGODB_URI`, `db.ts` persists atomically to `data/accesspath-db.json` (or pure memory in tests) and provides admin backup export, restore, and referential integrity verification.

## Collections (27)

| # | Collection | Key Fields & Purpose | Primary Indexes |
|---|---|---|---|
| 1 | `institutions` | Multi-tenant university/college records (`id`, `name`, `code`, `country`, `isDemoData`, `status`) | `id` (unique), `code` (unique) |
| 2 | `users` | Accounts with `bcryptjs` `passwordHash`, `role`, `campusId`, hashed reset/verification tokens with expiry, `language`, `deletedAt` | `id` (unique), `email` (unique), `role`, `campusId` |
| 3 | `userSessions` | Server-side tracked sessions (`id`, `userId`, `revokedAt`, `expiresAt`) enabling instant session revocation | `id` (unique), `userId`, `revokedAt` |
| 4 | `campusTransferRequests` | User-initiated cross-campus transfer requests (`userId`, `fromCampusId`, `toCampusId`, `status`, `reviewedBy`) | `id` (unique), `(userId, status)` |
| 5 | `campuses` | Campus geographic center (`centerLat`, `centerLng`), zoom, `graphVersion`, demo metadata, computed score | `id` (unique), `institutionId` |
| 6 | `buildings` | Campus buildings (`hasElevator`, `hasAccessibleEntrance`, `hasAccessibleRestroom`, `verificationStatus`) | `id` (unique), `campusId` |
| 7 | `locations` | Graph nodes (`entrance`, `building`, `classroom`, `corridor`, `intersection`, `elevator`, `ramp`, `facility`), floor, `qrCodeId`, `beaconId` | `id` (unique), `(campusId, type)` |
| 8 | `pathEdges` | Directed/bidirectional segments with physical dimensions, stairs/ramp/elevator status, `verificationStatus`, `lastVerifiedAt`, `verificationExpiresAt` | `id` (unique), `(campusId, status, verificationStatus)` |
| 9 | `accessibilityProfiles` | User mobility/sensory preferences (`wheelchairMode`, `stepFreeMode`, `limitedMobilityMode`, `rampRequired`, `elevatorRequired`, etc.) | `userId` (unique) |
| 10 | `accessibilityReports` | Barrier reports (`category`, `priority`, `status`, `clientRequestId` dedup key, `aiClassification`, `timeline`, `comments`) | `id` (unique), `(campusId, status, createdAt)` |
| 11 | `reportEvidence` | EXIF-stripped image evidence metadata (`reportId`, `campusId`, `uploaderId`, `fileUrl`, `mimeType`, `sizeBytes`) | `id` (unique), `reportId`, `campusId` |
| 12 | `verifications` | Field verification records (`reportId`, `verifierId`, `verifierRole`, `decision`, `notes`, `appliedToGraph`) | `id` (unique), `reportId`, `campusId` |
| 13 | `maintenanceTasks` | Facilities remediation work orders (`reportId`, `edgeId`, `priority`, `status`, `assignedTeam`, `estimatedCompletionDate`) | `id` (unique), `campusId`, `status` |
| 14 | `routeHistory` | User calculated routes (`fromNodeId`, `toNodeId`, `distanceMeters`, `estimatedMinutes`, `isSaved`, `feedbackRating`) | `id` (unique), `userId`, `campusId` |
| 15 | `favoriteLocations` | Saved campus places per user | `(userId, locationNodeId)` (unique) |
| 16 | `notifications` | User in-app alerts (`report_status`, `verification`, `route_alert`, `closure`, `maintenance`, `announcement`) | `id` (unique), `userId`, `read` |
| 17 | `announcements` | Campus-wide accessibility notices (`severity`, `authorName`, `active`) | `id` (unique), `campusId` |
| 18 | `campusIntegrations` | Readiness & configuration metadata for 12 external integration adapters | `id` (unique), `campusId` |
| 19 | `auditLogs` | Immutable admin/moderator/auth action log (`actorId`, `actorRole`, `action`, `targetType`, `targetId`, `details`) | `id` (unique), `campusId`, `action` |
| 20 | `aiInteractions` | Server-side AI observability log (`feature`, `provider`, `model`, `latencyMs`, `success`, `inputSummary`, `outputSummary`) | `id` (unique), `campusId`, `feature` |
| 21 | `emergencyRoutes` | Floor-specific evacuation paths (`fromBuildingId`, `floorNumber`, `assemblyPointName`, `wheelchairCompatible`, `adminApproved`) | `id` (unique), `campusId` |
| 22 | `floorPlans` | Interactive SVG multi-floor maps (`buildingId`, `floorNumber`, `corridors`, `rooms`, `qrWaypoints`, `bleBeacons`) | `id` (unique), `(campusId, buildingId, floorNumber)` |
| 23 | `liveFacilities` | Operational status monitors (`facilityType`, `status`, `edgeId`, `source`, `authorityVerified`, `providerStatus`, `lastSyncAt`) | `id` (unique), `campusId`, `facilityType` |
| 24 | `facilitySubscriptions` | User outage notification subscriptions (`userId`, `facilityId`, `campusId`) | `(userId, facilityId)` (unique) |
| 25 | `classScheduleItems` | Student course timetable items (`userId`, `courseCode`, `dayOfWeek`, `startTime`, `endTime`, `locationNodeId`, `bufferMinutes`) | `id` (unique), `(userId, campusId)` |
| 26 | `equipmentIncidents` | Historical facility failure & repair logs (`facilityId`, `buildingId`, `durationMinutes`, `slaTargetHours`, `slaMet`) | `id` (unique), `campusId`, `buildingId` |
| 27 | `graphVersions` | Versioned snapshots of campus map edits & GIS imports (`version`, `publishedBy`, `changeSummary`, `nodeCount`, `edgeCount`) | `id` (unique), `(campusId, version)` |
