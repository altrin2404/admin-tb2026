'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  IndianRupee, 
  ShieldCheck, 
  ArrowUpRight, 
  UserPlus, 
  Trophy, 
  Sparkles,
  RefreshCw,
  Building,
  AlertCircle
} from 'lucide-react';

interface StatsResponse {
  summary: {
    totalParticipants: number;
    totalEntered: number;
    yetToArrive: number;
    attendanceRate: number;
    totalTeams: number;
    totalRevenue: number;
    verifiedRevenue: number;
    pendingRevenue: number;
  };
  collegeStats: Array<{ college: string; total: number; entered: number }>;
  eventStats: Array<{ name: string; shortCode: string; count: number; entered: number }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to load stats');
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const summary = data?.summary || {
    totalParticipants: 0,
    totalEntered: 0,
    yetToArrive: 0,
    attendanceRate: 0,
    totalTeams: 0,
    totalRevenue: 0,
    verifiedRevenue: 0,
    pendingRevenue: 0,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Banner & Fast Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Admin Operations Portal
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">TechBETA 2026</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Event Management Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete registration administration, event rosters, fee tracking, and participant verification.
          </p>
        </div>

        {/* Quick Action CTAs */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-all border border-slate-200 active:scale-95"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Sync</span>
          </button>

          <Link
            href="/master"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all active:scale-95"
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Master Directory</span>
          </Link>

          <Link
            href="/spot-register"
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Spot Registration</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Grid (Without entry/gate counters) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Total Registered */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Participants</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {summary.totalParticipants}
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              ({summary.totalTeams} Teams)
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            <Link href="/master" className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
              View full directory <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Revenue Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Registration Fees</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              ₹{summary.totalRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 font-medium">₹200 / person</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            <span>Verified: <strong className="text-emerald-700">₹{summary.verifiedRevenue}</strong></span>
            <span>Pending: <strong className="text-amber-700">₹{summary.pendingRevenue}</strong></span>
          </div>
        </div>

        {/* Payment Verification */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">UTR Payment Verification</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-purple-700">
              {summary.totalParticipants > 0 
                ? Math.round((summary.verifiedRevenue / summary.totalRevenue) * 100) 
                : 0}%
            </span>
            <span className="text-xs text-slate-500">Verified UTR Rate</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5 flex items-center justify-between">
            <Link href="/master" className="text-purple-700 font-semibold hover:underline">
              Manage UTR Status
            </Link>
          </div>
        </div>

      </div>

      {/* Event Rosters & College Representation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Event Distribution Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  Official 6 Event Registrations
                </h2>
                <p className="text-xs text-slate-500">
                  Registered participant count per competition. Click any event to manage its roster.
                </p>
              </div>
              <Link 
                href="/events" 
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                All Event Rosters <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Event List Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {data?.eventStats?.map((ev) => {
                return (
                  <Link
                    key={ev.shortCode}
                    href={`/events`}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        {ev.shortCode}
                      </span>
                      <span className="text-xs font-bold text-blue-700">
                        {ev.count} Registered
                      </span>
                    </div>
                    <div className="mt-2.5 font-bold text-sm text-slate-900 group-hover:text-blue-700 line-clamp-1">
                      {ev.name}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 font-medium flex justify-between">
                      <span>Prefix: {ev.shortCode}001...</span>
                      <span className="text-blue-600 group-hover:underline">View Roster &rarr;</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: College Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Colleges Represented</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">{data?.collegeStats?.length || 0} Total</span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 flex-1">
            {data?.collegeStats?.map((col) => (
              <div 
                key={col.college}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              >
                <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                  {col.college}
                </span>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {col.total} Participants
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link href="/master" className="text-xs text-blue-600 font-bold hover:underline flex items-center justify-center gap-1">
              Open Master Directory <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
