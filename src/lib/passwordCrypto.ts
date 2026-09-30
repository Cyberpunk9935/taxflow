/**
 * Password hashing for the local (no-backend) build.
 *
 * Passwords are never stored or compared in plaintext. Each account gets a
 * random salt and a PBKDF2-SHA256 digest derived from that salt, so a stored
 * record cannot be turned back into the original password.
 *
 * LIMITATION - read this before relying on it in production:
 * this runs entirely in the browser against localStorage, so it protects the
 * stored record but it is NOT a substitute for server-side authentication. Any
 * real deployment must verify credentials and own the session server-side, and
 * should use a memory-hard KDF (argon2id / scrypt / bcrypt) rather than PBKDF2.
 */

import type { User } from '../types';

/** Salt length in bytes. */
const SALT_BYTES = 16;
/** PBKDF2 iteration count. */
const ITERATIONS = 210_000;
const KEY_BITS = 256;

const encoder = new TextEncoder();

export interface PasswordRecord {
  salt: string;
  hash: string;
  iterations?: number;
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
};

const getSubtle = (): SubtleCrypto => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      'Secure password storage needs the Web Crypto API, which this browser does not provide.',
    );
  }
  return subtle;
};

const derive = async (password: string, salt: Uint8Array, iterations: number): Promise<string> => {
  const subtle = getSubtle();
  const key = await subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );
  return toBase64(new Uint8Array(bits));
};

/** Creates the record to persist for a newly registered password. */
export async function createPasswordRecord(password: string): Promise<PasswordRecord> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return { salt: toBase64(salt), hash, iterations: ITERATIONS };
}

/**
 * Verifies a password against a stored record.
 *
 * Returns false rather than throwing on a malformed record so a corrupt entry
 * cannot be used to force a successful sign-in.
 */
export async function verifyPassword(
  password: string,
  record: PasswordRecord | undefined | null,
): Promise<boolean> {
  if (!record || !record.salt || !record.hash) return false;
  try {
    const salt = fromBase64(record.salt);
    const iterations = record.iterations || ITERATIONS;
    const candidate = await derive(password, salt, iterations);
    return timingSafeEqual(candidate, record.hash);
  } catch {
    return false;
  }
}

/** Constant-time-ish comparison of two base64 digests of equal expected length. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** True when the user has a password capable of being verified. */
export const hasPassword = (user: User): boolean =>
  Boolean(user.passwordHash && user.passwordSalt);

/**
 * Passwords are verified locally, so accounts seeded without one (including the
 * demo users and any Google account) can never be signed into with the email
 * form. Callers treat this as a failed sign-in.
 */
export const canAttemptEmailLogin = (user: User): boolean =>
  user.authProvider !== 'google' && hasPassword(user);
