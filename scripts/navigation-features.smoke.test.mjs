import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bearingDegrees,
  buildBilingualDirections,
  buildRouteDirections,
  classifyTurn,
  compassPoint,
  signedTurnAngle,
} from '../shared/directions.ts';
import { analyzeRouteResilience } from '../backend/src/services/routing/resilience.ts';
import { calculateAccessibleRoutes } from '../backend/src/services/routing/dijkstra.ts';
import {
  createRouteShareToken,
  decodePreferenceMask,
  encodePreferenceMask,
  verifyRouteShareToken,
} from '../backend/src/services/routing/routeShare.ts';
import { createEdge, createNode, defaultPreferences } from './support/graph-fixtures.mjs';

const CAMPUS_ID = 'campus_nav_test';

const preferences = defaultPreferences;
const makeNode = (id, lat, lng, extra = {}) => createNode(CAMPUS_ID, id, lat, lng, extra);
const makeEdge = (id, from, to, distance, extra = {}) =>
  createEdge(CAMPUS_ID, id, from, to, distance, extra);

/*
 * A ──e1── B ──e2── D        direct route A→B→D (short)
 *          └──e3── C ──e4──┘   detour B→C→D (longer)
 * A→B (e1) is a single point of failure; B→D (e2) has a detour.
 */
const locations = [
  makeNode('a', 24.9, 91.8, { nameBn: 'ক' }),
  makeNode('b', 24.9, 91.8004),
  makeNode('c', 24.9004, 91.8004),
  makeNode('d', 24.9004, 91.8008),
];
const edges = [
  makeEdge('e1', 'a', 'b', 40),
  makeEdge('e2', 'b', 'd', 60),
  makeEdge('e3', 'b', 'c', 45),
  makeEdge('e4', 'c', 'd', 45),
];

const route = (graphEdges = edges, from = 'a', to = 'd') =>
  calculateAccessibleRoutes(locations, graphEdges, {
    campusId: CAMPUS_ID,
    fromNodeId: from,
    toNodeId: to,
    preferences,
    allowUnverifiedFallback: false,
    includeAlternatives: false,
    topK: 1,
  });

/* ------------------------------ geometry ------------------------------ */

test('bearing, compass and turn helpers behave like a compass', () => {
  assert.equal(Math.round(bearingDegrees({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })), 0);
  assert.equal(Math.round(bearingDegrees({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })), 90);
  assert.equal(compassPoint(44), 'NE');
  assert.equal(compassPoint(359), 'N');
  assert.equal(signedTurnAngle(0, 90), 90);
  assert.equal(signedTurnAngle(90, 0), -90);
  assert.equal(classifyTurn(10), 'straight');
  assert.equal(classifyTurn(30), 'slight_right');
  assert.equal(classifyTurn(-90), 'left');
  assert.equal(classifyTurn(140), 'sharp_right');
  assert.equal(classifyTurn(-175), 'u_turn');
});

/* ----------------------------- directions ----------------------------- */

test('directions: English steps, arrival step and turn detection', () => {
  const result = route();
  assert.equal(result.found, true);
  const directions = buildRouteDirections(result.routes[0], locations, { language: 'en' });

  assert.equal(directions.language, 'en');
  assert.equal(directions.steps.at(-1).kind, 'arrive');
  assert.equal(directions.steps.length, result.routes[0].steps.length + 1);
  assert.match(directions.steps[0].text, /^Start at Node A\. Head east and walk 40 meters to Node B\.$/);
  // B→D heads north-east after an eastbound leg, so it is a left turn.
  assert.equal(directions.steps[1].turn, 'left');
  assert.match(directions.steps[1].text, /^Turn left and walk 60 meters to Node D\.$/);
  assert.equal(directions.steps.at(-1).remainingMeters, 0);
  assert.equal(directions.steps[0].remainingMeters, 60);
  assert.ok(directions.script.includes('Step 1.'));
});

test('directions: Bengali output uses Bengali digits, names and no English leakage', () => {
  const result = route();
  const directions = buildRouteDirections(result.routes[0], locations, { language: 'bn' });

  assert.match(directions.steps[0].text, /ক/); // nameBn is preferred when available
  assert.match(directions.steps[0].text, /৪০ মিটার/);
  assert.match(directions.summary, /মোট ১০০ মিটার/);
  assert.equal(/\d/.test(directions.steps[0].text.replace('Node B', '')), false, 'digits must be Bengali');
  assert.match(directions.steps.at(-1).text, /গন্তব্যে পৌঁছে গেছেন/);
});

