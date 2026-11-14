import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '../src/repositories/db.ts';
import { seedDatabaseIfEmpty } from '../src/jobs/seed.ts';
import { calculateAccessibleRoutes } from '../src/services/routing/dijkstra.ts';
import { assessEdgeTrust } from '../src/services/trust/trustEngine.ts';
import type {
  AccessibilityPreferences,
  EmergencyRouteDTO,
  FloorPlanDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
  RouteStepDTO,
} from '../../shared/types.ts';

const basePrefs: AccessibilityPreferences = {
  wheelchairMode: true,
  stepFreeMode: true,
  limitedMobilityMode: false,
  rampRequired: true,
  elevatorRequired: true,
  stairsAvoidance: true,
  smoothSurfacePreference: true,
  widePathPreference: true,
  lowGradientPreference: true,
  wellLitPreference: false,
  visualAssistanceMode: false,
  customNotes: '',
};

let locations: LocationNodeDTO[] = [];
let edges: PathEdgeDTO[] = [];
let liveFacilities: LiveFacilityStatusDTO[] = [];
let floorPlans: FloorPlanDTO[] = [];
let emergencyRoutes: EmergencyRouteDTO[] = [];

beforeAll(async () => {
  await db.connect({ memoryOnly: true });
  db.resetMemory();
  await seedDatabaseIfEmpty();
  locations = await db.find<LocationNodeDTO>('locations', { campusId: 'campus_demo_north' });
  edges = await db.find<PathEdgeDTO>('pathEdges', { campusId: 'campus_demo_north' });
  liveFacilities = await db.find<LiveFacilityStatusDTO>('liveFacilities', {
    campusId: 'campus_demo_north',
  });
  floorPlans = await db.find<FloorPlanDTO>('floorPlans', { campusId: 'campus_demo_north' });
  emergencyRoutes = await db.find<EmergencyRouteDTO>('emergencyRoutes', {
    campusId: 'campus_demo_north',
  });
});

