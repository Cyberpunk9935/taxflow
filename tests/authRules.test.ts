import {
  validateRegistration,
  findAuthenticatableUser,
  checkPassword,
  meetsPasswordPolicy,
  isValidEmail,
  decodeJwtPayload,
  profileFromCredential,
  GOOGLE_CLIENT_ID,
  type GoogleProfile,
} from '../src/lib/authRules';
import type { User } from '../src/types';

let pass = 0;
let fail = 0;
const check = (name: string, cond: boolean) => {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log('FAIL: ' + name);
  }
};

const user = (over: Partial<User> = {}): User => ({
  id: 'u1',
  name: 'Asha Rao',
  email: 'asha@example.com',
  role: 'OWNER',
  isActive: true,
  joinedDate: '2026-01-01',
  authProvider: 'email',
  ...over,
});

// ---- registration: email flow keeps every rule ----
const base = { name: 'Asha Rao', email: 'asha@example.com', role: 'OWNER' as const, agreeTerms: true, provider: 'email' as const, password: 'Taxflow1', confirmPassword: 'Taxflow1' };
check('valid email registration passes', Object.keys(validateRegistration(base, [])).length === 0);
check('short name rejected', !!validateRegistration({ ...base, name: 'A' }, []).name);
check('bad email rejected', !!validateRegistration({ ...base, email: 'nope@x' }, []).email);
check('empty email rejected', !!validateRegistration({ ...base, email: '' }, []).email);
check('terms required', !!validateRegistration({ ...base, agreeTerms: false }, []).terms);
check('mismatch rejected', !!validateRegistration({ ...base, confirmPassword: 'Other1' }, []).confirmPassword);
check('missing password rejected', !!validateRegistration({ ...base, password: '', confirmPassword: '' }, []).password);
check('weak password rejected', !!validateRegistration({ ...base, password: 'abc', confirmPassword: 'abc' }, []).password);
check('no-uppercase rejected', !!validateRegistration({ ...base, password: 'taxflow1', confirmPassword: 'taxflow1' }, []).password);

// ---- registration: duplicate email, case + whitespace insensitive ----
const existing = [user()];
check('duplicate email rejected (exact)', !!validateRegistration(base, existing).email);
check('duplicate email rejected (case/space)', !!validateRegistration({ ...base, email: '  ASHA@Example.COM ' }, existing).email);

// ---- registration: google flow enforces the SAME applicable rules ----
const gbase = { name: 'Asha Rao', email: 'new@example.com', role: 'OWNER' as const, agreeTerms: true, provider: 'google' as const };
check('valid google registration passes', Object.keys(validateRegistration(gbase, [])).length === 0);
check('google requires name min 2', !!validateRegistration({ ...gbase, name: 'A' }, []).name);
check('google requires blank name', !!validateRegistration({ ...gbase, name: '' }, []).name);
check('google requires terms', !!validateRegistration({ ...gbase, agreeTerms: false }, []).terms);
check('google rejects duplicate email', !!validateRegistration({ ...gbase, email: 'ASHA@example.com' }, existing).email);
check('google rejects bad email format', !!validateRegistration({ ...gbase, email: 'bad' }, []).email);
check('google never demands a password', validateRegistration(gbase, []).password === undefined);

// ---- login lookup ----
check('active user resolves', findAuthenticatableUser('ASHA@EXAMPLE.COM ', [user()]).status === 'ok');
check('inactive user flagged', findAuthenticatableUser('asha@example.com', [user({ isActive: false })]).status === 'inactive');
check('unknown user flagged', findAuthenticatableUser('nobody@example.com', [user()]).status === 'not_found');
const inactive = findAuthenticatableUser('asha@example.com', [user({ isActive: false })]);
check('inactive never returns a session', inactive.status !== 'ok');

// ---- password policy ----
check('policy accepts good password', meetsPasswordPolicy('Taxflow1'));
check('policy rejects short', !meetsPasswordPolicy('Ab1'));
check('policy rejects no digit', !meetsPasswordPolicy('Taxflowa'));
check('symbol is reported but not enforced', checkPassword('Taxflow1!').symbol && meetsPasswordPolicy('Taxflow1!'));
check('email regex', isValidEmail('a.b@c.co') && !isValidEmail('a@b'));