test('directions: accessibility callouts are derived only from route data', () => {
  const graph = [
    makeEdge('e1', 'a', 'b', 40, {
      slopePercent: 6,
      lighting: 'poor',
      rampAvailable: true,
      rampVerified: true,
    }),
    makeEdge('e2', 'b', 'd', 60, {
      surface: 'cobblestone',
      slopePercent: 9,
      rampAvailable: true,
      rampVerified: true,
    }),
  ];
  const result = route(graph);
  const en = buildRouteDirections(result.routes[0], locations, {
    language: 'en',
    edgeWidths: { e1: 1.0 },
  });

  assert.ok(en.steps[0].callouts.some((c) => c.startsWith('Steep section (6% slope)')));
  assert.ok(en.steps[0].callouts.some((c) => c.includes('Poorly lit')));
  assert.ok(en.steps[0].callouts.some((c) => c.includes('Narrow path (1 m wide)')));
  assert.ok(en.steps[1].callouts.some((c) => c.startsWith('Very steep section (9% slope)')));
  assert.ok(en.steps[1].callouts.some((c) => c.includes('Rough or uneven surface')));
  assert.ok(en.highlights.some((h) => h.includes('Steepest slope: 9%')));

  const clean = buildRouteDirections(route().routes[0], locations);
  assert.deepEqual(clean.highlights, ['No special conditions flagged on this route']);
  assert.deepEqual(clean.steps[0].callouts, []);
});

test('directions: elevator steps describe the floor change instead of a heading', () => {
  const indoorNodes = [
    makeNode('lobby', 24.9, 91.8, { floor: 0, type: 'elevator', hasElevator: true }),
    makeNode('upper', 24.9, 91.8, { floor: 2, type: 'elevator', hasElevator: true }),
  ];
  const lift = makeEdge('lift', 'lobby', 'upper', 6, {
    elevatorAvailable: true,
    indoorFloorTransition: true,
  });
  const result = calculateAccessibleRoutes(indoorNodes, [lift], {
    campusId: CAMPUS_ID,
    fromNodeId: 'lobby',
    toNodeId: 'upper',
    preferences,
    topK: 1,
  });
  assert.equal(result.found, true);
  const en = buildRouteDirections(result.routes[0], indoorNodes, { language: 'en' });
  assert.equal(en.steps[0].kind, 'elevator');
  assert.equal(en.steps[0].heading, null);
  assert.match(en.steps[0].text, /take the elevator up to floor 2/);
  assert.ok(en.highlights.includes('1 elevator ride'));
});

test('directions: bilingual helper returns both languages from the same route', () => {
  const both = buildBilingualDirections(route().routes[0], locations);
  assert.equal(both.en.language, 'en');
  assert.equal(both.bn.language, 'bn');
  assert.equal(both.en.steps.length, both.bn.steps.length);
});

/* ----------------------------- resilience ----------------------------- */

const resilienceInput = (graph = edges, overrides = {}) => ({
  campusId: CAMPUS_ID,
  fromNodeId: 'a',
  toNodeId: 'd',
  locations,
  edges: graph,
  preferences,
  ...overrides,
});

test('resilience: flags the single point of failure and measures detours', () => {
  const analysis = analyzeRouteResilience(resilienceInput());
  assert.equal(analysis.found, true);
  assert.equal(analysis.baselineDistanceMeters, 100);

  const e1 = analysis.segments.find((s) => s.edgeId === 'e1');
  const e2 = analysis.segments.find((s) => s.edgeId === 'e2');
  assert.equal(e1.critical, true, 'A→B is the only way out of A');
  assert.equal(e1.detourMeters, null);
  assert.equal(e2.critical, false);
  assert.equal(e2.detourMeters, 30); // 45 + 45 instead of 60
  assert.equal(e2.detourPercent, 30);
  assert.deepEqual(e2.alternativeEdgeIds, ['e1', 'e3', 'e4']);

  assert.equal(analysis.criticalSegmentCount, 1);
  // One of two segments is critical (50% > 33%) → LOW. Score: (0 + 0.75) / 2 = 38.
  assert.equal(analysis.level, 'LOW');
  assert.equal(analysis.score, 38);
  assert.match(analysis.recommendations[0], /"Path e1" closes/);
});

test('resilience: a fully redundant route scores HIGH with no recommendations of failure', () => {
  // Ring A–B–D–C–A plus a cheap shortcut: every single closure still leaves a way through.
  const ring = [
    makeEdge('r1', 'a', 'b', 40),
    makeEdge('r2', 'b', 'd', 40),
    makeEdge('r3', 'a', 'c', 40),
    makeEdge('r4', 'c', 'd', 40),
  ];
  const analysis = analyzeRouteResilience(resilienceInput(ring));
  assert.equal(analysis.found, true);
  assert.equal(analysis.criticalSegmentCount, 0);
  assert.equal(analysis.level, 'HIGH');
  assert.equal(analysis.score, 100);
  assert.deepEqual(analysis.recommendations, ['No single point of failure was found on this route.']);
});

test('resilience: Bengali analysis localizes copy and segment names', () => {
  const analysis = analyzeRouteResilience(resilienceInput(edges, { language: 'bn' }));
  assert.equal(analysis.language, 'bn');
  assert.match(analysis.message, /যাচাইকৃত বাধামুক্ত বিকল্প/);
  assert.equal(analysis.segments[0].fromName, 'ক');
  assert.match(analysis.recommendations[0], /বন্ধ হলে/);
});

