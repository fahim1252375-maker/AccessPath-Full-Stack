import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../repositories/db.ts';
import {
  authenticate,
  clearAuthCookies,
  generateSecureToken,
  hashSecurityToken,
  issueSessionToken,
  revokeAllUserSessions,
  revokeSessionByJti,
  setAuthCookies,
  validateBody,
} from '../middleware/auth.ts';
import {
  accessibilityProfileSchema,
  campusTransferRequestSchema,
  loginSchema,
  profilePatchSchema,
  registerSchema,
} from '../schemas/validators.ts';
import { emailAdapter } from '../services/integrations/adapters.ts';
import { recordAudit } from '../utils/audit.ts';
import type {
  AccessibilityPreferences,
  CampusTransferRequestDTO,
  UserDTO,
} from '../../../shared/types.ts';
import { newId } from '../utils/ids.ts';

export const authRouter = Router();

function sanitizeUser(u: any): UserDTO {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    campusId: u.campusId,
    institutionId: u.institutionId,
    emailVerified: Boolean(u.emailVerified),
    consentAnalytics: Boolean(u.consentAnalytics),
    consentLocation: Boolean(u.consentLocation),
    language: u.language || 'en',
    isActive: Boolean(u.isActive),
    isDemoAccount: Boolean(u.isDemoAccount),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

authRouter.post('/register', validateBody(registerSchema), async (req, res) => {
  const { name, email, password, campusId, language, consentAnalytics, consentLocation } = req.body;
  const normalizedEmail = email.toLowerCase();

  const existing = await db.findOne('users', { email: normalizedEmail });
  if (existing) {
    res.status(409).json({ success: false, error: 'An account with this email already exists' });
    return;
  }

  const campus = await db.findOne<any>('campuses', { id: campusId });
  if (!campus) {
    res.status(404).json({ success: false, error: 'Selected campus was not found' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = newId('user');
  const rawVerificationToken = generateSecureToken(24);
  const verificationTokenHash = hashSecurityToken(rawVerificationToken);
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();

  const newUser = await db.insert('users', {
    id: userId,
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'student', // Public registration strictly creates Student accounts
    campusId: campus.id,
    institutionId: campus.institutionId,
    emailVerified: false,
    verificationTokenHash,
    verificationTokenExpiresAt,
    consentAnalytics,
    consentLocation,
    language,
    isActive: true,
    isDemoAccount: false,
    deletedAt: null,
  });

  const defaultProfile: AccessibilityPreferences & { id: string; userId: string } = {
    id: `prof_${userId}`,
    userId,
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
  await db.insert('accessibilityProfiles', defaultProfile);

  const emailResult = await emailAdapter.sendNotificationEmail({
    to: normalizedEmail,
    subject: 'AccessPath Email Verification',
    body: `Your verification token is: ${rawVerificationToken} (expires in 24 hours).`,
  });

  const { token } = await issueSessionToken({
    userId,
    email: normalizedEmail,
    role: 'student',
    campusId: campus.id,
    institutionId: campus.institutionId,
  });
  const csrfToken = setAuthCookies(res, token);

  await recordAudit({
    campusId: campus.id,
    actorId: userId,
    actorEmail: normalizedEmail,
    actorRole: 'student',
    action: 'USER_REGISTERED',
    targetType: 'user',
    targetId: userId,
    details: `New student account registered (verificationEmailSent=${emailResult.sent}).`,
  });

  res.status(201).json({
    success: true,
    data: {
      user: sanitizeUser(newUser),
      token,
      csrfToken,
      emailDelivered: emailResult.sent,
      verificationNotice: emailResult.sent
        ? 'Verification email sent to your registered address.'
        : 'Email provider is not configured; external verification email could not be sent.',
    },
  });
});

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await db.findOne<any>('users', { email: email.toLowerCase() });
  if (!user || !user.isActive || user.deletedAt) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const { token } = await issueSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    campusId: user.campusId,
    institutionId: user.institutionId,
  });
  const csrfToken = setAuthCookies(res, token);

  await recordAudit({
    campusId: user.campusId,
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'USER_LOGIN',
    targetType: 'user',
    targetId: user.id,
    details: 'User authenticated via password.',
  });

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
      token,
      csrfToken,
    },
  });
});

authRouter.post('/logout', authenticate, async (req, res) => {
  if (req.auth?.jti) {
    await revokeSessionByJti(req.auth.jti, 'user_logout');
  }
  clearAuthCookies(res);
  res.json({ success: true, data: { loggedOut: true, sessionRevoked: Boolean(req.auth?.jti) } });
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await db.findOne<any>('users', { id: req.auth!.userId });
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  const profile = await db.findOne<AccessibilityPreferences>('accessibilityProfiles', {
    userId: user.id,
  });
  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
      accessibilityProfile: profile,
    },
  });
});

// STRICT TENANT ISOLATION: campusId cannot be mutated via self-service profile update
authRouter.patch(
  '/profile',
  authenticate,
  validateBody(profilePatchSchema),
  async (req, res) => {
    const updated = await db.updateOne('users', { id: req.auth!.userId }, req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: { user: sanitizeUser(updated) } });
  }
);

