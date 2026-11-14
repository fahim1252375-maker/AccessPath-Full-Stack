import type { LocationNodeDTO, PathEdgeDTO } from '../../../../shared/types.ts';

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  metadata: {
    campusId: string;
    graphVersion: number;
    exportedAt: string;
    nodeCount: number;
    edgeCount: number;
  };
  features: Array<{
    type: 'Feature';
    id: string;
    geometry:
      | { type: 'Point'; coordinates: [number, number] }
      | { type: 'LineString'; coordinates: Array<[number, number]> };
    properties: Record<string, unknown>;
  }>;
}

export interface GraphValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    isolatedNodeIds: string[];
    duplicateEdgePairs: string[];
  };
}

export function validateCampusGraph(
  nodes: LocationNodeDTO[],
  edges: PathEdgeDTO[]
): GraphValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeMap = new Map<string, LocationNodeDTO>();

  for (const n of nodes) {
    if (nodeMap.has(n.id)) {
      errors.push(`Duplicate location node ID: ${n.id}`);
    }
    if (n.lat < -90 || n.lat > 90 || n.lng < -180 || n.lng > 180) {
      errors.push(`Invalid coordinates on node ${n.id}: (${n.lat}, ${n.lng})`);
    }
    nodeMap.set(n.id, n);
  }

  const connectedNodeIds = new Set<string>();
  const edgePairSeen = new Map<string, string>();
  const duplicateEdgePairs: string[] = [];

  for (const e of edges) {
    if (!nodeMap.has(e.fromNodeId)) {
      errors.push(`Edge ${e.id} references missing fromNodeId: ${e.fromNodeId}`);
    }
    if (!nodeMap.has(e.toNodeId)) {
      errors.push(`Edge ${e.id} references missing toNodeId: ${e.toNodeId}`);
    }
    if (e.fromNodeId === e.toNodeId) {
      warnings.push(`Edge ${e.id} is a self-loop on ${e.fromNodeId}`);
    }
    connectedNodeIds.add(e.fromNodeId);
    connectedNodeIds.add(e.toNodeId);

    const pairKey = [e.fromNodeId, e.toNodeId].sort().join('::');
    if (edgePairSeen.has(pairKey)) {
      const msg = `${edgePairSeen.get(pairKey)} & ${e.id} (${e.fromNodeId} <-> ${e.toNodeId})`;
      duplicateEdgePairs.push(msg);
      warnings.push(`Duplicate parallel edge between nodes: ${msg}`);
    } else {
      edgePairSeen.set(pairKey, e.id);
    }
  }

  const isolatedNodeIds = nodes
    .filter((n) => !connectedNodeIds.has(n.id))
    .map((n) => n.id);
  if (isolatedNodeIds.length > 0) {
    warnings.push(`Isolated location nodes without path edges: ${isolatedNodeIds.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      isolatedNodeIds,
      duplicateEdgePairs,
    },
  };
}

export function exportCampusToGeoJson(
  campusId: string,
  graphVersion: number,
  nodes: LocationNodeDTO[],
  edges: PathEdgeDTO[]
): GeoJsonFeatureCollection {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const features: GeoJsonFeatureCollection['features'] = [];

  for (const n of nodes) {
    features.push({
      type: 'Feature',
      id: n.id,
      geometry: {
        type: 'Point',
        coordinates: [n.lng, n.lat],
      },
      properties: {
        featureKind: 'location_node',
        id: n.id,
        name: n.name,
        code: n.code,
        type: n.type,
        floor: n.floor,
        buildingId: n.buildingId,
        isAccessibleEntrance: n.isAccessibleEntrance,
        hasElevator: n.hasElevator,
        hasAccessibleRestroom: n.hasAccessibleRestroom,
        hasRamp: n.hasRamp,
        verificationStatus: n.verificationStatus,
      },
    });
  }

  for (const e of edges) {
    const f = nodeMap.get(e.fromNodeId);
    const t = nodeMap.get(e.toNodeId);
    if (!f || !t) continue;
    features.push({
      type: 'Feature',
      id: e.id,
      geometry: {
        type: 'LineString',
        coordinates: [
          [f.lng, f.lat],
          [t.lng, t.lat],
        ],
      },
      properties: {
        featureKind: 'path_edge',
        id: e.id,
        fromNodeId: e.fromNodeId,
        toNodeId: e.toNodeId,
        name: e.name,
        distanceMeters: e.distanceMeters,
        widthMeters: e.widthMeters,
        surface: e.surface,
        hasStairs: e.hasStairs,
        rampAvailable: e.rampAvailable,
        rampVerified: e.rampVerified,
        slopePercent: e.slopePercent,
        elevatorAvailable: e.elevatorAvailable,
        status: e.status,
        verificationStatus: e.verificationStatus,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    metadata: {
      campusId,
      graphVersion,
      exportedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
    features,
  };
}

export function parseGeoJsonImport(
  campusId: string,
  geojson: any
): {
  nodesToUpsert: Partial<LocationNodeDTO>[];
  edgesToUpsert: Partial<PathEdgeDTO>[];
  errors: string[];
} {
  const errors: string[] = [];
  const nodesToUpsert: Partial<LocationNodeDTO>[] = [];
  const edgesToUpsert: Partial<PathEdgeDTO>[] = [];

  if (!geojson || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    return { nodesToUpsert, edgesToUpsert, errors: ['Expected valid GeoJSON FeatureCollection'] };
  }

  for (let i = 0; i < geojson.features.length; i++) {
    const f = geojson.features[i];
    const props = f?.properties || {};
    if (f?.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
      const [lng, lat] = f.geometry.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number' || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        errors.push(`Feature[${i}] Point has invalid [lng, lat] coordinates`);
        continue;
      }
      nodesToUpsert.push({
        id: String(props.id || f.id || `loc_gis_${i}`),
        campusId,
        name: String(props.name || `Imported Node ${i + 1}`),
        code: props.code ? String(props.code) : undefined,
        type: props.type || 'intersection',
        floor: typeof props.floor === 'number' ? props.floor : 0,
        lat,
        lng,
        description: String(props.description || 'Imported via GeoJSON GIS tool'),
        isAccessibleEntrance: Boolean(props.isAccessibleEntrance),
        hasElevator: Boolean(props.hasElevator),
        hasAccessibleRestroom: Boolean(props.hasAccessibleRestroom),
        hasRamp: Boolean(props.hasRamp),
        verificationStatus: props.verificationStatus || 'unverified',
        facilities: Array.isArray(props.facilities) ? props.facilities : [],
      });
    } else if (f?.geometry?.type === 'LineString' && Array.isArray(f.geometry.coordinates)) {
      if (!props.fromNodeId || !props.toNodeId) {
        errors.push(`Feature[${i}] LineString missing fromNodeId or toNodeId property`);
        continue;
      }
      edgesToUpsert.push({
        id: String(props.id || f.id || `edge_gis_${i}`),
        campusId,
        fromNodeId: String(props.fromNodeId),
        toNodeId: String(props.toNodeId),
        bidirectional: props.bidirectional !== false,
        name: String(props.name || `Imported Segment ${i + 1}`),
        distanceMeters: Number(props.distanceMeters || 50),
        widthMeters: Number(props.widthMeters || 2.0),
        surface: props.surface || 'smooth_concrete',
        hasStairs: Boolean(props.hasStairs),
        stairCount: Number(props.stairCount || 0),
        rampAvailable: Boolean(props.rampAvailable),
        rampVerified: Boolean(props.rampVerified),
        slopePercent: Number(props.slopePercent || 0),
        elevatorAvailable: Boolean(props.elevatorAvailable),
        elevatorOperational: props.elevatorOperational !== false,
        lighting: props.lighting || 'unknown',
        status: props.status || 'open',
        temporaryClosure: Boolean(props.temporaryClosure),
        verificationStatus: props.verificationStatus || 'unverified',
      });
    } else {
      errors.push(`Feature[${i}] unsupported geometry type: ${f?.geometry?.type}`);
    }
  }

  return { nodesToUpsert, edgesToUpsert, errors };
}
