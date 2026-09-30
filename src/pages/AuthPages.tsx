import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import {
  FAILED_ATTEMPT_LIMIT,
  GENERIC_LOGIN_ERROR,
  RATE_LIMIT_SECONDS,
  checkPassword,
  findAuthenticatableUser,
  meetsPasswordPolicy,
  normaliseEmail,
  validateRegistration,
  type RegistrationErrors,
} from '../lib/authRules';
import { canAttemptEmailLogin, createPasswordRecord, verifyPassword } from '../lib/passwordCrypto';
import { DEMO_PASSWORD } from '../services/storage';

interface AuthPagesProps {
  initialMode?: 'login' | 'register';
  users: User[];
  onLoginSuccess: (user: User, remember: boolean) => void;
  onRegisterSuccess: (newUser: User) => void;
  onBackToLanding: () => void;
  prefilledEmail?: string;
  registrationSuccessMessage?: string | null;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  initialMode = 'login',
  users,
  onLoginSuccess,
  onRegisterSuccess,
  onBackToLanding,
  prefilledEmail = '',
  registrationSuccessMessage,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Sync mode if initialMode changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState(prefilledEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regRole, setRegRole] = useState<UserRole>('OWNER');
  const [regAgreeTerms, setRegAgreeTerms] = useState(false);
  const [regErrors, setRegErrors] = useState<{ [key: string]: string }>({});

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(registrationSuccessMessage || null);

  // Rate limit countdown effect
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  // Pre-fill email when it changes
  useEffect(() => {
    if (prefilledEmail) {
      setLoginEmail(prefilledEmail);
    }
  }, [prefilledEmail]);

  // Password rules check for registration
  const passwordChecks = checkPassword(regPassword);
  const hasMinLength = passwordChecks.minLength;
  const hasUppercase = passwordChecks.upper;
  const hasLowercase = passwordChecks.lower;
  const hasNumber = passwordChecks.number;
  const hasSymbol = passwordChecks.symbol;

