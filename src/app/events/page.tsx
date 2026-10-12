'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Download,
  Settings2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Phone,
  Mail,
  Building,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Users,
  Edit,
  Trash2,
  QrCode,
  UserPlus,
  CheckCheck,
  AlertTriangle,
  Info,
  X,
  Printer,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { exportToCSV, formatDate } from '@/lib/utils';
import { sounds } from '@/lib/audio';
import { TECHBETA_EVENTS, getShortCode } from '@/lib/events';
import EventSelector from '@/components/EventSelector';

interface EventParticipant {
  id: string;
  participantNumber?: number;
  participantId?: string;
  formattedParticipantId?: string;
  teamId?: string | null;
  teamName?: string | null;
  name: string;
  email: string;
  phone: string;
  college: string;
  department?: string | null;
  year?: string | null;
  paymentUtr?: string | null;
  amount?: number | null;
  isVerified: boolean;
  isEntered: boolean;
  enteredAt?: string | null;
  eventSequenceId: string;
  eventSequenceNumber?: number;
  isTeamEntry?: boolean;
  createdAt: string;
  technicalEvents?: string | null;
  nonTechnicalEvents?: string | null;
  event1?: string | null;
  event2?: string | null;
  techEventsList?: string[];
  nonTechEventsList?: string[];
  allEvents?: string[];
}

