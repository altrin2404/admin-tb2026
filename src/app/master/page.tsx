'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  FileText,
  UserPlus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  ShieldCheck, 
  ShieldAlert, 
  QrCode, 
  RefreshCw, 
  Clock, 
  Printer, 
  X,
  Phone,
  Mail,
  CheckCheck,
  AlertTriangle,
  Info
} from 'lucide-react';
import { formatDate, formatTimeOnly, exportToCSV } from '@/lib/utils';
import { sounds } from '@/lib/audio';

interface Participant {
  id: string;
  participantNumber: number; // 1, 2, 3...
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
  enteredAt?: string | null;
  entryNotes?: string | null;
  createdAt: string;
}

// ─── Toast Types ───
interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

let _toastCounter = 0;

// ─── Toast Container — must be rendered OUTSIDE any element that uses CSS
//     transforms (like animate-fadeIn), as transforms break position:fixed.
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
            backgroundColor:
              t.type === 'success' ? '#059669'
              : t.type === 'error' ? '#dc2626'
              : '#1e293b',
            borderColor:
              t.type === 'success' ? '#10b981'
              : t.type === 'error' ? '#ef4444'
              : '#334155',
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
            {t.message && (
              <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85, marginTop: '2px', lineHeight: 1.4 }}>
                {t.message}
              </div>
            )}
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            style={{ flexShrink: 0, opacity: 0.65, marginLeft: '2px', background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 0 }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}


