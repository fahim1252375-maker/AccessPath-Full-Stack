import { Router } from 'express';
import { z } from 'zod';
import { db } from '../repositories/db.ts';
import {
  authenticate,
  optionalAuthenticate,
  requireCampusAccess,
  requireRole,
  validateBody,
} from '../middleware/auth.ts';
import {
  buildingPatchSchema,
  edgeMutationSchema,
  edgePatchSchema,
  emergencyApprovePatchSchema,
  locationMutationSchema,
  locationPatchSchema,
} from '../schemas/validators.ts';
import {
  exportCampusToGeoJson,
  parseGeoJsonImport,
  validateCampusGraph,
} from '../services/gis/geojsonService.ts';
import {
  assessEdgeTrust,
  computeBuildingTrustCoverage,
  DEFAULT_VERIFICATION_EXPIRY_DAYS,
} from '../services/trust/trustEngine.ts';
import { recordAudit } from '../utils/audit.ts';
import type {
  AccessibilityReportDTO,
  AnnouncementDTO,
  BuildingDTO,
  CampusDTO,
  EmergencyRouteDTO,
  FloorPlanDTO,
  GraphVersionDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../../shared/types.ts';
import { newId } from '../utils/ids.ts';

export const campusRouter = Router();

async function bumpCampusGraphVersion(
  campusId: string,
  publishedBy: string,
  changeSummary: string
): Promise<number> {
  const campus = await db.findOne<CampusDTO>('campuses', { id: campusId });
  const nextVer = (campus?.graphVersion || 1) + 1;
  await db.updateOne('campuses', { id: campusId }, { graphVersion: nextVer });
  const [nodes, edges] = await Promise.all([
    db.count('locations', { campusId }),
    db.count('pathEdges', { campusId }),
  ]);
  const versionRecord: GraphVersionDTO = {
    id: `gv_${campusId}_${nextVer}_${Date.now()}`,
    campusId,
    version: nextVer,
    publishedBy,
    changeSummary,
    nodeCount: nodes,
    edgeCount: edges,
    publishedAt: new Date().toISOString(),
  };
  await db.insert('graphVersions', versionRecord);
  return nextVer;
}

campusRouter.get('/', async (_req, res) => {
  const campuses = await db.find<CampusDTO>('campuses');
  res.json({ success: true, data: campuses });
});

campusRouter.get('/:id', async (req, res) => {
  const campus = await db.findOne<CampusDTO>('campuses', { id: req.params.id });
  if (!campus) {
    res.status(404).json({ success: false, error: 'Campus not found' });
    return;
  }
  res.json({ success: true, data: campus });
});

campusRouter.post(
  '/',
  authenticate,
  requireRole('super_admin'),
  validateBody(
    z.object({
      institutionId: z.string().min(1),
      name: z.string().min(3).max(120),
      shortCode: z.string().min(2).max(20),
      city: z.string().min(2).max(80),
      description: z.string().max(500).default(''),
      centerLat: z.number().min(-90).max(90),
      centerLng: z.number().min(-180).max(180),
      defaultZoom: z.number().int().min(12).max(20).default(17),
    })
  ),
  async (req, res) => {
    const id = newId('campus');
    const campus = await db.insert('campuses', {
      id,
      ...req.body,
      graphVersion: 1,
      isDemoData: false,
      accessibilityScore: 0,
    });
    await recordAudit({
      campusId: id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'CREATE_CAMPUS',
      targetType: 'campus',
      targetId: id,
      details: `Created campus ${req.body.name}`,
    });
    res.status(201).json({ success: true, data: campus });
  }
);

campusRouter.patch(
  '/:id',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('id'),
  validateBody(
    z
      .object({
        name: z.string().min(3).max(120).optional(),
        description: z.string().max(600).optional(),
        city: z.string().max(80).optional(),
        centerLat: z.number().min(-90).max(90).optional(),
        centerLng: z.number().min(-180).max(180).optional(),
        defaultZoom: z.number().int().min(12).max(20).optional(),
      })
      .strict()
  ),
  async (req, res) => {
    const updated = await db.updateOne('campuses', { id: req.params.id }, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Campus not found' });
      return;
    }
    await recordAudit({
      campusId: req.params.id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'UPDATE_CAMPUS',
      targetType: 'campus',
      targetId: req.params.id,
      details: 'Updated campus settings',
    });
    res.json({ success: true, data: updated });
  }
);

campusRouter.get('/:id/map', optionalAuthenticate, async (req, res) => {
  const campus = await db.findOne<CampusDTO>('campuses', { id: req.params.id });
  if (!campus) {
    res.status(404).json({ success: false, error: 'Campus not found' });
    return;
  }
  const [buildings, locations, edges, announcements, emergencyRoutes, floorPlans] = await Promise.all([
    db.find<BuildingDTO>('buildings', { campusId: campus.id }),
    db.find<LocationNodeDTO>('locations', { campusId: campus.id }),
    db.find<PathEdgeDTO>('pathEdges', { campusId: campus.id }),
    db.find<AnnouncementDTO>('announcements', { campusId: campus.id, active: true }),
    db.find<EmergencyRouteDTO>('emergencyRoutes', { campusId: campus.id }),
    db.find<FloorPlanDTO>('floorPlans', { campusId: campus.id }),
  ]);
  res.json({
    success: true,
    data: {
      campus,
      buildings,
      locations,
      edges,
      announcements,
      emergencyRoutes,
      floorPlans,
    },
  });
});

// Phase 2 — Accessibility Trust & Freshness Engine
campusRouter.get('/:id/trust', optionalAuthenticate, async (req, res) => {
  const campus = await db.findOne<CampusDTO>('campuses', { id: req.params.id });
  if (!campus) {
    res.status(404).json({ success: false, error: 'Campus not found' });
    return;
  }
  const [buildings, locations, edges, reports] = await Promise.all([
    db.find<BuildingDTO>('buildings', { campusId: campus.id }),
    db.find<LocationNodeDTO>('locations', { campusId: campus.id }),
    db.find<PathEdgeDTO>('pathEdges', { campusId: campus.id }),
    db.find<AccessibilityReportDTO>('accessibilityReports', { campusId: campus.id }),
  ]);

  const edgeAssessments = edges.map((e) => assessEdgeTrust(e, reports));
  const buildingCoverage = computeBuildingTrustCoverage(buildings, locations, edges, reports);

  const counts = {
    VERIFIED_CURRENT: edgeAssessments.filter((a) => a.trustState === 'VERIFIED_CURRENT').length,
    VERIFICATION_EXPIRING: edgeAssessments.filter((a) => a.trustState === 'VERIFICATION_EXPIRING').length,
    STALE: edgeAssessments.filter((a) => a.trustState === 'STALE').length,
    UNVERIFIED: edgeAssessments.filter((a) => a.trustState === 'UNVERIFIED').length,
    DISPUTED: edgeAssessments.filter((a) => a.trustState === 'DISPUTED').length,
    BLOCKED: edgeAssessments.filter((a) => a.trustState === 'BLOCKED').length,
    UNKNOWN: edgeAssessments.filter((a) => a.trustState === 'UNKNOWN').length,
  };

  res.json({
    success: true,
    data: {
      campusId: campus.id,
      policyExpiryDays: DEFAULT_VERIFICATION_EXPIRY_DAYS,
      counts,
      edgeAssessments,
      buildingCoverage,
    },
  });
});

// Phase 3 — Multi-Floor Indoor Floor Plans & Real Registered QR Waypoint Lookup
campusRouter.get('/:id/floors', async (req, res) => {
  const { buildingId } = req.query;
  const filter: Record<string, any> = { campusId: req.params.id };
  if (typeof buildingId === 'string' && buildingId) {
    filter.buildingId = buildingId;
  }
  const floors = await db.find<FloorPlanDTO>('floorPlans', filter);
  floors.sort((a, b) => a.buildingId.localeCompare(b.buildingId) || a.floorNumber - b.floorNumber);
  res.json({ success: true, data: floors });
});

campusRouter.get('/:id/qr/:code', async (req, res) => {
  const rawCode = req.params.code.trim().toUpperCase();
  const locations = await db.find<LocationNodeDTO>('locations', { campusId: req.params.id });
  const match = locations.find(
    (l) => l.qrCodeId && l.qrCodeId.toUpperCase() === rawCode
  );
  if (!match) {
    res.status(404).json({
      success: false,
      error: `QR waypoint code "${req.params.code}" is not registered on this campus`,
    });
    return;
  }
  res.json({ success: true, data: match });
});

// Phase 10 — GIS GeoJSON Export / Validation / Import & Graph Versioning
campusRouter.get('/:id/gis/export', async (req, res) => {
  const campus = await db.findOne<CampusDTO>('campuses', { id: req.params.id });
  if (!campus) {
    res.status(404).json({ success: false, error: 'Campus not found' });
    return;
  }
  const [locations, edges] = await Promise.all([
    db.find<LocationNodeDTO>('locations', { campusId: campus.id }),
    db.find<PathEdgeDTO>('pathEdges', { campusId: campus.id }),
  ]);
  const geojson = exportCampusToGeoJson(campus.id, campus.graphVersion || 1, locations, edges);
  res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
  res.json(geojson);
});

campusRouter.get('/:id/gis/validate', async (req, res) => {
  const [locations, edges] = await Promise.all([
    db.find<LocationNodeDTO>('locations', { campusId: req.params.id }),
    db.find<PathEdgeDTO>('pathEdges', { campusId: req.params.id }),
  ]);
  const report = validateCampusGraph(locations, edges);
  res.json({ success: true, data: report });
});

campusRouter.get('/:id/gis/versions', async (req, res) => {
  const versions = await db.find<GraphVersionDTO>(
    'graphVersions',
    { campusId: req.params.id },
    { sort: { version: -1 }, limit: 30 }
  );
  res.json({ success: true, data: versions });
});

campusRouter.post(
  '/:id/gis/import',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('id'),
  async (req, res) => {
    const parsed = parseGeoJsonImport(req.params.id, req.body);
    if (parsed.errors.length > 0 && parsed.nodesToUpsert.length === 0 && parsed.edgesToUpsert.length === 0) {
      res.status(400).json({ success: false, error: parsed.errors.join('; ') });
      return;
    }

    let nodesAdded = 0;
    let edgesAdded = 0;
    const now = new Date().toISOString();

    for (const node of parsed.nodesToUpsert) {
      const existing = await db.findOne('locations', { id: node.id, campusId: req.params.id });
      if (existing) {
        await db.updateOne('locations', { id: node.id }, node);
      } else {
        await db.insert('locations', { ...node, isDemoData: false, createdAt: now });
        nodesAdded += 1;
      }
    }

    for (const edge of parsed.edgesToUpsert) {
      const existing = await db.findOne('pathEdges', { id: edge.id, campusId: req.params.id });
      if (existing) {
        await db.updateOne('pathEdges', { id: edge.id }, edge);
      } else {
        await db.insert('pathEdges', { ...edge, isDemoData: false, createdAt: now });
        edgesAdded += 1;
      }
    }

    const version = await bumpCampusGraphVersion(
      req.params.id,
      req.auth!.email,
      `GeoJSON GIS import (+${nodesAdded} nodes, +${edgesAdded} edges)`
    );

    await recordAudit({
      campusId: req.params.id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'GIS_GEOJSON_IMPORT',
      targetType: 'campus',
      targetId: req.params.id,
      details: `Published graph v${version} (+${nodesAdded} nodes, +${edgesAdded} edges)`,
    });

    res.json({
      success: true,
      data: {
        graphVersion: version,
        nodesProcessed: parsed.nodesToUpsert.length,
        edgesProcessed: parsed.edgesToUpsert.length,
        warnings: parsed.errors,
      },
    });
  }
);

campusRouter.get('/:id/locations', async (req, res) => {
  const { q, type, accessibleOnly, page, limit } = req.query;
  let locations = await db.find<LocationNodeDTO>('locations', { campusId: req.params.id });
  if (typeof type === 'string' && type) {
    locations = locations.filter((l) => l.type === type);
  }
  if (accessibleOnly === 'true') {
    locations = locations.filter((l) => l.isAccessibleEntrance || l.hasElevator || l.hasRamp);
  }
  if (typeof q === 'string' && q.trim()) {
    const query = q.trim().toLowerCase();
    locations = locations.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        (l.nameBn && l.nameBn.toLowerCase().includes(query)) ||
        (l.code && l.code.toLowerCase().includes(query)) ||
        l.description.toLowerCase().includes(query) ||
        l.facilities.some((f: string) => f.toLowerCase().includes(query))
    );
  }

  const total = locations.length;
  if (limit) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    locations = locations.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  }

  res.json({ success: true, data: locations, meta: { total } });
});

