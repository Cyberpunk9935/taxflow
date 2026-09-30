/**
 * Shared authentication rules.
 *
 * Both the email form and the Google path funnel through the validators here so
 * the two flows can never drift apart. Previously the Google flow re-implemented
 * (and skipped) most of the checks the email form performed.
 */

import type { User, UserRole } from '../types';

// ---------------------------------------------------------------------------
// Field validation
// ---------------------------------------------------------------------------

export const EMAIL_PATTERN = /\S+@\S+\.\S+/;

export const isValidEmail = (value: string): boolean =>
  EMAIL_PATTERN.test(value.trim());

export const isValidName = (value: string): boolean => value.trim().length >= 2;

export interface PasswordChecks {
  minLength: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
}

export const checkPassword = (password: string): PasswordChecks => ({
  minLength: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  symbol: /[^A-Za-z0-9]/.test(password),
});

/**
 * The password policy that is actually enforced at registration.
 * The symbol indicator is shown in the UI but has never been enforced, so it is
 * deliberately left out here to avoid tightening the policy without warning.
 */
export const meetsPasswordPolicy = (password: string): boolean => {
  const checks = checkPassword(password);
  return checks.minLength && checks.upper && checks.lower && checks.number;
};

export const PASSWORD_POLICY_MESSAGE =
  'Password must meet minimum criteria (8+ chars, upper, lower, and number)';

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export interface RegistrationInput {
  name: string;
  email: string;
  role: UserRole;
  agreeTerms: boolean;
  provider: 'email' | 'google';
  /** Only used by the email flow. */
  password?: string;
  confirmPassword?: string;
}

export type RegistrationErrors = Record<string, string>;

export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

/**
 * Returns a map of field -> message. An empty map means the input is valid.
 */
export function validateRegistration(
  input: RegistrationInput,
  existingUsers: User[],
): RegistrationErrors {
  const errors: RegistrationErrors = {};

  const name = input.name.trim();
  const email = normaliseEmail(input.email);

  if (!isValidName(name)) {
    errors.name = 'Full name is required (minimum 2 characters)';
  }

  if (!email) {
    errors.email = 'Email address is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Invalid email address format';
  } else if (existingUsers.some((u) => normaliseEmail(u.email) === email)) {
    errors.email = 'An account with this email already exists. Please log in.';
  }

  if (input.provider === 'email') {
    const password = input.password ?? '';
    if (!password) {
      errors.password = 'Password is required';
    } else if (!meetsPasswordPolicy(password)) {
      errors.password = PASSWORD_POLICY_MESSAGE;
    }
    if (password !== (input.confirmPassword ?? '')) {
      errors.confirmPassword = 'Passwords do not match';
    }
  }

  if (!input.agreeTerms) {
    errors.terms = 'You must agree that this is a tax preparation support system';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export type LoginLookup =
  | { status: 'ok'; user: User }
  | { status: 'not_found' }
  | { status: 'inactive' };

/**
 * Resolves an email to a sign-in-able account.
 *
 * A deactivated account is reported separately from an unknown one internally,
 * but callers must still show the same generic message for both so the form
 * cannot be used to discover which emails are registered.
 */
export function findAuthenticatableUser(email: string, users: User[]): LoginLookup {
  const clean = normaliseEmail(email);
  const found = users.find((u) => normaliseEmail(u.email) === clean);
  if (!found) return { status: 'not_found' };
  if (!found.isActive) return { status: 'inactive' };
  return { status: 'ok', user: found };
}

/** Single generic message for every failed sign-in, active or not. */
export const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

export const FAILED_ATTEMPT_LIMIT = 5;
export const RATE_LIMIT_SECONDS = 30;

// ---------------------------------------------------------------------------
// Google Identity Services
// ---------------------------------------------------------------------------

export interface GoogleProfile {
  name: string;
  email: string;
  /** Google profile picture URL, when the account exposes one. */
  pictureUrl: string;
}

export const GOOGLE_CLIENT_ID: string =
  (import.meta.env?.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

export const isGoogleConfigured = (): boolean => GOOGLE_CLIENT_ID.length > 0;

/**
 * Used only when no OAuth client is configured, so the flow still works in
 * development. Clearly surfaced in the UI as a demo - it is not a real login.
 */
export const DEMO_GOOGLE_PROFILE: GoogleProfile = {
  name: 'Legend Gamer',
  email: 'legendgamer1432@gmail.com',
  pictureUrl: '',
};

const GIS_SRC = 'https://accounts.google.com/gsi/client';

export type GisWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (config: Record<string, unknown>) => void;
        renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
      };
    };
  };
};

let gisPromise: Promise<void> | null = null;

export function loadGoogleIdentity(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in needs a browser environment.'));
  }
  const gisWindow = window as GisWindow;
  if (gisWindow.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;

  gisPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => {
        gisPromise = null;
        reject(new Error('Google Identity Services failed to load.'));
      });
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      reject(new Error('Google Identity Services failed to load.'));
    };
    document.head.appendChild(script);
  });

  return gisPromise;
}

export function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    throw new Error('Google returned a malformed credential.');
  }
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

/**
 * Turns a GIS credential into a profile.
 *
 * NOTE: this only decodes the claims so the UI can prefill them. The token
 * signature MUST still be verified server-side before the email is trusted -
 * client-side decoding proves nothing about authenticity.
 */
export function profileFromCredential(credential: string): GoogleProfile {
  const claims = decodeJwtPayload(credential);

  if (GOOGLE_CLIENT_ID && claims.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Google credential was issued for a different application.');
  }
  if (claims.email_verified === false) {
    throw new Error('Your Google account email is not verified.');
  }

  const email = typeof claims.email === 'string' ? claims.email.trim() : '';
  if (!email) {
    throw new Error('Google did not return an email address for this account.');
  }

  const name = typeof claims.name === 'string' ? claims.name.trim() : '';
  const pictureUrl = typeof claims.picture === 'string' ? claims.picture : '';

  return { name, email: email.toLowerCase(), pictureUrl };
}