describe('AccessPath Routing Engine, Trust Engine, Indoor & Live Facility Routing', () => {
  it('1. calculates shortest verified step-free path from Main Gate to Central Library', () => {
    const res = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_main_gate',
      toNodeId: 'loc_library_entrance',
      preferences: basePrefs,
    });
    expect(res.found).toBe(true);
    expect(res.routes.length).toBeGreaterThanOrEqual(1);
    const primary = res.routes[0];
    expect(primary.totalDistanceMeters).toBeGreaterThan(0);
    expect(primary.estimatedMinutes).toBeGreaterThan(0);
    expect(primary.isEstimate).toBe(true);
    expect(primary.steps.every((s: RouteStepDTO) => !s.hasStairs)).toBe(true);
  });

  it('2. excludes stairs in wheelchair mode (Student Union -> Science Hall never uses East Quad Stairs)', () => {
    const res = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_student_union',
      toNodeId: 'loc_science_hall',
      preferences: basePrefs,
    });
    expect(res.found).toBe(true);
    const usedEdges = res.routes[0].edgeIds;
    expect(usedEdges).not.toContain('edge_11');
    expect(usedEdges).not.toContain('edge_12');
    expect(res.routes[0].steps.every((s: RouteStepDTO) => !s.hasStairs)).toBe(true);
  });

  it('3. excludes blocked paths (Cafeteria -> Science Hall never uses blocked East Utility Trench edge_13)', () => {
    const res = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_cafeteria',
      toNodeId: 'loc_science_hall',
      preferences: basePrefs,
    });
    expect(res.found).toBe(true);
    expect(res.routes[0].edgeIds).not.toContain('edge_13');
    expect(res.blockingFactors.some((b: string) => b.includes('Blocked'))).toBe(true);
  });

  it('4. excludes unverified paths under strict step-free mode and reports NO_VERIFIED_ACCESSIBLE_ROUTE for Heritage Arts Annex', () => {
    const res = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_main_gate',
      toNodeId: 'loc_heritage_arts',
      preferences: basePrefs,
    });
    expect(res.found).toBe(false);
    expect(res.reasonCode).toBe('NO_VERIFIED_ACCESSIBLE_ROUTE');
    expect(res.blockingFactors.length).toBeGreaterThan(0);
  });

  it('5. provides an alternative verified route when multiple accessible paths exist (default top-2)', () => {
    const res = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_main_gate',
      toNodeId: 'loc_library_entrance',
      preferences: basePrefs,
      includeAlternatives: true,
    });
    expect(res.found).toBe(true);
    expect(res.routes.length).toBe(2);
    expect(res.routes[0].edgeIds.join(',')).not.toBe(res.routes[1].edgeIds.join(','));
  });

  it('6. recalculates around newly closed edge when temporary closure is applied', () => {
    const modifiedEdges = edges.map((e) =>
      e.id === 'edge_07' ? { ...e, status: 'blocked' as const, temporaryClosure: true } : e
    );
    const res = calculateAccessibleRoutes(locations, modifiedEdges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_ramp_plaza',
      toNodeId: 'loc_library_entrance',
      preferences: basePrefs,
    });
    expect(res.found).toBe(true);
    expect(res.routes[0].edgeIds).not.toContain('edge_07');
  });

  it('7. excludes unverified West Perimeter Trail (edge_26) even if shorter or alternate', () => {
    const res = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_auditorium',
      toNodeId: 'loc_north_lecture',
      preferences: basePrefs,
    });
    expect(res.found).toBe(true);
    for (const r of res.routes) {
      expect(r.edgeIds).not.toContain('edge_26');
    }
  });

  it('8. Trust Engine accurately classifies STALE (edge_20) and VERIFICATION_EXPIRING (edge_09)', () => {
    const staleEdge = edges.find((e) => e.id === 'edge_20')!;
    const expiringEdge = edges.find((e) => e.id === 'edge_09')!;
    const currentEdge = edges.find((e) => e.id === 'edge_01')!;

    expect(assessEdgeTrust(staleEdge).trustState).toBe('STALE');
    expect(assessEdgeTrust(expiringEdge).trustState).toBe('VERIFICATION_EXPIRING');
    expect(assessEdgeTrust(currentEdge).trustState).toBe('VERIFIED_CURRENT');
  });

  it('9. unverified fallback messaging NEVER falsely claims 100% verified route', () => {
    const testEdges: PathEdgeDTO[] = edges.map((e) =>
      e.id === 'edge_22'
        ? {
            ...e,
            widthMeters: 1.8,
            surface: 'asphalt',
            slopePercent: 2.5,
            rampAvailable: true,
            rampVerified: false,
            verificationStatus: 'unverified',
          }
        : e
    );
    const strictBlocked = calculateAccessibleRoutes(locations, testEdges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_main_gate',
      toNodeId: 'loc_heritage_arts',
      preferences: basePrefs,
      allowUnverifiedFallback: false,
    });
    expect(strictBlocked.found).toBe(false);

    const res = calculateAccessibleRoutes(locations, testEdges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_main_gate',
      toNodeId: 'loc_heritage_arts',
      preferences: basePrefs,
      allowUnverifiedFallback: true,
    });
    expect(res.found).toBe(true);
    const route = res.routes[0];
    expect(route.verificationSummary).toBe('unverified_included');
    expect(route.reasons.join(' ').toLowerCase()).not.toContain('100% verified');
    expect(route.warnings.some((w) => w.toLowerCase().includes('unverified'))).toBe(true);
  });

  it('10. live elevator outage excludes Science Elevator edge_19 from accessible route', () => {
    const outageFacilities = liveFacilities.map((f) =>
      f.id === 'fac_sci_elv' ? { ...f, status: 'outage' as const } : f
    );
    const res = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_science_hall',
      toNodeId: 'loc_computer_lab',
      preferences: basePrefs,
      liveFacilities: outageFacilities,
    });
    expect(res.found).toBe(false);
    expect(res.reasonCode).toBe('NO_VERIFIED_ACCESSIBLE_ROUTE');
  });

  it('11. supports Top-3 alternative routes with diversity & confidence scores and A* optimal parity', () => {
    const dijkstraRes = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_main_gate',
      toNodeId: 'loc_library_entrance',
      preferences: basePrefs,
      algorithm: 'dijkstra',
      includeAlternatives: true,
      topK: 3,
    });
    const astarRes = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_main_gate',
      toNodeId: 'loc_library_entrance',
      preferences: basePrefs,
      algorithm: 'astar',
      includeAlternatives: true,
      topK: 3,
    });

    expect(dijkstraRes.found).toBe(true);
    expect(astarRes.found).toBe(true);
    expect(astarRes.routes[0].algorithmUsed).toBe('astar');
    expect(astarRes.routes[0].totalDistanceMeters).toBe(dijkstraRes.routes[0].totalDistanceMeters);
    expect(dijkstraRes.routes.length).toBeGreaterThanOrEqual(2);
    expect(dijkstraRes.routes.length).toBeLessThanOrEqual(3);
    expect(typeof dijkstraRes.routes[0].confidenceScore).toBe('number');
    expect(typeof dijkstraRes.routes[1].diversityScore).toBe('number');
  });

  it('12. validates multi-floor indoor FloorPlans & accessible Library Floor 0 -> Floor 2 route + emergency approval status', () => {
    expect(floorPlans.some((f) => f.buildingId === 'bldg_lib' && f.floorNumber === 2)).toBe(true);
    const indoorRes = calculateAccessibleRoutes(locations, edges, {
      campusId: 'campus_demo_north',
      fromNodeId: 'loc_library_entrance',
      toNodeId: 'loc_library_reading_2f',
      preferences: basePrefs,
    });
    expect(indoorRes.found).toBe(true);
    expect(indoorRes.routes[0].edgeIds).toContain('edge_14');

    const approved = emergencyRoutes.filter((r) => r.adminApproved);
    const unapproved = emergencyRoutes.filter((r) => !r.adminApproved);
    expect(approved.length).toBeGreaterThanOrEqual(2);
    expect(unapproved.length).toBeGreaterThanOrEqual(1);
  });
});