campusRouter.post(
  '/:id/locations',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('id'),
  validateBody(locationMutationSchema),
  async (req, res) => {
    const id = newId('loc');
    const now = new Date().toISOString();
    const created = await db.insert('locations', {
      id,
      ...req.body,
      campusId: req.params.id,
      lastVerifiedAt: req.body.verificationStatus === 'verified' ? now : undefined,
      isDemoData: false,
    });
    await bumpCampusGraphVersion(req.params.id, req.auth!.email, `Added location ${req.body.name}`);
    await recordAudit({
      campusId: req.params.id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'CREATE_LOCATION',
      targetType: 'location',
      targetId: id,
      details: `Added location ${req.body.name}`,
    });
    res.status(201).json({ success: true, data: created });
  }
);

campusRouter.patch(
  '/:id/locations/:locationId',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('id'),
  validateBody(locationPatchSchema),
  async (req, res) => {
    const patch = {
      ...req.body,
      ...(req.body.verificationStatus === 'verified'
        ? { lastVerifiedAt: new Date().toISOString() }
        : {}),
    };
    const updated = await db.updateOne(
      'locations',
      { id: req.params.locationId, campusId: req.params.id },
      patch
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }
    await bumpCampusGraphVersion(
      req.params.id,
      req.auth!.email,
      `Updated location ${req.params.locationId}`
    );
    await recordAudit({
      campusId: req.params.id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'UPDATE_LOCATION',
      targetType: 'location',
      targetId: req.params.locationId,
      details: 'Updated location accessibility attributes',
    });
    res.json({ success: true, data: updated });
  }
);

