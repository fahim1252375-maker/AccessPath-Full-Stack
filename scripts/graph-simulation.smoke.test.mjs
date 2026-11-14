/**
 * Offline smoke tests for feature #215 (What-If Accessibility Digital Twin) and for
 * feature-catalog continuity. Run with `npm run test:simulation` (Node 22+, no installs needed).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateGraphChange } from '../backend/src/services/routing/graphSimulation.ts';
import { STAMP, createEdge, createNode, defaultPreferences } from './support/graph-fixtures.mjs';

const campus = {
  id: 'campus_twin_test',
  institutionId: 'inst_twin_test',
  name: 'Twin Test Campus',
  shortCode: 'TWIN',
  city: 'Sylhet',
  description: '',
  centerLat: 24.9,
  centerLng: 91.8,
  defaultZoom: 17,
  graphVersion: 1,
  isDemoData: true,
  accessibilityScore: 50,
  createdAt: STAMP,
  updatedAt: STAMP,
};

const buildings = [
  {
    id: 'building_twin',
    campusId: campus.id,
    name: 'Test Library',
    code: 'LIB',
    category: 'library',
    floors: 2,
    hasElevator: true,
    hasAccessibleEntrance: true,
    hasAccessibleRestroom: true,
    accessibilitySummary: 'Synthetic test fixture',
    lat: 24.9,
    lng: 91.8,
    verificationStatus: 'verified',
    isDemoData: true,
    createdAt: STAMP,
    updatedAt: STAMP,
  },
];

const locations = ['a', 'b'].map((id, index) =>
  createNode(campus.id, `node_${id}`, 24.9 + index * 0.0001, 91.8 + index * 0.0001, {
    buildingId: 'building_twin',
    name: `Location ${id.toUpperCase()}`,
    type: index === 0 ? 'entrance' : 'building',
  })
);

const makeEdge = (overrides = {}) =>
  createEdge(campus.id, 'edge_twin', 'node_a', 'node_b', 30, {
    name: 'Library approach',
    slopePercent: 2,
    ...overrides,
  });

const simulationInput = (edge, action) => ({
  campus,
  buildings,
  locations,
  edges: [edge],
  liveFacilities: [],
  reports: [],
  edgeId: edge.id,
  action,
  routePairs: [{ fromNodeId: 'node_a', toNodeId: 'node_b' }],
  preferences: defaultPreferences,
});

test('simulated repair unlocks a route without mutating the production graph', () => {
  const edge = makeEdge({
    status: 'blocked',
    temporaryClosure: true,
    closureReason: 'Construction',
  });
  const result = simulateGraphChange(simulationInput(edge, 'fixed'));

  assert.equal(result.simulationOnly, true);
  assert.equal(result.unlockedRoutes.length, 1);
  assert.equal(result.unlockedRoutes[0].afterFound, true);
  assert.deepEqual(result.buildingsAffected, [{ id: 'building_twin', name: 'Test Library' }]);
  assert.equal(result.changes.after.status, 'open');
  assert.equal(result.changes.after.verificationStatus, 'verified');

  // The source edge must be untouched.
  assert.equal(edge.status, 'blocked');
  assert.equal(edge.temporaryClosure, true);
  assert.equal(edge.closureReason, 'Construction');
});

test('repair simulation never promotes an unverified edge', () => {
  const edge = makeEdge({
    status: 'blocked',
    temporaryClosure: true,
    verificationStatus: 'unverified',
  });
  const result = simulateGraphChange(simulationInput(edge, 'fixed'));

  assert.equal(result.verificationPreserved, true);
  assert.equal(result.changes.after.verificationStatus, 'unverified');
  assert.equal(result.unlockedRoutes.length, 0);
  assert.equal(result.unchangedRoutes[0].afterFound, false);
});

test('proposed ramp stays unverified and is excluded from strict routing', () => {
  const edge = makeEdge({ slopePercent: 7, rampAvailable: false, rampVerified: false });
  const result = simulateGraphChange(simulationInput(edge, 'ramp_added'));

  assert.equal(result.changes.after.rampAvailable, true);
  assert.equal(result.changes.after.rampVerified, false);
  assert.equal(result.unlockedRoutes.length, 0);
  assert.equal(edge.rampAvailable, false);
});

test('simulated closure removes route without mutating source edge', () => {
  const edge = makeEdge();
  const result = simulateGraphChange(simulationInput(edge, 'closed'));

  assert.equal(result.lostRoutes.length, 1);
  assert.equal(result.changes.after.status, 'blocked');
  assert.equal(edge.status, 'open');
  assert.equal(edge.temporaryClosure, false);
});

test('feature catalog keeps consecutive IDs, the original 214 and Modules V and W', async () => {
  const { FEATURE_CATALOG, FEATURE_COUNT, MODULE_RANGE } = await import(
    '../frontend/src/data/featureCatalog.ts'
  );

  assert.equal(FEATURE_CATALOG.length, 218);
  assert.equal(FEATURE_COUNT, 218);
  assert.equal(MODULE_RANGE, 'A–W');
  assert.equal(new Set(FEATURE_CATALOG.map((feature) => feature.id)).size, 218);
  FEATURE_CATALOG.forEach((feature, index) => {
    assert.equal(feature.number, index + 1);
    assert.equal(feature.id, `F${String(index + 1).padStart(3, '0')}`);
  });
  assert.equal(FEATURE_CATALOG.find((feature) => feature.id === 'F215').module, 'V');
  assert.deepEqual(
    FEATURE_CATALOG.filter((feature) => feature.module === 'W').map((feature) => feature.id),
    ['F216', 'F217', 'F218']
  );
});
