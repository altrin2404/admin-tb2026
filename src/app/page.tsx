'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  QrCode,
  ArrowRight,
  ClipboardList,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
  AlertCircle
} from 'lucide-react';
import { setPortalAuthenticated, lockPortal } from '@/lib/auth';

interface TargetOption {
  title: string;
  badge: string;
  subtitle: string;
  href: string;
  ctaText: string;
  colorClass: string;
  bgClass: string;
  borderHoverClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function PortalGatewayPage() {
  const router = useRouter();
  const [selectedTarget, setSelectedTarget] = useState<TargetOption | null>(null);
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Lock session whenever user arrives or returns to gateway
  useEffect(() => {
    lockPortal();
    const handlePopState = () => lockPortal();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const options: TargetOption[] = [
    {
      title: 'Registrations',
      badge: 'Option 1',
      subtitle: 'Live registration & dashboard overview',
      href: '/registrations',
      ctaText: 'Open Registrations',
      colorClass: 'text-violet-600',
      bgClass: 'bg-violet-50',
      borderHoverClass: 'hover:border-violet-500',
      icon: ClipboardList,
    },
    {
      title: 'Event Dashboards',
      badge: 'Option 2',
      subtitle: 'Rosters & rounds for 6 competitions',
      href: '/events',
      ctaText: 'Open Event Dashboards',
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
      borderHoverClass: 'hover:border-amber-500',
      icon: Trophy,
    },
    {
      title: 'Attendance',
      badge: 'Option 3',
      subtitle: 'Participant ID (TB001) or QR Scan',
      href: '/scanner',
      ctaText: 'Open Attendance Station',
      colorClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50',
      borderHoverClass: 'hover:border-emerald-500',
      icon: QrCode,
    },
  ];

  // ALWAYS prompt for password every single time a card is clicked
  const handleCardClick = (e: React.MouseEvent, opt: TargetOption) => {
    e.preventDefault();
    setSelectedTarget(opt);
    setPasscode('');
    setError(false);
    setErrorMessage('');
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) {
      setError(true);
      setErrorMessage('Please enter the passcode.');
      return;
    }

    const success = setPortalAuthenticated(passcode);
    if (success && selectedTarget) {
      const destination = selectedTarget.href;
      setSelectedTarget(null);
      router.push(destination);
    } else {
      setError(true);
      setErrorMessage('Incorrect passcode. Please try again.');
      setPasscode('');
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-8 animate-fadeIn">
      {/* Title */}
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Select Operation Mode
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          TechBETA 2026 2.0 &bull; Department of Information Technology
        </p>
      </div>

      {/* Three Option Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl px-1">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <div
              key={opt.title}
              onClick={(e) => handleCardClick(e, opt)}
              className={`group bg-white p-5 sm:p-10 rounded-2xl sm:rounded-3xl border-2 border-slate-200 ${opt.borderHoverClass} shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4 hover:-translate-y-1 active:scale-[0.98] cursor-pointer relative`}
            >
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${opt.bgClass} ${opt.colorClass} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-xs relative`}
              >
                <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
                <span className="absolute -top-1 -right-1 p-1 bg-white rounded-full border border-slate-200 text-slate-400 group-hover:text-slate-700 shadow-xs">
                  <Lock className="w-3 h-3" />
                </span>
              </div>

              <div className="space-y-1">
                <span
                  className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${opt.colorClass} ${opt.bgClass} px-2.5 py-1 rounded-full`}
                >
                  {opt.badge}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors pt-1 sm:pt-2">
                  {opt.title}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium pt-0.5">
                  {opt.subtitle}
                </p>
              </div>

              <div
                className={`pt-1 sm:pt-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 group-hover:${opt.colorClass} transition-colors`}
              >
                <span>{opt.ctaText}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Password Prompt Modal */}
      {selectedTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-8 border border-slate-200 shadow-2xl text-center space-y-4 sm:space-y-5 animate-scaleUp relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTarget(null)}
              className="absolute right-3.5 top-3.5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Target Header Icon */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl ${selectedTarget.bgClass} ${selectedTarget.colorClass} border border-slate-200 flex items-center justify-center shadow-xs`}
            >
              <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            {/* Target Header Info */}
            <div className="space-y-1">
              <span className={`text-[10px] font-black uppercase tracking-wider ${selectedTarget.colorClass} ${selectedTarget.bgClass} px-2.5 py-0.5 rounded-full`}>
                {selectedTarget.title}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight pt-1">
                Enter Access Passcode
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Authorized passcode required to proceed
              </p>
            </div>

            {/* Unlock Form */}
            <form onSubmit={handleUnlock} className="space-y-3.5 sm:space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="Enter 6-digit passcode"
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

              <div className="flex flex-col gap-2 pt-1 sm:pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock &amp; Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>

            <p className="text-[10px] text-slate-400 font-mono">
              Passcode protected &bull; TechBETA 2026
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
