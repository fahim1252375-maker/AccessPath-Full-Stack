import dotenv from 'dotenv';

dotenv.config();

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

export const env = {
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development';
  },
  get PORT() {
    return Number(process.env.PORT || 3000);
  },
  get APP_URL() {
    return process.env.APP_URL || 'http://localhost:3000';
  },
  get MONGODB_URI() {
    return process.env.MONGODB_URI || '';
  },
  get JWT_SECRET() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    return isProductionEnv() ? '' : 'dev-accesspath-local-secret-change-in-production-2026';
  },
  get GEMINI_API_KEY() {
    return process.env.GEMINI_API_KEY || '';
  },
  get AI_PROVIDER() {
    return (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'mock')) as
      | 'gemini'
      | 'mock';
  },
  get EMAIL_PROVIDER() {
    return (process.env.EMAIL_PROVIDER || 'none') as 'none' | 'smtp' | 'resend';
  },
  get RESEND_API_KEY() {
    return process.env.RESEND_API_KEY || '';
  },
  get SMTP_HOST() {
    return process.env.SMTP_HOST || '';
  },
  get SMTP_PORT() {
    return Number(process.env.SMTP_PORT || 587);
  },
  get SMTP_USER() {
    return process.env.SMTP_USER || '';
  },
  get SMTP_PASS() {
    return process.env.SMTP_PASS || '';
  },
  get EMAIL_FROM() {
    return process.env.EMAIL_FROM || 'noreply@accesspath.example.edu';
  },
  get STORAGE_PROVIDER() {
    return (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3';
  },
  get SEED_DEMO_PASSWORD() {
    return process.env.SEED_DEMO_PASSWORD || 'AccessPathDemo!2026';
  },
  get ALLOW_DEMO_SEED() {
    if (isProductionEnv()) {
      return false;
    }
    return process.env.ALLOW_DEMO_SEED !== 'false';
  },
  get PUSH_VAPID_PUBLIC_KEY() {
    return process.env.PUSH_VAPID_PUBLIC_KEY || '';
  },
  get IS_PROD() {
    return isProductionEnv();
  },
};

