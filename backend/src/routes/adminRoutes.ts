import { Router } from 'express';
import { z } from 'zod';
import { db } from '../repositories/db.ts';
import {
  authenticate,
  requireCampusAccess,
  requireRole,
  revokeAllUserSessions,
  validateBody,
} from '../middleware/auth.ts';
import { emailAdapter, testCampusIntegration } from '../services/integrations/adapters.ts';
import { createInAppNotification, recordAudit } from '../utils/audit.ts';
import { getFailedJobs, getRecentErrors, runReadinessChecks } from '../utils/observability.ts';
import { simulateGraphChange } from '../services/routing/graphSimulation.ts';
import type {
  AnnouncementDTO,
  CampusIntegrationDTO,
  CampusTransferRequestDTO,
  MaintenanceTaskDTO,
  NotificationDTO,
  UserRole,
  AccessibilityPreferences,
  AccessibilityReportDTO,
  CampusDTO,
  BuildingDTO,
  LiveFacilityStatusDTO,
  LocationNodeDTO,
  PathEdgeDTO,
  GraphSimulationResultDTO,
} from '../../../shared/types.ts';
import { newId } from '../utils/ids.ts';

export const adminRouter = Router();

const graphSimulationSchema = z.object({
  campusId: z.string().min(1).max(100),
  edgeId: z.string().min(1).max(100),
  action: z.enum(['fixed', 'closed', 'ramp_added']),
  routePairs: z.array(z.object({
    fromNodeId: z.string().min(1).max(100),
    toNodeId: z.string().min(1).max(100),
  }).strict().refine((pair) => pair.fromNodeId !== pair.toNodeId, {
    message: 'Origin and destination must be different locations',
  })).min(1).max(25),
  preferences: z.object({
    wheelchairMode: z.boolean().optional(),
    stepFreeMode: z.boolean().optional(),
    limitedMobilityMode: z.boolean().optional(),
    rampRequired: z.boolean().optional(),
    elevatorRequired: z.boolean().optional(),
    stairsAvoidance: z.boolean().optional(),
    smoothSurfacePreference: z.boolean().optional(),
    widePathPreference: z.boolean().optional(),
    lowGradientPreference: z.boolean().optional(),
    wellLitPreference: z.boolean().optional(),
    visualAssistanceMode: z.boolean().optional(),
    customNotes: z.string().max(500).optional(),
  }).strict().optional(),
}).strict();

