'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList, Users, IndianRupee, Clock, CheckCircle2,
  Search, Download, RefreshCw, ShieldCheck, ShieldAlert,
  X, Phone, Mail, QrCode, Edit, Trash2, UserPlus, FileText, Printer,
  CheckCheck, AlertTriangle, Info,
} from 'lucide-react';
import { formatDate, exportToCSV } from '@/lib/utils';

interface Participant {
  id: string;
  participantNumber: number;
  formattedParticipantId: string;
  teamId?: string | null;
  teamName?: string | null;
  name: string;
  email: string;
  phone: string;
  department?: string | null;
  year?: string | null;
  college: string;
  event1?: string | null;
  event2?: string | null;
  technicalEvents?: string | null;
  nonTechnicalEvents?: string | null;
  techEventsList: string[];
  nonTechEventsList: string[];
  allEvents: string[];
  paymentUtr?: string | null;
  amount?: number | null;
  isVerified: boolean;
  isEntered: boolean;
  paymentStatus?: string | null;
  razorpayOrderId?: string | null;
  enteredAt?: string | null;
  entryNotes?: string | null;
  createdAt: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

let _toastCounter = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '12px',
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-end',
        pointerEvents: 'none',
        maxWidth: '340px',
        width: 'calc(100vw - 24px)',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slideInRight"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            border: '1px solid',
            fontSize: '13px',
            fontWeight: 600,
            width: '100%',
            backgroundColor: t.type === 'success' ? '#059669' : t.type === 'error' ? '#dc2626' : '#1e293b',
            borderColor: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#334155',
            color: '#ffffff',
          }}
        >
          <span style={{ flexShrink: 0, marginTop: '1px' }}>
            {t.type === 'success' && <CheckCheck className="w-4 h-4" />}
            {t.type === 'error' && <AlertTriangle className="w-4 h-4" />}
            {t.type === 'info' && <Info className="w-4 h-4" />}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{t.title}</div>
            {t.message && <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85, marginTop: '2px', lineHeight: 1.4 }}>{t.message}</div>}
          </div>
          <button onClick={() => onDismiss(t.id)} style={{ flexShrink: 0, opacity: 0.65, marginLeft: '2px', background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 0 }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function RegistrationsPage() {
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [passModalParticipant, setPassModalParticipant] = useState<Participant | null>(null);
  const [exportingDocx, setExportingDocx] = useState(false);

  // ─ Toast State ─
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = ++_toastCounter;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const fetchParticipants = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch('/api/registrations');
      const data = await res.json();
      if (res.ok) setAllParticipants(data.registrations || []);
    } catch (err) { console.error(err); } finally { if (!isBackground) setLoading(false); }
  };

  useEffect(() => { 
    fetchParticipants(); 
    const interval = setInterval(() => fetchParticipants(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const collegeList = useMemo(() =>
    Array.from(new Set(allParticipants.map((p) => p.college.trim()))).filter(Boolean).sort(),
    [allParticipants]
  );

  const stats = useMemo(() => {
    const validParticipants = allParticipants.filter((p) => p.paymentStatus !== 'INITIALIZED');
    const total = validParticipants.length;
    const confirmed = validParticipants.filter((p) => p.isVerified).length;
    const pending = total - confirmed;
    const totalAmount = validParticipants.reduce((s, p) => s + (p.amount || 200), 0);
    const confirmedAmount = validParticipants.filter((p) => p.isVerified).reduce((s, p) => s + (p.amount || 200), 0);
    return { total, confirmed, pending, totalAmount, confirmedAmount };
  }, [allParticipants]);

  const filteredParticipants = useMemo(() =>
    allParticipants.filter((p) => {
      if (search) {
        const q = search.toLowerCase().trim();
        const ok = p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) ||
          p.phone.includes(q) || p.college.toLowerCase().includes(q) ||
          (p.teamId && p.teamId.toLowerCase().includes(q)) ||
          (p.paymentUtr && p.paymentUtr.toLowerCase().includes(q)) ||
          p.participantNumber.toString() === q;
        if (!ok) return false;
      }
      if (selectedCollege && p.college.toLowerCase() !== selectedCollege.toLowerCase()) return false;
      
      // Hide initialized records unless the INITIALIZED filter is explicitly selected
      if (selectedPaymentStatus !== 'INITIALIZED' && p.paymentStatus === 'INITIALIZED') return false;

      if (selectedPaymentStatus === 'verified' && !p.isVerified) return false;
      if (selectedPaymentStatus === 'unverified' && p.isVerified) return false;
      if (selectedPaymentStatus === 'INITIALIZED' && !p.razorpayOrderId) return false;
      if (selectedPaymentStatus === 'PENDING' && p.paymentStatus !== 'PENDING') return false;
      if (selectedPaymentStatus === 'PAID' && p.paymentStatus !== 'PAID') return false;
      return true;
    }),
    [allParticipants, search, selectedCollege, selectedPaymentStatus]
  );

  const sendConfirmationEmail = async (p: Participant) => {
    showToast('info', 'Sending email...', `Dispatching confirmation to ${p.email}`);
    try {
      const res = await fetch(`/api/registrations/${p.id}/send-email`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Email Sent!', `Confirmation mail with ${p.formattedParticipantId} delivered to ${p.email}`);
      } else {
        showToast('error', 'Email Failed', data.error || 'Could not send confirmation email');
      }
    } catch {
      showToast('error', 'Email Failed', 'Network error — could not reach mail server');
    }
  };

  const toggleVerified = async (p: Participant) => {
    const willBeVerified = !p.isVerified;
    setAllParticipants((prev) => prev.map((item) => item.id === p.id ? { ...item, isVerified: willBeVerified } : item));
    if (willBeVerified) {
      showToast('success', 'Payment Verified!', `${p.formattedParticipantId} – ${p.name} confirmed`);
    } else {
      showToast('info', 'Marked as Pending', `${p.formattedParticipantId} – ${p.name} set back to pending`);
    }
    try {
      const res = await fetch(`/api/registrations/${p.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: willBeVerified }),
      });
      if (!res.ok) { fetchParticipants(); showToast('error', 'Update Failed', 'Could not save verification status'); }
    } catch { fetchParticipants(); showToast('error', 'Update Failed', 'Network error'); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const deleted = allParticipants.find((p) => p.id === deletingId);
    setAllParticipants((prev) => prev.filter((p) => p.id !== deletingId));
    setDeletingId(null);
    try {
      const res = await fetch(`/api/registrations/${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Participant Deleted', deleted ? `${deleted.name} removed` : 'Record removed');
      } else {
        fetchParticipants();
        showToast('error', 'Delete Failed', 'Could not remove the participant');
      }
    } catch { fetchParticipants(); showToast('error', 'Delete Failed', 'Network error'); }
  };

  const handleExportCSV = () => {
    const data = filteredParticipants.map((p, index) => ({
      'No': index + 1, 'ID': p.formattedParticipantId || `TB${String(p.participantNumber).padStart(3, '0')}`,
      'Name': p.name, 'College': p.college, 'Dept': p.department || '',
      'Phone': p.phone, 'Email': p.email, 'Events': p.allEvents.join('; '),
      'UTR': p.paymentUtr || 'N/A', 'Amount': p.amount || 200,
      'Status': p.isVerified ? 'Confirmed' : 'Pending',
      'Registered': formatDate(p.createdAt),
    }));
    exportToCSV('TechBETA-2026-Registrations', data);
  };

  const handleExportDocx = async () => {
    try {
      setExportingDocx(true);
      const { exportMasterSheetDocx } = await import('@/lib/docxExport');
      await exportMasterSheetDocx(filteredParticipants);
    } catch (err) { /* silent fail or handle */ } finally { setExportingDocx(false); }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <ClipboardList className="w-6 h-6 text-violet-600" />
              Registrations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-50 text-violet-700 border border-violet-200">
              {filteredParticipants.length} of {allParticipants.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Overview of all participant registrations with payment status tracking.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button onClick={() => setIsAddingNew(true)} className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95">
            <UserPlus className="w-4 h-4" /><span>Add Participant</span>
          </button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={handleExportCSV} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all active:scale-95">
              <Download className="w-4 h-4 text-slate-600" /><span>CSV</span>
            </button>
            <button onClick={handleExportDocx} disabled={exportingDocx} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200 transition-all shadow-xs active:scale-95">
              <FileText className={`w-4 h-4 text-violet-600 ${exportingDocx ? 'animate-bounce' : ''}`} />
              <span>{exportingDocx ? '...' : 'DOCX'}</span>
            </button>
            <button onClick={() => fetchParticipants(false)} disabled={loading} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all active:scale-95 shrink-0">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Participants */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-5 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</span>
          )}
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Participants</p>
        </div>

        {/* Total Amount */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-5 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg" />
          ) : (
            <span className="text-2xl sm:text-3xl font-black text-slate-900">&#8377;{stats.totalAmount.toLocaleString('en-IN')}</span>
          )}
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">&#8377;{stats.confirmedAmount.toLocaleString('en-IN')} confirmed</p>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-xs p-3.5 sm:p-5 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">Pending</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-amber-50 animate-pulse rounded-lg" />
          ) : (
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{stats.pending}</span>
          )}
          <p className="text-[10px] sm:text-[11px] text-amber-400 font-medium truncate">Awaiting verify</p>
        </div>

        {/* Confirmed */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs p-3.5 sm:p-5 flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">Confirmed</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-emerald-50 animate-pulse rounded-lg" />
          ) : (
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.confirmed}</span>
          )}
          <p className="text-[10px] sm:text-[11px] text-emerald-500 font-medium truncate">
            {stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}% verified` : 'Verified'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Name, Phone, UTR, College..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select value={selectedCollege} onChange={(e) => setSelectedCollege(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-violet-500 focus:bg-white">
            <option value="">All Colleges ({collegeList.length})</option>
            {collegeList.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={selectedPaymentStatus} onChange={(e) => setSelectedPaymentStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-violet-500 focus:bg-white">
            <option value="">All Registrations</option>
            <option value="verified">Verified (Confirmed)</option>
            <option value="unverified">Unverified</option>
            <option value="PAID">Paid via Razorpay</option>
            <option value="INITIALIZED">Initialized (Checkout opened)</option>
          </select>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-14 text-center font-mono">#</th>
                <th className="py-3 px-4 font-mono text-violet-700">Reg ID</th>
                <th className="py-3 px-4">Participant &amp; Contact</th>
                <th className="py-3 px-4">College &amp; Dept</th>
                <th className="py-3 px-4">Events</th>
                <th className="py-3 px-3 font-mono">Amount &amp; Type</th>
                <th className="py-3 px-3 text-center">Payment</th>
                <th className="py-3 px-3">Registered</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && allParticipants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-violet-600 mb-2" />
                    <span>Loading registrations...</span>
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No participants found.</p>
                  </td>
                </tr>
              ) : filteredParticipants.map((p, index) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm bg-slate-50/80">{index + 1}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <div className="inline-block px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 font-bold border border-violet-200">
                      {p.formattedParticipantId || `TB${String(p.participantNumber).padStart(3, '0')}`}
                    </div>
                    {p.teamId && <div className="text-[10px] text-slate-500 font-sans mt-0.5">{p.teamId}</div>}
                    {p.teamName && <div className="text-[10px] text-slate-400 font-sans">{p.teamName}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{p.phone}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="truncate max-w-[130px]">{p.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{p.college}</div>
                    <div className="text-slate-500 text-[11px] mt-0.5">{p.department || 'IT'} {p.year ? `(${p.year})` : ''}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {p.allEvents.length > 0 ? p.allEvents.map((ev, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">{ev}</span>
                      )) : <span className="text-slate-400 italic">No event</span>}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <span className="text-slate-800 font-medium">&#8377;{p.amount || 250}</span>
                    <div className="text-[10px] text-slate-500 font-sans uppercase font-bold text-blue-600 mt-0.5">Razorpay</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => toggleVerified(p)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center justify-center gap-1 mx-auto transition-all ${p.isVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'}`}
                    >
                      {p.isVerified ? (
                        <><ShieldCheck className="w-3.5 h-3.5" /><span>Confirmed</span></>
                      ) : (
                        <><ShieldAlert className="w-3.5 h-3.5" /><span>Pending</span></>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-[11px] font-mono text-slate-500">{formatDate(p.createdAt)}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => sendConfirmationEmail(p)} title="Send / Resend Confirmation Email" className="p-1.5 rounded-lg bg-slate-100 hover:bg-violet-50 text-violet-600 border border-slate-200 transition-colors"><Mail className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setPassModalParticipant(p)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-violet-50 text-violet-600 border border-slate-200 transition-colors" title="View Pass"><QrCode className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingParticipant(p)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeletingId(p.id)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading && allParticipants.length === 0 ? (
            <div className="py-12 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-violet-600 mb-2" /><span>Loading...</span></div>
          ) : filteredParticipants.length === 0 ? (
            <div className="py-12 text-center"><Users className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="font-semibold text-slate-700">No participants found.</p></div>
          ) : filteredParticipants.map((p, index) => (
            <div key={p.id} className="p-4 bg-white">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="h-5 px-1.5 rounded bg-slate-100 font-mono font-black text-[11px] text-slate-800 flex items-center border border-slate-200 shrink-0">#{index + 1}</span>
                  <span className="font-mono text-xs font-bold text-violet-800 shrink-0">
                    {p.formattedParticipantId || `TB${String(p.participantNumber).padStart(3, '0')}`}
                  </span>
                  {p.teamId && (
                    <span className="font-mono text-[10px] text-slate-500 truncate min-w-0">
                      ({p.teamId})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => sendConfirmationEmail(p)} title="Send / Resend Confirmation Email" className="p-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 active:scale-90"><Mail className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setPassModalParticipant(p)} className="p-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 active:scale-90" title="View Pass"><QrCode className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingParticipant(p)} className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 active:scale-90" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeletingId(p.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 active:scale-90" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="mb-2">
                <div className="text-base font-bold text-slate-900">{p.name}</div>
                {p.teamName && <div className="text-xs font-semibold text-violet-600 mt-0.5">Team: {p.teamName}</div>}
                <div className="text-xs text-slate-600 mt-1"><strong>{p.college}</strong> &bull; {p.department || 'IT'} {p.year ? `(${p.year})` : ''}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs mb-2 font-mono">
                <a href={`tel:${p.phone}`} className="text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-bold active:scale-95"><Phone className="w-3.5 h-3.5" />{p.phone}</a>
                {p.email && <a href={`mailto:${p.email}`} className="text-slate-600 flex items-center gap-1 truncate max-w-[200px] bg-slate-50 px-2 py-1 rounded-lg border border-slate-200"><Mail className="w-3.5 h-3.5 text-slate-400" /><span className="truncate">{p.email}</span></a>}
              </div>
              {p.allEvents.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.allEvents.map((ev, i) => <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">{ev}</span>)}
                </div>
              )}
              <div className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 mb-3">
                <div className="flex items-center gap-1.5"><span className="text-slate-500">Type:</span><span className="font-mono font-bold text-blue-600">RAZORPAY</span></div>
                <span className="font-bold">&#8377;{p.amount || 250}</span>
              </div>
              <button onClick={() => toggleVerified(p)} className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.99] ${p.isVerified ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                {p.isVerified ? <><ShieldCheck className="w-4 h-4" />CONFIRMED &bull; PAYMENT VERIFIED</> : <><ShieldAlert className="w-4 h-4 text-amber-700" />Pending &mdash; Tap to Confirm</>}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(editingParticipant || isAddingNew) && (
        <RegistrationFormModal
          participant={editingParticipant}
          onClose={() => { setEditingParticipant(null); setIsAddingNew(false); }}
          onSave={() => { setEditingParticipant(null); setIsAddingNew(false); fetchParticipants(); }}
        />
      )}

      {/* Delete Confirm */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 border border-slate-200 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-600" />Delete Participant</h3>
            <p className="text-xs text-slate-600">Are you sure? This permanently removes the record.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingId(null)} className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700">Cancel</button>
              <button onClick={handleDelete} className="px-3 py-1.5 rounded-xl bg-red-600 text-xs font-bold text-white">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Pass Modal */}
      {passModalParticipant && (
        <PassModal
          participant={passModalParticipant}
          onClose={() => setPassModalParticipant(null)}
          onSendEmail={sendConfirmationEmail}
        />
      )}
    </div>
    </>
  );
}

