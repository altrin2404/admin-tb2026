'use client';

import React, { useState } from 'react';
import { 
  UserPlus, 
  CheckCircle2, 
  Printer, 
  RotateCcw, 
  Sparkles 
} from 'lucide-react';
import { sounds } from '@/lib/audio';

export default function SpotRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    department: 'Information Technology',
    year: '3rd Year',
    event1: 'GENBUILD',
    event2: '',
    paymentUtr: 'SPOT-CASH',
    amount: 200,
    isVerified: true,
    isEntered: true,
  });

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    id: string;
    participantId: string;
    teamId: string;
    name: string;
    college: string;
    qrUrl?: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.college.trim()) {
      setError('Name, phone number, and college are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          technicalEvents: formData.event1 ? [formData.event1] : [],
          nonTechnicalEvents: formData.event2 ? [formData.event2] : [],
          entryNotes: 'On-Spot Help Desk Registration',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register');

      const created = data.registration;
      sounds.playSuccess();

      const qrData = `${created.teamId || created.id}|${created.name}|${created.college}`;
      const QRCode = await import('qrcode');
      const qrUrl = await QRCode.toDataURL(qrData, { width: 280, margin: 1 });

      setSuccessData({
        id: created.id,
        participantId: created.participantId || `TB${String(created.participantNumber || 1).padStart(3, '0')}`,
        teamId: created.teamId,
        name: created.name,
        college: created.college,
        qrUrl,
      });

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      sounds.playError();
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      college: '',
      department: 'Information Technology',
      year: '3rd Year',
      event1: 'GENBUILD',
      event2: '',
      paymentUtr: 'SPOT-CASH',
      amount: 200,
      isVerified: true,
      isEntered: true,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <UserPlus className="w-6 h-6 text-blue-600 shrink-0" />
              <span>On-Spot Walk-In Desk</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              ₹200
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rapid walk-in registration with fee tracking and instant entry pass issuance.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Success View with Printable Badge */}
      {successData ? (
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-xs text-center space-y-5 animate-fadeIn">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">Registration Successful!</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Participant registered, payment verified, and marked as ENTERED campus.
            </p>
          </div>

          {/* Badge Display */}
          <div className="max-w-xs mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 shadow-xs space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-800">
              TechBETA 2026 &bull; Spot Pass
            </div>
            {successData.qrUrl && (
              <img src={successData.qrUrl} alt="QR Code" className="w-40 h-40 mx-auto rounded-xl border border-slate-300 p-1 bg-white shadow-xs" />
            )}
            <div className="inline-block px-3 py-1 rounded-lg bg-blue-100 text-blue-900 font-mono font-black text-sm border border-blue-300 shadow-xs">
              {successData.participantId}
            </div>
            {successData.teamId && (
              <div className="font-mono text-xs font-semibold text-slate-500">
                {successData.teamId}
              </div>
            )}
            <div className="text-base font-black text-slate-900">{successData.name}</div>
            <div className="text-xs font-semibold text-slate-600">{successData.college}</div>
            <div className="text-[10px] font-bold text-emerald-700 uppercase pt-1 border-t border-slate-200">
              ENTRY GRANTED &bull; ATTENDANCE LOGGED
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs w-full sm:w-auto"
            >
              <Printer className="w-4 h-4" />
              <span>Print Spot Badge</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Register Next Participant</span>
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          
          <div className="space-y-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="block text-slate-800 font-bold mb-1">Participant Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Mobile & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Mobile Number (10-digit) *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-800 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="participant@example.com (Optional)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* College & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-800 font-bold mb-1">College Name *</label>
                <input
                  type="text"
                  required
                  value={formData.college}
                  onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  placeholder="e.g. SXCCE, Anna Univ, etc."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-800 font-bold mb-1">Department & Year</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. IT / CSE - 3rd Year"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Events Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Technical Event</label>
                <select
                  value={formData.event1}
                  onChange={(e) => setFormData({ ...formData, event1: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="">None</option>
                  <option value="GENBUILD">GENBUILD (GB)</option>
                  <option value="UI-VERSE">UI-VERSE (UV)</option>
                  <option value="LOGIC TRAP">LOGIC TRAP (LT)</option>
                  <option value="IDEA FORGE">IDEA FORGE (IF)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-800 font-bold mb-1">Non-Technical Event</label>
                <select
                  value={formData.event2}
                  onChange={(e) => setFormData({ ...formData, event2: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="">None</option>
                  <option value="BRAND BLITZ">BRAND BLITZ (BB)</option>
                  <option value="BID & BUILD">BID & BUILD (BNB)</option>
                </select>
              </div>
            </div>

            {/* Payment & Fee Calculation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-slate-800 font-bold mb-1">Payment Method / UTR</label>
                <select
                  value={formData.paymentUtr}
                  onChange={(e) => setFormData({ ...formData, paymentUtr: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-semibold"
                >
                  <option value="SPOT-CASH">Spot Cash (₹200 Collected at Desk)</option>
                  <option value="SPOT-UPI">Spot UPI (techbeta2k26@sbi)</option>
                  <option value="COLLEGE-OFFICIAL">SXCCE Host College Entry</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-800 font-bold mb-1">Fee Amount (₹)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-bold"
                />
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                <input
                  type="checkbox"
                  checked={formData.isEntered}
                  onChange={(e) => setFormData({ ...formData, isEntered: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-emerald-800">Grant Instant Gate Entry (Check In Now)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Complete Spot Registration & Issue Pass'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