campusRouter.get('/:id/edges', async (req, res) => {
  const { page, limit } = req.query;
  let edges = await db.find<PathEdgeDTO>('pathEdges', { campusId: req.params.id });
  const total = edges.length;
  if (limit) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
    edges = edges.slice((pageNum - 1) * limitNum, pageNum * limitNum);
  }
  res.json({ success: true, data: edges, meta: { total } });
});

campusRouter.post(
  '/:id/edges',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('id'),
  validateBody(edgeMutationSchema),
  async (req, res) => {
    const id = newId('edge');
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + DEFAULT_VERIFICATION_EXPIRY_DAYS * 86_400_000
    ).toISOString();
    const created = await db.insert('pathEdges', {
      id,
      ...req.body,
      campusId: req.params.id,
      lastVerifiedAt: req.body.verificationStatus === 'verified' ? now : undefined,
      verificationExpiresAt: req.body.verificationStatus === 'verified' ? expiresAt : undefined,
      verifiedByRole: req.body.verificationStatus === 'verified' ? req.auth!.role : undefined,
      isDemoData: false,
    });
    await bumpCampusGraphVersion(req.params.id, req.auth!.email, `Created edge ${req.body.name}`);
    await recordAudit({
      campusId: req.params.id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'CREATE_PATH_EDGE',
      targetType: 'pathEdge',
      targetId: id,
      details: `Created path edge ${req.body.name}`,
    });
    res.status(201).json({ success: true, data: created });
  }
);