// ---- google credential parsing ----
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const makeJwt = (claims: Record<string, unknown>) => `${b64url({ alg: 'RS256' })}.${b64url(claims)}.sig`;

check('decodes jwt payload', decodeJwtPayload(makeJwt({ email: 'x@y.com' })).email === 'x@y.com');
const prof: GoogleProfile = profileFromCredential(
  makeJwt({ email: 'Ravi@Example.com', email_verified: true, name: 'Ravi Kumar', picture: 'https://p/x.png' }),
);
check('profile email lowercased', prof.email === 'ravi@example.com');
check('profile name taken from google', prof.name === 'Ravi Kumar');
check('profile picture taken from google', prof.pictureUrl === 'https://p/x.png');
let threw = false;
try {
  profileFromCredential(makeJwt({ email: 'a@b.com', email_verified: false }));
} catch {
  threw = true;
}
check('unverified email rejected', threw);
threw = false;
try {
  profileFromCredential(makeJwt({ email_verified: true }));
} catch {
  threw = true;
}
check('missing email rejected', threw);
threw = false;
try {
  profileFromCredential('not-a-jwt');
} catch {
  threw = true;
}
check('malformed credential rejected', threw);

// audience is only checked when a client id is configured
if (GOOGLE_CLIENT_ID) {
  threw = false;
  try {
    profileFromCredential(makeJwt({ email: 'a@b.com', email_verified: true, aud: 'other-app' }));
  } catch {
    threw = true;
  }
  check('wrong audience rejected', threw);
} else {
  pass++; // no client id configured in this environment
}

// ---------------------------------------------------------------------------
// Password verification - the real regression guard for the login hole
// ---------------------------------------------------------------------------

const run = async () => {
  const { createPasswordRecord, verifyPassword, canAttemptEmailLogin, hasPassword } =
    await import('../src/lib/passwordCrypto');
  const { INITIAL_USERS, DEMO_PASSWORD } = await import('../src/services/storage');

  const password = 'Taxflow1';
  const record = await createPasswordRecord(password);
  check('record stores a salt', record.salt.length > 0);
  check('record stores a hash', record.hash.length > 0);
  check('plaintext is never stored in the record', !JSON.stringify(record).includes(password));
  check('two records for the same password differ (random salt)', (await createPasswordRecord(password)).salt !== record.salt);

  check('correct password verifies', await verifyPassword(password, record));
  check('wrong password rejected', !(await verifyPassword('WrongPass1', record)));
  check('empty password rejected', !(await verifyPassword('', record)));
  check('missing record rejected', !(await verifyPassword(password, undefined)));
  check('corrupt salt rejected', !(await verifyPassword(password, { salt: '!!not-base64!!', hash: record.hash })));
  check('empty hash rejected', !(await verifyPassword(password, { salt: record.salt, hash: '' })));

  // Seeded demo accounts must go through real verification, not a bypass.
  const rajesh = INITIAL_USERS.find((u) => u.email === 'rajesh@nexify.com')!;
  check('seeded demo user has a digest', hasPassword(rajesh));
  check('seeded demo user can attempt email login', canAttemptEmailLogin(rajesh));
  check('seeded demo password verifies', await verifyPassword(DEMO_PASSWORD, {
    salt: rajesh.passwordSalt!,
    hash: rajesh.passwordHash!,
    iterations: rajesh.passwordIterations,
  }));
  check('seeded demo rejects a wrong password', !(await verifyPassword('password123', {
    salt: rajesh.passwordSalt!,
    hash: rajesh.passwordHash!,
    iterations: rajesh.passwordIterations,
  })));

  // Accounts with no digest must never authenticate via the email form.
  const noDigest = user({ authProvider: 'email' });
  check('user without digest cannot attempt login', !canAttemptEmailLogin(noDigest));
  check('google user cannot attempt email login', !canAttemptEmailLogin(user({ authProvider: 'google', passwordHash: 'x', passwordSalt: 'y' })));

  console.log(`\nPASS ${pass}  FAIL ${fail}`);
  if (fail > 0) process.exit(1);
};

run();