// Registration Form Modal
function RegistrationFormModal({
  participant, onClose, onSave,
}: {
  participant: Participant | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!participant;
  const [formData, setFormData] = useState({
    name: participant?.name || '', email: participant?.email || '', phone: participant?.phone || '',
    college: participant?.college || '', department: participant?.department || '', year: participant?.year || '3rd Year',
    teamId: participant?.teamId || '',
    event1: participant?.techEventsList?.[0] || participant?.event1 || 'GENBUILD',
    event2: participant?.nonTechEventsList?.[0] || participant?.event2 || '',
    paymentUtr: participant?.paymentUtr || '', amount: participant?.amount || 200,
    isVerified: participant?.isVerified ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.college || !formData.phone) { setErr('Name, college, and mobile are required.'); return; }
    setSaving(true); setErr('');
    try {
      const url = isEdit ? `/api/registrations/${participant.id}` : '/api/registrations';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, technicalEvents: formData.event1 ? [formData.event1] : [], nonTechnicalEvents: formData.event2 ? [formData.event2] : [] }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save'); }
      onSave();
    } catch (error: unknown) { setErr(error instanceof Error ? error.message : 'Error saving'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white p-4 sm:p-6 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-violet-600" />
            {isEdit ? 'Edit Registration' : 'New Registration'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs my-2">{err}</div>}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1 py-2">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white text-xs sm:text-sm" placeholder="e.g. John Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-slate-700 font-bold mb-1">Mobile *</label><input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white font-mono text-xs" /></div>
            <div><label className="block text-slate-700 font-bold mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white text-xs" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-slate-700 font-bold mb-1">College *</label><input type="text" required value={formData.college} onChange={(e) => setFormData({ ...formData, college: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white text-xs" /></div>
            <div><label className="block text-slate-700 font-bold mb-1">Dept &amp; Year</label><input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-500 focus:bg-white text-xs" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Technical Event</label>
              <select value={formData.event1} onChange={(e) => setFormData({ ...formData, event1: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-500 text-xs">
                <option value="">None</option>
                <option value="GENBUILD">GENBUILD</option>
                <option value="UI-VERSE">UI-VERSE</option>
                <option value="LOGIC TRAP">LOGIC TRAP</option>
                <option value="IDEA FORGE">IDEA FORGE</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Non-Tech Event</label>
              <select value={formData.event2} onChange={(e) => setFormData({ ...formData, event2: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-500 text-xs">
                <option value="">None</option>
                <option value="BRAND BLITZ">BRAND BLITZ</option>
                <option value="BID & BUILD">BID & BUILD</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-slate-700 font-bold mb-1">Payment UTR</label><input type="text" value={formData.paymentUtr} onChange={(e) => setFormData({ ...formData, paymentUtr: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-500 font-mono text-xs" placeholder="UPI UTR or CASH" /></div>
            <div><label className="block text-slate-700 font-bold mb-1">Amount (&#8377;)</label><input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-violet-500 font-mono text-xs" /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium pt-1">
            <input type="checkbox" checked={formData.isVerified} onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-violet-600" />
            <span>Payment Confirmed</span>
          </label>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs">{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Pass Modal
function PassModal({ participant, onClose, onSendEmail }: { participant: Participant; onClose: () => void; onSendEmail?: (p: Participant) => void; }) {
  const [qrUrl, setQrUrl] = useState('');
  useEffect(() => {
    const qrData = `${participant.teamId || participant.id}|${participant.name}|${participant.college}`;
    import('qrcode').then((QRCode) =>
      QRCode.toDataURL(qrData, { width: 260, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }).then(setQrUrl)
    );
  }, [participant]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-center">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <span className="text-xs font-mono font-bold text-violet-700">REGISTRATION PASS</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-violet-800">St. Xavier&apos;s Catholic College of Engg.</div>
          <div className="text-lg font-black tracking-tight text-slate-900 border-b border-slate-200 pb-2">TechBETA 2026</div>
          <div className="flex justify-center my-2">
            {qrUrl ? <img src={qrUrl} alt="QR" className="w-40 h-40 rounded-xl border border-slate-300 p-1 bg-white" /> : <div className="w-40 h-40 bg-slate-200 rounded-xl animate-pulse" />}
          </div>
          <div className="space-y-0.5">
            <div className="font-mono text-xs font-black text-violet-800">#{participant.participantNumber} &bull; {participant.formattedParticipantId || `TB${String(participant.participantNumber).padStart(3, '0')}`} {participant.teamId ? `(${participant.teamId})` : ''}</div>
            <div className="text-base font-black text-slate-900">{participant.name}</div>
            <div className="text-xs font-semibold text-slate-600">{participant.college}</div>
            <div className="text-[11px] text-slate-500">{participant.allEvents.join(', ') || 'Event Pass'}</div>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] font-mono font-bold">
            <span>TYPE: RAZORPAY</span>
            <span className={participant.isVerified ? 'text-emerald-700' : 'text-amber-600'}>{participant.isVerified ? 'CONFIRMED' : 'PENDING'}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {onSendEmail && (
            <button
              onClick={() => onSendEmail(participant)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-xs border border-violet-200 active:scale-95"
              title="Send confirmation email with Master ID and PDF download link"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Pass</span>
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs active:scale-95"><Printer className="w-3.5 h-3.5" />Print Pass</button>
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs active:scale-95">Close</button>
        </div>
      </div>
    </div>
  );
}