test('resilience: reports found=false instead of inventing a route', () => {
  const blockedEdges = edges.map((edge) => ({ ...edge, status: 'blocked', temporaryClosure: true }));
  const analysis = analyzeRouteResilience(resilienceInput(blockedEdges));
  assert.equal(analysis.found, false);
  assert.equal(analysis.level, null);
  assert.equal(analysis.score, null);
  assert.deepEqual(analysis.segments, []);
});

test('resilience: analysis never mutates the production graph', () => {
  const snapshot = JSON.stringify(edges);
  analyzeRouteResilience(resilienceInput());
  assert.equal(JSON.stringify(edges), snapshot);
});

test('resilience: an elevator single point of failure gets the facilities recommendation', () => {
  const nodes = [
    makeNode('lobby', 24.9, 91.8, { floor: 0, type: 'elevator', hasElevator: true }),
    makeNode('upper', 24.9, 91.8, { floor: 2, type: 'elevator', hasElevator: true }),
  ];
  const lift = makeEdge('lift', 'lobby', 'upper', 6, {
    name: 'Library lift',
    elevatorAvailable: true,
    indoorFloorTransition: true,
  });
  const analysis = analyzeRouteResilience({
    campusId: CAMPUS_ID,
    fromNodeId: 'lobby',
    toNodeId: 'upper',
    locations: nodes,
    edges: [lift],
    preferences,
  });
  assert.equal(analysis.segments[0].involvesElevator, true);
  assert.match(analysis.recommendations[0], /Elevator or lift access at "Library lift"/);
});

/* ---------------------------- share tokens ---------------------------- */

const SECRET = 'unit-test-secret-that-is-long-enough-0123456789';
const sharePayload = {
  campusId: CAMPUS_ID,
  fromNodeId: 'a',
  toNodeId: 'd',
  algorithm: 'astar',
  preferences: { ...decodePreferenceMask(0), wheelchairMode: true, wellLitPreference: true },
};

test('share: preference mask round-trips and ignores free-text notes', () => {
  const mask = encodePreferenceMask({ wheelchairMode: true, stepFreeMode: true });
  assert.equal(mask, 0b11);
  const decoded = decodePreferenceMask(mask);
  assert.equal(decoded.wheelchairMode, true);
  assert.equal(decoded.stepFreeMode, true);
  assert.equal(decoded.elevatorRequired, false);
  assert.equal('customNotes' in decoded, false);
});

test('share: a valid token verifies and returns the signed request only', () => {
  const now = new Date('2026-06-01T10:00:00.000Z');
  const { token, expiresAt } = createRouteShareToken(sharePayload, SECRET, { ttlHours: 24, now });
  assert.equal(expiresAt.toISOString(), '2026-06-02T10:00:00.000Z');
  assert.equal(token.split('.').length, 2);
  assert.ok(token.length < 400, 'token should stay short enough for a URL or QR code');

  const verified = verifyRouteShareToken(token, SECRET, new Date('2026-06-01T12:00:00.000Z'));
  assert.equal(verified.ok, true);
  assert.deepEqual(verified.payload, sharePayload);
  assert.equal(verified.expiresAt.toISOString(), expiresAt.toISOString());
});

test('share: tampering, wrong secret, expiry and garbage are all rejected', () => {
  const now = new Date('2026-06-01T10:00:00.000Z');
  const { token } = createRouteShareToken(sharePayload, SECRET, { ttlHours: 1, now });
  const [payload, signature] = token.split('.');

  const forgedPayload = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), c: 'other_campus' })
  ).toString('base64url');

  assert.deepEqual(verifyRouteShareToken(`${forgedPayload}.${signature}`, SECRET, now), {
    ok: false,
    reason: 'BAD_SIGNATURE',
  });
  assert.deepEqual(verifyRouteShareToken(token, `${SECRET}-different`, now), {
    ok: false,
    reason: 'BAD_SIGNATURE',
  });
  assert.deepEqual(verifyRouteShareToken(token, SECRET, new Date('2026-06-01T11:00:00.000Z')), {
    ok: false,
    reason: 'EXPIRED',
  });
  for (const garbage of ['', 'abc', 'a.b.c', '.', `${payload}.`, 'x'.repeat(5000)]) {
    assert.equal(verifyRouteShareToken(garbage, SECRET, now).ok, false);
  }
});

test('share: ttl is clamped to 1 hour – 7 days and defaults to 48 hours', () => {
  const now = new Date('2026-06-01T00:00:00.000Z');
  const hoursUntilExpiry = (ttlHours) =>
    (createRouteShareToken(sharePayload, SECRET, { ttlHours, now }).expiresAt - now) / 3_600_000;
  assert.equal(hoursUntilExpiry(undefined), 48);
  assert.equal(hoursUntilExpiry(0), 1);
  assert.equal(hoursUntilExpiry(100000), 168);
});

test('share: a share token is never accepted as a session JWT shape', () => {
  const { token } = createRouteShareToken(sharePayload, SECRET);
  assert.equal(token.split('.').length, 2, 'JWTs have three segments; share tokens have two');
});
