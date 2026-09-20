'use client';

import React, { useState, useEffect } from 'react';
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
  Mail 
} from 'lucide-react';
import { exportToCSV, formatDate } from '@/lib/utils';
import { sounds } from '@/lib/audio';

interface EventReport {
  id: string;
  name: string;
  shortCode: string;
  category: string;
  currentType: string;
  totalRegistered: number;
  totalEntered: number;
  totalVerified: number;
  participants: Array<{
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
    isVerified: boolean;
    isEntered: boolean;
    enteredAt?: string | null;
    eventSequenceId: string;
    isTeamEntry?: boolean;
    createdAt: string;
  }>;
}

export default function EventDashboardsPage() {
  const [events, setEvents] = useState<EventReport[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingConfig, setUpdatingConfig] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/events');
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events || []);
        if (!selectedEventId && data.events?.length > 0) {
          setSelectedEventId(data.events[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const activeEvent = events.find((e) => e.id === selectedEventId) || events[0];

  // Handle Participation Mode Dropdown Change
  const handleTypeChange = async (eventId: string, newType: string) => {
    try {
      setUpdatingConfig(true);
      setEvents((prev) =>
        prev.map((ev) => (ev.id === eventId ? { ...ev, currentType: newType } : ev))
      );
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, participationType: newType }),
      });
      if (res.ok) {
        sounds.playSuccess();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingConfig(false);
    }
  };

  // Toggle entry
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
      }
    } catch (err) {
      console.error(err);
      fetchEvents();
    }
  };

  // Instant in-memory filter
  const filteredParticipants = activeEvent?.participants.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (p.participantId && p.participantId.toLowerCase().includes(s)) ||
      (p.formattedParticipantId && p.formattedParticipantId.toLowerCase().includes(s)) ||
      p.name.toLowerCase().includes(s) ||
      p.eventSequenceId.toLowerCase().includes(s) ||
      p.college.toLowerCase().includes(s) ||
      p.phone.includes(s) ||
      (p.teamId && p.teamId.toLowerCase().includes(s))
    );
  }) || [];

  const handleExportRoster = () => {
    if (!activeEvent) return;
    const exportData = filteredParticipants.map((p) => ({
      "Event Slot ID": p.eventSequenceId,
      "Entry Type": p.isTeamEntry ? "Team" : "Individual",
      "Master Participant ID": p.formattedParticipantId || p.participantId || "N/A",
      "Team ID": p.teamId || "N/A",
      "Team Name": p.teamName || "",
      "Participant Name": p.name,
      "College": p.college,
      "Department": p.department || "",
      "Year": p.year || "",
      "Phone": p.phone,
      "Email": p.email,
      "Payment Verified": p.isVerified ? "YES" : "NO",
      "Gate Entered": p.isEntered ? "YES" : "NO",
      "Entered At": p.enteredAt ? formatDate(p.enteredAt) : "N/A",
    }));

    exportToCSV(`TechBETA-2026-${activeEvent.shortCode}-Roster`, exportData);
  };

  // Export to Word (.docx) Table with Empty Signature Box and Grouped Teams
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
        teamId: p.teamId,
        teamName: p.teamName,
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
      console.error('Failed to export DOCX:', err);
    } finally {
      setExportingDocx(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Trophy className="w-6 h-6 text-blue-600" />
              Official Event Dashboards
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
              6 Official Events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dedicated rosters with short-code participant IDs (<strong>APW001</strong>, <strong>UB001</strong>, <strong>CR001</strong>...) and participation mode configuration.
          </p>
        </div>

        <button
          onClick={fetchEvents}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Event Selection Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar -mx-2.5 px-2.5">
        {events.map((ev) => {
          const isSelected = ev.id === activeEvent?.id;
          return (
            <button
              key={ev.id}
              onClick={() => setSelectedEventId(ev.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border active:scale-95 ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                isSelected ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {ev.shortCode}
              </span>
              <span>{ev.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 font-bold'
              }`}>
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
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900">
                  {activeEvent.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Short-code prefix: <strong className="text-blue-700 font-mono">{activeEvent.shortCode}001</strong>, <strong className="text-blue-700 font-mono">{activeEvent.shortCode}002</strong>...
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

                <select
                  value={activeEvent.currentType}
                  onChange={(e) => handleTypeChange(activeEvent.id, e.target.value)}
                  disabled={updatingConfig}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-xs"
                >
                  <option value="Individual">Individual Participation (1 member)</option>
                  <option value="Team of 2">Team Participation (2 members)</option>
                  <option value="Team (1-2)">Team or Individual (1 - 2 members)</option>
                </select>
                <div className="text-[10px] text-slate-500">
                  Select whether this competition allows individual or team entries.
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportRoster}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all shadow-xs active:scale-95"
                title="Export spreadsheet format"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>CSV</span>
              </button>

              <button
                onClick={handleExportDocx}
                disabled={exportingDocx}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-all shadow-xs active:scale-95"
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
                    <th className="py-3 px-4 font-mono text-blue-700 w-32">Event / Participant ID</th>
                    <th className="py-3 px-4">Participant Name</th>
                    <th className="py-3 px-4">College & Dept</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-3 font-mono">Team ID</th>
                    <th className="py-3 px-3 text-center">UTR Verified</th>
                    <th className="py-3 px-3 text-center">Gate Entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No participants registered for {activeEvent.name} matching search.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        {/* Event Specific Sequential ID & Participant ID */}
                        <td className="py-3 px-4 font-mono text-xs bg-slate-50/70">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-blue-700 text-sm">{p.eventSequenceId}</span>
                            {p.isTeamEntry ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                TEAM
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                                SOLO
                              </span>
                            )}
                          </div>
                          {(p.formattedParticipantId || p.participantId) && (
                            <div className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                              Master: {p.formattedParticipantId || p.participantId}
                            </div>
                          )}
                        </td>

                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          {p.teamName && (
                            <div className="text-[10px] text-slate-500">{p.teamName}</div>
                          )}
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

                        {/* Team ID */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {p.teamId || '—'}
                        </td>

                        {/* Payment Verified */}
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.isVerified
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.isVerified ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </td>

                        {/* Gate Entry Checkbox Toggle */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => toggleEntry(p.id, p.isEntered)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center justify-center gap-1 mx-auto transition-all ${
                              p.isEntered
                                ? 'bg-blue-50 text-blue-700 border border-blue-300'
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
                      </tr>
                    ))
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
                    {/* Top row: Event ID + Team/Solo + Master ID + Verified badge */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {p.eventSequenceId}
                        </span>
                        {p.isTeamEntry ? (
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        p.isVerified
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.isVerified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </div>

                    {/* Participant & Team */}
                    <div>
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
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={() => toggleEntry(p.id, p.isEntered)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