interface EventReport {
  id: string;
  name: string;
  shortCode: string;
  category: string;
  currentType: string;
  totalRegistered: number;
  totalEntered: number;
  totalVerified: number;
  participants: EventParticipant[];
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
            {t.message && (
              <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85, marginTop: '2px', lineHeight: 1.4 }}>
                {t.message}
              </div>
            )}
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            style={{
              flexShrink: 0,
              opacity: 0.65,
              marginLeft: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
              padding: 0,
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function EventDashboardsPage() {
  const [events, setEvents] = useState<EventReport[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCollegeFilter, setSelectedCollegeFilter] = useState('');
  const [showOverview, setShowOverview] = useState(true);
  const [updatingConfig, setUpdatingConfig] = useState(false);

  // CRUD Modals and State
  const [editingParticipant, setEditingParticipant] = useState<EventParticipant | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deletingParticipant, setDeletingParticipant] = useState<EventParticipant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passModalParticipant, setPassModalParticipant] = useState<EventParticipant | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showCsvDropdown, setShowCsvDropdown] = useState(false);
  const csvDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (csvDropdownRef.current && !csvDropdownRef.current.contains(event.target as Node)) {
        setShowCsvDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = ++_toastCounter;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/events', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
        if (!selectedEventId && data.events?.length > 0) {
          setSelectedEventId(data.events[0].id);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const activeEvent = events.find((e) => e.id === selectedEventId) || events[0];

  // Strictly individual check: GenBuild and UI-Verse are 100% individual competitions
  const isStrictlyIndividual =
    activeEvent?.id === 'genbuild' ||
    activeEvent?.id === 'ui-verse' ||
    activeEvent?.shortCode === 'GB' ||
    activeEvent?.shortCode === 'UV';

  // College representation breakdown calculated across all event rosters
  const collegeStats = useMemo(() => {
    const counts: Record<string, { total: number; entered: number }> = {};
    const seen = new Set<string>();

    events.forEach((ev) => {
      ev.participants.forEach((p) => {
        const idKey = p.formattedParticipantId || p.participantId || p.id || p.name;
        if (seen.has(idKey)) return;
        seen.add(idKey);
        const col = (p.college || 'Other').trim();
        if (!counts[col]) counts[col] = { total: 0, entered: 0 };
        counts[col].total += 1;
        if (p.isEntered) counts[col].entered += 1;
      });
    });

    return Object.entries(counts)
      .map(([college, stats]) => ({
        college,
        total: stats.total,
        entered: stats.entered,
      }))
      .sort((a, b) => b.total - a.total);
  }, [events]);

  // Toggle Gate Check-in Entry
  const toggleEntry = async (participantId: string, currentEntered: boolean) => {
    // Optimistic UI update
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== activeEvent?.id) return ev;
        return {
          ...ev,
          totalEntered: currentEntered ? ev.totalEntered - 1 : ev.totalEntered + 1,
          participants: ev.participants.map((p) =>
            p.id === participantId
              ? { ...p, isEntered: !currentEntered, enteredAt: !currentEntered ? new Date().toISOString() : null }
              : p
          ),
        };
      })
    );

    try {
      const endpoint = currentEntered ? '/api/entry/undo' : '/api/entry/checkin';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: participantId }),
      });
      if (res.ok && !currentEntered) {
        sounds.playSuccess();
        addToast('success', 'Checked In', 'Participant successfully marked entered.');
      } else if (res.ok) {
        addToast('info', 'Check-in Reverted', 'Participant entry has been undone.');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error(err);
      fetchEvents();
    }
  };

  // Toggle Payment Verification
  const toggleVerified = async (participantId: string, currentVerified: boolean) => {
    // Optimistic UI update
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== activeEvent?.id) return ev;
        return {
          ...ev,
          totalVerified: currentVerified ? ev.totalVerified - 1 : ev.totalVerified + 1,
          participants: ev.participants.map((p) =>
            p.id === participantId ? { ...p, isVerified: !currentVerified } : p
          ),
        };
      })
    );

    try {
      const res = await fetch(`/api/registrations/${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: !currentVerified }),
      });
      if (!res.ok) {
        throw new Error('Failed to update payment status');
      }
      sounds.playSuccess();
      addToast('success', !currentVerified ? 'Payment Confirmed' : 'Payment Marked Pending');
    } catch (err: unknown) {
      addToast('error', 'Update Failed', err instanceof Error ? err.message : 'Error updating status');
      fetchEvents();
    }
  };

  // Confirm Delete Handler
  const handleConfirmDelete = async () => {
    if (!deletingParticipant) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/registrations/${deletingParticipant.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete participant');
      }
      addToast('success', 'Participant Deleted', `${deletingParticipant.name} removed from system.`);
      sounds.playSuccess();
      setDeletingParticipant(null);
      fetchEvents();
    } catch (err: unknown) {
      addToast('error', 'Delete Failed', err instanceof Error ? err.message : 'Error deleting participant');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredParticipants =
    activeEvent?.participants.filter((p) => {
      if (selectedCollegeFilter && p.college.toLowerCase() !== selectedCollegeFilter.toLowerCase()) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (p.participantId && p.participantId.toLowerCase().includes(s)) ||
        (p.formattedParticipantId && p.formattedParticipantId.toLowerCase().includes(s)) ||
        p.name.toLowerCase().includes(s) ||
        p.eventSequenceId.toLowerCase().includes(s) ||
        p.college.toLowerCase().includes(s) ||
        p.phone.includes(s) ||
        (!isStrictlyIndividual && p.teamId && p.teamId.toLowerCase().includes(s)) ||
        (!isStrictlyIndividual && p.teamName && p.teamName.toLowerCase().includes(s))
      );
    }) || [];

  // If GenBuild or UI-Verse: strictly map each participant into their own group of 1 (strictly individual)
  // Otherwise: group by shared eventSequenceId for team events
  const groupedParticipants = useMemo(() => {
    if (isStrictlyIndividual) {
      return filteredParticipants.map((p) => [p]);
    }
    const groups: Record<string, typeof filteredParticipants> = {};
    filteredParticipants.forEach((p) => {
      if (!groups[p.eventSequenceId]) groups[p.eventSequenceId] = [];
      groups[p.eventSequenceId].push(p);
    });
    return Object.values(groups);
  }, [filteredParticipants, isStrictlyIndividual]);

  // Export Handlers: 1) Event CSV (Clean roster for events) & 2) Raw CSV (Full dataset with timestamps)
  const handleExportEventCSV = () => {
    if (!activeEvent) return;
    const exportData = filteredParticipants.map((p) => {
      if (isStrictlyIndividual) {
        // Individual Event Columns (e.g. GB01, UV01)
        return {
          'Participant ID': p.eventSequenceId || p.formattedParticipantId || p.participantId,
          'Participant Name': p.name,
          'College': p.college,
          'Department': p.department || '',
          'Contact Number': p.phone,
          'Gmail ID': p.email,
          'Verified': p.isVerified ? 'YES' : 'NO',
          'Signature': '',
        };
      } else {
        // Team Event Columns (e.g. LT01, IF01, BB01, BNB01)
        return {
          'Team ID': p.eventSequenceId || p.teamId,
          'Team Name': p.teamName || p.name,
          'Participant Name': p.name,
          'College': p.college,
          'Department': p.department || '',
          'Contact Number': p.phone,
          'Gmail ID': p.email,
          'Verified': p.isVerified ? 'YES' : 'NO',
          'Signature': '',
        };
      }
    });

    exportToCSV(`TechBETA-2026-${activeEvent.shortCode}-Event-Roster`, exportData);
    addToast('success', 'Event CSV Exported', `Downloaded roster for ${activeEvent.name}`);
  };

  const handleExportRawCSV = () => {
    if (!activeEvent) return;
    const exportData = filteredParticipants.map((p) => ({
      'Event Slot ID': p.eventSequenceId,
      'Entry Type': isStrictlyIndividual ? 'Individual' : p.isTeamEntry ? 'Team' : 'Individual',
      'Master Participant ID': p.formattedParticipantId || p.participantId || 'N/A',
      'Team ID': isStrictlyIndividual ? 'N/A' : p.eventSequenceId || p.teamId || 'N/A',
      'Team Name': isStrictlyIndividual ? '' : p.teamName || '',
      'Participant Name': p.name,
      College: p.college,
      Department: p.department || '',
      Year: p.year || '',
      'Contact Number': p.phone,
      'Email': p.email,
      'Payment Ref': p.paymentUtr || 'N/A',
      'Amount': p.amount || 200,
      'Payment Verified': p.isVerified ? 'YES' : 'NO',
      'Gate Entered': p.isEntered ? 'YES' : 'NO',
      'Entered At': p.enteredAt ? formatDate(p.enteredAt) : 'N/A',
      'Registered At': p.createdAt ? formatDate(p.createdAt) : 'N/A',
    }));

    exportToCSV(`TechBETA-2026-${activeEvent.shortCode}-Raw-Roster`, exportData);
    addToast('success', 'Raw CSV Exported', `Downloaded complete dataset for ${activeEvent.name}`);
  };

  // Export to Word (.docx) Table with Empty Signature Box
  const [exportingDocx, setExportingDocx] = useState(false);
  const handleExportDocx = async () => {
    if (!activeEvent) return;
    try {
      setExportingDocx(true);
      const { exportEventRosterDocx } = await import('@/lib/docxExport');
      const docxParticipants = filteredParticipants.map((p, idx) => ({
        participantNumber: p.participantNumber || idx + 1,
        formattedParticipantId: p.formattedParticipantId || p.participantId || p.eventSequenceId,
        participantId: p.participantId || p.formattedParticipantId,
        teamId: isStrictlyIndividual ? undefined : p.teamId || undefined,
        teamName: isStrictlyIndividual ? undefined : p.teamName || undefined,
        name: p.name,
        email: p.email,
        phone: p.phone,
        college: p.college,
        department: p.department,
        year: p.year,
        eventSequenceId: p.eventSequenceId,
        isEntered: p.isEntered,
        isVerified: p.isVerified,
      }));
      await exportEventRosterDocx(activeEvent, docxParticipants);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Failed to export DOCX:', err);
    } finally {
      setExportingDocx(false);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fadeIn">
        {/* Header Banner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                <Trophy className="w-6 h-6 text-blue-600" />
                Event Dashboards
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                6 Events
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time event rosters, live gate check-in, fee status, and complete participant management.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              title={`Add new participant to ${activeEvent?.name || 'event'}`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Participant</span>
            </button>

            <button
              onClick={fetchEvents}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Competition Breakdown & College Analytics */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Competition Breakdown &amp; College Analytics
              </h2>
            </div>
            <button
              onClick={() => setShowOverview(!showOverview)}
              className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <span>{showOverview ? 'Hide Analytics' : 'Show Analytics'}</span>
              {showOverview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showOverview && (
            <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* 6 Event Distribution Cards */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    OFFICIAL 6 EVENTS (TAP CARD TO SELECT EVENT)
                  </span>
                  <span className="text-xs font-bold text-blue-600">
                    {events.reduce((sum, e) => sum + e.totalRegistered, 0)} Total Registered
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {events.map((ev) => {
                    const isSelected = ev.id === activeEvent?.id;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEventId(ev.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-200 shadow-xs'
                            : 'bg-slate-50 hover:bg-blue-50/30 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-mono text-xs font-black px-2 py-0.5 rounded border ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                          >
                            {ev.shortCode}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            <strong className="text-blue-700 font-black">{ev.totalRegistered}</strong> registered
                          </span>
                        </div>
                        <div className="mt-2 font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">
                          {ev.name}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                          <span className="truncate max-w-[170px]">
                            {ev.category} &bull; {ev.currentType}
                          </span>
                          <span className="text-blue-600 font-semibold">
                            {isSelected ? 'Active Roster ✓' : 'Select Roster →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* College Breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Colleges Represented</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">{collegeStats.length} Total</span>
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 flex-1">
                  {collegeStats.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-4 text-center">No college records yet</div>
                  ) : (
                    collegeStats.map((col) => {
                      const isSelected = selectedCollegeFilter.toLowerCase() === col.college.toLowerCase();
                      return (
                        <div
                          key={col.college}
                          onClick={() => setSelectedCollegeFilter(isSelected ? '' : col.college)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-blue-100/70 border-blue-300 text-blue-900 font-bold'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                          }`}
                          title={isSelected ? 'Click to clear filter' : `Filter roster by ${col.college}`}
                        >
                          <span className="truncate max-w-[150px]">{col.college}</span>
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            {col.total}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  {selectedCollegeFilter ? (
                    <button
                      onClick={() => setSelectedCollegeFilter('')}
                      className="font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Clear &ldquo;{selectedCollegeFilter}&rdquo; &times;
                    </button>
                  ) : (
                    <span className="text-slate-400">Click to filter roster</span>
                  )}
                  <Link
                    href="/master"
                    className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1 ml-auto"
                  >
                    Master Directory <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Selection Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar -mx-2.5 px-2.5">
          {events.map((ev) => {
            const isSelected = ev.id === activeEvent?.id;
            return (
              <button
                key={ev.id}
                onClick={() => setSelectedEventId(ev.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span
                  className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                    isSelected ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {ev.shortCode}
                </span>
                <span>{ev.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 font-bold'
                  }`}
                >
                  {ev.totalRegistered}
                </span>
              </button>
            );
          })}
        </div>

        {activeEvent && (
          <div className="space-y-4 sm:space-y-6">
            {/* Active Event Command Card */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
                {/* Event Info */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                      {activeEvent.shortCode}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-600">
                      {activeEvent.category} Event
                    </span>
                    {isStrictlyIndividual && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Strictly Individual Competition
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900">{activeEvent.name}</h2>
                  <p className="text-xs text-slate-500">
                    Slot Sequence prefix:{' '}
                    <strong className="text-blue-700 font-mono">{activeEvent.shortCode}01</strong>,{' '}
                    <strong className="text-blue-700 font-mono">{activeEvent.shortCode}02</strong>...
                    {isStrictlyIndividual && ' (All participants assigned distinct individual slots)'}
                  </p>
                </div>

                {/* Event Participation Mode Dropdown */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 w-full lg:w-auto lg:min-w-[280px]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Settings2 className="w-4 h-4 text-blue-600" />
                      Participation Mode
                    </span>
                    {updatingConfig && (
                      <span className="text-[10px] text-blue-600 animate-pulse font-medium">Saving...</span>
                    )}
                  </div>

                  <div className="w-full px-3 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
                    {isStrictlyIndividual ? 'Individual' : activeEvent.currentType}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isStrictlyIndividual
                      ? 'GENBUILD and UI-VERSE are strictly individual events.'
                      : 'Configured by system administrator.'}
                  </div>
                </div>

                {/* Quick Roster Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center w-full lg:w-auto lg:min-w-[260px]">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-base sm:text-lg font-black text-slate-900">{activeEvent.totalRegistered}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Registered</div>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-base sm:text-lg font-black text-emerald-700">{activeEvent.totalEntered}</div>
                    <div className="text-[10px] text-emerald-600 font-medium">Checked In</div>
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-base sm:text-lg font-black text-blue-700">{activeEvent.totalVerified}</div>
                    <div className="text-[10px] text-blue-600 font-medium">Verified</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Export Toolbar */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${activeEvent.name} (Name, ID, College)...`}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Add Participant Button */}
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                  title={`Add participant to ${activeEvent.name}`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Participant</span>
                </button>

                {/* CSV Export Dropdown (Raw CSV & Event CSV) */}
                <div className="relative flex-1 sm:flex-initial" ref={csvDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowCsvDropdown((prev) => !prev)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all shadow-xs active:scale-95 cursor-pointer"
                    title="Export CSV (Event or Raw)"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>CSV</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${showCsvDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showCsvDropdown && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fadeIn">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Select CSV Format
                      </div>

                      {/* 1. Event CSV */}
                      <button
                        type="button"
                        onClick={() => {
                          handleExportEventCSV();
                          setShowCsvDropdown(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50/80 transition-colors flex items-start gap-2.5 group cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Download className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Event CSV</span>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                              {isStrictlyIndividual ? 'Individual' : 'Team'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {isStrictlyIndividual
                              ? `Participant ID (${activeEvent.shortCode}01), Name, College, Dept, Contact, Gmail, Verified & Signature`
                              : `Team ID (${activeEvent.shortCode}01), Team Name, Member Name, College, Dept, Contact, Gmail, Verified & Signature`}
                          </p>
                        </div>
                      </button>

                      {/* 2. Raw CSV */}
                      <button
                        type="button"
                        onClick={() => {
                          handleExportRawCSV();
                          setShowCsvDropdown(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 transition-colors flex items-start gap-2.5 group cursor-pointer mt-1"
                      >
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">Raw CSV</span>
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              Full Data
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Complete dataset with registration timestamps, check-in logs &amp; all columns.
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExportDocx}
                  disabled={exportingDocx}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Export official printable Microsoft Word attendance & judging roster"
                >
                  <FileText className={`w-4 h-4 text-blue-600 ${exportingDocx ? 'animate-bounce' : ''}`} />
                  <span>{exportingDocx ? '...' : 'DOCX'}</span>
                </button>
              </div>
            </div>

            {/* Event Roster Table & Mobile Cards */}
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
              {/* Desktop Table View (Visible on md+ screens) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-mono text-blue-700 w-36">Event Slot / Master ID</th>
                      <th className="py-3 px-4">Participant Name</th>
                      <th className="py-3 px-4">College &amp; Dept</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-3 font-mono text-center">Team Info</th>
                      <th className="py-3 px-3 text-center">Fee Verified</th>
                      <th className="py-3 px-3 text-center">Gate Entry</th>
                      <th className="py-3 px-3 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupedParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-500">
                          No participants registered for {activeEvent.name} matching search.
                        </td>
                      </tr>
                    ) : (
                      groupedParticipants.map((group) => {
                        const firstP = group[0];
                        const rowSpan = group.length;

                        return (
                          <React.Fragment key={firstP.eventSequenceId || firstP.id}>
                            {group.map((p, index) => (
                              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                {/* Event Specific Sequential ID & Participant ID */}
                                {index === 0 && (
                                  <td
                                    rowSpan={rowSpan}
                                    className="py-3 px-4 font-mono text-xs bg-slate-50/70 border-r border-slate-200"
                                  >
                                    <div className="flex flex-col items-start gap-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-black text-blue-700 text-sm">
                                          {p.eventSequenceId}
                                        </span>
                                        {isStrictlyIndividual ? (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                            SOLO
                                          </span>
                                        ) : p.isTeamEntry ? (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                            TEAM
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                                            SOLO
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-col gap-1 mt-1">
                                        {group.map((member, mIdx) =>
                                          member.formattedParticipantId || member.participantId ? (
                                            <div
                                              key={member.id}
                                              className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-slate-600 border border-slate-200 shadow-2xs"
                                            >
                                              {group.length > 1 ? `${mIdx + 1}. ` : ''}
                                              {member.formattedParticipantId || member.participantId}
                                            </div>
                                          ) : null
                                        )}
                                      </div>
                                      {/* Only display team name badge in team-eligible events */}
                                      {!isStrictlyIndividual && p.teamName && (
                                        <div className="mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-sm">
                                          {p.teamName}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                )}

                                {/* Name */}
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                                </td>

                                {/* College & Dept */}
                                <td className="py-3 px-4">
                                  <div className="font-semibold text-slate-800">{p.college}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {p.department || 'General'} {p.year ? `(${p.year})` : ''}
                                  </div>
                                </td>

                                {/* Contact */}
                                <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                                  <div>{p.phone}</div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[130px] font-sans">
                                    {p.email}
                                  </div>
                                </td>

                                {/* Team Info - Spanned for Team */}
                                {index === 0 && (
                                  <td
                                    rowSpan={rowSpan}
                                    className="py-3 px-3 font-mono text-[11px] text-slate-600 border-l border-slate-200 text-center"
                                  >
                                    {isStrictlyIndividual ? (
                                      <span className="text-slate-400 italic text-[11px]">Individual</span>
                                    ) : (
                                      <div>
                                        {p.teamName && <div className="font-bold text-blue-700">{p.teamName}</div>}
                                        <div className="text-[10px] text-slate-500">{p.teamId || '—'}</div>
                                      </div>
                                    )}
                                  </td>
                                )}

                                {/* Payment Verified Toggle */}
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => toggleVerified(p.id, p.isVerified)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                      p.isVerified
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                    }`}
                                    title="Click to toggle fee verification status"
                                  >
                                    {p.isVerified ? (
                                      <>
                                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                        <span>VERIFIED</span>
                                      </>
                                    ) : (
                                      <>
                                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                                        <span>PENDING</span>
                                      </>
                                    )}
                                  </button>
                                </td>

                                {/* Gate Entry Checkbox Toggle */}
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => toggleEntry(p.id, p.isEntered)}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer ${
                                      p.isEntered
                                        ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                    }`}
                                  >
                                    {p.isEntered ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                        <span>ENTERED</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Not Entered</span>
                                      </>
                                    )}
                                  </button>
                                </td>

                                {/* Actions: View Pass, Edit, Delete */}
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setPassModalParticipant(p)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="View Pass & QR"
                                    >
                                      <QrCode className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingParticipant(p)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Edit Participant"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeletingParticipant(p)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Delete Participant"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Participant Cards (Visible on < md screens) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredParticipants.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs">
                    No participants registered for {activeEvent.name} matching search.
                  </div>
                ) : (
                  filteredParticipants.map((p) => (
                    <div key={p.id} className="p-4 bg-white space-y-2.5">
                      {/* Top row: Event ID + Solo/Team + Master ID + Verified badge */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {p.eventSequenceId}
                          </span>
                          {isStrictlyIndividual ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              SOLO
                            </span>
                          ) : p.isTeamEntry ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                              TEAM
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              SOLO
                            </span>
                          )}
                          {(p.formattedParticipantId || p.participantId) && (
                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {p.formattedParticipantId || p.participantId}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => toggleVerified(p.id, p.isVerified)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 cursor-pointer ${
                            p.isVerified
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {p.isVerified ? 'VERIFIED' : 'PENDING'}
                        </button>
                      </div>

                      {/* Participant & Team */}
                      <div>
                        <div className="text-base font-bold text-slate-900 leading-tight">{p.name}</div>
                        {!isStrictlyIndividual && p.teamName && (
                          <div className="text-xs font-semibold text-blue-600 mt-0.5">
                            Team: {p.teamName} {p.teamId ? `(${p.teamId})` : ''}
                          </div>
                        )}
                        <div className="text-xs text-slate-600 mt-1">
                          <strong className="text-slate-800">{p.college}</strong> &bull;{' '}
                          <span className="text-slate-500">
                            {p.department || 'General'} {p.year ? `(${p.year})` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Contact Links */}
                      <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
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

                      {/* Gate Entry Checkbox Toggle Button */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                        <button
                          onClick={() => toggleEntry(p.id, p.isEntered)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                            p.isEntered
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {p.isEntered ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>GATE CHECKED IN (PRESENT)</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span>Mark as Gate Entered</span>
                            </>
                          )}
                        </button>

                        {/* Actions Row */}
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setPassModalParticipant(p)}
                            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5 text-blue-600" />
                            <span>Pass</span>
                          </button>
                          <button
                            onClick={() => setEditingParticipant(p)}
                            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-600" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeletingParticipant(p)}
                            className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS RENDERED DIRECTLY OUTSIDE .animate-fadeIn CONTAINER TO AVOID CSS STACKING CONTEXT ISSUES */}

      {/* Add or Edit Participant Modal */}
      {(isAddingNew || editingParticipant) && (
        <EventParticipantFormModal
          participant={editingParticipant}
          activeEvent={activeEvent}
          onClose={() => {
            setIsAddingNew(false);
            setEditingParticipant(null);
          }}
          onSave={(name: string, isEdit: boolean) => {
            setIsAddingNew(false);
            setEditingParticipant(null);
            fetchEvents();
            sounds.playSuccess();
            addToast('success', isEdit ? 'Participant Updated' : 'Participant Added', `${name} successfully saved.`);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingParticipant && (
        <DeleteConfirmModal
          participant={deletingParticipant}
          isDeleting={isDeleting}
          onClose={() => setDeletingParticipant(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Pass QR Modal */}
      {passModalParticipant && (
        <EventPassModal
          participant={passModalParticipant}
          eventName={activeEvent?.name}
          onClose={() => setPassModalParticipant(null)}
        />
      )}

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

// -------------------------------------------------------------
// EVENT PARTICIPANT FORM MODAL (Add / Edit)
// -------------------------------------------------------------
function EventParticipantFormModal({
  participant,
  activeEvent,
  onClose,
  onSave,
}: {
  participant: EventParticipant | null;
  activeEvent?: EventReport;
  onClose: () => void;
  onSave: (name: string, isEdit: boolean) => void;
}) {
  const isEdit = Boolean(participant);

  // Derive initial technical and non-technical events
  const initialEvents = useMemo(() => {
    if (!participant) {
      if (activeEvent?.category === 'Technical') {
        return { tech: [activeEvent.name], nonTech: [] };
      }
      if (activeEvent?.category === 'Non-Technical') {
        return { tech: [], nonTech: [activeEvent.name] };
      }
      return { tech: ['GENBUILD'], nonTech: [] };
    }

    try {
      let rawTech: string[] = [];
      let rawNonTech: string[] = [];

      if (Array.isArray(participant.techEventsList) && participant.techEventsList.length > 0) {
        rawTech = [...participant.techEventsList];
      } else if (participant.technicalEvents) {
        try {
          const parsed = JSON.parse(participant.technicalEvents);
          if (Array.isArray(parsed)) rawTech = parsed.filter((x: unknown) => typeof x === 'string');
        } catch {
          rawTech = participant.event1 ? [participant.event1] : [];
        }
      } else if (participant.event1) {
        rawTech = [participant.event1];
      }

      if (Array.isArray(participant.nonTechEventsList) && participant.nonTechEventsList.length > 0) {
        rawNonTech = [...participant.nonTechEventsList];
      } else if (participant.nonTechnicalEvents) {
        try {
          const parsed = JSON.parse(participant.nonTechnicalEvents);
          if (Array.isArray(parsed)) rawNonTech = parsed.filter((x: unknown) => typeof x === 'string');
        } catch {
          rawNonTech = participant.event2 ? [participant.event2] : [];
        }
      } else if (participant.event2) {
        rawNonTech = [participant.event2];
      }

      const safeAllEvents = Array.isArray(participant.allEvents)
        ? participant.allEvents.filter((x) => typeof x === 'string')
        : [];

      const allRaw = [...rawTech, ...rawNonTech, ...safeAllEvents].filter(
        (x): x is string => typeof x === 'string' && x.length > 0
      );

      const techDefs = TECHBETA_EVENTS.filter((e) => e.category === 'Technical');
      const nonTechDefs = TECHBETA_EVENTS.filter((e) => e.category === 'Non-Technical');

      const selectedTech: string[] = [];
      const selectedNonTech: string[] = [];

      techDefs.forEach((def) => {
        const isMatched = allRaw.some((ev) => {
          try {
            return (
              getShortCode(ev) === def.shortCode ||
              ev.toLowerCase().includes(def.name.toLowerCase()) ||
              def.name.toLowerCase().includes(ev.toLowerCase())
            );
          } catch {
            return false;
          }
        });
        if (isMatched && !selectedTech.includes(def.name)) {
          selectedTech.push(def.name);
        }
      });

      nonTechDefs.forEach((def) => {
        const isMatched = allRaw.some((ev) => {
          try {
            return (
              getShortCode(ev) === def.shortCode ||
              ev.toLowerCase().includes(def.name.toLowerCase()) ||
              def.name.toLowerCase().includes(ev.toLowerCase())
            );
          } catch {
            return false;
          }
        });
        if (isMatched && !selectedNonTech.includes(def.name)) {
          selectedNonTech.push(def.name);
        }
      });

      // Ensure active event is included if user was editing from that event's roster
      if (activeEvent) {
        if (activeEvent.category === 'Technical' && !selectedTech.includes(activeEvent.name)) {
          selectedTech.push(activeEvent.name);
        } else if (activeEvent.category === 'Non-Technical' && !selectedNonTech.includes(activeEvent.name)) {
          selectedNonTech.push(activeEvent.name);
        }
      }

      return { tech: selectedTech, nonTech: selectedNonTech };
    } catch {
      const fallbackTech = participant.event1 ? [participant.event1] : [];
      const fallbackNonTech = participant.event2 ? [participant.event2] : [];
      return { tech: fallbackTech, nonTech: fallbackNonTech };
    }
  }, [participant, activeEvent]);

  const [formData, setFormData] = useState({
    name: participant?.name || '',
    email: participant?.email || '',
    phone: participant?.phone || '',
    college: participant?.college || '',
    department: participant?.department || '',
    year: participant?.year || '3rd Year',
    teamId: participant?.teamId || '',
    teamName: participant?.teamName || '',
    paymentUtr: participant?.paymentUtr || '',
    amount: participant?.amount || 250,
    isVerified: participant?.isVerified ?? false,
  });

  const [selectedTechEvents, setSelectedTechEvents] = useState<string[]>(initialEvents.tech);
  const [selectedNonTechEvents, setSelectedNonTechEvents] = useState<string[]>(initialEvents.nonTech);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.college || !formData.phone) {
      setErr('Name, college, and mobile number are required.');
      return;
    }
    if (selectedTechEvents.length === 0 && selectedNonTechEvents.length === 0) {
      setErr('Please select at least one event.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      const url = isEdit ? `/api/registrations/${participant!.id}` : '/api/registrations';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'master',
          entryNotes: isEdit ? undefined : `Registered via Event Dashboard (${activeEvent?.name || 'Master'})`,
          technicalEvents: selectedTechEvents,
          nonTechnicalEvents: selectedNonTechEvents,
          event1: selectedTechEvents[0] || selectedNonTechEvents[0] || '',
          event2: selectedNonTechEvents[0] || selectedTechEvents[1] || '',
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save participant');
      }
      onSave(formData.name, isEdit);
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'Error saving participant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto"
    >
      <div className="bg-white p-4 sm:p-6 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            {isEdit ? 'Edit Participant Details' : `Add Participant (${activeEvent?.name || 'Event'})`}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
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
              placeholder="e.g. Sujith V"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Mobile *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono text-xs"
                placeholder="10-digit number"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">College *</label>
              <input
                type="text"
                required
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
                placeholder="College name"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Dept &amp; Year</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
                placeholder="e.g. IT, CSE"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Team Name (For Team Comps)</label>
              <input
                type="text"
                value={formData.teamName}
                onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
                placeholder="e.g. Team Nova"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Team ID (Optional)</label>
              <input
                type="text"
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono text-xs"
                placeholder="e.g. TB26-3544-LJYP"
              />
            </div>
          </div>

          {/* Multi-Event Selector */}
          <EventSelector
            selectedTechEvents={selectedTechEvents}
            onTechEventsChange={setSelectedTechEvents}
            selectedNonTechEvents={selectedNonTechEvents}
            onNonTechEventsChange={setSelectedNonTechEvents}
            accentColor="blue"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Reference</label>
              <input
                type="text"
                value={formData.paymentUtr}
                onChange={(e) => setFormData({ ...formData, paymentUtr: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 font-mono text-xs"
                placeholder="UTR, Ref ID, or CASH"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Amount (&#8377;)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium pt-1">
            <input
              type="checkbox"
              checked={formData.isVerified}
              onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Payment Verified / Confirmed</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Participant' : 'Save Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// DELETE CONFIRMATION MODAL
// -------------------------------------------------------------
function DeleteConfirmModal({
  participant,
  isDeleting,
  onClose,
  onConfirm,
}: {
  participant: EventParticipant;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Delete Participant?</h3>
            <p className="text-xs text-slate-500">This action cannot be undone.</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="font-bold text-slate-900">{participant.name}</div>
          <div className="font-mono text-[11px] text-slate-500">
            ID: {participant.formattedParticipantId || participant.participantId || participant.eventSequenceId}
          </div>
          <div className="text-slate-600">{participant.college}</div>
        </div>

        <p className="text-xs text-red-600 font-medium">
          This will permanently remove this participant from all event rosters and the master sheet.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// EVENT PASS MODAL
// -------------------------------------------------------------
function EventPassModal({
  participant,
  eventName,
  onClose,
}: {
  participant: EventParticipant;
  eventName?: string;
  onClose: () => void;
}) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const qrData = `${participant.teamId || participant.id}|${participant.name}|${participant.college}`;
    import('qrcode').then((QRCode) =>
      QRCode.toDataURL(qrData, { width: 260, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }).then(setQrUrl)
    );
  }, [participant]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white p-6 rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 text-center">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <span className="text-xs font-mono font-bold text-blue-700">EVENT PARTICIPANT PASS</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-800">
            St. Xavier&apos;s Catholic College of Engg.
          </div>
          <div className="text-lg font-black tracking-tight text-slate-900 border-b border-slate-200 pb-2">
            TechBETA 2026
          </div>
          <div className="flex justify-center my-2">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Pass"
                className="w-40 h-40 rounded-xl border border-slate-300 p-1 bg-white shadow-xs"
              />
            ) : (
              <div className="w-40 h-40 bg-slate-200 rounded-xl animate-pulse" />
            )}
          </div>
          <div className="space-y-0.5">
            <div className="font-mono text-xs font-black text-blue-700">
              SLOT: {participant.eventSequenceId} &bull;{' '}
              {participant.formattedParticipantId || participant.participantId || ''}
            </div>
            <div className="text-base font-black text-slate-900">{participant.name}</div>
            <div className="text-xs font-semibold text-slate-600">{participant.college}</div>
            <div className="text-[11px] text-blue-600 font-bold">{eventName || 'Event Pass'}</div>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] font-mono font-bold">
            <span className="truncate max-w-[150px]">PHONE: {participant.phone}</span>
            <span className={participant.isVerified ? 'text-emerald-700' : 'text-amber-600'}>
              {participant.isVerified ? 'CONFIRMED' : 'PENDING'}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Pass</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
