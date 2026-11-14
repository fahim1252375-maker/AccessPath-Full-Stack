import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../repositories/db.ts';
import {
  authenticate,
  optionalAuthenticate,
  requireCampusAccess,
  requireRole,
  validateBody,
} from '../middleware/auth.ts';
import { createReportSchema, updateReportSchema } from '../schemas/validators.ts';
import { aiService } from '../services/ai/geminiService.ts';
import { sanitizeAndReencodeImage } from '../services/security/imageSanitizer.ts';
import { createInAppNotification, recordAudit } from '../utils/audit.ts';
import type { AccessibilityReportDTO } from '../../../shared/types.ts';
import { newId } from '../utils/ids.ts';

export const reportRouter = Router();

const uploadDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_EVIDENCE_PER_REPORT = 5;
const MAX_EVIDENCE_PER_USER = 25;

// Store uploaded bytes in memory ONLY AFTER auth & campus checks pass, so invalid/unauthorized files never touch disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Invalid file type. Only PNG, JPEG, and WEBP images up to 5MB are allowed.'));
      return;
    }
    cb(null, true);
  },
});

function sanitizeReportForPublic(report: AccessibilityReportDTO, viewerUserId?: string, viewerRole?: string) {
  const isOwner = viewerUserId && report.reporterId === viewerUserId;
  const isStaff = viewerRole && ['moderator', 'campus_admin', 'super_admin'].includes(viewerRole);
  return {
    ...report,
    reporterId: isOwner || isStaff ? report.reporterId : 'anonymous',
  };
}

function assertReportCampusAccess(report: AccessibilityReportDTO, userRole: string, userCampusId: string): boolean {
  return userRole === 'super_admin' || report.campusId === userCampusId;
}

reportRouter.get('/', optionalAuthenticate, async (req, res) => {
  const { campusId, status, category, mine, page, limit } = req.query;
  const filter: Record<string, any> = {};
  if (typeof campusId === 'string' && campusId) filter.campusId = campusId;
  if (typeof status === 'string' && status) filter.status = status;
  if (typeof category === 'string' && category) filter.category = category;
  if (mine === 'true') {
    if (!req.auth) {
      res.status(401).json({ success: false, error: 'Authentication required for personal reports' });
      return;
    }
    filter.reporterId = req.auth.userId;
  }

  // Authenticated non-super-admins querying operational reports are restricted to their campus unless browsing public campus queries
  if (req.auth && req.auth.role !== 'super_admin' && filter.campusId && filter.campusId !== req.auth.campusId) {
    res.status(403).json({ success: false, error: 'Cross-campus report listing denied' });
    return;
  }

  const total = await db.count('accessibilityReports', filter);
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = limit ? Math.min(200, Math.max(1, Number(limit) || 50)) : undefined;
  const skip = limitNum ? (pageNum - 1) * limitNum : undefined;

  const reports = await db.find<AccessibilityReportDTO>('accessibilityReports', filter, {
    sort: { createdAt: -1 },
    limit: limitNum,
    skip,
  });

  res.json({
    success: true,
    data: reports.map((r) => sanitizeReportForPublic(r, req.auth?.userId, req.auth?.role)),
    meta: { page: pageNum, limit: limitNum || total, total },
  });
});

reportRouter.get('/:id', optionalAuthenticate, async (req, res) => {
  const report = await db.findOne<AccessibilityReportDTO>('accessibilityReports', {
    id: req.params.id,
  });
  if (!report) {
    res.status(404).json({ success: false, error: 'Report not found' });
    return;
  }
  if (req.auth && !assertReportCampusAccess(report, req.auth.role, req.auth.campusId)) {
    res.status(403).json({ success: false, error: 'Cross-campus report access denied' });
    return;
  }
  res.json({
    success: true,
    data: sanitizeReportForPublic(report, req.auth?.userId, req.auth?.role),
  });
});