campusRouter.patch(
  '/:id/edges/:edgeId',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('id'),
  validateBody(edgePatchSchema),
  async (req, res) => {
    const now = new Date().toISOString();
    const patch = {
      ...req.body,
      ...(req.body.verificationStatus === 'verified'
        ? {
            lastVerifiedAt: req.body.lastVerifiedAt || now,
            verificationExpiresAt:
              req.body.verificationExpiresAt ||
              new Date(Date.now() + DEFAULT_VERIFICATION_EXPIRY_DAYS * 86_400_000).toISOString(),
            verifiedByRole: req.auth!.role,
          }
        : {}),
    };
    const updated = await db.updateOne(
      'pathEdges',
      { id: req.params.edgeId, campusId: req.params.id },
      patch
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Path edge not found' });
      return;
    }
    await bumpCampusGraphVersion(
      req.params.id,
      req.auth!.email,
      `Updated path edge ${req.params.edgeId} (${updated.status})`
    );
    await recordAudit({
      campusId: req.params.id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'UPDATE_PATH_EDGE',
      targetType: 'pathEdge',
      targetId: req.params.edgeId,
      details: `Updated path edge attributes (status=${updated.status}, verification=${updated.verificationStatus})`,
    });
    res.json({ success: true, data: updated });
  }
);