authRouter.post(
  '/transfer-request',
  authenticate,
  validateBody(campusTransferRequestSchema),
  async (req, res) => {
    const { toCampusId, reason } = req.body;
    if (toCampusId === req.auth!.campusId) {
      res.status(400).json({ success: false, error: 'You are already assigned to this campus' });
      return;
    }
    const targetCampus = await db.findOne<any>('campuses', { id: toCampusId });
    if (!targetCampus) {
      res.status(404).json({ success: false, error: 'Destination campus not found' });
      return;
    }

    const transfer: CampusTransferRequestDTO = {
      id: newId('xfer'),
      userId: req.auth!.userId,
      userEmail: req.auth!.email,
      fromCampusId: req.auth!.campusId,
      toCampusId,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const created = await db.insert('campusTransferRequests', transfer);

    await recordAudit({
      campusId: req.auth!.campusId,
      actorId: req.auth!.userId,
      actorEmail: req.auth!.email,
      actorRole: req.auth!.role,
      action: 'REQUEST_CAMPUS_TRANSFER',
      targetType: 'campusTransferRequest',
      targetId: created.id,
      details: `Requested transfer ${req.auth!.campusId} -> ${toCampusId}`,
    });

    res.status(201).json({ success: true, data: created });
  }
);

authRouter.get('/transfer-requests', authenticate, async (req, res) => {
  const list = await db.find<CampusTransferRequestDTO>(
    'campusTransferRequests',
    { userId: req.auth!.userId },
    { sort: { createdAt: -1 } }
  );
  res.json({ success: true, data: list });
});

authRouter.put(
  '/accessibility-profile',
  authenticate,
  validateBody(accessibilityProfileSchema),
  async (req, res) => {
    const existing = await db.findOne('accessibilityProfiles', { userId: req.auth!.userId });
    let saved;
    if (existing) {
      saved = await db.updateOne(
        'accessibilityProfiles',
        { userId: req.auth!.userId },
        req.body
      );
    } else {
      saved = await db.insert('accessibilityProfiles', {
        id: `prof_${req.auth!.userId}`,
        userId: req.auth!.userId,
        ...req.body,
      });
    }
    res.json({ success: true, data: saved });
  }
);

authRouter.post(
  '/forgot-password',
  validateBody(z.object({ email: z.string().email() })),
  async (req, res) => {
    if (!emailAdapter.isConfigured()) {
      res.status(503).json({
        success: false,
        error:
          'Password reset email delivery is unavailable because no email provider is configured (EMAIL_PROVIDER=none). Contact your campus administrator.',
        emailSent: false,
      });
      return;
    }

    const user = await db.findOne<any>('users', { email: req.body.email.toLowerCase() });
    if (user) {
      const rawToken = generateSecureToken(32);
      const resetTokenHash = hashSecurityToken(rawToken);
      const resetTokenExpiresAt = new Date(Date.now() + 3600_000).toISOString();

      await db.updateOne('users', { id: user.id }, {
        resetTokenHash,
        resetTokenExpiresAt,
      });

      const sendResult = await emailAdapter.sendNotificationEmail({
        to: user.email,
        subject: 'AccessPath Password Reset',
        body: `Use this single-use reset token within 1 hour: ${rawToken}`,
      });
      if (!sendResult.sent) {
        res.status(502).json({
          success: false,
          error: `Email delivery failed (${sendResult.reason || 'provider error'}).`,
          emailSent: false,
        });
        return;
      }
    }

    res.json({
      success: true,
      data: {
        emailSent: true,
        message: 'If an account matches that email, a password reset message was sent.',
      },
    });
  }
);

authRouter.post(
  '/reset-password',
  validateBody(z.object({ token: z.string().min(16), newPassword: z.string().min(8).max(100) })),
  async (req, res) => {
    const tokenHash = hashSecurityToken(req.body.token);
    const user = await db.findOne<any>('users', { resetTokenHash: tokenHash });
    if (
      !user ||
      !user.resetTokenExpiresAt ||
      new Date(user.resetTokenExpiresAt).getTime() <= Date.now()
    ) {
      res.status(400).json({ success: false, error: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(req.body.newPassword, 10);
    await db.updateOne('users', { id: user.id }, {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });

    // Security requirement: revoke all existing sessions when password changes
    await revokeAllUserSessions(user.id, 'password_reset');

    await recordAudit({
      campusId: user.campusId,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'PASSWORD_RESET',
      targetType: 'user',
      targetId: user.id,
      details: 'Password updated via one-time token; all active sessions revoked.',
    });

    res.json({ success: true, data: { reset: true, sessionsRevoked: true } });
  }
);

authRouter.post(
  '/verify-email',
  validateBody(z.object({ token: z.string().min(8) })),
  async (req, res) => {
    const tokenHash = hashSecurityToken(req.body.token);
    const user = await db.findOne<any>('users', { verificationTokenHash: tokenHash });
    if (
      !user ||
      !user.verificationTokenExpiresAt ||
      new Date(user.verificationTokenExpiresAt).getTime() <= Date.now()
    ) {
      res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
      return;
    }
    await db.updateOne('users', { id: user.id }, {
      emailVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
    });
    res.json({ success: true, data: { emailVerified: true } });
  }
);
