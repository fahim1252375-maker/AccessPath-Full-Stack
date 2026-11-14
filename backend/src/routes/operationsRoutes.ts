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
import { classScheduleCreateSchema, liveFacilityPatchSchema } from '../schemas/validators.ts';
import { calculateAccessibleRoutes } from '../services/routing/dijkstra.ts';
import { createInAppNotification, recordAudit } from '../utils/audit.ts';
import type {
  AccessibilityPreferences,
  AccessibilityReportDTO,
  ClassScheduleItemDTO,
  DayPlanTransitionDTO,
  FacilitySubscriptionDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
} from '../../../shared/types.ts';
import { newId } from '../utils/ids.ts';

export const operationsRouter = Router();

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

function parseHhMmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToHhMm(totalMins: number): string {
  const normalized = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = Math.round(normalized % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Phase 4 — Live Campus Accessibility Status
operationsRouter.get('/live-status', optionalAuthenticate, async (req, res) => {
  const requestedCampus =
    typeof req.query.campusId === 'string' && req.query.campusId ? req.query.campusId : null;
  if (req.auth && req.auth.role !== 'super_admin' && requestedCampus && requestedCampus !== req.auth.campusId) {
    res.status(403).json({ success: false, error: 'Cross-campus live status query denied' });
    return;
  }
  const campusId = requestedCampus || req.auth?.campusId || 'campus_demo_north';
  const facilities = await db.find<LiveFacilityStatusDTO>('liveFacilities', { campusId });

  let mySubscriptions: string[] = [];
  if (req.auth) {
    const subs = await db.find<FacilitySubscriptionDTO>('facilitySubscriptions', {
      userId: req.auth.userId,
      campusId,
    });
    mySubscriptions = subs.map((s) => s.facilityId);
  }

  res.json({
    success: true,
    data: {
      campusId,
      facilities,
      subscribedFacilityIds: mySubscriptions,
      lastCheckedAt: new Date().toISOString(),
    },
  });
});

operationsRouter.post(
  '/live-status/:facilityId/subscribe',
  authenticate,
  validateBody(
    z.object({
      channel: z.enum(['in_app', 'web_push']).default('in_app'),
      pushEndpoint: z.string().max(500).optional(),
    })
  ),
  async (req, res) => {
    const facility = await db.findOne<LiveFacilityStatusDTO>('liveFacilities', {
      id: req.params.facilityId,
    });
    if (!facility) {
      res.status(404).json({ success: false, error: 'Facility not found' });
      return;
    }
    if (req.auth!.role !== 'super_admin' && facility.campusId !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus facility subscription denied' });
      return;
    }

    const existing = await db.findOne<FacilitySubscriptionDTO>('facilitySubscriptions', {
      userId: req.auth!.userId,
      facilityId: facility.id,
    });
    if (existing) {
      await db.deleteOne('facilitySubscriptions', { id: existing.id });
      res.json({ success: true, data: { subscribed: false, facilityId: facility.id } });
      return;
    }

    const created: FacilitySubscriptionDTO = {
      id: newId('sub'),
      userId: req.auth!.userId,
      campusId: facility.campusId,
      facilityId: facility.id,
      channel: req.body.channel,
      pushEndpoint: req.body.pushEndpoint,
      createdAt: new Date().toISOString(),
    };
    await db.insert('facilitySubscriptions', created);
    res.status(201).json({ success: true, data: { subscribed: true, subscription: created } });
  }
);

operationsRouter.patch(
  '/live-status/:facilityId',
  authenticate,
  requireRole('moderator', 'campus_admin', 'super_admin'),
  validateBody(liveFacilityPatchSchema),
  async (req, res) => {
    const facility = await db.findOne<LiveFacilityStatusDTO>('liveFacilities', {
      id: req.params.facilityId,
    });
    if (!facility) {
      res.status(404).json({ success: false, error: 'Facility not found' });
      return;
    }
    if (req.auth!.role !== 'super_admin' && facility.campusId !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus facility update denied' });
      return;
    }

    const now = new Date().toISOString();
    const updated = await db.updateOne<LiveFacilityStatusDTO>(
      'liveFacilities',
      { id: facility.id },
      {
        status: req.body.status,
        source: req.body.source || `Authorized update by ${req.auth!.email}`,
        authorityVerified: req.body.authorityVerified ?? ['campus_admin', 'super_admin'].includes(req.auth!.role),
        notes: req.body.notes !== undefined ? req.body.notes : facility.notes,
        lastSyncAt: now,
      }
    );

    const isOutage = req.body.status === 'outage' || req.body.status === 'closed';

    // Sync operational availability onto linked routing graph edge cleanly
    if (facility.edgeId) {
      if (facility.facilityType === 'elevator') {
        await db.updateOne('pathEdges', { id: facility.edgeId }, {
          elevatorOperational: !isOutage,
          closureReason: isOutage ? `${facility.name}: ${req.body.status}` : undefined,
        });
      } else {
        await db.updateOne('pathEdges', { id: facility.edgeId }, {
          status: isOutage ? 'blocked' : 'open',
          temporaryClosure: isOutage,
          closureReason: isOutage ? `${facility.name}: ${req.body.status}` : undefined,
        });
      }
    }

    if (isOutage && facility.buildingId) {
      await db.insert('equipmentIncidents', {
        id: newId('inc'),
        campusId: facility.campusId,
        buildingId: facility.buildingId,
        facilityId: facility.id,
        edgeId: facility.edgeId,
        equipmentName: facility.name,
        startedAt: now,
        severity: facility.facilityType === 'elevator' ? 'critical' : 'high',
        slaTargetHours: facility.facilityType === 'elevator' ? 12 : 24,
        rootCause: req.body.notes || `Reported ${req.body.status} via Live Operations`,
        isDemoData: false,
      });
    }

    // Alert all subscribed users about outage or recovery
    const subscribers = await db.find<FacilitySubscriptionDTO>('facilitySubscriptions', {
      facilityId: facility.id,
    });
    for (const sub of subscribers) {
      await createInAppNotification({
        userId: sub.userId,
        campusId: facility.campusId,
        type: 'route_alert',
        title: `${facility.name}: ${req.body.status.toUpperCase()}`,
        message: isOutage
          ? `${facility.name} is currently ${req.body.status}. Recalculate affected campus routes.`
          : `${facility.name} has returned to ${req.body.status} status.`,
        link: '/app/planner',
      });
    }

    await recordAudit({
      campusId: facility.campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'LIVE_FACILITY_STATUS_CHANGED',
      targetType: 'liveFacility',
      targetId: facility.id,
      details: `Set ${facility.name} status=${req.body.status} (notified ${subscribers.length} subscribers)`,
    });

    res.json({
      success: true,
      data: {
        facility: updated,
        notifiedSubscribers: subscribers.length,
        affectedEdgeId: facility.edgeId,
      },
    });
  }
);

// Phase 5 — Smart Class Schedule Planner
operationsRouter.get('/schedule', authenticate, async (req, res) => {
  const items = await db.find<ClassScheduleItemDTO>('classScheduleItems', {
    userId: req.auth!.userId,
    campusId: req.auth!.campusId,
  });
  items.sort((a, b) => a.startTime.localeCompare(b.startTime));
  res.json({ success: true, data: items });
});

operationsRouter.post(
  '/schedule',
  authenticate,
  requireCampusAccess('campusId'),
  validateBody(classScheduleCreateSchema),
  async (req, res) => {
    const startM = parseHhMmToMinutes(req.body.startTime);
    const endM = parseHhMmToMinutes(req.body.endTime);
    if (endM <= startM) {
      res.status(400).json({ success: false, error: 'Class endTime must be after startTime' });
      return;
    }
    const item: ClassScheduleItemDTO = {
      id: newId('cls'),
      userId: req.auth!.userId,
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    const created = await db.insert('classScheduleItems', item);
    res.status(201).json({ success: true, data: created });
  }
);

operationsRouter.delete('/schedule/:id', authenticate, async (req, res) => {
  const deleted = await db.deleteOne('classScheduleItems', {
    id: req.params.id,
    userId: req.auth!.userId,
  });
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Schedule entry not found' });
    return;
  }
  res.json({ success: true, data: { deleted: true } });
});

operationsRouter.get('/schedule/day-plan', authenticate, async (req, res) => {
  const day = (typeof req.query.day === 'string' && req.query.day) || 'Mon';
  const campusId = req.auth!.campusId;
  const arrivalStartNodeId =
    (typeof req.query.startNodeId === 'string' && req.query.startNodeId) || 'loc_main_gate';

  const [allClasses, savedProfile, locations, edges, liveFacilities, reports] = await Promise.all([
    db.find<ClassScheduleItemDTO>('classScheduleItems', {
      userId: req.auth!.userId,
      campusId,
      dayOfWeek: day,
    }),
    db.findOne<AccessibilityPreferences>('accessibilityProfiles', { userId: req.auth!.userId }),
    db.find<LocationNodeDTO>('locations', { campusId }),
    db.find<PathEdgeDTO>('pathEdges', { campusId }),
    db.find<LiveFacilityStatusDTO>('liveFacilities', { campusId }),
    db.find<AccessibilityReportDTO>('accessibilityReports', { campusId }),
  ]);

  const classes = [...allClasses].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const prefs: AccessibilityPreferences = {
    ...defaultPreferences,
    ...(savedProfile || {}),
  };
  const locMap = new Map(locations.map((l) => [l.id, l]));

  const transitions: DayPlanTransitionDTO[] = [];

  for (let i = 0; i < classes.length; i++) {
    const current = classes[i];
    const prevClass = i > 0 ? classes[i - 1] : null;
    const fromNodeId = prevClass ? prevClass.locationNodeId : arrivalStartNodeId;
    const toNodeId = current.locationNodeId;

    // Strictly use verified accessible routing — NEVER enable unverified fallback because schedule is tight
    const routeResult = calculateAccessibleRoutes(locations, edges, {
      campusId,
      fromNodeId,
      toNodeId,
      preferences: prefs,
      allowUnverifiedFallback: false,
      includeAlternatives: false,
      liveFacilities,
      reports,
    });

    const primary = routeResult.routes[0];
    const estTravelMin = primary ? primary.estimatedMinutes : 0;
    const classStartM = parseHhMmToMinutes(current.startTime);
    const prevEndM = prevClass ? parseHhMmToMinutes(prevClass.endTime) : classStartM - 45;
    const availableMinutes = Math.max(0, classStartM - prevEndM);
    const recommendedDepartureTime = formatMinutesToHhMm(
      classStartM - estTravelMin - current.bufferMinutes
    );

    let tightScheduleWarning: string | undefined;
    if (!routeResult.found) {
      tightScheduleWarning =
        'No verified accessible route found for this class transition. AccessPath will not substitute unverified paths; contact disability support for accommodations.';
    } else if (prevClass && availableMinutes < estTravelMin + current.bufferMinutes) {
      tightScheduleWarning = `Tight transition: ${availableMinutes} min between classes, but accessible route + ${current.bufferMinutes} min buffer requires ${
        estTravelMin + current.bufferMinutes
      } min.`;
    }

    transitions.push({
      fromClassId: prevClass?.id,
      toClassId: current.id,
      fromLocationName: locMap.get(fromNodeId)?.name || fromNodeId,
      toLocationName: locMap.get(toNodeId)?.name || toNodeId,
      recommendedDepartureTime,
      classStartTime: current.startTime,
      availableMinutes,
      estimatedTravelMinutes: estTravelMin,
      bufferMinutes: current.bufferMinutes,
      routeFound: routeResult.found,
      tightScheduleWarning,
      routeResult,
    });
  }

  res.json({
    success: true,
    data: {
      dayOfWeek: day,
      campusId,
      classes,
      transitions,
    },
  });
});
