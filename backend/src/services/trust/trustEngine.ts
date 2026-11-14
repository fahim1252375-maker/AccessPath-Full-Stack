import type {
  AccessibilityReportDTO,
  BuildingDTO,
  BuildingTrustCoverage,
  EdgeTrustAssessment,
  LocationNodeDTO,
  PathEdgeDTO,
  RouteFreshnessSummary,
  TrustState,
} from '../../../../shared/types.ts';

export const DEFAULT_VERIFICATION_EXPIRY_DAYS = 30;
export const EXPIRING_SOON_WINDOW_DAYS = 7;

export function assessEdgeTrust(
  edge: PathEdgeDTO,
  reports: AccessibilityReportDTO[] = [],
  nowMs = Date.now()
): EdgeTrustAssessment {
  const conflictingReports = reports.filter(
    (r) =>
      r.pathEdgeId === edge.id &&
      !['resolved', 'rejected', 'duplicate'].includes(r.status)
  );
  const conflictingReportsCount = conflictingReports.length;
  const conflictingReportIds = conflictingReports.map((r) => r.id);

  if (edge.status === 'blocked' || edge.temporaryClosure) {
    return {
      edgeId: edge.id,
      edgeName: edge.name,
      trustState: 'BLOCKED',
      lastVerifiedAt: edge.lastVerifiedAt,
      verificationExpiresAt: edge.verificationExpiresAt,
      daysSinceVerification: computeDaysSince(edge.lastVerifiedAt, nowMs),
      conflictingReportsCount,
      conflictingReportIds,
      requiresHumanReview: conflictingReportsCount > 0,
      explanation: edge.closureReason || 'Path segment is currently blocked or temporarily closed.',
    };
  }

  if (edge.verificationStatus === 'disputed' || conflictingReportsCount > 0) {
    return {
      edgeId: edge.id,
      edgeName: edge.name,
      trustState: 'DISPUTED',
      lastVerifiedAt: edge.lastVerifiedAt,
      verificationExpiresAt: edge.verificationExpiresAt,
      daysSinceVerification: computeDaysSince(edge.lastVerifiedAt, nowMs),
      conflictingReportsCount,
      conflictingReportIds,
      requiresHumanReview: true,
      explanation:
        conflictingReportsCount > 0
          ? `${conflictingReportsCount} active barrier report(s) conflict with current path status.`
          : 'Path verification is currently marked disputed pending human field inspection.',
    };
  }

  if (edge.verificationStatus === 'unknown') {
    return {
      edgeId: edge.id,
      edgeName: edge.name,
      trustState: 'UNKNOWN',
      lastVerifiedAt: edge.lastVerifiedAt,
      verificationExpiresAt: edge.verificationExpiresAt,
      daysSinceVerification: computeDaysSince(edge.lastVerifiedAt, nowMs),
      conflictingReportsCount: 0,
      conflictingReportIds: [],
      requiresHumanReview: true,
      explanation: 'Accessibility attributes are unknown; field audit required before recommending in strict mode.',
    };
  }

  if (edge.verificationStatus === 'unverified') {
    return {
      edgeId: edge.id,
      edgeName: edge.name,
      trustState: 'UNVERIFIED',
      lastVerifiedAt: edge.lastVerifiedAt,
      verificationExpiresAt: edge.verificationExpiresAt,
      daysSinceVerification: computeDaysSince(edge.lastVerifiedAt, nowMs),
      conflictingReportsCount: 0,
      conflictingReportIds: [],
      requiresHumanReview: true,
      explanation: 'Path has not yet received human accessibility verification.',
    };
  }

  // Edge is marked 'verified' — evaluate freshness & expiration policy
  const daysSince = computeDaysSince(edge.lastVerifiedAt, nowMs);
  const expiresAtIso =
    edge.verificationExpiresAt ||
    (edge.lastVerifiedAt
      ? new Date(
          new Date(edge.lastVerifiedAt).getTime() +
            DEFAULT_VERIFICATION_EXPIRY_DAYS * 86_400_000
        ).toISOString()
      : undefined);

  const expiresMs = expiresAtIso ? new Date(expiresAtIso).getTime() : NaN;

  if (!edge.lastVerifiedAt || Number.isNaN(expiresMs)) {
    return {
      edgeId: edge.id,
      edgeName: edge.name,
      trustState: 'STALE',
      lastVerifiedAt: edge.lastVerifiedAt,
      verificationExpiresAt: expiresAtIso,
      daysSinceVerification: daysSince,
      conflictingReportsCount: 0,
      conflictingReportIds: [],
      requiresHumanReview: true,
      explanation: 'Verification timestamp is missing; re-inspection required under freshness policy.',
    };
  }

  if (expiresMs <= nowMs) {
    return {
      edgeId: edge.id,
      edgeName: edge.name,
      trustState: 'STALE',
      lastVerifiedAt: edge.lastVerifiedAt,
      verificationExpiresAt: expiresAtIso,
      daysSinceVerification: daysSince,
      conflictingReportsCount: 0,
      conflictingReportIds: [],
      requiresHumanReview: true,
      explanation: `Inspection expired (${daysSince ?? '?'} days old); re-verification recommended.`,
    };
  }

  const daysRemaining = Math.ceil((expiresMs - nowMs) / 86_400_000);
  if (daysRemaining <= EXPIRING_SOON_WINDOW_DAYS) {
    return {
      edgeId: edge.id,
      edgeName: edge.name,
      trustState: 'VERIFICATION_EXPIRING',
      lastVerifiedAt: edge.lastVerifiedAt,
      verificationExpiresAt: expiresAtIso,
      daysSinceVerification: daysSince,
      conflictingReportsCount: 0,
      conflictingReportIds: [],
      requiresHumanReview: false,
      explanation: `Verified inspection expires in ${daysRemaining} day(s); schedule follow-up audit.`,
    };
  }

  return {
    edgeId: edge.id,
    edgeName: edge.name,
    trustState: 'VERIFIED_CURRENT',
    lastVerifiedAt: edge.lastVerifiedAt,
    verificationExpiresAt: expiresAtIso,
    daysSinceVerification: daysSince,
    conflictingReportsCount: 0,
    conflictingReportIds: [],
    requiresHumanReview: false,
    explanation: 'Verified within active inspection policy window with zero conflicting reports.',
  };
}

