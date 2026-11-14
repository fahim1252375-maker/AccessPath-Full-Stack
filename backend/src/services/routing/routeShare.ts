/**
 * Stateless, signed, expiring route-share tokens (feature #218).
 *
 * A token encodes only the *request* (campus, origin, destination, boolean
 * accessibility constraints and algorithm) — never a route snapshot and never
 * personal data. The recipient's browser asks the API to recompute the route
 * from live campus data, so a shared link can never show a stale (and possibly
 * unsafe) path.
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 * The signing key is derived from the server secret with a purpose label, so a
 * share token can never be mistaken for a session JWT.
 */
import crypto from 'node:crypto';
import type { AccessibilityPreferences } from '../../../../shared/types.ts';

export const SHARE_TOKEN_VERSION = 1;
export const DEFAULT_SHARE_TTL_HOURS = 48;
export const MAX_SHARE_TTL_HOURS = 168;

const KEY_PURPOSE = 'accesspath:route-share:v1';

/**
 * Order matters: each constraint owns one bit. Append new constraints at the end
 * only, so previously issued links keep decoding to the same preferences.
 */
export const SHAREABLE_PREFERENCE_KEYS = [
  'wheelchairMode',
  'stepFreeMode',
  'limitedMobilityMode',
  'rampRequired',
  'elevatorRequired',
  'stairsAvoidance',
  'smoothSurfacePreference',
  'widePathPreference',
  'lowGradientPreference',
  'wellLitPreference',
  'visualAssistanceMode',
] as const satisfies ReadonlyArray<keyof AccessibilityPreferences>;

export type ShareablePreferenceKey = (typeof SHAREABLE_PREFERENCE_KEYS)[number];
export type ShareablePreferences = Record<ShareablePreferenceKey, boolean>;

export interface RouteSharePayload {
  campusId: string;
  fromNodeId: string;
  toNodeId: string;
  algorithm: 'dijkstra' | 'astar';
  preferences: ShareablePreferences;
}

export type ShareTokenFailure = 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED' | 'UNSUPPORTED_VERSION';

export type ShareTokenVerification =
  | { ok: true; payload: RouteSharePayload; issuedAt: Date; expiresAt: Date }
  | { ok: false; reason: ShareTokenFailure };

interface WirePayload {
  v: number;
  c: string;
  f: string;
  t: string;
  a: 'd' | 's';
  m: number;
  i: number;
  e: number;
}

/* -------------------------------------------------------------------------- */
/* Preference bit mask                                                        */
/* -------------------------------------------------------------------------- */

export function encodePreferenceMask(
  preferences: Partial<Record<ShareablePreferenceKey, boolean>>
): number {
  return SHAREABLE_PREFERENCE_KEYS.reduce(
    (mask, key, bit) => (preferences[key] ? mask | (1 << bit) : mask),
    0
  );
}

export function decodePreferenceMask(mask: number): ShareablePreferences {
  const result = {} as ShareablePreferences;
  SHAREABLE_PREFERENCE_KEYS.forEach((key, bit) => {
    result[key] = (mask & (1 << bit)) !== 0;
  });
  return result;
}

/* -------------------------------------------------------------------------- */
/* Signing helpers                                                            */
/* -------------------------------------------------------------------------- */

const base64Url = (input: Buffer | string): string => Buffer.from(input).toString('base64url');

function signingKey(secret: string): Buffer {
  return crypto.createHmac('sha256', secret).update(KEY_PURPOSE).digest();
}

function sign(encodedPayload: string, secret: string): Buffer {
  return crypto.createHmac('sha256', signingKey(secret)).update(encodedPayload).digest();
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export function clampShareTtlHours(hours: number | undefined): number {
  if (hours === undefined || !Number.isFinite(hours)) return DEFAULT_SHARE_TTL_HOURS;
  return Math.min(MAX_SHARE_TTL_HOURS, Math.max(1, Math.floor(hours)));
}

export function createRouteShareToken(
  payload: RouteSharePayload,
  secret: string,
  options: { ttlHours?: number; now?: Date } = {}
): { token: string; issuedAt: Date; expiresAt: Date } {
  const issuedAt = options.now ?? new Date();
  const ttlHours = clampShareTtlHours(options.ttlHours);
  const expiresAt = new Date(issuedAt.getTime() + ttlHours * 3_600_000);

  const wire: WirePayload = {
    v: SHARE_TOKEN_VERSION,
    c: payload.campusId,
    f: payload.fromNodeId,
    t: payload.toNodeId,
    a: payload.algorithm === 'astar' ? 's' : 'd',
    m: encodePreferenceMask(payload.preferences),
    i: Math.floor(issuedAt.getTime() / 1000),
    e: Math.floor(expiresAt.getTime() / 1000),
  };

  const encoded = base64Url(JSON.stringify(wire));
  const signature = base64Url(sign(encoded, secret));
  return { token: `${encoded}.${signature}`, issuedAt, expiresAt };
}

function isWirePayload(value: unknown): value is WirePayload {
  if (!value || typeof value !== 'object') return false;
  const wire = value as Record<string, unknown>;
  return (
    typeof wire.v === 'number' &&
    typeof wire.c === 'string' &&
    typeof wire.f === 'string' &&
    typeof wire.t === 'string' &&
    (wire.a === 'd' || wire.a === 's') &&
    Number.isInteger(wire.m) &&
    Number.isInteger(wire.i) &&
    Number.isInteger(wire.e)
  );
}

export function verifyRouteShareToken(
  token: string,
  secret: string,
  now: Date = new Date()
): ShareTokenVerification {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0 || token.length > 2048) {
    return { ok: false, reason: 'MALFORMED' };
  }
  const [encoded, providedSignature] = parts;

  const expected = sign(encoded, secret);
  const provided = Buffer.from(providedSignature, 'base64url');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return { ok: false, reason: 'BAD_SIGNATURE' };
  }

  let wire: unknown;
  try {
    wire = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }
  if (!isWirePayload(wire)) return { ok: false, reason: 'MALFORMED' };
  if (wire.v !== SHARE_TOKEN_VERSION) return { ok: false, reason: 'UNSUPPORTED_VERSION' };
  if (now.getTime() >= wire.e * 1000) return { ok: false, reason: 'EXPIRED' };

  return {
    ok: true,
    payload: {
      campusId: wire.c,
      fromNodeId: wire.f,
      toNodeId: wire.t,
      algorithm: wire.a === 's' ? 'astar' : 'dijkstra',
      preferences: decodePreferenceMask(wire.m),
    },
    issuedAt: new Date(wire.i * 1000),
    expiresAt: new Date(wire.e * 1000),
  };
}