const simulationDefaultPreferences: AccessibilityPreferences = {
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

adminRouter.post(
  '/accessibility-twin/simulate',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess(),
  validateBody(graphSimulationSchema),
  async (req, res) => {
    const { campusId, edgeId, action, routePairs, preferences } = req.body as z.infer<typeof graphSimulationSchema>;
    const [campus, buildings, locations, edges, liveFacilities, reports] = await Promise.all([
      db.findOne<CampusDTO>('campuses', { id: campusId }),
      db.find<BuildingDTO>('buildings', { campusId }),
      db.find<LocationNodeDTO>('locations', { campusId }),
      db.find<PathEdgeDTO>('pathEdges', { campusId }),
      db.find<LiveFacilityStatusDTO>('liveFacilities', { campusId }),
      db.find<AccessibilityReportDTO>('accessibilityReports', { campusId }),
    ]);

    if (!campus) {
      res.status(404).json({ success: false, error: 'Campus not found' });
      return;
    }
    if (!edges.some((edge) => edge.id === edgeId)) {
      res.status(404).json({ success: false, error: 'Path segment not found in this campus' });
      return;
    }
    const knownLocationIds = new Set(locations.map((location) => location.id));
    if (routePairs.some((pair) => !knownLocationIds.has(pair.fromNodeId) || !knownLocationIds.has(pair.toNodeId))) {
      res.status(400).json({ success: false, error: 'Every route pair must use locations in the selected campus' });
      return;
    }

    const result = simulateGraphChange({
      campus,
      buildings,
      locations,
      edges,
      liveFacilities,
      reports,
      edgeId,
      action,
      routePairs,
      preferences: { ...simulationDefaultPreferences, ...(preferences || {}) },
    }) as GraphSimulationResultDTO;

    await recordAudit({
      campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'SIMULATE_ACCESSIBILITY_GRAPH_CHANGE',
      targetType: 'pathEdge',
      targetId: edgeId,
      details: `Non-persistent ${action} simulation evaluated ${routePairs.length} route pair(s)`,
    });

    res.json({ success: true, data: result });
  }
);

adminRouter.get(
  '/dashboard',
  authenticate,
  requireRole('campus_admin', 'super_admin', 'moderator'),
  async (req, res) => {
    const requestedCampus = typeof req.query.campusId === 'string' && req.query.campusId ? req.query.campusId : null;
    if (req.auth!.role !== 'super_admin' && requestedCampus && requestedCampus !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus dashboard access denied' });
      return;
    }
    const campusId = requestedCampus || req.auth!.campusId;

    const [reports, tasks, edges, users, auditLogs] = await Promise.all([
      db.find('accessibilityReports', { campusId }),
      db.find('maintenanceTasks', { campusId }),
      db.find('pathEdges', { campusId }),
      db.find('users', { campusId }),
      db.find('auditLogs', { campusId }, { sort: { createdAt: -1 }, limit: 20 }),
    ]);

    res.json({
      success: true,
      data: {
        campusId,
        reportsTotal: reports.length,
        pendingVerificationCount: reports.filter((r: any) =>
          ['submitted', 'ai_classified', 'pending_review', 'under_verification'].includes(r.status)
        ).length,
        openMaintenanceCount: tasks.filter((t: any) => t.status !== 'completed').length,
        blockedEdgesCount: edges.filter((e: any) => e.status === 'blocked' || e.temporaryClosure).length,
        usersCount: users.length,
        recentAuditLogs: auditLogs,
      },
    });
  }
);

adminRouter.get(
  '/users',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  async (req, res) => {
    const { page, limit } = req.query;
    const filter = req.auth!.role === 'super_admin' ? {} : { campusId: req.auth!.campusId };
    const total = await db.count('users', filter);
    const limitNum = limit ? Math.min(200, Math.max(1, Number(limit) || 50)) : undefined;
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = limitNum ? (pageNum - 1) * limitNum : undefined;

    const users = await db.find<any>('users', filter, { limit: limitNum, skip });
    res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        campusId: u.campusId,
        institutionId: u.institutionId,
        emailVerified: Boolean(u.emailVerified),
        isActive: Boolean(u.isActive),
        isDemoAccount: Boolean(u.isDemoAccount),
        createdAt: u.createdAt,
      })),
      meta: { page: pageNum, limit: limitNum || total, total },
    });
  }
);

adminRouter.patch(
  '/users/:userId',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  validateBody(
    z
      .object({
        role: z.enum(['student', 'volunteer', 'moderator', 'campus_admin', 'super_admin']).optional(),
        isActive: z.boolean().optional(),
      })
      .strict()
  ),
  async (req, res) => {
    const target = await db.findOne<any>('users', { id: req.params.userId });
    if (!target) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    if (req.auth!.role !== 'super_admin' && target.campusId !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus user management denied' });
      return;
    }
    if (req.body.role === 'super_admin' && req.auth!.role !== 'super_admin') {
      res.status(403).json({ success: false, error: 'Only Super Admin can assign super_admin role' });
      return;
    }
    const updated = await db.updateOne<any>('users', { id: target.id }, req.body);

    // Revoke existing sessions if account deactivated or role changed
    if (req.body.isActive === false || (req.body.role && req.body.role !== target.role)) {
      await revokeAllUserSessions(target.id, 'admin_security_update');
    }

    await recordAudit({
      campusId: target.campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'UPDATE_USER_ACCESS',
      targetType: 'user',
      targetId: target.id,
      details: `Updated user role=${updated.role}, isActive=${updated.isActive}`,
    });
    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role as UserRole,
        isActive: updated.isActive,
      },
    });
  }
);

// Authorized Campus Transfer Workflow (separately authorized from self profile edit)
adminRouter.get(
  '/transfer-requests',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  async (req, res) => {
    const filter =
      req.auth!.role === 'super_admin' ? {} : { fromCampusId: req.auth!.campusId };
    const requests = await db.find<CampusTransferRequestDTO>('campusTransferRequests', filter, {
      sort: { createdAt: -1 },
    });
    res.json({ success: true, data: requests });
  }
);

