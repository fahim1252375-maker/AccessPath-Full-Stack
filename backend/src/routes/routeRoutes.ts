import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../repositories/db.ts';
import {
  assertValidJwtSecret,
  authenticate,
  optionalAuthenticate,
  requireCampusAccess,
  validateBody,
} from '../middleware/auth.ts';
import {
  favoriteLocationSchema,
  routeCalculateSchema,
  routeDirectionsSchema,
  routeResilienceSchema,
  routeSavePatchSchema,
  routeShareSchema,
} from '../schemas/validators.ts';
import { calculateAccessibleRoutes } from '../services/routing/dijkstra.ts';
import { analyzeRouteResilience } from '../services/routing/resilience.ts';
import {
  createRouteShareToken,
  decodePreferenceMask,
  encodePreferenceMask,
  verifyRouteShareToken,
} from '../services/routing/routeShare.ts';
import { buildBilingualDirections, buildRouteDirections } from '../../../shared/directions.ts';
import { newId } from '../utils/ids.ts';
import type {
  AccessibilityPreferences,
  AccessibilityReportDTO,
  CampusDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
  RouteShareLinkDTO,
  SharedRouteDTO,
} from '../../../shared/types.ts';

export const routeRouter = Router();

const defaultPreferences: AccessibilityPreferences = {
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

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Loads everything the routing engine needs for one campus in a single parallel round-trip. */
async function loadRoutingGraph(campusId: string) {
  const [campus, locations, edges, liveFacilities, reports] = await Promise.all([
    db.findOne<CampusDTO>('campuses', { id: campusId }),
    db.find<LocationNodeDTO>('locations', { campusId }),
    db.find<PathEdgeDTO>('pathEdges', { campusId }),
    db.find<LiveFacilityStatusDTO>('liveFacilities', { campusId }),
    db.find<AccessibilityReportDTO>('accessibilityReports', { campusId }),
  ]);
  return { campus, locations, edges, liveFacilities, reports };
}

/** Defaults → signed-in user's saved profile → per-request overrides (later wins). */
async function resolvePreferences(
  req: Request,
  overrides?: Partial<AccessibilityPreferences>
): Promise<AccessibilityPreferences> {
  let preferences: AccessibilityPreferences = { ...defaultPreferences };
  if (req.auth) {
    const savedProfile = await db.findOne<AccessibilityPreferences>('accessibilityProfiles', {
      userId: req.auth.userId,
    });
    if (savedProfile) preferences = { ...preferences, ...savedProfile };
  }
  return { ...preferences, ...(overrides ?? {}) };
}

const edgeWidthLookup = (edges: PathEdgeDTO[]): Record<string, number> =>
  Object.fromEntries(edges.map((edge) => [edge.id, edge.widthMeters]));

const locationName = (locations: LocationNodeDTO[], id: string): string =>
  locations.find((location) => location.id === id)?.name ?? id;

function sendNodeNotFound(res: Response): void {
  res.status(400).json({
    success: false,
    error: 'Selected origin or destination location was not found in this campus graph.',
    reasonCode: 'NODE_NOT_FOUND',
  });
}

/* -------------------------------------------------------------------------- */
/* Route calculation                                                          */
/* -------------------------------------------------------------------------- */

routeRouter.post(
  '/calculate',
  optionalAuthenticate,
  validateBody(routeCalculateSchema),
  async (req, res) => {
    const {
      campusId,
      fromNodeId,
      toNodeId,
      preferences,
      allowUnverifiedFallback,
      includeAlternatives,
      algorithm,
      topK,
    } = req.body;

    const mergedPreferences = await resolvePreferences(req, preferences);
    const { campus, locations, edges, liveFacilities, reports } = await loadRoutingGraph(campusId);

    const result = calculateAccessibleRoutes(locations, edges, {
      campusId,
      fromNodeId,
      toNodeId,
      preferences: mergedPreferences,
      allowUnverifiedFallback,
      includeAlternatives,
      algorithm,
      topK,
      liveFacilities,
      reports,
    });

    let historyId: string | undefined;
    if (req.auth && result.found && result.routes.length > 0) {
      const primary = result.routes[0];
      historyId = newId('rh');
      await db.insert('routeHistory', {
        id: historyId,
        userId: req.auth.userId,
        campusId,
        fromNodeId,
        toNodeId,
        fromName: locationName(locations, fromNodeId),
        toName: locationName(locations, toNodeId),
        distanceMeters: primary.totalDistanceMeters,
        estimatedMinutes: primary.estimatedMinutes,
        isSaved: false,
      });
    }

    res.json({
      success: true,
      data: { ...result, graphVersion: campus?.graphVersion || 1, historyId },
    });
  }
);

/* -------------------------------------------------------------------------- */
/* #216 Bilingual turn-by-turn directions                                     */
/* -------------------------------------------------------------------------- */

routeRouter.post(
  '/directions',
  optionalAuthenticate,
  validateBody(routeDirectionsSchema),
  async (req, res) => {
    const {
      campusId,
      fromNodeId,
      toNodeId,
      preferences,
      allowUnverifiedFallback,
      algorithm,
      topK,
      language,
    } = req.body;

    const mergedPreferences = await resolvePreferences(req, preferences);
    const { campus, locations, edges, liveFacilities, reports } = await loadRoutingGraph(campusId);

    const result = calculateAccessibleRoutes(locations, edges, {
      campusId,
      fromNodeId,
      toNodeId,
      preferences: mergedPreferences,
      allowUnverifiedFallback,
      includeAlternatives: topK > 1,
      algorithm,
      topK,
      liveFacilities,
      reports,
    });

    const edgeWidths = edgeWidthLookup(edges);
    res.json({
      success: true,
      data: {
        ...result,
        graphVersion: campus?.graphVersion || 1,
        language,
        directions: result.routes.map((route) =>
          buildRouteDirections(route, locations, { language, edgeWidths })
        ),
      },
    });
  }
);

/* -------------------------------------------------------------------------- */
/* #217 Route resilience (single point of failure analysis)                   */
/* -------------------------------------------------------------------------- */

routeRouter.post(
  '/resilience',
  optionalAuthenticate,
  validateBody(routeResilienceSchema),
  async (req, res) => {
    const { campusId, fromNodeId, toNodeId, preferences, algorithm, language } = req.body;

    const mergedPreferences = await resolvePreferences(req, preferences);
    const { locations, edges, liveFacilities, reports } = await loadRoutingGraph(campusId);

    const analysis = analyzeRouteResilience({
      campusId,
      fromNodeId,
      toNodeId,
      locations,
      edges,
      preferences: mergedPreferences,
      liveFacilities,
      reports,
      algorithm,
      language,
    });

    res.json({ success: true, data: analysis });
  }
);

/* -------------------------------------------------------------------------- */
/* #218 Signed shareable route links                                          */
/* -------------------------------------------------------------------------- */

routeRouter.post('/share', optionalAuthenticate, validateBody(routeShareSchema), async (req, res) => {
  const { campusId, fromNodeId, toNodeId, preferences, algorithm, ttlHours } = req.body;

  const { campus, locations } = await loadRoutingGraph(campusId);
  if (!campus) {
    res.status(404).json({ success: false, error: 'Campus not found' });
    return;
  }
  const knownNodeIds = new Set(locations.map((location) => location.id));
  if (!knownNodeIds.has(fromNodeId) || !knownNodeIds.has(toNodeId) || fromNodeId === toNodeId) {
    sendNodeNotFound(res);
    return;
  }

  const mergedPreferences = await resolvePreferences(req, preferences);
  const { token, issuedAt, expiresAt } = createRouteShareToken(
    {
      campusId,
      fromNodeId,
      toNodeId,
      algorithm,
      // Only boolean constraints are shared; free-text notes never leave the account.
      preferences: decodePreferenceMask(encodePreferenceMask(mergedPreferences)),
    },
    assertValidJwtSecret(),
    { ttlHours }
  );

  const link: RouteShareLinkDTO = {
    token,
    path: `/shared-route/${token}`,
    createdAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  res.status(201).json({ success: true, data: link });
});

routeRouter.get('/shared/:token', async (req, res) => {
  const verification = verifyRouteShareToken(req.params.token, assertValidJwtSecret());
  if (!verification.ok) {
    const expired = verification.reason === 'EXPIRED';
    res.status(expired ? 410 : 404).json({
      success: false,
      error: expired ? 'This shared route link has expired.' : 'This shared route link is not valid.',
      reasonCode: expired ? 'SHARE_LINK_EXPIRED' : 'SHARE_LINK_INVALID',
    });
    return;
  }

  const { payload, issuedAt, expiresAt } = verification;
  const { campus, locations, edges, liveFacilities, reports } = await loadRoutingGraph(
    payload.campusId
  );
  if (!campus) {
    res.status(404).json({ success: false, error: 'Campus not found', reasonCode: 'SHARE_LINK_INVALID' });
    return;
  }

  // The route is recomputed from live data on every visit, so a shared link never shows a stale path.
  const result = calculateAccessibleRoutes(locations, edges, {
    campusId: payload.campusId,
    fromNodeId: payload.fromNodeId,
    toNodeId: payload.toNodeId,
    preferences: { ...defaultPreferences, ...payload.preferences },
    allowUnverifiedFallback: false,
    includeAlternatives: true,
    algorithm: payload.algorithm,
    topK: 3,
    liveFacilities,
    reports,
  });

  const data: SharedRouteDTO = {
    ...result,
    graphVersion: campus.graphVersion || 1,
    fromName: locationName(locations, payload.fromNodeId),
    toName: locationName(locations, payload.toNodeId),
    share: { createdAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString() },
    directions: result.found
      ? buildBilingualDirections(result.routes[0], locations, { edgeWidths: edgeWidthLookup(edges) })
      : null,
  };

  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data });
});

