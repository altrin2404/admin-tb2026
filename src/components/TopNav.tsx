'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Trophy, 
  QrCode, 
  UserPlus, 
  Clock, 
  Database,
  ArrowLeftRight,
  Menu,
  X,
  ClipboardList
} from 'lucide-react';

export default function TopNav() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isGateway = pathname === '/';
  const isScannerMode = pathname === '/scanner';

  const allNavLinks = [
    { href: '/registrations', label: 'Registrations', shortLabel: 'Registrations', icon: ClipboardList, color: 'text-violet-600', activeBg: 'bg-violet-600' },
    { href: '/dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600', activeBg: 'bg-blue-600' },
    { href: '/master', label: 'Master Sheet', shortLabel: 'Master', icon: Users, color: 'text-blue-600', activeBg: 'bg-blue-600' },
    { href: '/events', label: 'Event Dashboards', shortLabel: 'Events', icon: Trophy, color: 'text-amber-600', activeBg: 'bg-amber-600' },
    { href: '/scanner', label: 'Attendance Station', shortLabel: 'Attendance', icon: QrCode, color: 'text-emerald-600', activeBg: 'bg-emerald-600' },
    { href: '/spot-register', label: 'Spot Registration', shortLabel: 'Spot Reg', icon: UserPlus, color: 'text-indigo-600', activeBg: 'bg-indigo-600' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-13 sm:h-16">
          
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 group min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs sm:text-base shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform shrink-0">
                TB
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight truncate group-hover:text-blue-600 transition-colors">
                    TechBETA 2.0
                  </span>
                  <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${
                    isScannerMode
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : isGateway
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {isScannerMode ? 'Attendance' : isGateway ? 'Portal' : 'Admin'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate hidden xs:block">
                  SXCCE IT Department
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links (Hidden on Gateway page for clean focus) */}
          {!isGateway && (
            <nav className="hidden lg:flex items-center gap-1">
              {allNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? link.href === '/scanner'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs'
                          : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? (link.href === '/scanner' ? 'text-emerald-600' : 'text-blue-600') : 'text-slate-500'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Header Status Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Supabase Live Indicator (Visible on tablets & desktops) */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[11px] font-semibold text-slate-600">Live DB</span>
            </div>

            {/* Live Clock (Hidden on mobile phones to give space for hamburger button) */}
            <div className="hidden md:flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="text-xs">{time || '--:--'}</span>
            </div>

            {/* Mobile Menu Button - ALWAYS visible on < lg */}
            {!isGateway && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 lg:hidden transition-all active:scale-90"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 text-slate-900" />
                ) : (
                  <Menu className="h-5 w-5 text-slate-900" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {!isGateway && mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 animate-fadeIn space-y-1.5">
            {allNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? link.href === '/scanner'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 bg-white border border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${link.color}`} />
                    <span>{link.label}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">&rarr;</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Mobile Horizontal Quick Tab Bar (Always accessible for instant 1-tap switching) */}
        {!isGateway && !mobileMenuOpen && (
          <div className="flex lg:hidden overflow-x-auto py-1.5 gap-1 border-t border-slate-200 no-scrollbar -mx-2.5 px-2.5 bg-slate-50/80">
            {allNavLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? link.href === '/scanner'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 bg-white hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span>{link.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