campusRouter.post(
  '/:id/buildings',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('id'),
  validateBody(
    z.object({
      name: z.string().min(2).max(120),
      code: z.string().min(1).max(20),
      category: z.enum([
        'academic',
        'library',
        'laboratory',
        'student_services',
        'medical',
        'dining',
        'auditorium',
      ]),
      floors: z.number().int().min(1).max(40).default(1),
      hasElevator: z.boolean().default(false),
      hasAccessibleEntrance: z.boolean().default(false),
      hasAccessibleRestroom: z.boolean().default(false),
      accessibilitySummary: z.string().max(500).default(''),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      verificationStatus: z.enum(['verified', 'unverified', 'unknown', 'disputed']).default('unverified'),
    })
  ),
  async (req, res) => {
    const id = newId('bldg');
    const created = await db.insert('buildings', {
      id,
      campusId: req.params.id,
      ...req.body,
      isDemoData: false,
    });
    await recordAudit({
      campusId: req.params.id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'CREATE_BUILDING',
      targetType: 'building',
      targetId: id,
      details: `Added building ${req.body.name}`,
    });
    res.status(201).json({ success: true, data: created });
  }
);

campusRouter.patch(
  '/:id/buildings/:buildingId',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('id'),
  validateBody(buildingPatchSchema),
  async (req, res) => {
    const updated = await db.updateOne(
      'buildings',
      { id: req.params.buildingId, campusId: req.params.id },
      req.body
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Building not found' });
      return;
    }
    await recordAudit({
      campusId: req.params.id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'UPDATE_BUILDING',
      targetType: 'building',
      targetId: req.params.buildingId,
      details: 'Updated building metadata',
    });
    res.json({ success: true, data: updated });
  }
);

campusRouter.get('/:id/emergency-routes', async (req, res) => {
  const routes = await db.find<EmergencyRouteDTO>('emergencyRoutes', { campusId: req.params.id });
  res.json({ success: true, data: routes });
});

campusRouter.patch(
  '/:id/emergency-routes/:routeId/approve',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('id'),
  validateBody(emergencyApprovePatchSchema),
  async (req, res) => {
    const updated = await db.updateOne(
      'emergencyRoutes',
      { id: req.params.routeId, campusId: req.params.id },
      {
        adminApproved: Boolean(req.body.adminApproved),
        approvedBy: req.body.adminApproved ? req.auth!.email : undefined,
        approvedAt: req.body.adminApproved ? new Date().toISOString() : undefined,
        ...(req.body.notes !== undefined ? { notes: req.body.notes } : {}),
        ...(req.body.wheelchairCompatible !== undefined
          ? { wheelchairCompatible: req.body.wheelchairCompatible }
          : {}),
      }
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Emergency route not found' });
      return;
    }
    await recordAudit({
      campusId: req.params.id,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'UPDATE_EMERGENCY_ROUTE_APPROVAL',
      targetType: 'emergencyRoute',
      targetId: req.params.routeId,
      details: `Admin approval set to ${Boolean(req.body.adminApproved)}`,
    });
    res.json({ success: true, data: updated });
  }
);

campusRouter.get('/:id/public-portal', async (req, res) => {
  const campus = await db.findOne<CampusDTO>('campuses', { id: req.params.id });
  if (!campus) {
    res.status(404).json({ success: false, error: 'Campus not found' });
    return;
  }
  const [buildings, locations, edges, reports] = await Promise.all([
    db.find<BuildingDTO>('buildings', { campusId: campus.id }),
    db.find<LocationNodeDTO>('locations', { campusId: campus.id }),
    db.find<PathEdgeDTO>('pathEdges', { campusId: campus.id }),
    db.find('accessibilityReports', { campusId: campus.id }),
  ]);
  const verifiedEdges = edges.filter((e) => e.verificationStatus === 'verified');
  const openStepFreeEdges = verifiedEdges.filter((e) => e.status === 'open' && !e.hasStairs);
  res.json({
    success: true,
    data: {
      campus: {
        id: campus.id,
        name: campus.name,
        city: campus.city,
        graphVersion: campus.graphVersion || 1,
        isDemoData: campus.isDemoData,
        demoBannerText: campus.demoBannerText,
      },
      summary: {
        buildingsCount: buildings.length,
        accessibleEntrancesCount: locations.filter((l) => l.isAccessibleEntrance).length,
        verifiedPathsCount: verifiedEdges.length,
        stepFreeOpenPathsCount: openStepFreeEdges.length,
        blockedPathsCount: edges.filter((e) => e.status === 'blocked' || e.temporaryClosure).length,
        resolvedReportsCount: reports.filter((r: any) => r.status === 'resolved').length,
      },
      buildings: buildings.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        hasElevator: b.hasElevator,
        hasAccessibleEntrance: b.hasAccessibleEntrance,
        hasAccessibleRestroom: b.hasAccessibleRestroom,
        verificationStatus: b.verificationStatus,
      })),
    },
  });
});