/* -------------------------------------------------------------------------- */
/* History & favorites                                                        */
/* -------------------------------------------------------------------------- */

routeRouter.get('/history', authenticate, async (req, res) => {
  const items = await db.find(
    'routeHistory',
    { userId: req.auth!.userId },
    { sort: { createdAt: -1 }, limit: 50 }
  );
  res.json({ success: true, data: items });
});

routeRouter.get('/favorites', authenticate, async (req, res) => {
  const favorites = await db.find('favoriteLocations', { userId: req.auth!.userId });
  const locations = await db.find<LocationNodeDTO>('locations', { campusId: req.auth!.campusId });
  const enriched = favorites.map((favorite: any) => ({
    ...favorite,
    location: locations.find((location) => location.id === favorite.locationNodeId) || null,
  }));
  res.json({ success: true, data: enriched });
});

routeRouter.post(
  '/favorites',
  authenticate,
  requireCampusAccess('campusId'),
  validateBody(favoriteLocationSchema),
  async (req, res) => {
    const { campusId, locationNodeId, label } = req.body;

    const location = await db.findOne<LocationNodeDTO>('locations', { id: locationNodeId, campusId });
    if (!location) {
      res.status(404).json({ success: false, error: 'Location not found in this campus' });
      return;
    }

    const existing = await db.findOne('favoriteLocations', {
      userId: req.auth!.userId,
      locationNodeId,
    });
    if (existing) {
      res.json({ success: true, data: existing });
      return;
    }

    const created = await db.insert('favoriteLocations', {
      id: newId('fav'),
      userId: req.auth!.userId,
      campusId,
      locationNodeId,
      label,
    });
    res.status(201).json({ success: true, data: created });
  }
);

