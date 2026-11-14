import type {
  AccessibilityPreferences,
  AccessibilityReportDTO,
  CalculatedRouteDTO,
  EdgeTrustAssessment,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
  RouteCalculationResultDTO,
  RouteStepDTO,
} from '../../../../shared/types.ts';
import { assessEdgeTrust, summarizeRouteFreshness } from '../trust/trustEngine.ts';

export interface RouteOptions {
  campusId: string;
  fromNodeId: string;
  toNodeId: string;
  preferences: AccessibilityPreferences;
  allowUnverifiedFallback?: boolean;
  includeAlternatives?: boolean;
  algorithm?: 'dijkstra' | 'astar';
  topK?: number;
  liveFacilities?: LiveFacilityStatusDTO[];
  reports?: AccessibilityReportDTO[];
  emergencyMode?: boolean;
}

interface DirectedStep {
  edge: PathEdgeDTO;
  fromId: string;
  toId: string;
  trust: EdgeTrustAssessment;
}

interface HeapItem {
  nodeId: string;
  priority: number;
  gScore: number;
}

class BinaryMinHeap {
  private heap: HeapItem[] = [];

  get size(): number {
    return this.heap.length;
  }

  push(item: HeapItem): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): HeapItem | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    const item = this.heap[index];
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.heap[parentIdx];
      if (item.priority >= parent.priority) break;
      this.heap[parentIdx] = item;
      this.heap[index] = parent;
      index = parentIdx;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const item = this.heap[index];
    while (true) {
      const leftIdx = 2 * index + 1;
      const rightIdx = 2 * index + 2;
      let swapIdx = -1;

      if (leftIdx < length && this.heap[leftIdx].priority < item.priority) {
        swapIdx = leftIdx;
      }
      if (rightIdx < length) {
        const rightLessThanCompare =
          swapIdx === -1
            ? this.heap[rightIdx].priority < item.priority
            : this.heap[rightIdx].priority < this.heap[swapIdx].priority;
        if (rightLessThanCompare) {
          swapIdx = rightIdx;
        }
      }
      if (swapIdx === -1) break;
      this.heap[index] = this.heap[swapIdx];
      this.heap[swapIdx] = item;
      index = swapIdx;
    }
  }
}

