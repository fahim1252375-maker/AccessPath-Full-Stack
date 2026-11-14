import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.ts';
import { db } from '../repositories/db.ts';
import { aiService } from '../services/ai/geminiService.ts';
import { emailAdapter } from '../services/integrations/adapters.ts';
import type { ServiceHealthStatus } from '../../../shared/types.ts';
import { newId } from './ids.ts';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export interface RecordedErrorEvent {
  id: string;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  timestamp: string;
}

const errorBuffer: RecordedErrorEvent[] = [];
const failedJobs: Array<{ id: string; jobName: string; reason: string; timestamp: string }> = [];

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.trim().length > 0 && incoming.length <= 64
      ? incoming.trim()
      : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

export function recordApiError(params: {
  requestId?: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
}): void {
  errorBuffer.unshift({
    id: newId('err'),
    requestId: params.requestId || 'n/a',
    method: params.method,
    path: params.path,
    statusCode: params.statusCode,
    message: params.message,
    timestamp: new Date().toISOString(),
  });
  if (errorBuffer.length > 50) {
    errorBuffer.length = 50;
  }
}

export function recordFailedJob(jobName: string, reason: string): void {
  failedJobs.unshift({
    id: newId('job'),
    jobName,
    reason,
    timestamp: new Date().toISOString(),
  });
  if (failedJobs.length > 30) {
    failedJobs.length = 30;
  }
}

export function getRecentErrors(): RecordedErrorEvent[] {
  return [...errorBuffer];
}

export function getFailedJobs() {
  return [...failedJobs];
}

export async function runReadinessChecks(): Promise<{
  services: ServiceHealthStatus[];
  dbMeta: ReturnType<typeof db.getMetadata>;
  recentErrorCount: number;
  failedJobsCount: number;
}> {
  const checkedAt = new Date().toISOString();
  const dbMeta = db.getMetadata();
  const aiStatus = aiService.getProviderStatus();
  const emailConfigured = emailAdapter.isConfigured();

  const services: ServiceHealthStatus[] = [
    {
      service: 'API',
      status: 'healthy',
      configured: true,
      message: 'Express API router active and accepting requests.',
      checkedAt,
    },
    {
      service: 'DATABASE',
      status: dbMeta.initialized ? 'healthy' : 'error',
      configured: dbMeta.initialized,
      message:
        dbMeta.mode === 'mongoose'
          ? 'Connected to MongoDB Atlas / Mongoose.'
          : env.IS_PROD
          ? 'Local mode disallowed in production.'
          : 'Development local persistent JSON store active.',
      checkedAt,
    },
    {
      service: 'AI_PROVIDER',
      status: aiStatus.activeProvider === 'gemini' ? 'healthy' : 'simulated',
      configured: aiStatus.activeProvider === 'gemini',
      message:
        aiStatus.activeProvider === 'gemini'
          ? `Server-side Google GenAI (${aiStatus.model}) connected.`
          : 'GEMINI_API_KEY not configured; running deterministic fallback classifier.',
      checkedAt,
    },
    {
      service: 'EMAIL_PROVIDER',
      status: emailConfigured ? 'healthy' : 'unconfigured',
      configured: emailConfigured,
      message: emailConfigured
        ? `Email delivery enabled (${env.EMAIL_PROVIDER}).`
        : 'EMAIL_PROVIDER=none or missing SMTP/Resend credentials; no fake emails sent.',
      checkedAt,
    },
    {
      service: 'MAP_PROVIDER',
      status: 'healthy',
      configured: true,
      message: 'OpenStreetMap Leaflet tiles & GeoJSON graph layers enabled.',
      checkedAt,
    },
    {
      service: 'STORAGE',
      status: env.STORAGE_PROVIDER === 'local' ? 'healthy' : 'unconfigured',
      configured: env.STORAGE_PROVIDER === 'local',
      message:
        env.STORAGE_PROVIDER === 'local'
          ? 'Local magic-byte validated + EXIF-stripped image storage active.'
          : 'External S3 object storage credentials not configured.',
      checkedAt,
    },
    {
      service: 'NOTIFICATIONS',
      status: env.PUSH_VAPID_PUBLIC_KEY ? 'healthy' : 'simulated',
      configured: Boolean(env.PUSH_VAPID_PUBLIC_KEY),
      message: env.PUSH_VAPID_PUBLIC_KEY
        ? 'In-app persistence + Web Push VAPID key configured.'
        : 'In-app persistent notifications active; external Web Push VAPID key unconfigured.',
      checkedAt,
    },
  ];

  return {
    services,
    dbMeta,
    recentErrorCount: errorBuffer.length,
    failedJobsCount: failedJobs.length,
  };
}
