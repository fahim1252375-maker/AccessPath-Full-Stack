import crypto from 'node:crypto';

/**
 * Collision-resistant, roughly time-sortable record identifier: `<prefix>_<time36>_<random>`.
 *
 * Replaces the earlier `${prefix}_${Date.now()}` pattern, which could collide when two records
 * were created in the same millisecond and used the non-cryptographic `Math.random()`.
 */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${time}${random}`;
}