function haversineMeters(a?: LocationNodeDTO, b?: LocationNodeDTO): number {
  if (!a || !b) return 0;
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function describeAppliedConstraints(prefs: AccessibilityPreferences): string[] {
  const constraints: string[] = ['Blocked & outage paths excluded'];
  if (prefs.wheelchairMode) {
    constraints.push('Wheelchair mode (stairs excluded, min width 1.2m, verified surfaces)');
  }
  if (prefs.stepFreeMode) {
    constraints.push('Step-free route (stairs excluded, unverified ramps/elevators excluded)');
  }
  if (prefs.limitedMobilityMode) {
    constraints.push('Limited mobility (steep slopes & unverified paths penalized/excluded)');
  }
  if (prefs.stairsAvoidance && !prefs.wheelchairMode && !prefs.stepFreeMode) {
    constraints.push('Stairs avoidance');
  }
  if (prefs.rampRequired) {
    constraints.push('Verified ramp required on elevation changes');
  }
  if (prefs.elevatorRequired) {
    constraints.push('Operational elevator required for multi-floor paths');
  }
  if (prefs.smoothSurfacePreference) {
    constraints.push('Smooth surface preference');
  }
  if (prefs.widePathPreference) {
    constraints.push('Wide path (>= 1.5m)');
  }
  if (prefs.lowGradientPreference) {
    constraints.push('Low gradient (<= 5% slope)');
  }
  if (prefs.wellLitPreference) {
    constraints.push('Well-lit paths prioritized');
  }
  return constraints;
}

/**
 * Evaluates whether an edge satisfies hard accessibility filtering rules BEFORE optimization.
 * Returns null if allowed, or a human-readable rejection reason if filtered out.
 */
export function evaluateEdgeEligibility(
  edge: PathEdgeDTO,
  fromNode: LocationNodeDTO | undefined,
  toNode: LocationNodeDTO | undefined,
  prefs: AccessibilityPreferences,
  allowUnverifiedFallback = false,
  liveFacilities: LiveFacilityStatusDTO[] = [],
  emergencyMode = false
): string | null {
  // 1. Blocked or temporary closure is ALWAYS excluded
  if (edge.status === 'blocked' || edge.temporaryClosure) {
    return edge.closureReason
      ? `Blocked path (${edge.name}): ${edge.closureReason}`
      : `Blocked path (${edge.name})`;
  }

  // Check LiveFacilityStatus outages tied to this edge or endpoint nodes
  const affectingFacilities = liveFacilities.filter(
    (f) =>
      f.edgeId === edge.id ||
      f.locationNodeId === edge.fromNodeId ||
      f.locationNodeId === edge.toNodeId
  );
  for (const fac of affectingFacilities) {
    if (fac.status === 'outage' || fac.status === 'closed') {
      if (fac.facilityType === 'elevator' && edge.elevatorAvailable) {
        return `Elevator outage (${fac.name} — ${fac.source})`;
      }
      if (fac.edgeId === edge.id) {
        return `Live facility closure (${fac.name} — ${fac.status})`;
      }
    }
  }

  const strictAccessibility =
    prefs.wheelchairMode ||
    prefs.stepFreeMode ||
    prefs.limitedMobilityMode ||
    prefs.rampRequired ||
    prefs.elevatorRequired ||
    prefs.stairsAvoidance;

  // 2. Unknown/unverified/disputed accessibility must NEVER automatically be treated as accessible
  if ((strictAccessibility || emergencyMode) && !allowUnverifiedFallback) {
    if (
      edge.verificationStatus === 'unverified' ||
      edge.verificationStatus === 'unknown' ||
      edge.verificationStatus === 'disputed'
    ) {
      return `Unverified accessibility (${edge.name}: ${edge.verificationStatus})`;
    }
  }

  // 3. Stairs exclusion
  if (
    (prefs.wheelchairMode || prefs.stepFreeMode || prefs.stairsAvoidance || prefs.limitedMobilityMode || emergencyMode) &&
    edge.hasStairs
  ) {
    return `Contains stairs (${edge.name}: ${edge.stairCount || 'multiple'} steps)`;
  }

  // 4. Ramp verification on non-flat outdoor/transition edges when rampRequired or stepFree
  if (prefs.stepFreeMode || prefs.rampRequired || emergencyMode) {
    if (edge.slopePercent > 5 && !edge.rampAvailable && !edge.elevatorAvailable) {
      return `Steep slope without verified ramp (${edge.name}: ${edge.slopePercent}%)`;
    }
    if (edge.rampAvailable && !edge.rampVerified && !allowUnverifiedFallback) {
      return `Unverified ramp (${edge.name})`;
    }
  }

  // 5. Elevator operational check for multi-floor transitions
  const isFloorChange =
    edge.indoorFloorTransition ||
    (fromNode && toNode && fromNode.floor !== toNode.floor);
  if (isFloorChange) {
    if (edge.hasStairs && (prefs.wheelchairMode || prefs.stepFreeMode || prefs.elevatorRequired || emergencyMode)) {
      return `Floor transition uses stairs (${edge.name})`;
    }
    if (edge.elevatorAvailable && !edge.elevatorOperational) {
      return `Elevator out of service (${edge.name})`;
    }
    if (prefs.elevatorRequired && !edge.elevatorAvailable && !edge.rampAvailable) {
      return `No operational elevator for floor change (${edge.name})`;
    }
  }

  // 6. Width & Surface hard constraints for wheelchair & emergency evacuation modes
  if (prefs.wheelchairMode || emergencyMode) {
    if (edge.widthMeters < 1.2) {
      return `Path too narrow for wheelchair (${edge.name}: ${edge.widthMeters}m < 1.2m)`;
    }
    if (edge.surface === 'unpaved_rough' || edge.surface === 'cobblestone') {
      return `Unsuitable rough surface for wheelchair (${edge.name}: ${edge.surface})`;
    }
    if (edge.slopePercent > 8.5) {
      return `Gradient exceeds safe wheelchair threshold (${edge.name}: ${edge.slopePercent}%)`;
    }
  }

  if (prefs.widePathPreference && edge.widthMeters < 1.5) {
    return `Path narrower than wide-path preference (${edge.name}: ${edge.widthMeters}m < 1.5m)`;
  }

  if (prefs.lowGradientPreference && edge.slopePercent > 5) {
    return `Slope exceeds low-gradient preference (${edge.name}: ${edge.slopePercent}% > 5%)`;
  }

  if (
    prefs.smoothSurfacePreference &&
    (edge.surface === 'cobblestone' || edge.surface === 'unpaved_rough')
  ) {
    return `Rough surface (${edge.name}: ${edge.surface})`;
  }

  return null;
}

/**
 * Multi-objective traversal cost: distance + safety caution + lighting + gradient + freshness weighting + penalty for distinct alternatives.
 */
function computeEdgeWeight(
  step: DirectedStep,
  prefs: AccessibilityPreferences,
  penalizedEdgeCounts: Map<string, number>
): number {
  const { edge, trust } = step;
  let weight = edge.distanceMeters;

  if (edge.status === 'caution') {
    weight *= 1.35;
  }
  if (trust.trustState === 'STALE') {
    weight *= 1.3;
  } else if (trust.trustState === 'VERIFICATION_EXPIRING') {
    weight *= 1.12;
  } else if (trust.trustState === 'UNVERIFIED' || trust.trustState === 'UNKNOWN') {
    weight *= 1.65;
  }

  if (prefs.wellLitPreference) {
    if (edge.lighting === 'poor') weight *= 2.5;
    else if (edge.lighting === 'moderate') weight *= 1.3;
  }
  if (prefs.lowGradientPreference || prefs.wheelchairMode) {
    weight += edge.slopePercent * 4;
  }
  if (edge.surface === 'brick_paver' && prefs.smoothSurfacePreference) {
    weight *= 1.2;
  }

  const repeatCount = penalizedEdgeCounts.get(edge.id) || 0;
  if (repeatCount > 0) {
    weight *= 1 + repeatCount * 3.0;
  }
  return weight;
}

function runShortestPathSearch(
  fromNodeId: string,
  toNodeId: string,
  adjacency: Map<string, DirectedStep[]>,
  nodeMap: Map<string, LocationNodeDTO>,
  prefs: AccessibilityPreferences,
  penalizedEdgeCounts: Map<string, number>,
  algorithm: 'dijkstra' | 'astar'
): DirectedStep[] | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; step: DirectedStep }>();
  const visited = new Set<string>();
  const pq = new BinaryMinHeap();
  const goalNode = nodeMap.get(toNodeId);

  dist.set(fromNodeId, 0);
  pq.push({
    nodeId: fromNodeId,
    gScore: 0,
    priority:
      algorithm === 'astar'
        ? haversineMeters(nodeMap.get(fromNodeId), goalNode)
        : 0,
  });

  while (pq.size > 0) {
    const current = pq.pop()!;
    if (visited.has(current.nodeId)) continue;
    if (current.nodeId === toNodeId) break;
    visited.add(current.nodeId);

    const neighbors = adjacency.get(current.nodeId) || [];
    for (const step of neighbors) {
      if (visited.has(step.toId)) continue;
      const weight = computeEdgeWeight(step, prefs, penalizedEdgeCounts);
      const alt = current.gScore + weight;
      if (alt < (dist.get(step.toId) ?? Infinity)) {
        dist.set(step.toId, alt);
        prev.set(step.toId, { nodeId: current.nodeId, step });
        const heuristic =
          algorithm === 'astar' ? haversineMeters(nodeMap.get(step.toId), goalNode) : 0;
        pq.push({
          nodeId: step.toId,
          gScore: alt,
          priority: alt + heuristic,
        });
      }
    }
  }

  if (!prev.has(toNodeId)) return null;

  const path: DirectedStep[] = [];
  let curr = toNodeId;
  while (curr !== fromNodeId) {
    const entry = prev.get(curr);
    if (!entry) break;
    path.unshift(entry.step);
    curr = entry.nodeId;
  }
  return path;
}

