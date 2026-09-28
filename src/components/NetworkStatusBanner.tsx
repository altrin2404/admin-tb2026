'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';

export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detect weak/slow mobile data via Network Information API if available
    const nav = navigator as unknown as {
      connection?: {
        effectiveType?: string;
        saveData?: boolean;
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    };

    const checkSpeed = () => {
      if (nav.connection?.effectiveType) {
        setIsSlow(nav.connection.effectiveType === '2g' || nav.connection.effectiveType === 'slow-2g');
      }
    };

    checkSpeed();
    if (nav.connection?.addEventListener) {
      nav.connection.addEventListener('change', checkSpeed);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (nav.connection?.removeEventListener) {
        nav.connection.removeEventListener('change', checkSpeed);
      }
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="sticky top-0 z-50 bg-red-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-fadeIn">
        <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
        <span>
          No Internet Connection — System is offline. Scans and updates are paused until network restores.
        </span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="sticky top-0 z-50 bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-fadeIn">
        <Wifi className="w-4 h-4 shrink-0" />
        <span>Connection Restored — You are back online!</span>
      </div>
    );
  }

  if (isSlow) {
    return (
      <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shadow-xs">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>Weak network signal detected in venue. Requests may take a moment to respond.</span>
      </div>
    );
  }

  return null;
}
