/**
 * Shared, dependency-free fixtures for the offline Node smoke tests.
 * Every value is synthetic; nothing here touches the database or the network.
 */
export const STAMP = '2026-01-01T00:00:00.000Z';

export const defaultPreferences = {
  wheelchairMode: false,
  stepFreeMode: true,
  limitedMobilityMode: false,
  rampRequired: false,
  elevatorRequired: false,
  stairsAvoidance: true,
  smoothSurfacePreference: false,
  widePathPreference: false,
  lowGradientPreference: false,
  wellLitPreference: false,
  visualAssistanceMode: false,
  customNotes: '',
};

export function createNode(campusId, id, lat, lng, extra = {}) {
  return {
    id,
    campusId,
    name: `Node ${id.toUpperCase()}`,
    type: 'intersection',
    floor: 0,
    lat,
    lng,
    description: '',
    isAccessibleEntrance: true,
    hasElevator: false,
    hasAccessibleRestroom: false,
    hasRamp: false,
    verificationStatus: 'verified',
    facilities: [],
    isDemoData: true,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...extra,
  };
}

export function createEdge(campusId, id, fromNodeId, toNodeId, distanceMeters, extra = {}) {
  return {
    id,
    campusId,
    fromNodeId,
    toNodeId,
    bidirectional: true,
    name: `Path ${id}`,
    distanceMeters,
    widthMeters: 1.8,
    surface: 'smooth_concrete',
    hasStairs: false,
    stairCount: 0,
    rampAvailable: false,
    rampVerified: false,
    slopePercent: 1,
    elevatorAvailable: false,
    elevatorOperational: true,
    lighting: 'well_lit',
    status: 'open',
    temporaryClosure: false,
    verificationStatus: 'verified',
    lastVerifiedAt: new Date().toISOString(),
    verificationExpiresAt: '2099-01-01T00:00:00.000Z',
    isDemoData: true,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...extra,
  };
}