function buildCalculatedRoute(
  id: string,
  label: string,
  isPrimary: boolean,
  stepsDirected: DirectedStep[],
  nodeMap: Map<string, LocationNodeDTO>,
  prefs: AccessibilityPreferences,
  algorithmUsed: 'dijkstra' | 'astar',
  primaryEdgeIds?: Set<string>
): CalculatedRouteDTO {
  const walkingSpeedMps = prefs.wheelchairMode || prefs.limitedMobilityMode ? 0.95 : 1.25;
  let totalDistance = 0;
  let totalMinutes = 0;
  const warnings: string[] = [];
  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  const coordinates: [number, number][] = [];
  let hasCaution = false;
  let hasUnverified = false;
  let hasStale = false;
  let rampCount = 0;
  let elevatorCount = 0;

  if (stepsDirected.length > 0) {
    const startNode = nodeMap.get(stepsDirected[0].fromId);
    nodeIds.push(stepsDirected[0].fromId);
    if (startNode) coordinates.push([startNode.lat, startNode.lng]);
  }

  const assessments: EdgeTrustAssessment[] = stepsDirected.map((s) => s.trust);

  const routeSteps: RouteStepDTO[] = stepsDirected.map((s) => {
    const fromN = nodeMap.get(s.fromId);
    const toN = nodeMap.get(s.toId);
    const stepMinutes = Math.max(
      0.2,
      Number(
        ((s.edge.distanceMeters / walkingSpeedMps) / 60 + (s.edge.elevatorAvailable ? 0.6 : 0)).toFixed(1)
      )
    );
    totalDistance += s.edge.distanceMeters;
    totalMinutes += stepMinutes;
    nodeIds.push(s.toId);
    edgeIds.push(s.edge.id);
    if (toN) coordinates.push([toN.lat, toN.lng]);

    const stepWarnings: string[] = [];
    if (s.edge.status === 'caution') {
      hasCaution = true;
      const msg = s.edge.closureReason || 'Proceed with caution due to surface condition.';
      stepWarnings.push(msg);
      warnings.push(`${s.edge.name}: ${msg}`);
    }
    if (s.edge.verificationStatus !== 'verified') {
      hasUnverified = true;
      const msg = `Path verification status is "${s.edge.verificationStatus}" (NOT verified).`;
      stepWarnings.push(msg);
      warnings.push(`${s.edge.name}: ${msg}`);
    } else if (s.trust.trustState === 'STALE') {
      hasStale = true;
      stepWarnings.push(s.trust.explanation);
      warnings.push(`${s.edge.name}: ${s.trust.explanation}`);
    } else if (s.trust.trustState === 'DISPUTED') {
      hasUnverified = true;
      stepWarnings.push(s.trust.explanation);
      warnings.push(`${s.edge.name}: ${s.trust.explanation}`);
    }

    if (s.edge.lighting === 'poor' && prefs.wellLitPreference) {
      stepWarnings.push('Low evening lighting reported.');
      warnings.push(`${s.edge.name}: Low evening lighting.`);
    }

    if (s.edge.rampAvailable && s.edge.rampVerified) rampCount++;
    if (s.edge.elevatorAvailable && s.edge.elevatorOperational) elevatorCount++;

    const floorNote =
      fromN && toN && fromN.floor !== toN.floor
        ? ` [Floor ${fromN.floor}F → ${toN.floor}F]`
        : '';

    const viaLabel = s.edge.elevatorAvailable
      ? `Use elevator via ${s.edge.name}${floorNote}`
      : s.edge.rampAvailable
      ? `Follow accessible ramp along ${s.edge.name}${floorNote}`
      : `Continue along ${s.edge.name}${floorNote}`;

    return {
      edgeId: s.edge.id,
      fromNodeId: s.fromId,
      fromName: fromN?.name || s.fromId,
      toNodeId: s.toId,
      toName: toN?.name || s.toId,
      instruction: `${viaLabel} toward ${toN?.name || s.toId} (~${s.edge.distanceMeters}m)`,
      distanceMeters: s.edge.distanceMeters,
      estimatedMinutes: stepMinutes,
      surface: s.edge.surface,
      slopePercent: s.edge.slopePercent,
      hasRamp: s.edge.rampAvailable,
      hasElevator: s.edge.elevatorAvailable,
      hasStairs: s.edge.hasStairs,
      lighting: s.edge.lighting,
      verificationStatus: s.edge.verificationStatus,
      trustState: s.trust.trustState,
      lastVerifiedAt: s.edge.lastVerifiedAt,
      warnings: stepWarnings,
    };
  });

  const trustSummary = summarizeRouteFreshness(assessments);

  // Accurate, honest reasoning (NEVER label unverified fallback paths as 100% verified!)
  const reasons: string[] = [];
  if (hasUnverified) {
    reasons.push(
      'Unverified fallback enabled: contains one or more unverified/disputed segments that require caution'
    );
  } else if (hasStale) {
    reasons.push(
      'Step-free graph traversal with stale verification warning on older inspection segment(s)'
    );
  } else {
    reasons.push('100% stairs-free and blocked-path-free verified graph traversal');
  }

  if (rampCount > 0) reasons.push(`Uses ${rampCount} verified accessible ramp segment(s)`);
  if (elevatorCount > 0) reasons.push(`Includes ${elevatorCount} operational elevator transition(s)`);
  if (!hasCaution && !hasUnverified && !hasStale) {
    reasons.push('All segments verified within freshness policy and open operational status');
  }

  // Condition confidence score (derived deterministically from segment verification freshness, never AI guesswork)
  let confidenceScore = 100;
  confidenceScore -= trustSummary.unverifiedSegmentsCount * 25;
  confidenceScore -= trustSummary.disputedSegmentsCount * 30;
  confidenceScore -= trustSummary.staleSegmentsCount * 12;
  confidenceScore -= trustSummary.expiringSegmentsCount * 5;
  if (hasCaution) confidenceScore -= 10;
  confidenceScore = Math.max(10, Math.min(100, confidenceScore));

  let diversityScore = 100;
  if (primaryEdgeIds && primaryEdgeIds.size > 0 && edgeIds.length > 0) {
    const overlap = edgeIds.filter((eid) => primaryEdgeIds.has(eid)).length;
    diversityScore = Math.max(0, Math.round((1 - overlap / edgeIds.length) * 100));
  }

  return {
    id,
    label,
    isPrimary,
    totalDistanceMeters: Math.round(totalDistance),
    estimatedMinutes: Math.max(1, Math.round(totalMinutes)),
    isEstimate: true,
    algorithmUsed,
    confidenceScore,
    diversityScore,
    nodeIds,
    edgeIds,
    coordinates,
    steps: routeSteps,
    reasons,
    warnings: Array.from(new Set(warnings)),
    verificationSummary: hasUnverified
      ? 'unverified_included'
      : hasStale
      ? 'contains_stale'
      : hasCaution
      ? 'contains_caution'
      : 'all_verified',
    trustSummary,
    constraintsApplied: describeAppliedConstraints(prefs),
  };
}