adminRouter.patch(
  '/transfer-requests/:id',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  validateBody(z.object({ decision: z.enum(['approved', 'rejected']) }).strict()),
  async (req, res) => {
    const transfer = await db.findOne<CampusTransferRequestDTO>('campusTransferRequests', {
      id: req.params.id,
    });
    if (!transfer) {
      res.status(404).json({ success: false, error: 'Transfer request not found' });
      return;
    }
    if (
      req.auth!.role !== 'super_admin' &&
      transfer.fromCampusId !== req.auth!.campusId &&
      transfer.toCampusId !== req.auth!.campusId
    ) {
      res.status(403).json({ success: false, error: 'Cross-campus transfer review denied' });
      return;
    }
    if (transfer.status !== 'pending') {
      res.status(400).json({ success: false, error: 'Transfer request already processed' });
      return;
    }

    const updatedTransfer = await db.updateOne<CampusTransferRequestDTO>(
      'campusTransferRequests',
      { id: transfer.id },
      {
        status: req.body.decision,
        reviewedBy: req.auth!.email,
        reviewedAt: new Date().toISOString(),
      }
    );

    if (req.body.decision === 'approved') {
      const targetCampus = await db.findOne<any>('campuses', { id: transfer.toCampusId });
      if (targetCampus) {
        await db.updateOne('users', { id: transfer.userId }, {
          campusId: targetCampus.id,
          institutionId: targetCampus.institutionId,
        });
        await revokeAllUserSessions(transfer.userId, 'campus_transfer_approved');
      }
    }

    await recordAudit({
      campusId: transfer.fromCampusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'REVIEW_CAMPUS_TRANSFER',
      targetType: 'campusTransferRequest',
      targetId: transfer.id,
      details: `Campus transfer ${req.body.decision} (${transfer.fromCampusId} -> ${transfer.toCampusId})`,
    });

    res.json({ success: true, data: updatedTransfer });
  }
);

adminRouter.get(
  '/maintenance',
  authenticate,
  requireRole('volunteer', 'moderator', 'campus_admin', 'super_admin'),
  async (req, res) => {
    const requestedCampus = typeof req.query.campusId === 'string' && req.query.campusId ? req.query.campusId : null;
    if (req.auth!.role !== 'super_admin' && requestedCampus && requestedCampus !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus maintenance list denied' });
      return;
    }
    const campusId = requestedCampus || req.auth!.campusId;
    const tasks = await db.find<MaintenanceTaskDTO>('maintenanceTasks', { campusId }, {
      sort: { createdAt: -1 },
    });
    res.json({ success: true, data: tasks });
  }
);

adminRouter.post(
  '/maintenance',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('campusId'),
  validateBody(
    z.object({
      campusId: z.string().min(1),
      reportId: z.string().optional(),
      edgeId: z.string().optional(),
      locationNodeId: z.string().optional(),
      title: z.string().min(3).max(160),
      description: z.string().max(1000).default(''),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      assignedTeam: z.string().min(2).max(120).default('Facilities Maintenance'),
      slaTargetHours: z.number().int().min(1).max(720).default(48),
      estimatedCompletionDate: z.string().optional(),
    })
  ),
  async (req, res) => {
    const id = newId('maint');
    const created = await db.insert('maintenanceTasks', {
      id,
      ...req.body,
      status: 'assigned',
      isDemoData: false,
    });
    if (req.body.reportId) {
      const rep = await db.findOne<any>('accessibilityReports', { id: req.body.reportId });
      if (rep) {
        await db.updateOne('accessibilityReports', { id: rep.id }, {
          status: 'assigned',
          timeline: [
            ...rep.timeline,
            {
              status: 'assigned',
              note: `Maintenance work order ${id} assigned to ${req.body.assignedTeam}.`,
              actorRole: req.auth!.role,
              timestamp: new Date().toISOString(),
            },
          ],
        });
      }
    }
    await recordAudit({
      campusId: req.body.campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'CREATE_MAINTENANCE_TASK',
      targetType: 'maintenance',
      targetId: id,
      details: `Assigned "${req.body.title}" to ${req.body.assignedTeam}`,
    });
    res.status(201).json({ success: true, data: created });
  }
);

