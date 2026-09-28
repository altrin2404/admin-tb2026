'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Home, AlertCircle, Loader2 } from 'lucide-react';
import { isPortalAuthenticated, setPortalAuthenticated, lockPortal, checkServerSession } from '@/lib/auth';

export default function PortalAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState<boolean>(true);
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isGateway = pathname === '/';

  useEffect(() => {
    if (isGateway) {
      setAuthenticated(true);
    } else {
      // Check local storage first for fast initial display
      const localAuthed = isPortalAuthenticated();
      setAuthenticated(localAuthed);

      // Verify with server
      checkServerSession().then((isValid) => {
        setAuthenticated(isValid);
      });
    }
  }, [pathname, isGateway]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) {
      setError(true);
      setErrorMessage('Please enter the passcode.');
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const success = await setPortalAuthenticated(passcode);
      if (success) {
        setAuthenticated(true);
        setError(false);
        setPasscode('');
      } else {
        setError(true);
        setErrorMessage('Incorrect passcode. Please try again.');
        setPasscode('');
      }
    } catch {
      setError(true);
      setErrorMessage('Verification failed. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  // If already authenticated or on public gateway, render normally
  if (isGateway || authenticated) {
    return <>{children}</>;
  }

  // Blocker modal for protected routes visited directly without authentication
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-8 border border-slate-200 shadow-2xl text-center space-y-4 sm:space-y-5 animate-scaleUp max-h-[92vh] overflow-y-auto">
        
        {/* Icon */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
          <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Security Passcode Required
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Enter the authorized passcode to access this section
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleUnlock} className="space-y-3.5 sm:space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              disabled={loading}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Enter passcode"
              className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-center font-mono text-lg font-bold tracking-widest text-slate-900 placeholder-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs focus:outline-none focus:bg-white transition-all ${
                error
                  ? 'border-red-400 ring-2 ring-red-200 bg-red-50/30'
                  : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock Access</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                await lockPortal();
                router.push('/');
              }}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Portal Gateway</span>
            </button>
          </div>
        </form>

        <p className="text-[10px] text-slate-400 font-mono">
          TechBETA 2026 2.0 &bull; SXCCE IT
        </p>
      </div>
    </div>
  );
}