export function calculateAccessibleRoutes(
  nodes: LocationNodeDTO[],
  edges: PathEdgeDTO[],
  options: RouteOptions
): RouteCalculationResultDTO {
  const now = new Date().toISOString();
  const algorithm: 'dijkstra' | 'astar' = options.algorithm || 'dijkstra';
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const fromNode = nodeMap.get(options.fromNodeId);
  const toNode = nodeMap.get(options.toNodeId);

  if (!fromNode || !toNode) {
    return {
      found: false,
      campusId: options.campusId,
      fromNodeId: options.fromNodeId,
      toNodeId: options.toNodeId,
      reasonCode: 'NODE_NOT_FOUND',
      message: 'Selected origin or destination location was not found in this campus graph.',
      blockingFactors: ['Unknown campus location identifier'],
      routes: [],
      calculatedAt: now,
    };
  }

  if (options.fromNodeId === options.toNodeId) {
    return {
      found: false,
      campusId: options.campusId,
      fromNodeId: options.fromNodeId,
      toNodeId: options.toNodeId,
      reasonCode: 'SAME_ORIGIN_DESTINATION',
      message: 'Origin and destination are the same location.',
      blockingFactors: [],
      routes: [],
      calculatedAt: now,
    };
  }

  const adjacency = new Map<string, DirectedStep[]>();
  const rejectionReasons: string[] = [];
  const liveFacilities = options.liveFacilities || [];
  const reports = options.reports || [];

  for (const edge of edges) {
    const fNode = nodeMap.get(edge.fromNodeId);
    const tNode = nodeMap.get(edge.toNodeId);
    const rejection = evaluateEdgeEligibility(
      edge,
      fNode,
      tNode,
      options.preferences,
      options.allowUnverifiedFallback,
      liveFacilities,
      options.emergencyMode
    );

    if (rejection) {
      if (
        edge.fromNodeId === options.fromNodeId ||
        edge.toNodeId === options.fromNodeId ||
        edge.fromNodeId === options.toNodeId ||
        edge.toNodeId === options.toNodeId ||
        edge.status === 'blocked' ||
        rejection.includes('Elevator outage') ||
        rejection.includes('Live facility closure')
      ) {
        rejectionReasons.push(rejection);
      }
      continue;
    }

    const trust = assessEdgeTrust(edge, reports);

    if (!adjacency.has(edge.fromNodeId)) adjacency.set(edge.fromNodeId, []);
    adjacency
      .get(edge.fromNodeId)!
      .push({ edge, fromId: edge.fromNodeId, toId: edge.toNodeId, trust });

    if (edge.bidirectional) {
      if (!adjacency.has(edge.toNodeId)) adjacency.set(edge.toNodeId, []);
      adjacency
        .get(edge.toNodeId)!
        .push({ edge, fromId: edge.toNodeId, toId: edge.fromNodeId, trust });
    }
  }

  const penalizedCounts = new Map<string, number>();
  const primarySteps = runShortestPathSearch(
    options.fromNodeId,
    options.toNodeId,
    adjacency,
    nodeMap,
    options.preferences,
    penalizedCounts,
    algorithm
  );

  if (!primarySteps) {
    return {
      found: false,
      campusId: options.campusId,
      fromNodeId: options.fromNodeId,
      toNodeId: options.toNodeId,
      reasonCode: 'NO_VERIFIED_ACCESSIBLE_ROUTE',
      message:
        'No verified accessible route satisfies your current accessibility constraints between these locations. AccessPath will not invent or recommend unverified or stepped paths.',
      blockingFactors:
        rejectionReasons.length > 0
          ? Array.from(new Set(rejectionReasons)).slice(0, 6)
          : ['No connected verified segments satisfy all selected constraints'],
      routes: [],
      calculatedAt: now,
    };
  }

  const primaryRoute = buildCalculatedRoute(
    'route_primary',
    primarySteps.some((s) => s.edge.verificationStatus !== 'verified')
      ? 'Recommended Fallback Route (Contains Unverified Segments)'
      : 'Recommended Verified Route',
    true,
    primarySteps,
    nodeMap,
    options.preferences,
    algorithm
  );

  const routes: CalculatedRouteDTO[] = [primaryRoute];
  const seenKeys = new Set<string>([primarySteps.map((s) => s.edge.id).join(',')]);
  const desiredCount = options.includeAlternatives === false ? 1 : Math.max(1, Math.min(3, options.topK ?? 2));
  const primaryEdgeSet = new Set(primaryRoute.edgeIds);

  if (desiredCount > 1 && primarySteps.length > 0) {
    // Iteratively penalize used route segments to surface up to Top-K distinct alternatives
    let lastSteps = primarySteps;
    for (let attempt = 1; attempt < desiredCount + 2 && routes.length < desiredCount; attempt++) {
      for (const s of lastSteps) {
        penalizedCounts.set(s.edge.id, (penalizedCounts.get(s.edge.id) || 0) + 1);
      }
      const altSteps = runShortestPathSearch(
        options.fromNodeId,
        options.toNodeId,
        adjacency,
        nodeMap,
        options.preferences,
        penalizedCounts,
        algorithm
      );
      if (!altSteps) break;
      const key = altSteps.map((s) => s.edge.id).join(',');
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const altLabel = altSteps.some((s) => s.edge.verificationStatus !== 'verified')
          ? `Alternative Route ${routes.length} (Unverified Segment Warning)`
          : `Alternative Verified Route ${routes.length === 1 ? '' : routes.length}`.trim();
        routes.push(
          buildCalculatedRoute(
            `route_alt_${routes.length}`,
            altLabel,
            false,
            altSteps,
            nodeMap,
            options.preferences,
            algorithm,
            primaryEdgeSet
          )
        );
      }
      lastSteps = altSteps;
    }
  }

  const hasAnyUnverified = routes.some((r) => r.verificationSummary === 'unverified_included');
  const summaryMsg = hasAnyUnverified
    ? `Found ${routes.length} route option(s) with UNVERIFIED segment warnings enabled. Review cautions before travel.`
    : `Found ${routes.length} verified accessible route(s) via ${algorithm.toUpperCase()}. Travel times and distances are estimates.`;

  return {
    found: true,
    campusId: options.campusId,
    fromNodeId: options.fromNodeId,
    toNodeId: options.toNodeId,
    message: summaryMsg,
    blockingFactors: Array.from(new Set(rejectionReasons)).slice(0, 4),
    routes,
    calculatedAt: now,
  };
}