function computeDaysSince(iso: string | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((nowMs - t) / 86_400_000));
}

export function summarizeRouteFreshness(assessments: EdgeTrustAssessment[]): RouteFreshnessSummary {
  let verifiedCurrent = 0;
  let expiring = 0;
  let stale = 0;
  let unverified = 0;
  let disputed = 0;
  let conflictingReportsCount = 0;

  let oldestTs = Infinity;
  let newestTs = -Infinity;

  for (const a of assessments) {
    conflictingReportsCount += a.conflictingReportsCount;
    if (a.trustState === 'VERIFIED_CURRENT') verifiedCurrent += 1;
    else if (a.trustState === 'VERIFICATION_EXPIRING') expiring += 1;
    else if (a.trustState === 'STALE') stale += 1;
    else if (a.trustState === 'DISPUTED') disputed += 1;
    else unverified += 1;

    if (a.lastVerifiedAt) {
      const ts = new Date(a.lastVerifiedAt).getTime();
      if (!Number.isNaN(ts)) {
        if (ts < oldestTs) oldestTs = ts;
        if (ts > newestTs) newestTs = ts;
      }
    }
  }

  let overallTrustState: TrustState = 'VERIFIED_CURRENT';
  if (assessments.some((a) => a.trustState === 'BLOCKED')) {
    overallTrustState = 'BLOCKED';
  } else if (disputed > 0) {
    overallTrustState = 'DISPUTED';
  } else if (unverified > 0) {
    overallTrustState = 'UNVERIFIED';
  } else if (stale > 0) {
    overallTrustState = 'STALE';
  } else if (expiring > 0) {
    overallTrustState = 'VERIFICATION_EXPIRING';
  }

  return {
    overallTrustState,
    verifiedSegmentsCount: verifiedCurrent,
    expiringSegmentsCount: expiring,
    staleSegmentsCount: stale,
    unverifiedSegmentsCount: unverified,
    disputedSegmentsCount: disputed,
    conflictingReportsCount,
    oldestInspectionAt: oldestTs < Infinity ? new Date(oldestTs).toISOString() : undefined,
    newestInspectionAt: newestTs > -Infinity ? new Date(newestTs).toISOString() : undefined,
  };
}

export function computeBuildingTrustCoverage(
  buildings: BuildingDTO[],
  locations: LocationNodeDTO[],
  edges: PathEdgeDTO[],
  reports: AccessibilityReportDTO[] = []
): BuildingTrustCoverage[] {
  const nodeBuilding = new Map<string, string>();
  for (const loc of locations) {
    if (loc.buildingId) nodeBuilding.set(loc.id, loc.buildingId);
  }

  const assessmentsByEdgeId = new Map<string, EdgeTrustAssessment>();
  for (const edge of edges) {
    assessmentsByEdgeId.set(edge.id, assessEdgeTrust(edge, reports));
  }

  return buildings.map((b) => {
    const connectedEdges = edges.filter(
      (e) => nodeBuilding.get(e.fromNodeId) === b.id || nodeBuilding.get(e.toNodeId) === b.id
    );
    let verifiedCurrentCount = 0;
    let expiringCount = 0;
    let staleCount = 0;
    let disputedCount = 0;

    for (const e of connectedEdges) {
      const a = assessmentsByEdgeId.get(e.id)!;
      if (a.trustState === 'VERIFIED_CURRENT') verifiedCurrentCount += 1;
      else if (a.trustState === 'VERIFICATION_EXPIRING') expiringCount += 1;
      else if (a.trustState === 'STALE') staleCount += 1;
      else if (a.trustState === 'DISPUTED') disputedCount += 1;
    }

    const totalEdges = connectedEdges.length;
    const coveragePercent =
      totalEdges === 0
        ? 0
        : Math.round(((verifiedCurrentCount + expiringCount) / totalEdges) * 100);

    return {
      buildingId: b.id,
      buildingName: b.name,
      buildingCode: b.code,
      totalEdges,
      verifiedCurrentCount,
      expiringCount,
      staleCount,
      disputedCount,
      coveragePercent,
    };
  });
}
