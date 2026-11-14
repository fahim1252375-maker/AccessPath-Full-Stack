import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../repositories/db.ts';
import {
  authenticate,
  optionalAuthenticate,
  requireCampusAccess,
  requireRole,
  validateBody,
} from '../middleware/auth.ts';
import { aiService } from '../services/ai/geminiService.ts';
import type {
  AccessibilityPreferences,
  AccessibilityReportDTO,
  BuildingDTO,
  CampusDTO,
  EquipmentIncidentDTO,
  FloorPlanDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  MaintenanceTaskDTO,
  PathEdgeDTO,
} from '../../../shared/types.ts';

export const aiRouter = Router();

if (process.env.NODE_ENV !== 'test') {
  const aiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'AI rate limit reached. Please try again in a few minutes.' },
  });
  aiRouter.use(aiLimiter);
}

aiRouter.get('/status', (_req, res) => {
  res.json({ success: true, data: aiService.getProviderStatus() });
});

aiRouter.post(
  '/classify-report',
  authenticate,
  requireCampusAccess('campusId'),
  validateBody(
    z.object({
      text: z.string().trim().min(5).max(2000),
      locationHint: z.string().max(160).optional(),
      campusId: z.string().optional(),
    })
  ),
  async (req, res) => {
    const result = await aiService.classifyReport({
      text: req.body.text,
      locationHint: req.body.locationHint,
      campusId: req.body.campusId || req.auth!.campusId,
      userId: req.auth!.userId,
    });
    res.json({ success: true, data: result });
  }
);

aiRouter.post(
  '/translate',
  authenticate,
  validateBody(
    z.object({
      text: z.string().trim().min(2).max(2000),
      targetLanguage: z.enum(['en', 'bn']),
    })
  ),
  async (req, res) => {
    const result = await aiService.translateText({
      text: req.body.text,
      targetLanguage: req.body.targetLanguage,
      campusId: req.auth!.campusId,
      userId: req.auth!.userId,
    });
    res.json({ success: true, data: result });
  }
);

aiRouter.post(
  '/detect-duplicates',
  authenticate,
  requireCampusAccess('campusId'),
  validateBody(
    z.object({
      campusId: z.string().min(1),
      title: z.string().min(2).max(160),
      description: z.string().min(2).max(2000),
      locationLabel: z.string().min(2).max(160),
    })
  ),
  async (req, res) => {
    const existingReports = await db.find<AccessibilityReportDTO>('accessibilityReports', {
      campusId: req.body.campusId,
    });
    const matches = await aiService.detectDuplicates({
      title: req.body.title,
      description: req.body.description,
      locationLabel: req.body.locationLabel,
      existingReports,
    });
    res.json({ success: true, data: matches });
  }
);

aiRouter.post(
  '/summarize',
  authenticate,
  requireRole('moderator', 'campus_admin', 'super_admin'),
  requireCampusAccess('campusId'),
  validateBody(z.object({ campusId: z.string().min(1) })),
  async (req, res) => {
    const [campus, reports] = await Promise.all([
      db.findOne<CampusDTO>('campuses', { id: req.body.campusId }),
      db.find<AccessibilityReportDTO>('accessibilityReports', { campusId: req.body.campusId }),
    ]);
    const summary = await aiService.summarizeReports({
      reports,
      campusName: campus?.name || 'Campus',
      campusId: req.body.campusId,
      userId: req.auth!.userId,
    });
    res.json({ success: true, data: summary });
  }
);

aiRouter.post(
  '/analytics-qa',
  authenticate,
  requireRole('moderator', 'campus_admin', 'super_admin'),
  requireCampusAccess('campusId'),
  validateBody(
    z.object({
      campusId: z.string().min(1),
      question: z.string().trim().min(3).max(600),
    })
  ),
  async (req, res) => {
    const [campus, reports, edges, buildings, incidents, tasks] = await Promise.all([
      db.findOne<CampusDTO>('campuses', { id: req.body.campusId }),
      db.find<AccessibilityReportDTO>('accessibilityReports', { campusId: req.body.campusId }),
      db.find<PathEdgeDTO>('pathEdges', { campusId: req.body.campusId }),
      db.find<BuildingDTO>('buildings', { campusId: req.body.campusId }),
      db.find<EquipmentIncidentDTO>('equipmentIncidents', { campusId: req.body.campusId }),
      db.find<MaintenanceTaskDTO>('maintenanceTasks', { campusId: req.body.campusId }),
    ]);
    const qa = await aiService.analyticsAssistant({
      question: req.body.question,
      campusName: campus?.name || 'Campus',
      campusId: req.body.campusId,
      userId: req.auth!.userId,
      reports,
      edges,
      buildings,
      incidents,
      tasks,
    });
    res.json({ success: true, data: qa });
  }
);

aiRouter.post(
  '/analyze-image',
  authenticate,
  validateBody(
    z.object({
      base64Data: z.string().min(10),
      mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
      note: z.string().max(400).optional(),
    })
  ),
  async (req, res) => {
    const result = await aiService.analyzeImage({
      base64Data: req.body.base64Data,
      mimeType: req.body.mimeType,
      note: req.body.note,
      campusId: req.auth!.campusId,
      userId: req.auth!.userId,
    });
    res.json({ success: true, data: result });
  }
);

aiRouter.post(
  '/assistant',
  optionalAuthenticate,
  validateBody(
    z.object({
      campusId: z.string().default('campus_demo_north'),
      message: z.string().trim().min(2).max(1000),
    })
  ),
  async (req, res) => {
    const campusId = req.body.campusId;
    if (req.auth && req.auth.role !== 'super_admin' && campusId !== req.auth.campusId) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: cross-campus AI assistant queries are restricted',
      });
      return;
    }

    const [buildings, locations, edges, reports, liveFacilities, floorPlans, userProfile] =
      await Promise.all([
        db.find<BuildingDTO>('buildings', { campusId }),
        db.find<LocationNodeDTO>('locations', { campusId }),
        db.find<PathEdgeDTO>('pathEdges', { campusId }),
        db.find<AccessibilityReportDTO>('accessibilityReports', { campusId }),
        db.find<LiveFacilityStatusDTO>('liveFacilities', { campusId }),
        db.find<FloorPlanDTO>('floorPlans', { campusId }),
        req.auth
          ? db.findOne<AccessibilityPreferences>('accessibilityProfiles', { userId: req.auth.userId })
          : Promise.resolve(null),
      ]);

    const result = await aiService.campusAssistant({
      message: req.body.message,
      campusId,
      userId: req.auth?.userId,
      buildings,
      locations,
      edges,
      reports,
      liveFacilities,
      floorPlans,
      userPreferences: userProfile || undefined,
    });
    res.json({ success: true, data: result });
  }
);

aiRouter.get(
  '/logs',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  async (req, res) => {
    const filter =
      req.auth!.role === 'super_admin' ? {} : { campusId: req.auth!.campusId };
    const logs = await db.find('aiInteractions', filter, {
      sort: { createdAt: -1 },
      limit: 100,
    });
    res.json({ success: true, data: logs });
  }
);