export default function MasterSheetPage() {
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedEntryStatus, setSelectedEntryStatus] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [passModalParticipant, setPassModalParticipant] = useState<Participant | null>(null);

  // Fast single fetch on mount
  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/registrations');
      const data = await res.json();
      if (res.ok) {
        setAllParticipants(data.registrations || []);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  // Unique colleges extracted for filter dropdown
  const collegeList = useMemo(() => {
    return Array.from(new Set(allParticipants.map((p) => p.college.trim()))).filter(Boolean).sort();
  }, [allParticipants]);

  // INSTANT 0ms In-Memory Client-Side Filtering
  const filteredParticipants = useMemo(() => {
    return allParticipants.filter((p) => {
      if (search) {
        const q = search.toLowerCase().trim();
        const matches =
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.college.toLowerCase().includes(q) ||
          (p.teamId && p.teamId.toLowerCase().includes(q)) ||
          (p.paymentUtr && p.paymentUtr.toLowerCase().includes(q)) ||
          p.participantNumber.toString() === q;
        if (!matches) return false;
      }

      if (selectedEvent) {
        const hasEvent = p.allEvents.some((ev) => ev.toLowerCase().includes(selectedEvent.toLowerCase()));
        if (!hasEvent) return false;
      }

      if (selectedCollege && p.college.toLowerCase() !== selectedCollege.toLowerCase()) {
        return false;
      }

      if (selectedEntryStatus === 'entered' && !p.isEntered) return false;
      if (selectedEntryStatus === 'not_entered' && p.isEntered) return false;

      if (selectedPaymentStatus === 'verified' && !p.isVerified) return false;
      if (selectedPaymentStatus === 'pending' && p.isVerified) return false;

      return true;
    });
  }, [allParticipants, search, selectedEvent, selectedCollege, selectedEntryStatus, selectedPaymentStatus]);

  // ─── Toast State ───
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = ++_toastCounter;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const sendConfirmationEmail = async (p: Participant) => {
    showToast('info', 'Sending email...', `Dispatching confirmation to ${p.email}`);
    try {
      const res = await fetch(`/api/registrations/${p.id}/send-email`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        sounds.playSuccess();
        showToast('success', 'Email Sent!', `Confirmation mail with ${p.formattedParticipantId} delivered to ${p.email}`);
      } else {
        sounds.playError();
        showToast('error', 'Email Failed', data.error || 'Could not send confirmation email');
      }
    } catch {
      showToast('error', 'Email Failed', 'Network error — could not reach mail server');
    }
  };

  // Toggle single payment verified
  const toggleVerified = async (p: Participant) => {
    const willBeVerified = !p.isVerified;
    // Optimistic UI update
    setAllParticipants((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, isVerified: willBeVerified } : item))
    );
    if (willBeVerified) {
      showToast('success', 'Payment Verified!', `${p.formattedParticipantId} – ${p.name} marked as verified`);
    } else {
      showToast('info', 'Marked as Pending', `${p.formattedParticipantId} – ${p.name} set back to pending`);
    }
    try {
      const res = await fetch(`/api/registrations/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: willBeVerified }),
      });
      if (res.ok) {
        sounds.playSuccess();
      } else {
        fetchParticipants(); // revert on fail
        showToast('error', 'Update Failed', 'Could not change verification status');
      }
    } catch {
      fetchParticipants();
      showToast('error', 'Update Failed', 'Network error — please try again');
    }
  };

  // Toggle single entry check-in
  const toggleEntry = async (p: Participant) => {
    const nextEntered = !p.isEntered;
    const nextEnteredAt = nextEntered ? new Date().toISOString() : null;

    // Optimistic UI update
    setAllParticipants((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, isEntered: nextEntered, enteredAt: nextEnteredAt } : item))
    );

    if (nextEntered) {
      showToast('success', 'Entry Checked In!', `${p.name} (${p.formattedParticipantId}) marked as entered`);
    } else {
      showToast('info', 'Entry Undone', `${p.name} entry status has been reset`);
    }

    try {
      const endpoint = nextEntered ? '/api/entry/checkin' : '/api/entry/undo';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id }),
      });
      if (res.ok) {
        if (nextEntered) sounds.playSuccess();
      } else {
        fetchParticipants();
        showToast('error', 'Check-In Failed', 'Could not update entry status');
      }
    } catch {
      fetchParticipants();
      showToast('error', 'Check-In Failed', 'Network error — please try again');
    }
  };

  // Delete participant
  const handleDelete = async () => {
    if (!deletingId) return;
    const deleted = allParticipants.find((p) => p.id === deletingId);
    setAllParticipants((prev) => prev.filter((p) => p.id !== deletingId));
    setDeletingId(null);
    try {
      const res = await fetch(`/api/registrations/${deletingId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Participant Deleted', deleted ? `${deleted.name} has been removed` : 'Record removed successfully');
      } else {
        fetchParticipants();
        showToast('error', 'Delete Failed', 'Could not remove the participant');
      }
    } catch (err) {
      console.error(err);
      fetchParticipants();
      showToast('error', 'Delete Failed', 'Network error — please try again');
    }
  };

  // Batch action handler
  const handleBatchAction = async (action: 'verify' | 'unverify' | 'checkin' | 'checkout' | 'delete') => {
    if (!selectedIds.length) return;
    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedIds.length} participants?`)) {
      return;
    }
    const count = selectedIds.length;
    const actionLabels: Record<string, string> = {
      verify: 'Verified', unverify: 'Unmarked', checkin: 'Checked In', checkout: 'Checked Out', delete: 'Deleted'
    };
    try {
      const res = await fetch('/api/registrations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchParticipants();
        showToast('success', `Bulk Action Done`, `${count} participant(s) ${actionLabels[action] || action}`);
      } else {
        showToast('error', 'Batch Action Failed', 'Server returned an error — please retry');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Batch Action Failed', 'Network error — please try again');
    }
  };

  // Select all toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredParticipants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredParticipants.map((p) => p.id));
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const exportData = filteredParticipants.map((p) => ({
      "Participant No": p.participantNumber,
      "Participant ID": p.formattedParticipantId,
      "Team ID": p.teamId || "N/A",
      "Name": p.name,
      "College": p.college,
      "Department": p.department || "",
      "Year": p.year || "",
      "Phone": p.phone,
      "Email": p.email,
      "Technical Events": p.techEventsList.join("; "),
      "Non-Technical Events": p.nonTechEventsList.join("; "),
      "Payment UTR": p.paymentUtr || "N/A",
      "Amount": p.amount || 200,
      "Payment Verified": p.isVerified ? "YES" : "NO",
      "Entered Campus": p.isEntered ? "YES" : "NO",
      "Entered At": p.enteredAt ? formatDate(p.enteredAt) : "N/A",
      "Registered On": formatDate(p.createdAt),
    }));
    exportToCSV("TechBETA-2026-MasterSheet", exportData);
  };

  // Export to Word (.docx)
  const [exportingDocx, setExportingDocx] = useState(false);
  const handleExportDocx = async () => {
    try {
      setExportingDocx(true);
      const { exportMasterSheetDocx } = await import('@/lib/docxExport');
      await exportMasterSheetDocx(filteredParticipants);
    } catch (err) {
      console.error('Failed to export DOCX:', err);
    } finally {
      setExportingDocx(false);
    }
  };

  return (
    <>
      {/* Toast notifications — MUST be outside animate-fadeIn wrapper (transforms break position:fixed) */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="space-y-6 animate-fadeIn">
      
      {/* Top Title & Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Users className="w-6 h-6 text-blue-600" />
              Master Participant Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {filteredParticipants.length} of {allParticipants.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every registered participant assigned clean sequential IDs (1, 2, 3...) with instant live filtering and 1-click status controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsAddingNew(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Participant</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all active:scale-95"
              title="Export spreadsheet format"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleExportDocx}
              disabled={exportingDocx}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-all shadow-xs active:scale-95"
              title="Export official Microsoft Word printable attendance roster"
            >
              <FileText className={`w-4 h-4 text-blue-600 ${exportingDocx ? 'animate-bounce' : ''}`} />
              <span>{exportingDocx ? '...' : 'DOCX'}</span>
            </button>

            <button
              onClick={fetchParticipants}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all active:scale-95 shrink-0"
              title="Refresh from Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Instant Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box with 0ms Live Filter */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Instant search by Name, #, Phone, UTR, College..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Event Filter */}
          <div>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Events (6)</option>
              <option value="GENBUILD">GENBUILD</option>
              <option value="UI-VERSE">UI-VERSE</option>
              <option value="LOGIC TRAP">LOGIC TRAP</option>
              <option value="IDEA FORGE">IDEA FORGE</option>
              <option value="BRAND BLITZ">BRAND BLITZ</option>
              <option value="BID & BUILD">BID & BUILD</option>
            </select>
          </div>

          {/* College Filter */}
          <div>
            <select
              value={selectedCollege}
              onChange={(e) => setSelectedCollege(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Colleges ({collegeList.length})</option>
              {collegeList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Entry Status Filter */}
          <div>
            <select
              value={selectedEntryStatus}
              onChange={(e) => setSelectedEntryStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Entry Status</option>
              <option value="entered">Entered (Present)</option>
              <option value="not_entered">Not Yet Entered</option>
            </select>
          </div>

        </div>

        {/* Batch Operations Bar */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs animate-fadeIn">
            <span className="font-bold text-blue-900">
              {selectedIds.length} participant(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBatchAction('verify')}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-xs"
              >
                Mark Verified
              </button>
              <button
                onClick={() => handleBatchAction('checkin')}
                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-xs"
              >
                Check-In (Entry)
              </button>
              <button
                onClick={() => handleBatchAction('delete')}
                className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 shadow-xs"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table & Mobile Cards */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
        {/* Desktop Table (Visible on md+ screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredParticipants.length > 0 && selectedIds.length === filteredParticipants.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3 px-3 w-14 text-center font-mono">#</th>
                <th className="py-3 px-4 font-mono text-blue-700">Team / Reg ID</th>
                <th className="py-3 px-4">Participant Name & Contact</th>
                <th className="py-3 px-4">College & Dept</th>
                <th className="py-3 px-4">Events</th>
                <th className="py-3 px-3 font-mono">UTR & Fee</th>
                <th className="py-3 px-3 text-center">Payment</th>
                <th className="py-3 px-3 text-center">Gate Entry</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && allParticipants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading participants from Supabase...</span>
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No participants found matching your search.</p>
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedIds((prev) =>
                              isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                            );
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Sequential ID (1, 2, 3...) */}
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm bg-slate-50/80">
                        {p.participantNumber}
                      </td>

                      {/* Participant ID & Team */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200">
                          {p.formattedParticipantId || `TB${String(p.participantNumber).padStart(3, '0')}`}
                        </div>
                        {p.teamId && (
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5">{p.teamId}</div>
                        )}
                        {p.teamName && (
                          <div className="text-[10px] text-slate-400 font-sans">{p.teamName}</div>
                        )}
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                          <span className="font-mono">{p.phone}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="truncate max-w-[150px]">{p.email}</span>
                        </div>
                      </td>

                      {/* College & Dept */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{p.college}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {p.department || 'IT'} {p.year ? `(${p.year})` : ''}
                        </div>
                      </td>

                      {/* Registered Events */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.allEvents.length > 0 ? (
                            p.allEvents.map((ev, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {ev}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">No event</span>
                          )}
                        </div>
                      </td>

                      {/* Payment UTR */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="text-slate-800 font-medium">{p.paymentUtr || 'N/A'}</span>
                        <div className="text-[10px] text-slate-500 font-sans">₹{p.amount || 200}</div>
                      </td>

                      {/* Payment Verified Inline Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleVerified(p)}
                          title="Click to toggle payment verification"
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center justify-center gap-1 mx-auto transition-all ${
                            p.isVerified
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          {p.isVerified ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Gate Entry Inline Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleEntry(p)}
                          title={p.isEntered ? `Entered at ${formatDate(p.enteredAt)}. Click to undo.` : 'Click to check in'}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center justify-center gap-1 mx-auto transition-all ${
                            p.isEntered
                              ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-800'
                          }`}
                        >
                          {p.isEntered ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>ENTERED</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Not Entered</span>
                            </>
                          )}
                        </button>
                        {p.isEntered && p.enteredAt && (
                          <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                            {formatTimeOnly(p.enteredAt)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => sendConfirmationEmail(p)}
                            title="Send / Resend Confirmation Email"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-600 border border-slate-200 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPassModalParticipant(p)}
                            title="View / Print Entry Pass"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-600 border border-slate-200 transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingParticipant(p)}
                            title="Edit participant"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(p.id)}
                            title="Delete participant"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Participant Cards (Optimized for Phones and Small Tablets) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading && allParticipants.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <span>Loading participants from Supabase...</span>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No participants found matching your search.</p>
            </div>
          ) : (
            filteredParticipants.map((p) => {
              const isSelected = selectedIds.includes(p.id);

              return (
                <div
                  key={p.id}
                  className={`p-4 transition-colors ${
                    isSelected ? 'bg-blue-50/60' : 'bg-white'
                  }`}
                >
                  {/* Top Bar: S.No + Reg ID + Multi-Select Checkbox + Actions */}
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedIds((prev) =>
                            isSelected ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          );
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                      />
                      <span className="h-5 px-1.5 rounded bg-slate-100 font-mono font-black text-[11px] text-slate-800 flex items-center justify-center border border-slate-200 shrink-0">
                        #{p.participantNumber}
                      </span>
                      <span className="font-mono text-xs font-bold text-blue-800 shrink-0">
                        {p.formattedParticipantId || `TB${String(p.participantNumber).padStart(3, '0')}`}
                      </span>
                      {p.teamId && (
                        <span className="font-mono text-[10px] text-slate-500 truncate min-w-0">
                          ({p.teamId})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => sendConfirmationEmail(p)}
                        title="Send / Resend Confirmation Email"
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 active:scale-90"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPassModalParticipant(p)}
                        title="View / Print Entry Pass"
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 active:scale-90"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingParticipant(p)}
                        title="Edit participant"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 active:scale-90"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(p.id)}
                        title="Delete participant"
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-90"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Name & College Details */}
                  <div className="mb-2">
                    <div className="text-base font-bold text-slate-900 leading-tight">
                      {p.name}
                    </div>
                    {p.teamName && (
                      <div className="text-xs font-semibold text-blue-600 mt-0.5">
                        Team: {p.teamName}
                      </div>
                    )}
                    <div className="text-xs text-slate-600 mt-1">
                      <strong className="text-slate-800">{p.college}</strong> &bull;{' '}
                      <span className="text-slate-500">
                        {p.department || 'IT'} {p.year ? `(${p.year})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Contact Links */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs mb-2.5 font-mono">
                    <a
                      href={`tel:${p.phone}`}
                      className="text-blue-700 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-bold"
                    >
                      <Phone className="w-3 h-3 text-blue-600" />
                      <span>{p.phone}</span>
                    </a>
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        className="text-slate-600 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                      >
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{p.email}</span>
                      </a>
                    )}
                  </div>

                  {/* Registered Events Chips */}
                  {p.allEvents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.allEvents.map((ev, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Fee & Payment Info */}
                  <div className="flex items-center justify-between text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px]">UTR / Ref:</span>
                      <span className="font-mono font-bold text-slate-900">{p.paymentUtr || 'N/A'}</span>
                    </div>
                    <span className="font-bold text-slate-800">₹{p.amount || 200}</span>
                  </div>

                  {/* Fast Action Buttons: Check In & Payment Verified */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => toggleEntry(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                        p.isEntered
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {p.isEntered ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>CHECKED IN</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>Check In Gate</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => toggleVerified(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                        p.isVerified
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                      }`}
                    >
                      {p.isVerified ? (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>VERIFIED</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-amber-700" />
                          <span>Verify UTR</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Participant Modal */}
      {(editingParticipant || isAddingNew) && (
        <ParticipantFormModal
          participant={editingParticipant}
          onClose={() => {
            setEditingParticipant(null);
            setIsAddingNew(false);
          }}
          onSave={(isEdit) => {
            setEditingParticipant(null);
            setIsAddingNew(false);
            fetchParticipants();
            showToast('success', isEdit ? 'Participant Updated' : 'Participant Added', isEdit ? 'Details saved successfully' : 'New registration created successfully');
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 border border-slate-200 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Participant
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove this participant? This action will permanently remove the record from Supabase.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry Pass & QR Modal */}
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

// Light Themed Form Modal
function ParticipantFormModal({
  participant,
  onClose,
  onSave,
}: {
  participant: Participant | null;
  onClose: () => void;
  onSave: (isEdit: boolean) => void;
}) {
  const isEdit = !!participant;
  const [formData, setFormData] = useState({
    name: participant?.name || '',
    email: participant?.email || '',
    phone: participant?.phone || '',
    college: participant?.college || '',
    department: participant?.department || '',
    year: participant?.year || '3rd Year',
    teamId: participant?.teamId || '',
    event1: participant?.techEventsList?.[0] || participant?.event1 || 'GENBUILD',
    event2: participant?.nonTechEventsList?.[0] || participant?.event2 || '',
    paymentUtr: participant?.paymentUtr || '',
    amount: participant?.amount || 200,
    isVerified: participant?.isVerified ?? true,
    isEntered: participant?.isEntered ?? false,
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.college || !formData.phone) {
      setErr('Name, college, and mobile number are required.');
      return;
    }

    setSaving(true);
    setErr('');

    try {
      const url = isEdit ? `/api/registrations/${participant.id}` : '/api/registrations';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        technicalEvents: formData.event1 ? [formData.event1] : [],
        nonTechnicalEvents: formData.event2 ? [formData.event2] : [],
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save');
      }

      onSave(isEdit);
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'Error saving participant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white p-4 sm:p-6 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            {isEdit ? 'Edit Participant Details' : 'Add New Participant'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {err && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs my-2 shrink-0">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1 py-2">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs sm:text-sm"
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono text-xs sm:text-sm"
                placeholder="10-digit mobile"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs sm:text-sm"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">College Name *</label>
              <input
                type="text"
                required
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs sm:text-sm"
                placeholder="e.g. SXCCE"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Department & Year</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs sm:text-sm"
                placeholder="e.g. IT - 3rd Year"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Technical Event</label>
              <select
                value={formData.event1}
                onChange={(e) => setFormData({ ...formData, event1: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs sm:text-sm"
              >
                <option value="">None</option>
                <option value="GENBUILD">GENBUILD (GB)</option>
                <option value="UI-VERSE">UI-VERSE (UV)</option>
                <option value="LOGIC TRAP">LOGIC TRAP (LT)</option>
                <option value="IDEA FORGE">IDEA FORGE (IF)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Non-Technical Event</label>
              <select
                value={formData.event2}
                onChange={(e) => setFormData({ ...formData, event2: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs sm:text-sm"
              >
                <option value="">None</option>
                <option value="BRAND BLITZ">BRAND BLITZ (BB)</option>
                <option value="BID & BUILD">BID & BUILD (BNB)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment UTR / Ref</label>
              <input
                type="text"
                value={formData.paymentUtr}
                onChange={(e) => setFormData({ ...formData, paymentUtr: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono text-xs sm:text-sm"
                placeholder="UPI UTR number or CASH"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Amount (₹)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={formData.isVerified}
                onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Payment Verified</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={formData.isEntered}
                onChange={(e) => setFormData({ ...formData, isEntered: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Gate Checked-In (Entered)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs text-xs sm:text-sm transition-all"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Participant' : 'Create Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Printable Pass Modal
function PassModal({
  participant,
  onClose,
  onSendEmail,
}: {
  participant: Participant;
  onClose: () => void;
  onSendEmail?: (p: Participant) => void;
}) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const qrData = `${participant.teamId || participant.id}|${participant.name}|${participant.college}`;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(qrData, {
        width: 260,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).then(setQrUrl);
    });
  }, [participant]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-center">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <span className="text-xs font-mono font-bold text-blue-700">
            OFFICIAL PASS
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badge Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 shadow-xs space-y-2.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-800">
            St. Xavier&apos;s Catholic College of Engg.
          </div>
          <div className="text-lg font-black tracking-tight text-slate-900 border-b border-slate-200 pb-2">
            TechBETA 2026
          </div>

          <div className="flex justify-center my-2">
            {qrUrl ? (
              <img src={qrUrl} alt="Entry QR" className="w-40 h-40 rounded-xl border border-slate-300 p-1 bg-white shadow-xs" />
            ) : (
              <div className="w-40 h-40 bg-slate-200 rounded-xl animate-pulse" />
            )}
          </div>

          <div className="space-y-0.5">
            <div className="font-mono text-xs font-black text-blue-800">
              #{participant.participantNumber} &bull; {participant.formattedParticipantId || `TB${String(participant.participantNumber).padStart(3, '0')}`} {participant.teamId ? `(${participant.teamId})` : ''}
            </div>
            <div className="text-base font-black text-slate-900">{participant.name}</div>
            <div className="text-xs font-semibold text-slate-600">{participant.college}</div>
            <div className="text-[11px] text-slate-500 font-medium">
              {participant.allEvents.join(', ') || 'Event Pass'}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] font-mono font-bold text-slate-600">
            <span>UTR: {participant.paymentUtr || 'VERIFIED'}</span>
            <span className="text-emerald-700">PASS ACTIVE</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {onSendEmail && (
            <button
              onClick={() => onSendEmail(participant)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all active:scale-95"
              title="Send confirmation email with Master ID and PDF download link"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Pass</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Pass</span>
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