reportRouter.post(
  '/',
  authenticate,
  requireCampusAccess('campusId'),
  validateBody(createReportSchema),
  async (req, res) => {
    const body = req.body;

    // Offline draft sync deduplication via clientRequestId
    if (body.clientRequestId) {
      const existing = await db.findOne<AccessibilityReportDTO>('accessibilityReports', {
        campusId: body.campusId,
        reporterId: req.auth!.userId,
        clientRequestId: body.clientRequestId,
      });
      if (existing) {
        res.status(200).json({ success: true, data: existing, deduplicated: true });
        return;
      }
    }

    const now = new Date().toISOString();
    const id = newId('rep');
    const reporterAlias = `Community Member #${req.auth!.userId.slice(-4).toUpperCase()}`;

    let aiClassification;
    if (body.runAiClassification) {
      aiClassification = await aiService.classifyReport({
        text: `${body.title}. ${body.description}`,
        locationHint: body.locationLabel,
        campusId: body.campusId,
        userId: req.auth!.userId,
      });
    }

    const timeline = [
      {
        status: 'submitted' as const,
        note: 'Report submitted by campus community member.',
        actorRole: req.auth!.role,
        timestamp: now,
      },
      ...(aiClassification
        ? [
            {
              status: 'ai_classified' as const,
              note: `AI recommended category "${aiClassification.category}" (${Math.round(
                aiClassification.confidence * 100
              )}% confidence). Pending human verification.`,
              actorRole: 'system' as const,
              timestamp: new Date().toISOString(),
            },
          ]
        : []),
    ];

    const newReport: AccessibilityReportDTO = {
      id,
      campusId: body.campusId,
      buildingId: body.buildingId,
      locationNodeId: body.locationNodeId,
      pathEdgeId: body.pathEdgeId,
      clientRequestId: body.clientRequestId,
      reporterId: req.auth!.userId,
      reporterAlias,
      title: body.title,
      description: body.description,
      language: body.language,
      category: body.category,
      priority: body.priority,
      status: aiClassification ? 'pending_review' : 'submitted',
      lat: body.lat,
      lng: body.lng,
      locationLabel: body.locationLabel,
      evidenceUrls: [],
      aiClassification,
      upvotes: 1,
      upvoterIds: [req.auth!.userId],
      timeline,
      comments: [],
      isDemoData: false,
      createdAt: now,
      updatedAt: now,
    };

    const created = await db.insert('accessibilityReports', newReport);

    await recordAudit({
      campusId: body.campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'SUBMIT_REPORT',
      targetType: 'report',
      targetId: id,
      details: `Submitted barrier report "${body.title}" (human verification required).`,
    });

    res.status(201).json({ success: true, data: created });
  }
);

// Evidence retrieval is authenticated and strictly campus-scoped (never exposed via unguarded /uploads static dir)
reportRouter.get('/:id/evidence/:filename', authenticate, async (req, res) => {
  const report = await db.findOne<AccessibilityReportDTO>('accessibilityReports', {
    id: req.params.id,
  });
  if (!report) {
    res.status(404).json({ success: false, error: 'Report not found' });
    return;
  }
  if (!assertReportCampusAccess(report, req.auth!.role, req.auth!.campusId)) {
    res.status(403).json({ success: false, error: 'Cross-campus evidence access denied' });
    return;
  }

  const safeFilename = path.basename(req.params.filename);
  const evidenceRecord = await db.findOne<any>('reportEvidence', {
    reportId: report.id,
    filename: safeFilename,
  });
  if (!evidenceRecord) {
    res.status(404).json({ success: false, error: 'Evidence file not found' });
    return;
  }

  const fullPath = path.join(uploadDir, safeFilename);
  if (!fullPath.startsWith(uploadDir) || !fs.existsSync(fullPath)) {
    res.status(404).json({ success: false, error: 'Evidence file missing from storage' });
    return;
  }

  res.setHeader('Content-Type', evidenceRecord.mimeType || 'image/png');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(fullPath);
});