  const rulesPassed = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSymbol].filter(Boolean).length;
  const strengthLabels = ['Too Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['#ff6b6b', '#ff6b6b', '#f59e0b', '#7dd3fc', '#34d399', '#34d399'];

  const initialsFromName = (fullName: string) =>
    fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

  // Shared failure path so every rejected sign-in looks identical to the user.
  const rejectLogin = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    setShakeCard(true);
    setTimeout(() => setShakeCard(false), 500);

    if (nextAttempts >= FAILED_ATTEMPT_LIMIT) {
      setRateLimitCountdown(RATE_LIMIT_SECONDS);
      setLoginError(
        `Too many failed login attempts. Button locked for ${RATE_LIMIT_SECONDS} seconds.`,
      );
    } else {
      setLoginError(GENERIC_LOGIN_ERROR);
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimitCountdown > 0) return;

    setLoginError('');
    setIsSubmitting(true);

    const lookup = findAuthenticatableUser(loginEmail, users);
    const candidate = lookup.status === 'ok' ? lookup.user : null;
    const attemptedPassword = loginPassword;

    // The password must be verified before the account is treated as signed in.
    // A missing digest (demo/seeded/Google accounts) can never authenticate.
    const verification = candidate && canAttemptEmailLogin(candidate)
      ? verifyPassword(attemptedPassword, {
          salt: candidate.passwordSalt ?? '',
          hash: candidate.passwordHash ?? '',
          iterations: candidate.passwordIterations,
        })
      : Promise.resolve(false);

    verification
      .then((valid) => {
        setIsSubmitting(false);
        if (candidate && valid) {
          setFailedAttempts(0);
          setLoginPassword('');
          onLoginSuccess(candidate, rememberMe);
          return;
        }
        rejectLogin();
      })
      .catch(() => {
        setIsSubmitting(false);
        rejectLogin();
      });
  };

  // Handle Register Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateRegistration(
      {
        name: regName,
        email: regEmail,
        role: regRole,
        agreeTerms: regAgreeTerms,
        provider: 'email',
        password: regPassword,
        confirmPassword: regConfirmPassword,
      },
      users,
    );

    setRegErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsSubmitting(true);
      // The digest is derived before the account is created so the plaintext
      // password is never persisted anywhere.
      createPasswordRecord(regPassword)
        .then((record) => {
          const cleanName = regName.trim();
          const cleanEmail = normaliseEmail(regEmail);

          const newUser: User = {
            id: 'user-' + Date.now(),
            name: cleanName,
            email: cleanEmail,
            role: regRole,
            isActive: true,
            joinedDate: new Date().toISOString().split('T')[0],
            avatarUrl: initialsFromName(cleanName),
            authProvider: 'email',
            passwordHash: record.hash,
            passwordSalt: record.salt,
            passwordIterations: record.iterations,
          };

          onRegisterSuccess(newUser);
          setToastMessage(`Account created successfully for ${cleanEmail}! Please sign in.`);
          setLoginEmail(cleanEmail);
          setRegPassword('');
          setRegConfirmPassword('');
          setMode('login');
        })
        .catch(() => {
          setRegErrors({
            password: 'Could not secure your password in this browser. Registration failed.',
          });
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#1B2430] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-body selection:bg-[#E4DCCE] selection:text-[#1B2430]">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 z-50 max-w-md w-full px-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold shadow-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-700 text-base">check_circle</span>
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Bar with Logo & Back Link */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-6 z-10">
        <button
          onClick={onBackToLanding}
          className="text-xs font-bold text-[#596579] hover:text-[#1B2430] flex items-center gap-1.5 transition-colors group cursor-pointer"
        >
          <span className="material-symbols-outlined text-base group-hover:-translate-x-0.5 transition-transform">
            arrow_back
          </span>
          <span>Back to Landing Page</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1B2430] border border-[#1B2430] flex items-center justify-center text-[#F7F4EC] shadow-xs">
            <span className="material-symbols-outlined text-base">menu_book</span>
          </div>
          <span className="font-headline font-bold text-base text-[#1B2430]">TaxFlowSMB</span>
        </div>
      </div>

      {/* Main Split-Screen Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* LEFT PANEL: Ledger Feature Panel */}
        <div className="lg:col-span-6 text-left space-y-6 hidden lg:block p-8 rounded-3xl bg-[#F3EFE6] border border-[#DED8CA] shadow-sm relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF8F2] border border-[#DED8CA] text-xs font-bold text-[#1B2430]">
            <span className="w-2 h-2 rounded-full bg-[#166534]"></span>
            <span>Secured Statutory Gateway</span>
          </div>

          <h2 className="text-3xl font-extrabold text-[#1B2430] font-headline leading-tight">
            Organize your business taxes in one place.
          </h2>

          <p className="text-xs text-[#596579] font-medium leading-relaxed">
            Access your encrypted books, generate Section 37 expense schedules, and collaborate with your Chartered Accountant under automated audit verification.
          </p>

          {/* Feature Bullets */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3 text-xs text-[#1B2430] font-semibold">
              <div className="w-6 h-6 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-[#1E3A8A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-sm">receipt_long</span>
              </div>
              <div>
                <span>Automated Section 37 Classification</span>
                <p className="text-[11px] text-[#596579] font-normal">Real-time deductible vs disallowed tagging on ledger entries</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-[#1B2430] font-semibold">
              <div className="w-6 h-6 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-[#1E3A8A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-sm">calculate</span>
              </div>
              <div>
                <span>Dynamic Progressive Slab Calculation</span>
                <p className="text-[11px] text-[#596579] font-normal">Data-driven rules engine with precise ROUND_HALF_UP decimal math</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-[#1B2430] font-semibold">
              <div className="w-6 h-6 rounded-lg bg-[#FAF8F2] border border-[#DED8CA] text-[#1E3A8A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-sm">verified_user</span>
              </div>
              <div>
                <span>Role-Gated State Machine</span>
                <p className="text-[11px] text-[#596579] font-normal">Four-stage certification workflow (Draft → Review → Ready → Filed)</p>
              </div>
            </div>
          </div>

          {/* Fast Test Profiles Helper */}
          <div className="pt-4 border-t border-[#DED8CA]">
            <p className="text-[11px] font-bold text-[#1B2430] mb-2 uppercase tracking-wider font-mono">
              Quick Test Credentials:
            </p>
            <p className="text-[11px] text-[#596579] mb-2 font-normal">
              Demo profiles are provisioned with the password{' '}
              <code className="font-mono font-semibold text-[#1B2430]">Taxflow1</code> on first
              use. Accounts you register yourself set their own password.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('rajesh@nexify.com');
                  setLoginPassword(DEMO_PASSWORD);
                  setMode('login');
                }}
                className="text-[11px] bg-[#FFFFFF] hover:bg-[#FAF8F2] text-[#1B2430] px-2.5 py-1 rounded-lg border border-[#DED8CA] font-medium shadow-2xs cursor-pointer"
              >
                Rajesh (Owner)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('priya.ca@taxpro.in');
                  setLoginPassword(DEMO_PASSWORD);
                  setMode('login');
                }}
                className="text-[11px] bg-[#FFFFFF] hover:bg-[#FAF8F2] text-[#1B2430] px-2.5 py-1 rounded-lg border border-[#DED8CA] font-medium shadow-2xs cursor-pointer"
              >
                Priya (Accountant)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@taxflowsmb.com');
                  setLoginPassword(DEMO_PASSWORD);
                  setMode('login');
                }}
                className="text-[11px] bg-[#FFFFFF] hover:bg-[#FAF8F2] text-[#6B21A8] px-2.5 py-1 rounded-lg border border-[#DED8CA] font-medium shadow-2xs cursor-pointer"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Solid Paper Login / Register Card */}
        <div
          className={`lg:col-span-6 w-full bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 border border-[#DED8CA] shadow-lg transition-all duration-300 ${
            shakeCard ? 'animate-[wiggle_0.4s_ease-in-out]' : ''
          }`}
        >
          {mode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold font-headline text-[#1B2430]">Welcome back</h2>
                <p className="text-xs text-[#596579] mt-1 font-medium">
                  Sign in with your registered email to enter your tax workspace
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Login Error Box */}
              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#991B1B] flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#991B1B]">error</span>
                    <span className="font-semibold">{loginError}</span>
                  </div>
                  <p className="text-[11px] text-[#596579] pl-6">
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-[#1E3A8A] font-bold underline hover:text-[#1B2430]"
                    >
                      Register first
                    </button>
                  </p>
                </div>
              )}

              {/* Email Form */}
              <div>
                  <label className="block text-xs font-bold text-[#1B2430] mb-1.5">
                    Business Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      placeholder="e.g. rajesh@nexify.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#1B2430]"
                    />
                    <span className="material-symbols-outlined text-base text-[#596579] absolute left-3 top-2.5">
                      mail
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#1B2430]">Password</label>
                    <button
                      type="button"
                      onClick={() => alert('Contact your administrator to reset your password.')}
                      className="text-[11px] font-semibold text-[#1E3A8A] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:border-[#1B2430]"
                    />
                    <span className="material-symbols-outlined text-base text-[#596579] absolute left-3 top-2.5">
                      lock
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#596579] hover:text-[#1B2430]"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-[#596579] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded bg-[#FAF8F2] border-[#DED8CA] text-[#1B2430] focus:ring-0"
                    />
                    <span>Remember me on this browser</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || rateLimitCountdown > 0}
                  className="w-full py-3 px-4 bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] font-extrabold text-xs tracking-wider rounded-xl border border-[#1B2430] shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                      <span>Verifying Credentials...</span>
                    </>
                  ) : rateLimitCountdown > 0 ? (
                    <span>Locked ({rateLimitCountdown}s)</span>
                  ) : (
                    <>
                      <span>Login to Platform</span>
                      <span className="material-symbols-outlined text-sm">login</span>
                    </>
                  )}
                </button>
              </form>

              {/* Don't have an account? Register First */}
              <div className="pt-2 text-center border-t border-[#DED8CA]">
                <p className="text-xs text-[#596579]">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setRegErrors({});
                      setMode('register');
                    }}
                    className="text-[#1E3A8A] font-bold hover:underline cursor-pointer"
                  >
                    Register first
                  </button>
                </p>
              </div>

              {/* Statutory Footnote */}
              <p className="text-[10px] text-[#596579] text-center leading-relaxed">
                This system supports tax preparation and is not a substitute for a qualified tax professional.
              </p>
            </div>
          ) : (
            /* ================= REGISTER FORM ================= */
            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
              <div>
                <h2 className="text-2xl font-extrabold font-headline text-[#1B2430]">Create your account</h2>
                <p className="text-xs text-[#596579] mt-1 font-medium">
                  Register your small business profile or tax advisor credentials
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1B2430] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-xl px-3 py-2 focus:outline-none focus:border-[#1B2430]"
                  />
                  {regErrors.name && <p className="text-[10px] text-red-600 mt-1">{regErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1B2430] mb-1">Business Email</label>
                  <input
                    type="email"
                    required
                    placeholder="finance@yourcompany.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-xl px-3 py-2 focus:outline-none focus:border-[#1B2430]"
                  />
                  {regErrors.email && <p className="text-[10px] text-red-600 mt-1">{regErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1B2430] mb-1">
                    Select Your Role (Admin not selectable)
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-xl px-3 py-2 focus:outline-none focus:border-[#1B2430]"
                  >
                    <option value="OWNER">Business Owner (OWNER)</option>
                    <option value="ACCOUNTANT">Accountant / Tax Professional (ACCOUNTANT)</option>
                  </select>
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-xs font-bold text-[#1B2430] mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 8 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-xl px-3 pr-10 py-2 focus:outline-none focus:border-[#1B2430]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-2 text-[#596579] hover:text-[#1B2430]"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {showRegPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Password Strength Bar */}
                  {regPassword && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#596579]">Strength:</span>
                        <span style={{ color: strengthColors[rulesPassed] }} className="font-bold">
                          {strengthLabels[rulesPassed]}
                        </span>
                      </div>
                      <div className="w-full bg-[#EFECE3] h-1.5 rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className="h-full flex-1 rounded-full transition-all"
                            style={{
                              backgroundColor: rulesPassed >= lvl ? strengthColors[rulesPassed] : '#EFECE3',
                            }}
                          ></div>
                        ))}
                      </div>

                      {/* Real-time checklist */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px]">
                        <span className={hasMinLength ? 'text-emerald-700 font-bold' : 'text-[#596579]'}>
                          {hasMinLength ? '✓' : '•'} 8+ characters
                        </span>
                        <span className={hasUppercase ? 'text-emerald-700 font-bold' : 'text-[#596579]'}>
                          {hasUppercase ? '✓' : '•'} Uppercase letter
                        </span>
                        <span className={hasLowercase ? 'text-emerald-700 font-bold' : 'text-[#596579]'}>
                          {hasLowercase ? '✓' : '•'} Lowercase letter
                        </span>
                        <span className={hasNumber ? 'text-emerald-700 font-bold' : 'text-[#596579]'}>
                          {hasNumber ? '✓' : '•'} Number
                        </span>
                      </div>
                    </div>
                  )}
                  {regErrors.password && <p className="text-[10px] text-red-600 mt-1">{regErrors.password}</p>}
                </div>

                {/* Confirm Password field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#1B2430]">Confirm Password</label>
                    {regConfirmPassword && (
                      <span
                        className={`text-[10px] font-bold ${
                          regPassword === regConfirmPassword ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {regPassword === regConfirmPassword ? '✓ Passwords match' : '✗ Does not match'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showRegConfirm ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full bg-[#FAF8F2] border border-[#DED8CA] text-xs text-[#1B2430] rounded-xl px-3 pr-10 py-2 focus:outline-none focus:border-[#1B2430]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirm(!showRegConfirm)}
                      className="absolute right-3 top-2 text-[#596579] hover:text-[#1B2430]"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {showRegConfirm ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {regErrors.confirmPassword && (
                    <p className="text-[10px] text-red-600 mt-1">{regErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 text-[11px] text-[#596579] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regAgreeTerms}
                      onChange={(e) => setRegAgreeTerms(e.target.checked)}
                      className="mt-0.5 rounded bg-[#FAF8F2] border-[#DED8CA] text-[#1B2430] focus:ring-0"
                    />
                    <span>
                      I understand this tool supports tax preparation and does not replace professional tax advice or file with the government.
                    </span>
                  </label>
                  {regErrors.terms && <p className="text-[10px] text-red-600 mt-1">{regErrors.terms}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-[#1B2430] hover:bg-[#283548] text-[#F7F4EC] font-extrabold text-xs tracking-wider rounded-xl border border-[#1B2430] shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Registering Account...</span>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Already have an account? Login */}
              <div className="pt-2 text-center border-t border-[#DED8CA]">
                <p className="text-xs text-[#596579]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError('');
                      setMode('login');
                    }}
                    className="text-[#1E3A8A] font-bold hover:underline cursor-pointer"
                  >
                    Login
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
