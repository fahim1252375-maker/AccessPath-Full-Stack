type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const redactedKeys = ['password', 'passwordHash', 'token', 'apiKey', 'secret', 'authorization'];
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(meta)) {
    if (redactedKeys.some((rk) => key.toLowerCase().includes(rk.toLowerCase()))) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'test' && level === 'debug') return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'accesspath-api',
    message,
    ...(meta ? { meta: sanitizeMeta(meta) } : {}),
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
};