// Authorize BEFORE running multer so unauthorized callers cannot buffer or store files
reportRouter.post(
  '/:id/evidence',
  authenticate,
  async (req, res, next) => {
    const report = await db.findOne<AccessibilityReportDTO>('accessibilityReports', {
      id: req.params.id,
    });
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }
    if (!assertReportCampusAccess(report, req.auth!.role, req.auth!.campusId)) {
      res.status(403).json({ success: false, error: 'Cross-campus evidence upload denied' });
      return;
    }
    if (
      report.reporterId !== req.auth!.userId &&
      !['volunteer', 'moderator', 'campus_admin', 'super_admin'].includes(req.auth!.role)
    ) {
      res.status(403).json({ success: false, error: 'Not authorized to upload evidence to this report' });
      return;
    }
    if (report.evidenceUrls.length >= MAX_EVIDENCE_PER_REPORT) {
      res.status(400).json({
        success: false,
        error: `Upload quota exceeded: maximum ${MAX_EVIDENCE_PER_REPORT} evidence images per report`,
      });
      return;
    }
    const userUploads = await db.count('reportEvidence', { uploaderId: req.auth!.userId });
    if (userUploads >= MAX_EVIDENCE_PER_USER) {
      res.status(429).json({
        success: false,
        error: `Upload quota exceeded: maximum ${MAX_EVIDENCE_PER_USER} total evidence uploads per account`,
      });
      return;
    }

    (req as any)._authorizedReport = report;
    next();
  },
  (req, res) => {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ success: false, error: 'No image file provided' });
        return;
      }

      let sanitized;
      try {
        sanitized = sanitizeAndReencodeImage(req.file.buffer);
      } catch (sanitizeErr) {
        res.status(400).json({
          success: false,
          error: (sanitizeErr as Error).message,
        });
        return;
      }

      const report = (req as any)._authorizedReport as AccessibilityReportDTO;
      const filename = `${newId(`evidence_${report.id}`)}.${sanitized.ext}`;
      const diskPath = path.join(uploadDir, filename);

      try {
        fs.writeFileSync(diskPath, sanitized.buffer);
        const fileUrl = `/api/v1/reports/${report.id}/evidence/${filename}`;

        await db.insert('reportEvidence', {
          id: newId('ev'),
          reportId: report.id,
          campusId: report.campusId,
          uploaderId: req.auth!.userId,
          fileUrl,
          filename,
          mimeType: sanitized.mimeType,
          sizeBytes: sanitized.buffer.length,
        });

        const updated = await db.updateOne<AccessibilityReportDTO>(
          'accessibilityReports',
          { id: report.id },
          {
            evidenceUrls: [...report.evidenceUrls, fileUrl],
          }
        );

        res.status(201).json({
          success: true,
          data: {
            fileUrl,
            metadataStripped: sanitized.metadataStripped,
            report: updated,
          },
        });
      } catch (writeErr) {
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
        res.status(500).json({ success: false, error: (writeErr as Error).message });
      }
    });
  }
);

reportRouter.patch(
  '/:id',
  authenticate,
  requireRole('moderator', 'campus_admin', 'super_admin'),
  validateBody(updateReportSchema),
  async (req, res) => {
    const report = await db.findOne<AccessibilityReportDTO>('accessibilityReports', {
      id: req.params.id,
    });
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }
    if (!assertReportCampusAccess(report, req.auth!.role, req.auth!.campusId)) {
      res.status(403).json({ success: false, error: 'Cross-campus modification denied' });
      return;
    }

    const { status, priority, assignedToId, duplicateOfId, note, updateEdgeStatus } = req.body;
    const timeline = [...report.timeline];
    if (status && status !== report.status) {
      timeline.push({
        status,
        note: note || `Status updated to ${status.replace(/_/g, ' ')}.`,
        actorRole: req.auth!.role,
        timestamp: new Date().toISOString(),
      });
    }

    const updated = await db.updateOne<AccessibilityReportDTO>(
      'accessibilityReports',
      { id: report.id },
      {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
        ...(duplicateOfId !== undefined ? { duplicateOfId } : {}),
        timeline,
      }
    );

    if (
      updateEdgeStatus &&
      report.pathEdgeId &&
      ['campus_admin', 'super_admin'].includes(req.auth!.role)
    ) {
      const now = new Date().toISOString();
      await db.updateOne('pathEdges', { id: report.pathEdgeId }, {
        status: updateEdgeStatus,
        temporaryClosure: updateEdgeStatus === 'blocked',
        closureReason:
          updateEdgeStatus === 'open'
            ? undefined
            : note || `Updated from report ${report.id}`,
        verificationStatus: 'verified',
        lastVerifiedAt: now,
        verificationExpiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        verifiedByRole: req.auth!.role,
      });
    }

    await createInAppNotification({
      userId: report.reporterId,
      campusId: report.campusId,
      type: 'report_status',
      title: `Report Updated: ${report.title.slice(0, 48)}`,
      message: `Your report is now "${(status || report.status).replace(/_/g, ' ')}".`,
      link: `/app/reports/${report.id}`,
    });

    await recordAudit({
      campusId: report.campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'UPDATE_REPORT',
      targetType: 'report',
      targetId: report.id,
      details: `Updated report status=${status || report.status}`,
    });

    res.json({ success: true, data: updated });
  }
);

