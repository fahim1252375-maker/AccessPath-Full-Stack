import { describe, expect, it } from 'vitest';
import { simulateGraphChange } from '../src/services/routing/graphSimulation.ts';
import type {
  AccessibilityPreferences,
  BuildingDTO,
  CampusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../shared/types.ts';

const campus: CampusDTO = {
  id: 'campus_twin_test', institutionId: 'inst_twin_test', name: 'Twin Test Campus',
  shortCode: 'TWIN', city: 'Sylhet', description: '', centerLat: 24.9, centerLng: 91.8,
  defaultZoom: 17, graphVersion: 1, isDemoData: true, accessibilityScore: 50,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const buildings: BuildingDTO[] = [{
  id: 'building_twin', campusId: campus.id, name: 'Test Library', code: 'LIB', category: 'library',
  floors: 2, hasElevator: true, hasAccessibleEntrance: true, hasAccessibleRestroom: true,
  accessibilitySummary: 'Synthetic test fixture', lat: 24.9, lng: 91.8,
  verificationStatus: 'verified', isDemoData: true,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}];
const locations: LocationNodeDTO[] = ['a', 'b'].map((id, index) => ({
  id: `node_${id}`, campusId: campus.id, buildingId: 'building_twin', name: `Location ${id.toUpperCase()}`,
  type: index === 0 ? ('entrance' as const) : ('building' as const), floor: 0, lat: 24.9 + index * 0.0001,
  lng: 91.8 + index * 0.0001, description: '', isAccessibleEntrance: true, hasElevator: false,
  hasAccessibleRestroom: false, hasRamp: false, verificationStatus: 'verified' as const, facilities: [],
  isDemoData: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}));
const preferences: AccessibilityPreferences = {
  wheelchairMode: false, stepFreeMode: true, limitedMobilityMode: false, rampRequired: false,
  elevatorRequired: false, stairsAvoidance: true, smoothSurfacePreference: false,
  widePathPreference: false, lowGradientPreference: false, wellLitPreference: false,
  visualAssistanceMode: false, customNotes: '',
};
function makeEdge(overrides: Partial<PathEdgeDTO> = {}): PathEdgeDTO {
  return {
    id: 'edge_twin', campusId: campus.id, fromNodeId: 'node_a', toNodeId: 'node_b',
    bidirectional: true, name: 'Library approach', distanceMeters: 30, widthMeters: 1.8,
    surface: 'smooth_concrete', hasStairs: false, stairCount: 0, rampAvailable: false,
    rampVerified: false, slopePercent: 2, elevatorAvailable: false, elevatorOperational: true,
    lighting: 'well_lit', status: 'open', temporaryClosure: false, verificationStatus: 'verified',
    lastVerifiedAt: new Date().toISOString(), verificationExpiresAt: '2099-01-01T00:00:00.000Z',
    isDemoData: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const sharedInput = (edge: PathEdgeDTO, action: 'fixed' | 'closed' | 'ramp_added') => ({
  campus, buildings, locations, edges: [edge], liveFacilities: [], reports: [], edgeId: edge.id,
  action, routePairs: [{ fromNodeId: 'node_a', toNodeId: 'node_b' }], preferences,
});

describe('Accessibility Digital Twin — non-persistent what-if graph simulation', () => {
  it('unlocks a route on a copied graph after a simulated repair without changing production data', () => {
    const productionEdge = makeEdge({ status: 'blocked', temporaryClosure: true, closureReason: 'Construction' });
    const result = simulateGraphChange(sharedInput(productionEdge, 'fixed'));

    expect(result.simulationOnly).toBe(true);
    expect(result.unlockedRoutes).toHaveLength(1);
    expect(result.unlockedRoutes[0].afterFound).toBe(true);
    expect(result.buildingsAffected).toEqual([{ id: 'building_twin', name: 'Test Library' }]);
    expect(result.changes.after.status).toBe('open');
    expect(result.changes.after.verificationStatus).toBe('verified');
    expect(productionEdge.status).toBe('blocked');
    expect(productionEdge.temporaryClosure).toBe(true);
    expect(productionEdge.closureReason).toBe('Construction');
  });

  it('never promotes an unverified edge to verified when the scenario says fixed', () => {
    const productionEdge = makeEdge({
      status: 'blocked', temporaryClosure: true, verificationStatus: 'unverified',
    });
    const result = simulateGraphChange(sharedInput(productionEdge, 'fixed'));

    expect(result.verificationPreserved).toBe(true);
    expect(result.changes.after.verificationStatus).toBe('unverified');
    expect(result.unlockedRoutes).toHaveLength(0);
    expect(result.unchangedRoutes[0].afterFound).toBe(false);
  });

  it('keeps a proposed ramp explicitly unverified and excludes it from strict routing', () => {
    const productionEdge = makeEdge({ slopePercent: 7, rampAvailable: false, rampVerified: false });
    const result = simulateGraphChange(sharedInput(productionEdge, 'ramp_added'));

    expect(result.changes.after.rampAvailable).toBe(true);
    expect(result.changes.after.rampVerified).toBe(false);
    expect(result.unlockedRoutes).toHaveLength(0);
    expect(productionEdge.rampAvailable).toBe(false);
  });

  it('removes a route in a simulated closure without mutating the source edge', () => {
    const productionEdge = makeEdge();
    const result = simulateGraphChange(sharedInput(productionEdge, 'closed'));

    expect(result.lostRoutes).toHaveLength(1);
    expect(result.changes.after.status).toBe('blocked');
    expect(productionEdge.status).toBe('open');
    expect(productionEdge.temporaryClosure).toBe(false);
  });
});
