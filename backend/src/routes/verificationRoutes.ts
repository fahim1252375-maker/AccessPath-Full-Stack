import { Router } from 'express';
import { z } from 'zod';
import { db } from '../repositories/db.ts';
import {
  authenticate,
  requireCampusAccess,
  requireRole,
  validateBody,
} from '../middleware/auth.ts';
import { verificationSchema } from '../schemas/validators.ts';
import { DEFAULT_VERIFICATION_EXPIRY_DAYS } from '../services/trust/trustEngine.ts';
import { createInAppNotification, recordAudit } from '../utils/audit.ts';
import type { AccessibilityReportDTO, PathEdgeDTO, VerificationRecordDTO } from '../../../shared/types.ts';
import { newId } from '../utils/ids.ts';

export const verificationRouter = Router();

verificationRouter.get(
  '/queue',
  authenticate,
  requireRole('volunteer', 'moderator', 'campus_admin', 'super_admin'),
  async (req, res) => {
    const campusId =
      req.auth!.role === 'super_admin' && typeof req.query.campusId === 'string'
        ? req.query.campusId
        : req.auth!.campusId;

    const reports = await db.find<AccessibilityReportDTO>(
      'accessibilityReports',
      { campusId },
      { sort: { createdAt: -1 } }
    );

    const queue = reports.filter((r) =>
      ['submitted', 'ai_classified', 'pending_review', 'under_verification', 'disputed'].includes(
        r.status
      )
    );

    res.json({ success: true, data: queue });
  }
);

verificationRouter.get(
  '/history',
  authenticate,
  requireRole('volunteer', 'moderator', 'campus_admin', 'super_admin'),
  async (req, res) => {
    const filter: Record<string, any> = {};
    if (req.auth!.role === 'volunteer') {
      filter.verifierId = req.auth!.userId;
    } else if (req.auth!.role !== 'super_admin') {
      filter.campusId = req.auth!.campusId;
    }
    const records = await db.find<VerificationRecordDTO>('verifications', filter, {
      sort: { createdAt: -1 },
    });
    res.json({ success: true, data: records });
  }
);

verificationRouter.post(
  '/',
  authenticate,
  requireRole('volunteer', 'moderator', 'campus_admin', 'super_admin'),
  requireCampusAccess('campusId'),
  validateBody(verificationSchema),
  async (req, res) => {
    const { campusId, reportId, decision, notes, applyToGraphStatus } = req.body;
    const report = await db.findOne<AccessibilityReportDTO>('accessibilityReports', { id: reportId });
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }
    if (req.auth!.role !== 'super_admin' && report.campusId !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus verification denied' });
      return;
    }

    const canMutateAuthoritativeGraph = ['campus_admin', 'super_admin'].includes(req.auth!.role);
    const appliedToGraph = Boolean(applyToGraphStatus && canMutateAuthoritativeGraph && report.pathEdgeId);

    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + DEFAULT_VERIFICATION_EXPIRY_DAYS * 86_400_000
    ).toISOString();

    const verification = await db.insert<VerificationRecordDTO>('verifications', {
      id: newId('ver'),
      campusId,
      reportId,
      edgeId: report.pathEdgeId,
      verifierId: req.auth!.userId,
      verifierRole: req.auth!.role,
      decision,
      notes,
      evidenceUrls: [],
      appliedToGraph,
      createdAt: now,
    });

    let nextReportStatus = report.status;
    if (decision === 'confirmed') {
      nextReportStatus = canMutateAuthoritativeGraph ? 'verified' : 'under_verification';
    } else if (decision === 'rejected') {
      nextReportStatus = canMutateAuthoritativeGraph || req.auth!.role === 'moderator' ? 'rejected' : 'pending_review';
    } else if (decision === 'resolved_confirmed') {
      nextReportStatus = canMutateAuthoritativeGraph ? 'resolved' : 'under_verification';
    } else if (decision === 'needs_more_evidence') {
      nextReportStatus = 'pending_review';
    }

    const timeline = [
      ...report.timeline,
      {
        status: nextReportStatus,
        note: `${req.auth!.role.replace(/_/g, ' ')} verification (${decision}): ${notes}`,
        actorRole: req.auth!.role,
        timestamp: now,
      },
    ];

    await db.updateOne('accessibilityReports', { id: report.id }, {
      status: nextReportStatus,
      timeline,
    });

    if (appliedToGraph && report.pathEdgeId && applyToGraphStatus) {
      await db.updateOne('pathEdges', { id: report.pathEdgeId }, {
        status: applyToGraphStatus,
        temporaryClosure: applyToGraphStatus === 'blocked',
        closureReason:
          applyToGraphStatus === 'open' ? undefined : `Verified via report ${report.id}: ${notes}`,
        verificationStatus: 'verified',
        lastVerifiedAt: now,
        verificationExpiresAt: expiresAt,
        verifiedByRole: req.auth!.role,
        verificationSource: `Human inspection (${req.auth!.email})`,
      });
    }

    await createInAppNotification({
      userId: report.reporterId,
      campusId: report.campusId,
      type: 'verification',
      title: `Verification update on "${report.title.slice(0, 42)}"`,
      message: `Decision recorded: ${decision.replace(/_/g, ' ')}.`,
      link: `/app/reports/${report.id}`,
    });

    await recordAudit({
      campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'SUBMIT_VERIFICATION',
      targetType: 'verification',
      targetId: verification.id,
      details: `Decision=${decision}, appliedToGraph=${appliedToGraph}`,
    });

    res.status(201).json({ success: true, data: verification });
  }
);

// Phase 2: Re-verify / renew freshness of an edge segment (Campus Admin / Super Admin only for authoritative renewal)
verificationRouter.post(
  '/edges/:edgeId/inspect',
  authenticate,
  requireRole('campus_admin', 'super_admin'),
  validateBody(
    z.object({
      campusId: z.string().min(1),
      verificationStatus: z.enum(['verified', 'unverified', 'disputed']).default('verified'),
      status: z.enum(['open', 'blocked', 'caution']).optional(),
      notes: z.string().trim().min(3).max(500),
      validityDays: z.number().int().min(7).max(180).default(DEFAULT_VERIFICATION_EXPIRY_DAYS),
    })
  ),
  async (req, res) => {
    const edge = await db.findOne<PathEdgeDTO>('pathEdges', {
      id: req.params.edgeId,
      campusId: req.body.campusId,
    });
    if (!edge) {
      res.status(404).json({ success: false, error: 'Path edge not found' });
      return;
    }
    if (req.auth!.role !== 'super_admin' && edge.campusId !== req.auth!.campusId) {
      res.status(403).json({ success: false, error: 'Cross-campus inspection denied' });
      return;
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + req.body.validityDays * 86_400_000).toISOString();

    const updated = await db.updateOne<PathEdgeDTO>(
      'pathEdges',
      { id: edge.id },
      {
        verificationStatus: req.body.verificationStatus,
        ...(req.body.status ? { status: req.body.status } : {}),
        lastVerifiedAt: now,
        verificationExpiresAt: expiresAt,
        verifiedByRole: req.auth!.role,
        verificationSource: `${req.body.notes} (${req.auth!.email})`,
      }
    );

    await recordAudit({
      campusId: edge.campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'RENEW_EDGE_VERIFICATION',
      targetType: 'pathEdge',
      targetId: edge.id,
      details: `Renewed verification status=${req.body.verificationStatus} for ${req.body.validityDays}d`,
    });

    res.json({ success: true, data: updated });
  }
);