adminRouter.patch(
  '/maintenance/:id',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  validateBody(
    z
      .object({
        status: z.enum(['open', 'assigned', 'in_progress', 'completed', 'deferred']).optional(),
        assignedTeam: z.string().optional(),
        estimatedCompletionDate: z.string().optional(),
      })
      .strict()
  ),
  async (req, res) => {
    const existing = await db.findOne<MaintenanceTaskDTO>('maintenanceTasks', { id: req.params.id });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Maintenance task not found' });
      return;
    }
    if (req.auth!.role !== 'super_admin' && existing.campusId !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus modification denied' });
      return;
    }
    const patch: Record<string, any> = { ...req.body };
    if (req.body.status === 'completed') {
      const now = new Date().toISOString();
      patch.completedAt = now;
      if (existing.edgeId) {
        await db.updateOne('pathEdges', { id: existing.edgeId }, {
          status: 'open',
          temporaryClosure: false,
          closureReason: undefined,
          lastVerifiedAt: now,
          verificationExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        });
      }
      if (existing.reportId) {
        const rep = await db.findOne<any>('accessibilityReports', { id: existing.reportId });
        if (rep) {
          await db.updateOne('accessibilityReports', { id: rep.id }, {
            status: 'resolved',
            timeline: [
              ...rep.timeline,
              {
                status: 'resolved',
                note: 'Maintenance task marked completed and path reopened.',
                actorRole: req.auth!.role,
                timestamp: now,
              },
            ],
          });
        }
      }
    }
    const updated = await db.updateOne('maintenanceTasks', { id: existing.id }, patch);
    await recordAudit({
      campusId: existing.campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'UPDATE_MAINTENANCE_TASK',
      targetType: 'maintenance',
      targetId: existing.id,
      details: `Updated maintenance status=${req.body.status || existing.status}`,
    });
    res.json({ success: true, data: updated });
  }
);

adminRouter.get('/notifications', authenticate, async (req, res) => {
  const items = await db.find<NotificationDTO>(
    'notifications',
    { userId: req.auth!.userId },
    { sort: { createdAt: -1 }, limit: 50 }
  );
  res.json({ success: true, data: items });
});

adminRouter.patch('/notifications/:id/read', authenticate, async (req, res) => {
  const updated = await db.updateOne(
    'notifications',
    { id: req.params.id, userId: req.auth!.userId },
    { read: true }
  );
  res.json({ success: true, data: updated });
});

adminRouter.get('/announcements', async (req, res) => {
  const campusId = typeof req.query.campusId === 'string' ? req.query.campusId : 'campus_demo_north';
  const list = await db.find<AnnouncementDTO>(
    'announcements',
    { campusId },
    { sort: { createdAt: -1 } }
  );
  res.json({ success: true, data: list });
});

adminRouter.post(
  '/announcements',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  requireCampusAccess('campusId'),
  validateBody(
    z.object({
      campusId: z.string().min(1),
      title: z.string().min(3).max(160),
      message: z.string().min(5).max(1200),
      severity: z.enum(['info', 'warning', 'urgent']).default('info'),
    })
  ),
  async (req, res) => {
    const created = await db.insert('announcements', {
      id: newId('ann'),
      ...req.body,
      authorName: req.auth!.email,
      active: true,
    });
    const campusUsers = await db.find<any>('users', { campusId: req.body.campusId });
    for (const u of campusUsers) {
      await createInAppNotification({
        userId: u.id,
        campusId: req.body.campusId,
        type: 'announcement',
        title: req.body.title,
        message: req.body.message,
        link: '/app/notifications',
      });
    }
    await recordAudit({
      campusId: req.body.campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'CREATE_ANNOUNCEMENT',
      targetType: 'announcement',
      targetId: created.id,
      details: `Published announcement "${req.body.title}"`,
    });
    res.status(201).json({ success: true, data: created });
  }
);

adminRouter.post(
  '/notifications/test-email',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  validateBody(z.object({ to: z.string().email() })),
  async (req, res) => {
    const result = await emailAdapter.sendNotificationEmail({
      to: req.body.to,
      subject: 'AccessPath Notification Test',
      body: 'Verifying transactional email provider configuration.',
    });
    res.json({ success: true, data: result });
  }
);

