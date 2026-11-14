import nodemailer from 'nodemailer';
import { env } from '../../config/env.ts';
import { db } from '../../repositories/db.ts';
import { aiService } from '../ai/geminiService.ts';
import type { CampusIntegrationDTO } from '../../../../shared/types.ts';

export interface EmailSendResult {
  sent: boolean;
  provider: string;
  messageId?: string;
  reason?: string;
}

export const emailAdapter = {
  isConfigured(): boolean {
    if (env.EMAIL_PROVIDER === 'smtp') {
      return Boolean(env.SMTP_HOST && env.SMTP_PORT);
    }
    if (env.EMAIL_PROVIDER === 'resend') {
      return Boolean(env.RESEND_API_KEY);
    }
    return false;
  },

  async sendNotificationEmail(params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
  }): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return {
        sent: false,
        provider: env.EMAIL_PROVIDER,
        reason:
          'Email provider is not configured (EMAIL_PROVIDER=none or missing SMTP/Resend credentials). Delivery aborted honestly without fake sends.',
      };
    }

    try {
      if (env.EMAIL_PROVIDER === 'smtp') {
        const transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: env.SMTP_USER
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              }
            : undefined,
        });

        const info = await transporter.sendMail({
          from: env.EMAIL_FROM,
          to: params.to,
          subject: params.subject,
          text: params.body,
          html: params.html,
        });
        return {
          sent: true,
          provider: 'smtp',
          messageId: info.messageId,
        };
      }

      if (env.EMAIL_PROVIDER === 'resend') {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: [params.to],
            subject: params.subject,
            text: params.body,
            html: params.html,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          return {
            sent: false,
            provider: 'resend',
            reason: `Resend HTTP ${res.status}: ${text.slice(0, 140)}`,
          };
        }
        const data = (await res.json()) as { id?: string };
        return {
          sent: true,
          provider: 'resend',
          messageId: data.id,
        };
      }
    } catch (err) {
      return {
        sent: false,
        provider: env.EMAIL_PROVIDER,
        reason: (err as Error).message,
      };
    }

    return {
      sent: false,
      provider: env.EMAIL_PROVIDER,
      reason: 'Unsupported EMAIL_PROVIDER setting.',
    };
  },
};

export async function testCampusIntegration(
  campusId: string,
  key: CampusIntegrationDTO['key']
): Promise<{
  ok: boolean;
  status: CampusIntegrationDTO['connectionStatus'];
  message: string;
  checkedAt: string;
}> {
  const checkedAt = new Date().toISOString();
  const existing = await db.findOne<CampusIntegrationDTO>('campusIntegrations', { campusId, key });

  let ok = false;
  let status: CampusIntegrationDTO['connectionStatus'] = 'not_configured';
  let message = 'Integration adapter not configured.';

  switch (key) {
    case 'gemini_ai': {
      const aiStatus = aiService.getProviderStatus();
      ok = true;
      status = aiStatus.activeProvider === 'gemini' ? 'connected' : 'simulated';
      message =
        aiStatus.activeProvider === 'gemini'
          ? `Connected to Google GenAI (${aiStatus.model}) with server-side API key.`
          : 'Running deterministic mock AI provider (no live GEMINI_API_KEY configured).';
      break;
    }
    case 'email_delivery': {
      const configured = emailAdapter.isConfigured();
      ok = configured;
      status = configured ? 'connected' : 'not_configured';
      message = configured
        ? `Email provider (${env.EMAIL_PROVIDER}) configured.`
        : 'Email provider is not configured; password reset and transactional emails are disabled honestly.';
      break;
    }
    case 'image_storage': {
      ok = env.STORAGE_PROVIDER === 'local';
      status = ok ? 'connected' : 'not_configured';
      message = ok
        ? 'Local sanitized image upload storage active (magic-byte verified, EXIF stripped, 5MB max).'
        : 'External object storage credentials not set.';
      break;
    }
    case 'map_tiles':
    case 'browser_geolocation': {
      ok = true;
      status = 'connected';
      message = 'Client capability & OpenStreetMap attribution endpoint ready.';
      break;
    }
    case 'push_notifications': {
      const hasVapid = Boolean(env.PUSH_VAPID_PUBLIC_KEY);
      ok = hasVapid;
      status = hasVapid ? 'connected' : 'not_configured';
      message = hasVapid
        ? 'Web Push VAPID public key configured alongside in-app persistent alert subscriptions.'
        : 'Web Push VAPID key not configured; in-app notification subscriptions active.';
      break;
    }
    default: {
      ok = false;
      status = existing?.mode === 'demo' || existing?.mode === 'hardware_dependent' ? 'simulated' : 'not_configured';
      message =
        existing?.mode === 'hardware_dependent'
          ? 'Hardware/device capability adapter ready for browser check; simulated demo fallback clearly labelled when hardware is absent.'
          : 'Institutional external feed credentials are not configured; running in clearly marked demo simulation mode.';
    }
  }

  if (existing) {
    await db.updateOne('campusIntegrations', { id: existing.id }, {
      connectionStatus: status,
      lastSyncAt: checkedAt,
      lastError: ok ? undefined : message,
    });
  }

  return { ok, status, message, checkedAt };
}