reportRouter.post(
  '/:id/comments',
  authenticate,
  validateBody(z.object({ content: z.string().trim().min(2).max(800) })),
  async (req, res) => {
    const report = await db.findOne<AccessibilityReportDTO>('accessibilityReports', {
      id: req.params.id,
    });
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }
    if (!assertReportCampusAccess(report, req.auth!.role, req.auth!.campusId)) {
      res.status(403).json({ success: false, error: 'Cross-campus commenting denied' });
      return;
    }
    const comment = {
      id: newId('cmt'),
      authorLabel:
        req.auth!.role === 'student'
          ? 'Campus Student'
          : req.auth!.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
      authorRole: req.auth!.role,
      content: req.body.content,
      createdAt: new Date().toISOString(),
    };
    const updated = await db.updateOne(
      'accessibilityReports',
      { id: report.id },
      { comments: [...report.comments, comment] }
    );
    res.status(201).json({ success: true, data: updated });
  }
);

reportRouter.post('/:id/upvote', authenticate, async (req, res) => {
  const report = await db.findOne<AccessibilityReportDTO>('accessibilityReports', {
    id: req.params.id,
  });
  if (!report) {
    res.status(404).json({ success: false, error: 'Report not found' });
    return;
  }
  if (!assertReportCampusAccess(report, req.auth!.role, req.auth!.campusId)) {
    res.status(403).json({ success: false, error: 'Cross-campus upvote denied' });
    return;
  }
  const hasUpvoted = report.upvoterIds.includes(req.auth!.userId);
  const upvoterIds = hasUpvoted
    ? report.upvoterIds.filter((id: string) => id !== req.auth!.userId)
    : [...report.upvoterIds, req.auth!.userId];
  const updated = await db.updateOne(
    'accessibilityReports',
    { id: report.id },
    { upvoterIds, upvotes: upvoterIds.length }
  );
  res.json({ success: true, data: updated });
});

reportRouter.post(
  '/:id/dispute',
  authenticate,
  validateBody(z.object({ reason: z.string().trim().min(5).max(500) })),
  async (req, res) => {
    const report = await db.findOne<AccessibilityReportDTO>('accessibilityReports', {
      id: req.params.id,
    });
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }
    if (!assertReportCampusAccess(report, req.auth!.role, req.auth!.campusId)) {
      res.status(403).json({ success: false, error: 'Cross-campus dispute denied' });
      return;
    }
    const timeline = [
      ...report.timeline,
      {
        status: 'disputed' as const,
        note: `Disputed: ${req.body.reason}`,
        actorRole: req.auth!.role,
        timestamp: new Date().toISOString(),
      },
    ];
    const updated = await db.updateOne(
      'accessibilityReports',
      { id: report.id },
      { status: 'disputed', timeline }
    );
    res.json({ success: true, data: updated });
  }
);

reportRouter.post(
  '/:id/resolution-feedback',
  authenticate,
  validateBody(
    z.object({
      resolvedConfirmed: z.boolean(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).default(''),
    })
  ),
  async (req, res) => {
    const report = await db.findOne<AccessibilityReportDTO>('accessibilityReports', {
      id: req.params.id,
    });
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found' });
      return;
    }
    if (!assertReportCampusAccess(report, req.auth!.role, req.auth!.campusId)) {
      res.status(403).json({ success: false, error: 'Cross-campus feedback denied' });
      return;
    }
    const updated = await db.updateOne(
      'accessibilityReports',
      { id: report.id },
      {
        resolutionFeedback: {
          ...req.body,
          submittedAt: new Date().toISOString(),
        },
      }
    );
    res.json({ success: true, data: updated });
  }
);
