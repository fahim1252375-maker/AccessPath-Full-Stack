import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import express from 'express';
import { assertValidJwtSecret } from './backend/src/middleware/auth.ts';
import { env } from './backend/src/config/env.ts';
import { db } from './backend/src/repositories/db.ts';
import { seedDatabaseIfEmpty } from './backend/src/jobs/seed.ts';
import { createApiApp } from './backend/src/app.ts';
import { logger } from './backend/src/utils/logger.ts';

/** Milliseconds to let in-flight requests finish before forcing the process to exit. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

function serveBuiltClient(app: express.Express): void {
  const distDir = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    const indexFile = path.join(distDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      res.status(404).send('Build output not found. Run npm run build first.');
    }
  });
}

async function serveViteDevClient(app: express.Express): Promise<void> {
  // Imported lazily so production never needs the Vite toolchain at runtime.
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

function registerGracefulShutdown(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}; shutting down gracefully`);

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out; forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function startServer(): Promise<void> {
  assertValidJwtSecret();
  await db.connect();
  if (!env.IS_PROD && env.ALLOW_DEMO_SEED) {
    await seedDatabaseIfEmpty();
  }

  const app = createApiApp();

  if (env.IS_PROD) {
    serveBuiltClient(app);
  } else {
    await serveViteDevClient(app);
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`AccessPath server listening on http://0.0.0.0:${env.PORT}`, {
      mode: env.NODE_ENV,
      dbMode: db.getMode(),
    });
  });
  registerGracefulShutdown(server);
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  });
});

startServer().catch((err) => {
  logger.error('Failed to start AccessPath server', { error: (err as Error).message });
  process.exit(1);
});