adminRouter.get(
  '/integrations',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  async (req, res) => {
    const requestedCampus = typeof req.query.campusId === 'string' && req.query.campusId ? req.query.campusId : null;
    if (req.auth!.role !== 'super_admin' && requestedCampus && requestedCampus !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus integration access denied' });
      return;
    }
    const campusId = requestedCampus || req.auth!.campusId;
    const list = await db.find<CampusIntegrationDTO>('campusIntegrations', { campusId });
    res.json({ success: true, data: list });
  }
);

adminRouter.post(
  '/integrations/:key/test',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  async (req, res) => {
    const requestedCampus = typeof req.body?.campusId === 'string' && req.body.campusId ? req.body.campusId : null;
    if (req.auth!.role !== 'super_admin' && requestedCampus && requestedCampus !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus integration test denied' });
      return;
    }
    const campusId = requestedCampus || req.auth!.campusId;
    const result = await testCampusIntegration(campusId, req.params.key as CampusIntegrationDTO['key']);
    res.json({ success: true, data: result });
  }
);

adminRouter.get(
  '/audit-logs',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  async (req, res) => {
    const { page, limit } = req.query;
    const filter = req.auth!.role === 'super_admin' ? {} : { campusId: req.auth!.campusId };
    const total = await db.count('auditLogs', filter);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 100));
    const pageNum = Math.max(1, Number(page) || 1);
    const logs = await db.find('auditLogs', filter, {
      sort: { createdAt: -1 },
      limit: limitNum,
      skip: (pageNum - 1) * limitNum,
    });
    res.json({ success: true, data: logs, meta: { page: pageNum, limit: limitNum, total } });
  }
);

// Phase 11 — Observability & Service Health Readiness
adminRouter.get(
  '/system/observability',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  async (_req, res) => {
    const readiness = await runReadinessChecks();
    res.json({
      success: true,
      data: {
        ...readiness,
        recentErrors: getRecentErrors().slice(0, 20),
        failedJobs: getFailedJobs().slice(0, 20),
      },
    });
  }
);

// Phase 1 — Production Data Safety: Backup, Restore & Integrity Verification (Super Admin)
adminRouter.get(
  '/system/integrity',
  authenticate,
  requireRole('super_admin'),
  async (_req, res) => {
    const report = await db.runIntegrityCheck();
    res.json({ success: true, data: report });
  }
);

adminRouter.get(
  '/system/backup',
  authenticate,
  requireRole('super_admin'),
  async (req, res) => {
    const backup = await db.exportBackup();
    await recordAudit({
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'EXPORT_DB_BACKUP',
      targetType: 'system',
      targetId: 'database',
      details: `Exported schema v${backup.schemaVersion} backup snapshot`,
    });
    res.json({ success: true, data: backup });
  }
);

adminRouter.post(
  '/system/restore',
  authenticate,
  requireRole('super_admin'),
  validateBody(
    z.object({
      schemaVersion: z.number().int().min(1),
      collections: z.record(z.string(), z.array(z.any())),
    })
  ),
  async (req, res) => {
    const summary = await db.restoreBackup(req.body);
    await recordAudit({
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'RESTORE_DB_BACKUP',
      targetType: 'system',
      targetId: 'database',
      details: `Restored ${summary.restoredCollections} collections (${summary.restoredDocuments} docs)`,
    });
    res.json({ success: true, data: summary });
  }
);

adminRouter.get(
  '/institutions',
  authenticate,
  requireRole('super_admin'),
  async (_req, res) => {
    const list = await db.find('institutions');
    res.json({ success: true, data: list });
  }
);

adminRouter.post(
  '/institutions',
  authenticate,
  requireRole('super_admin'),
  validateBody(
    z.object({
      name: z.string().min(3).max(120),
      code: z.string().min(2).max(20),
      country: z.string().min(2).max(80),
      contactEmail: z.string().email(),
    })
  ),
  async (req, res) => {
    const created = await db.insert('institutions', {
      id: newId('inst'),
      ...req.body,
      isDemoData: false,
      status: 'active',
    });
    res.status(201).json({ success: true, data: created });
  }
);
