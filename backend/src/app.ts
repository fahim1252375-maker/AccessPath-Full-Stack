import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.ts';
import { logger } from './utils/logger.ts';
import { correlationIdMiddleware, recordApiError } from './utils/observability.ts';
import { authRouter } from './routes/authRoutes.ts';
import { campusRouter } from './routes/campusRoutes.ts';
import { routeRouter } from './routes/routeRoutes.ts';
import { reportRouter } from './routes/reportRoutes.ts';
import { verificationRouter } from './routes/verificationRoutes.ts';
import { aiRouter } from './routes/aiRoutes.ts';
import { analyticsRouter } from './routes/analyticsRoutes.ts';
import { adminRouter } from './routes/adminRoutes.ts';
import { operationsRouter } from './routes/operationsRoutes.ts';

export function createApiApp(options?: { disableRateLimit?: boolean }) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(correlationIdMiddleware);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false, // Required for AI Studio preview iframe
    })
  );

  app.use(
    cors({
      origin: env.IS_PROD ? [env.APP_URL] : true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '6mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  if (!options?.disableRateLimit && process.env.NODE_ENV !== 'test') {
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 600,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests. Please try again shortly.' },
    });
    app.use('/api/v1', apiLimiter);

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 40,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many authentication attempts. Please wait a few minutes.' },
    });
    app.use('/api/v1/auth/login', authLimiter);
    app.use('/api/v1/auth/register', authLimiter);
    app.use('/api/v1/auth/forgot-password', authLimiter);
  }

  // Structured request logging with correlation ID
  app.use('/api/v1', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (res.statusCode >= 500) {
        recordApiError({
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          message: `HTTP ${res.statusCode}`,
        });
      }
      logger.debug(`${req.method} ${req.originalUrl}`, {
        requestId: req.requestId,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  // Note: Unauthenticated /uploads static directory removed to protect evidence files from public disclosure.
  // Authorized campus-scoped evidence downloads are served via GET /api/v1/reports/:id/evidence/:filename.

  app.get('/api/v1/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        service: 'AccessPath API',
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/campuses', campusRouter);
  app.use('/api/v1/routes', routeRouter);
  app.use('/api/v1/reports', reportRouter);
  app.use('/api/v1/verifications', verificationRouter);
  app.use('/api/v1/ai', aiRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/operations', operationsRouter);

  app.use('/api/v1/*', (_req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  });

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    recordApiError({
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: 500,
      message: err.message,
    });
    logger.error('Unhandled API error', {
      requestId: req.requestId,
      error: err.message,
    });
    res.status(500).json({
      success: false,
      error: env.IS_PROD ? 'Internal server error' : err.message || 'Internal server error',
    });
  });

  return app;
}
