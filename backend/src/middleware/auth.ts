import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ZodError, type ZodType } from 'zod';
import { env } from '../config/env.ts';
import { logger } from '../utils/logger.ts';
import { db } from '../repositories/db.ts';
import type { UserRole, UserSessionDTO } from '../../../shared/types.ts';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  campusId: string;
  institutionId: string;
  jti?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

const JWT_ALGORITHM = 'HS256' as const;

function isTokenError(error: unknown): boolean {
  // TokenExpiredError and NotBeforeError both extend JsonWebTokenError.
  return error instanceof jwt.JsonWebTokenError;
}

export function assertValidJwtSecret(): string {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured');
  }
  if (env.IS_PROD && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  return secret;
}

export function hashSecurityToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function signAuthToken(payload: AuthPayload): string {
  const secret = assertValidJwtSecret();
  return jwt.sign(payload, secret, { algorithm: JWT_ALGORITHM, expiresIn: '7d' });
}

/** Verifies signature, algorithm and expiry. Tokens without a session id are rejected: they could never be revoked. */
function verifyAuthToken(token: string, secret: string): AuthPayload & { jti: string } {
  const decoded = jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as AuthPayload;
  if (!decoded.jti) {
    throw new jwt.JsonWebTokenError('Token is missing a session identifier');
  }
  return decoded as AuthPayload & { jti: string };
}

export async function issueSessionToken(
  payload: Omit<AuthPayload, 'jti'>
): Promise<{ token: string; jti: string; expiresAt: string }> {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const session: UserSessionDTO = {
    id: `sess_${jti}`,
    jti,
    userId: payload.userId,
    revoked: false,
    expiresAt,
    createdAt: new Date().toISOString(),
  };
  await db.insert('userSessions', session);
  const token = signAuthToken({ ...payload, jti });
  return { token, jti, expiresAt };
}

export async function revokeSessionByJti(jti: string, reason = 'logout'): Promise<void> {
  if (!jti) return;
  await db.updateOne(
    'userSessions',
    { jti },
    { revoked: true, revokedReason: reason }
  );
}

export async function revokeAllUserSessions(userId: string, reason = 'security_event'): Promise<void> {
  if (!userId) return;
  await db.updateMany(
    'userSessions',
    { userId, revoked: false },
    { revoked: true, revokedReason: reason }
  );
}

export function setAuthCookies(res: Response, token: string): string {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
  res.cookie('accesspath_token', token, cookieOpts);
  res.cookie('accesspath_csrf', csrfToken, {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: env.IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  return csrfToken;
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('accesspath_token', { path: '/' });
  res.clearCookie('accesspath_csrf', { path: '/' });
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  const candidate = origin || referer;
  if (!candidate) return true; // Non-browser clients / supertest without Origin header still rely on strict double-submit CSRF
  try {
    const parsed = new URL(candidate);
    const allowedHosts = new Set<string>(env.IS_PROD ? [] : ['localhost:3000', '127.0.0.1:3000']);
    const hostHeader = req.headers.host;
    if (hostHeader) allowedHosts.add(hostHeader);
    try {
      const appUrl = new URL(env.APP_URL);
      allowedHosts.add(appUrl.host);
    } catch {
      // ignore invalid APP_URL
    }
    return allowedHosts.has(parsed.host);
  } catch {
    return false;
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const secret = assertValidJwtSecret();
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const cookieToken = req.cookies?.accesspath_token as string | undefined;
    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Strict double-submit CSRF + Origin check when authenticating via cookie on state-changing requests
    if (!bearerToken && cookieToken && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!isOriginAllowed(req)) {
        res.status(403).json({ success: false, error: 'Forbidden: untrusted request origin' });
        return;
      }
      const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
      const csrfCookie = req.cookies?.accesspath_csrf as string | undefined;
      if (!csrfCookie || !csrfHeader || !timingSafeStringEqual(csrfHeader, csrfCookie)) {
        res.status(403).json({ success: false, error: 'CSRF validation failed' });
        return;
      }
    }

    const decoded = verifyAuthToken(token, secret);
    if (decoded.jti) {
      const session = await db.findOne<UserSessionDTO>('userSessions', { jti: decoded.jti });
      if (!session || session.revoked || new Date(session.expiresAt).getTime() <= Date.now()) {
        res.status(401).json({ success: false, error: 'Session has been revoked or expired' });
        return;
      }
    }

    const user = await db.findOne<any>('users', { id: decoded.userId });
    if (!user || !user.isActive || user.deletedAt) {
      res.status(401).json({ success: false, error: 'User account is inactive or missing' });
      return;
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
      campusId: user.campusId,
      institutionId: user.institutionId,
      jti: decoded.jti,
    };
    next();
  } catch (error) {
    if (isTokenError(error)) {
      res.status(401).json({ success: false, error: 'Invalid or expired authentication token' });
      return;
    }
    // A database or configuration failure must not look like a bad token: clients would log users out.
    logger.error('Authentication could not be completed', { error: (error as Error).message });
    res.status(503).json({ success: false, error: 'Authentication service temporarily unavailable' });
  }
}

export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const secret = assertValidJwtSecret();
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const cookieToken = req.cookies?.accesspath_token as string | undefined;
    const token = bearerToken || cookieToken;
    if (token) {
      const decoded = verifyAuthToken(token, secret);
      if (decoded.jti) {
        const session = await db.findOne<UserSessionDTO>('userSessions', { jti: decoded.jti });
        if (!session || session.revoked || new Date(session.expiresAt).getTime() <= Date.now()) {
          next();
          return;
        }
      }
      const user = await db.findOne<any>('users', { id: decoded.userId });
      if (user && user.isActive && !user.deletedAt) {
        req.auth = {
          userId: user.id,
          email: user.email,
          role: user.role,
          campusId: user.campusId,
          institutionId: user.institutionId,
          jti: decoded.jti,
        };
      }
    }
  } catch {
    // Ignore invalid optional tokens
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: requires one of roles [${allowedRoles.join(', ')}]`,
      });
      return;
    }
    next();
  };
}

export function requireCampusAccess(paramName = 'campusId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (req.auth.role === 'super_admin') {
      next();
      return;
    }
    const targetCampusId =
      req.params[paramName] || req.params.id || req.body?.campusId || (req.query.campusId as string);
    if (targetCampusId && targetCampusId !== req.auth.campusId) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: cross-campus access is restricted to Super Administrators',
      });
      return;
    }
    next();
  };
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
        return;
      }
      next(err);
    }
  };
}
