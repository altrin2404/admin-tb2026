'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, QrCode, ArrowRight, ClipboardList } from 'lucide-react';

export default function PortalGatewayPage() {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        
        {/* OPTION 1: Registrations */}
        <Link
          href="/registrations"
          className="group bg-white p-8 sm:p-10 rounded-3xl border-2 border-slate-200 hover:border-violet-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center text-center space-y-4 hover:-translate-y-1"
        >
          <div className="w-20 h-20 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <ClipboardList className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
              Option 1
            </span>
            <h2 className="text-2xl font-black text-slate-900 group-hover:text-violet-600 transition-colors pt-2">
              Registrations
            </h2>
          </div>

          <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 group-hover:text-violet-600 transition-colors">
            <span>View Registrations</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* OPTION 2: Dashboard */}
        <Link
          href="/dashboard"
          className="group bg-white p-8 sm:p-10 rounded-3xl border-2 border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center text-center space-y-4 hover:-translate-y-1"
        >
          <div className="w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <LayoutDashboard className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Option 2
            </span>
            <h2 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors pt-2">
              Dashboard
            </h2>
          </div>

          <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
            <span>Enter Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* OPTION 3: QR Entry */}
        <Link
          href="/scanner"
          className="group bg-white p-8 sm:p-10 rounded-3xl border-2 border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center text-center space-y-4 hover:-translate-y-1"
        >
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-xs">
            <QrCode className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Option 3
            </span>
            <h2 className="text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors pt-2">
              QR Entry
            </h2>
          </div>

          <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
            <span>Open Gate Scanner</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

      </div>

    </div>
  );
}