routeRouter.delete('/favorites/:locationNodeId', authenticate, async (req, res) => {
  await db.deleteOne('favoriteLocations', {
    userId: req.auth!.userId,
    locationNodeId: req.params.locationNodeId,
  });
  res.json({ success: true, data: { removed: true } });
});

/* -------------------------------------------------------------------------- */
/* Saved route records                                                        */
/* -------------------------------------------------------------------------- */

routeRouter.patch(
  '/:id/save',
  authenticate,
  validateBody(routeSavePatchSchema),
  async (req, res) => {
    const patch: Record<string, unknown> = {
      isSaved: req.body.isSaved !== undefined ? Boolean(req.body.isSaved) : true,
    };
    if (req.body.feedbackRating !== undefined) patch.feedbackRating = req.body.feedbackRating;
    if (req.body.feedbackComment !== undefined) patch.feedbackComment = req.body.feedbackComment;

    const updated = await db.updateOne(
      'routeHistory',
      { id: req.params.id, userId: req.auth!.userId },
      patch
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Route history record not found' });
      return;
    }
    res.json({ success: true, data: updated });
  }
);

routeRouter.get('/:id', authenticate, async (req, res) => {
  const item = await db.findOne('routeHistory', {
    id: req.params.id,
    userId: req.auth!.userId,
  });
  if (!item) {
    res.status(404).json({ success: false, error: 'Route not found' });
    return;
  }
  res.json({ success: true, data: item });
});

routeRouter.post(
  '/:id/feedback',
  authenticate,
  validateBody(
    z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).default(''),
    })
  ),
  async (req, res) => {
    const updated = await db.updateOne(
      'routeHistory',
      { id: req.params.id, userId: req.auth!.userId },
      {
        feedbackRating: req.body.rating,
        feedbackComment: req.body.comment,
      }
    );
    if (!updated) {
      res.status(404).json({ success: false, error: 'Route history record not found' });
      return;
    }
    res.json({ success: true, data: updated });
  }
);
