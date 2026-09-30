import React, { useEffect, useRef, useState } from 'react';
import {
  DEMO_GOOGLE_PROFILE,
  GOOGLE_CLIENT_ID,
  isGoogleConfigured,
  loadGoogleIdentity,
  profileFromCredential,
  type GisWindow,
  type GoogleProfile,
} from '../lib/authRules';

interface GoogleAuthButtonProps {
  /** Button caption, e.g. "Continue with Google". */
  label: string;
  /** Called with the profile Google authorised. */
  onProfile: (profile: GoogleProfile) => void;
  onError: (message: string) => void;
}

/**
 * Renders Google's own sign-in button when VITE_GOOGLE_CLIENT_ID is configured,
 * so the credential comes straight from Google. Without a client id it falls
 * back to a clearly-labelled demo profile so local development still works.
 */
export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  label,
  onProfile,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'pending' | 'official' | 'demo'>(
    isGoogleConfigured() ? 'pending' : 'demo',
  );
  /** Why the real Google button is not being used, shown to the user. */
  const [demoReason, setDemoReason] = useState<'unconfigured' | 'unavailable' | null>(
    isGoogleConfigured() ? null : 'unconfigured',
  );
  const onProfileRef = useRef(onProfile);
  const onErrorRef = useRef(onError);
  onProfileRef.current = onProfile;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!isGoogleConfigured()) return;
    let cancelled = false;

    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const googleId = (window as GisWindow).google?.accounts.id;
        if (!googleId) {
          setMode('demo');
          setDemoReason('unavailable');
          onErrorRef.current(
            'Google sign-in is unavailable. Using the demo profile instead.',
          );
          return;
        }

        googleId.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (!response?.credential) {
              onErrorRef.current('Google did not return a credential. Please try again.');
              return;
            }
            try {
              onProfileRef.current(profileFromCredential(response.credential));
            } catch (err) {
              onErrorRef.current(
                err instanceof Error ? err.message : 'Could not read your Google profile.',
              );
            }
          },
        });

        googleId.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: Math.max(240, containerRef.current.offsetWidth || 320),
        });
        if (!cancelled) setMode('official');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMode('demo');
        setDemoReason('unavailable');
        onErrorRef.current(
          err instanceof Error
            ? `${err.message} Using the demo profile instead.`
            : 'Google sign-in could not be loaded. Using the demo profile instead.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The container must be mounted before the script resolves, otherwise
  // renderButton has no target and the button never appears.
  if (mode !== 'demo') {
    return (
      <div>
        <div ref={containerRef} className="flex justify-center min-h-[44px]" />
        {mode === 'pending' && (
          <p className="mt-2 text-[10px] text-[#596579] text-center">
            Loading Google sign-in...
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => onProfile(DEMO_GOOGLE_PROFILE)}
        className="w-full py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#FAF8F2] text-[#1B2430] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 border border-[#DED8CA] active:scale-95 cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.41 7.37 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.59 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>{label}</span>
      </button>

      {demoReason && (
        <p className="mt-2 text-[10px] text-[#8A5A00] bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-center leading-relaxed font-medium">
          {demoReason === 'unconfigured' ? (
            <>
              Demo mode - no Google client is configured, so this uses a sample
              profile instead of a real Google account.
            </>
          ) : (
            <>
              Google could not be reached, so this demo profile is being used
              instead. This is not a real Google sign-in.
            </>
          )}
        </p>
      )}
    </div>
  );
};

export default GoogleAuthButton;
