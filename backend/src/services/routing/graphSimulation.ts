import type {
  AccessibilityPreferences,
  BuildingDTO,
  AccessibilityReportDTO,
  CalculatedRouteDTO,
  CampusDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../../../shared/types.ts';
import { calculateAccessibleRoutes } from './dijkstra.ts';

export type GraphSimulationAction = 'fixed' | 'closed' | 'ramp_added';

export interface GraphSimulationRoutePair {
  fromNodeId: string;
  toNodeId: string;
}

export interface GraphSimulationInput {
  campus: CampusDTO;
  buildings: BuildingDTO[];
  locations: LocationNodeDTO[];
  edges: PathEdgeDTO[];
  liveFacilities: LiveFacilityStatusDTO[];
  reports: AccessibilityReportDTO[];
  edgeId: string;
  action: GraphSimulationAction;
  routePairs: GraphSimulationRoutePair[];
  preferences: AccessibilityPreferences;
}

export interface GraphSimulationRouteChange {
  fromNodeId: string;
  toNodeId: string;
  beforeFound: boolean;
  afterFound: boolean;
  beforeDistanceMeters: number | null;
  afterDistanceMeters: number | null;
  beforeRouteEdgeIds: string[];
  afterRouteEdgeIds: string[];
}

export interface GraphSimulationResult {
  simulationOnly: true;
  simulatedAt: string;
  campusId: string;
  edgeId: string;
  action: GraphSimulationAction;
  verificationPreserved: true;
  unlockedRoutes: GraphSimulationRouteChange[];
  lostRoutes: GraphSimulationRouteChange[];
  unchangedRoutes: GraphSimulationRouteChange[];
  buildingsAffected: Array<{ id: string; name: string }>;
  changes: {
    before: Pick<PathEdgeDTO, 'status' | 'temporaryClosure' | 'rampAvailable' | 'rampVerified' | 'verificationStatus'>;
    after: Pick<PathEdgeDTO, 'status' | 'temporaryClosure' | 'rampAvailable' | 'rampVerified' | 'verificationStatus'>;
  };
  notes: string[];
}

const routeSummary = (route?: CalculatedRouteDTO) => ({
  found: Boolean(route),
  distanceMeters: route?.totalDistanceMeters ?? null,
  edgeIds: route?.edgeIds ?? [],
});

/**
 * Applies a hypothetical edge change to a detached graph copy and compares
 * the existing verified-route engine before/after. This function never writes
 * to the repository, and deliberately never upgrades verification state.
 */
export function simulateGraphChange(input: GraphSimulationInput): GraphSimulationResult {
  const target = input.edges.find((edge) => edge.id === input.edgeId);
  if (!target || target.campusId !== input.campus.id) {
    throw new Error('Simulation edge not found in the selected campus graph');
  }

  const beforeEdge = {
    status: target.status,
    temporaryClosure: target.temporaryClosure,
    rampAvailable: target.rampAvailable,
    rampVerified: target.rampVerified,
    verificationStatus: target.verificationStatus,
  };

  // Copy every record before applying the hypothetical edit. The source array
  // and its edge objects remain unchanged for all simulation actions.
  const simulatedEdges = input.edges.map((edge) => ({ ...edge }));
  const simulatedTarget = simulatedEdges.find((edge) => edge.id === input.edgeId)!;
  const notes: string[] = [];

  if (input.action === 'fixed') {
    simulatedTarget.status = 'open';
    simulatedTarget.temporaryClosure = false;
    delete simulatedTarget.closureReason;
    notes.push('A simulated repair clears the edge closure only; it does not verify the segment.');
  } else if (input.action === 'closed') {
    simulatedTarget.status = 'blocked';
    simulatedTarget.temporaryClosure = true;
    simulatedTarget.closureReason = 'Closed in a what-if simulation';
    notes.push('The edge is blocked in the simulation only. Production graph data is unchanged.');
  } else {
    simulatedTarget.rampAvailable = true;
    // A digital simulation cannot establish physical evidence or human approval.
    simulatedTarget.rampVerified = false;
    notes.push('The proposed ramp remains unverified and is excluded from strict accessible routing.');
  }

  // Keep verification status invariant even if the selected action is "fixed".
  simulatedTarget.verificationStatus = target.verificationStatus;

  const calculate = (edges: PathEdgeDTO[], pair: GraphSimulationRoutePair) =>
    calculateAccessibleRoutes(input.locations, edges, {
      campusId: input.campus.id,
      fromNodeId: pair.fromNodeId,
      toNodeId: pair.toNodeId,
      preferences: input.preferences,
      allowUnverifiedFallback: false,
      includeAlternatives: false,
      algorithm: 'dijkstra',
      topK: 1,
      liveFacilities: input.liveFacilities,
      reports: input.reports,
    });

  const unlockedRoutes: GraphSimulationRouteChange[] = [];
  const lostRoutes: GraphSimulationRouteChange[] = [];
  const unchangedRoutes: GraphSimulationRouteChange[] = [];

  for (const pair of input.routePairs) {
    const before = calculate(input.edges, pair);
    const after = calculate(simulatedEdges, pair);
    const beforeRoute = before.found ? before.routes[0] : undefined;
    const afterRoute = after.found ? after.routes[0] : undefined;
    const beforeSummary = routeSummary(beforeRoute);
    const afterSummary = routeSummary(afterRoute);
    const change: GraphSimulationRouteChange = {
      fromNodeId: pair.fromNodeId,
      toNodeId: pair.toNodeId,
      beforeFound: beforeSummary.found,
      afterFound: afterSummary.found,
      beforeDistanceMeters: beforeSummary.distanceMeters,
      afterDistanceMeters: afterSummary.distanceMeters,
      beforeRouteEdgeIds: beforeSummary.edgeIds,
      afterRouteEdgeIds: afterSummary.edgeIds,
    };

    if (!before.found && after.found) unlockedRoutes.push(change);
    else if (before.found && !after.found) lostRoutes.push(change);
    else unchangedRoutes.push(change);
  }

  // The selected segment's adjacent locations are affected even when a route
  // remains available (for example, a closure simulation that changes a
  // detour or a hypothetical improvement that shortens an existing route).
  const affectedNodeIds = new Set<string>([target.fromNodeId, target.toNodeId]);
  for (const route of [...unlockedRoutes, ...lostRoutes]) {
    affectedNodeIds.add(route.fromNodeId);
    affectedNodeIds.add(route.toNodeId);
  }
  const buildingIds = new Set(
    input.locations
      .filter((location) => affectedNodeIds.has(location.id) && location.buildingId)
      .map((location) => location.buildingId!)
  );
  const buildingsAffected = [...buildingIds].flatMap((id) => {
    const building = input.buildings.find((candidate) => candidate.id === id);
    return building ? [{ id, name: building.name }] : [{ id, name: id }];
  });

  return {
    simulationOnly: true,
    simulatedAt: new Date().toISOString(),
    campusId: input.campus.id,
    edgeId: input.edgeId,
    action: input.action,
    verificationPreserved: true,
    unlockedRoutes,
    lostRoutes,
    unchangedRoutes,
    buildingsAffected,
    changes: {
      before: beforeEdge,
      after: {
        status: simulatedTarget.status,
        temporaryClosure: simulatedTarget.temporaryClosure,
        rampAvailable: simulatedTarget.rampAvailable,
        rampVerified: simulatedTarget.rampVerified,
        verificationStatus: simulatedTarget.verificationStatus,
      },
    },
    notes,
  };
}
