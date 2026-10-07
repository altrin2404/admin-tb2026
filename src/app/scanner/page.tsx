'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  QrCode,
  Camera,
  CameraOff,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCw,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  X,
  UserPlus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Users,
  Check,
  Phone,
  ArrowRight
} from 'lucide-react';
import { formatTimeOnly, exportToCSV } from '@/lib/utils';
import { playSound } from '@/lib/audio';

interface Participant {
  id: string;
  participantId?: string | null;
  participantNumber?: number | null;
  formattedParticipantId?: string | null;
  teamId?: string | null;
  name: string;
  email: string;
  phone: string;
  college: string;
  department?: string | null;
  year?: string | null;
  amount?: number | null;
  isVerified: boolean;
  isEntered: boolean;
  enteredAt?: string | null;
  entryNotes?: string | null;
  technicalEvents?: string | null;
  nonTechnicalEvents?: string | null;
  techEventsList?: string[];
  nonTechEventsList?: string[];
  allEvents?: string[];
}

interface ScanResult {
  found: boolean;
  participant?: Participant;
  isDuplicate?: boolean;
  enteredAt?: string | null;
  error?: string;
}

export default function AttendancePage() {
  // Simple view tabs: 'station' (Scan & Enter ID) or 'list' (All Attendees & CRUD)
  const [activeTab, setActiveTab] = useState<'station' | 'list'>('station');

  // Input & Camera states
  const [idInput, setIdInput] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [loading, setLoading] = useState(false);

  // Active verified participant card awaiting confirmation
  const [activeCandidate, setActiveCandidate] = useState<Participant | null>(null);
  const [isDuplicateAlert, setIsDuplicateAlert] = useState(false);
  const [duplicateTime, setDuplicateTime] = useState<string | null>(null);

  // Attendees list state (for CRUD tab)
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all');

  // CRUD Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalParticipant, setEditModalParticipant] = useState<Participant | null>(null);
  const [deleteModalParticipant, setDeleteModalParticipant] = useState<Participant | null>(null);

  // Add Form state
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    college: '',
    department: 'IT',
    year: '3rd Year',
    isVerified: true,
    markPresent: true,
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    college: '',
    department: '',
    isVerified: false,
    isEntered: false,
  });

  // Toast alert
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((cur) => cur?.text === text ? null : cur);
    }, 4000);
  }, []);

  const html5QrCodeRef = useRef<unknown>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Safe fetch with 8s timeout and offline guard
  const safeFetch = useCallback(async (url: string, options: RequestInit = {}, timeoutMs = 8000) => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      throw new Error('OFFLINE');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  // Load roster data
  const loadParticipants = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await safeFetch('/api/registrations');
      const data = await res.json();
      if (res.ok) {
        setParticipants(data.registrations || []);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'OFFLINE') {
        showToast('error', '⚠️ Device is offline. Cannot sync roster.');
      } else if (err instanceof Error && err.message === 'TIMEOUT') {
        showToast('error', '⏳ Network timed out loading roster. Retrying...');
      } else {
        if (process.env.NODE_ENV === 'development') console.error('Failed to load participants:', err);
      }
    } finally {
      setLoadingList(false);
    }
  }, [safeFetch, showToast]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // Focus input when entering station tab
  useEffect(() => {
    if (activeTab === 'station' && !cameraOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [activeTab, cameraOpen]);

  // Camera Management
  const startCamera = async () => {
    setCameraError('');
    setCameraOpen(true);
    try {
      // Small tick to ensure DOM element is painted
      await new Promise((resolve) => setTimeout(resolve, 80));

      const { Html5Qrcode } = await import('html5-qrcode');
      if (html5QrCodeRef.current) {
        try {
          const current = html5QrCodeRef.current as { stop: () => Promise<void> };
          await current.stop();
        } catch { }
      }

      const elem = document.getElementById('qr-camera-box');
      if (!elem) {
        throw new Error('Camera container element not found');
      }

      const qrScanner = new Html5Qrcode('qr-camera-box');
      html5QrCodeRef.current = qrScanner;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(160, Math.floor(minEdge * 0.72));
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      };

      await qrScanner.start(
        { facingMode: cameraFacing },
        config,
        (decodedText) => {
          handleLookup(decodedText);
          stopCamera();
        },
        () => { }
      );
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Camera startup error:', err);
      setCameraError('Unable to open camera. Please allow camera permissions or type the ID manually.');
      setCameraOpen(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        const scanner = html5QrCodeRef.current as { stop: () => Promise<void>; clear: () => void };
        await scanner.stop();
        scanner.clear();
      } catch { }
      html5QrCodeRef.current = null;
    }
    setCameraOpen(false);
  };

  const flipCamera = async () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    await stopCamera();
    setTimeout(startCamera, 200);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          const scanner = html5QrCodeRef.current as { stop: () => Promise<void> };
          scanner.stop().catch(() => { });
        } catch { }
      }
    };
  }, []);

  // Lookup Participant by ID or QR text
  const handleLookup = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      const res = await safeFetch('/api/entry/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: trimmed }),
      });

      const data: ScanResult = await res.json();

      if (!res.ok || !data.found || !data.participant) {
        playSound('warning');
        showToast('error', data.error || 'Participant not found. Check the ID and try again.');
        setActiveCandidate(null);
        setIsDuplicateAlert(false);
        return;
      }

      playSound('success');
      const p = data.participant;
      setActiveCandidate(p);

      if (data.isDuplicate || p.isEntered) {
        setIsDuplicateAlert(true);
        setDuplicateTime(data.enteredAt || p.enteredAt || null);
      } else {
        setIsDuplicateAlert(false);
        setDuplicateTime(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'OFFLINE') {
        showToast('error', '⚠️ Device is offline. Reconnect to Wi-Fi to scan passes.');
      } else if (err instanceof Error && err.message === 'TIMEOUT') {
        showToast('error', '⏳ Network timed out (weak venue connection). Please tap to retry.');
      } else {
        if (process.env.NODE_ENV === 'development') console.error('Lookup error:', err);
        showToast('error', 'Network error during lookup. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit typed ID
  const handleIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idInput.trim()) return;
    handleLookup(idInput.toUpperCase());
    setIdInput('');
  };

  // Mark Present (Action with user confirmation)
  const handleConfirmAttendance = async (participantId: string, verifyPayment: boolean = false) => {
    try {
      setLoading(true);
      const res = await safeFetch('/api/entry/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: participantId,
          forceOverride: isDuplicateAlert,
          verifyPayment,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playSound('success');
        const p = result.participant;
        const displayId = p.participantId || (p.participantNumber ? `TB${String(p.participantNumber).padStart(3, '0')}` : 'TB');

        showToast('success', `✓ Marked Present: ${p.name} (${displayId})`);

        // Update candidate display
        setActiveCandidate({
          ...p,
          isEntered: true,
          enteredAt: result.enteredAt,
          isVerified: verifyPayment ? true : p.isVerified,
        });
        setIsDuplicateAlert(false);

        // Refresh list
        loadParticipants();
      } else if (res.status === 409 || result.duplicate) {
        playSound('warning');
        setIsDuplicateAlert(true);
        setDuplicateTime(result.enteredAt);
        if (result.participant && activeCandidate) {
          setActiveCandidate({
            ...activeCandidate,
            isEntered: true,
            enteredAt: result.enteredAt,
          });
        }
        showToast('error', result.error || 'DUPLICATE ENTRY ALERT: Already checked in!');
      } else if (res.status === 429) {
        showToast('error', result.error || 'Scan rate limit reached. Please wait a few seconds.');
      } else {
        showToast('error', result.error || 'Failed to record attendance');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'OFFLINE') {
        showToast('error', '⚠️ Device is offline. Reconnect to Wi-Fi to confirm attendance.');
      } else if (err instanceof Error && err.message === 'TIMEOUT') {
        showToast('error', '⏳ Network timed out recording attendance. Please retry.');
      } else {
        if (process.env.NODE_ENV === 'development') console.error('Checkin error:', err);
        showToast('error', 'Error recording attendance. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mark Absent / Undo attendance
  const handleRemoveAttendance = async (participantId: string, participantName: string) => {
    if (!confirm(`Mark ${participantName} as ABSENT? This will remove their attendance record.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/entry/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: participantId }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playSound('warning');
        showToast('info', `Attendance removed for ${participantName}`);

        if (activeCandidate?.id === participantId) {
          setActiveCandidate({
            ...activeCandidate,
            isEntered: false,
            enteredAt: null,
          });
          setIsDuplicateAlert(false);
        }

        loadParticipants();
      } else {
        showToast('error', result.error || 'Failed to remove attendance');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Undo error:', err);
      showToast('error', 'Error updating attendance');
    } finally {
      setLoading(false);
    }
  };

  // Delete participant
  const handleDeleteParticipant = async (participantId: string, participantName: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/registrations/${participantId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('success', `Deleted ${participantName}`);
        setDeleteModalParticipant(null);
        if (activeCandidate?.id === participantId) {
          setActiveCandidate(null);
        }
        loadParticipants();
      } else {
        const data = await res.json();
        showToast('error', data.error || 'Failed to delete');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Delete error:', err);
      showToast('error', 'Error deleting participant');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (p: Participant) => {
    setEditModalParticipant(p);
    setEditForm({
      name: p.name || '',
      phone: p.phone || '',
      college: p.college || '',
      department: p.department || '',
      isVerified: p.isVerified,
      isEntered: p.isEntered,
    });
  };

  // Save Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalParticipant) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/registrations/${editModalParticipant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          college: editForm.college.trim(),
          department: editForm.department.trim(),
          isVerified: editForm.isVerified,
          isEntered: editForm.isEntered,
        }),
      });

      if (res.ok) {
        showToast('success', `Updated ${editForm.name}`);
        setEditModalParticipant(null);
        loadParticipants();

        if (activeCandidate?.id === editModalParticipant.id) {
          setActiveCandidate((prev) => prev ? {
            ...prev,
            name: editForm.name,
            phone: editForm.phone,
            college: editForm.college,
            department: editForm.department,
            isVerified: editForm.isVerified,
            isEntered: editForm.isEntered,
          } : null);
        }
      } else {
        const data = await res.json();
        showToast('error', data.error || 'Failed to update');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Update error:', err);
      showToast('error', 'Error updating participant');
    } finally {
      setLoading(false);
    }
  };

  // Save Add Form
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.college.trim() || !addForm.phone.trim()) {
      showToast('error', 'Name, College, and Phone are required.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          phone: addForm.phone.trim(),
          college: addForm.college.trim(),
          department: addForm.department.trim(),
          year: addForm.year,
          isVerified: addForm.isVerified,
          isEntered: addForm.markPresent,
          amount: 250,
          paymentUtr: addForm.isVerified ? 'CASH' : 'PENDING',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const created = data.registration;
        const displayId = created.participantId || (created.participantNumber ? `TB${String(created.participantNumber).padStart(3, '0')}` : 'TB');
        showToast('success', `Added ${created.name} (${displayId})!`);
        setAddModalOpen(false);
        setAddForm({
          name: '',
          phone: '',
          college: '',
          department: 'IT',
          year: '3rd Year',
          isVerified: true,
          markPresent: true,
        });
        loadParticipants();
      } else {
        showToast('error', data.error || 'Failed to add participant');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Add error:', err);
      showToast('error', 'Error adding participant');
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = participants.length;
    const present = participants.filter((p) => p.isEntered).length;
    const absent = total - present;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, percent };
  }, [participants]);

  // Filtered participants list for CRUD tab
  const filteredList = useMemo(() => {
    return participants.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const pId = (p.participantId || (p.participantNumber ? `TB${String(p.participantNumber).padStart(3, '0')}` : '')).toLowerCase();

      if (q) {
        const matches =
          p.name.toLowerCase().includes(q) ||
          pId.includes(q) ||
          p.college.toLowerCase().includes(q) ||
          p.phone.includes(q);
        if (!matches) return false;
      }

      if (filterStatus === 'present' && !p.isEntered) return false;
      if (filterStatus === 'absent' && p.isEntered) return false;

      return true;
    });
  }, [participants, searchQuery, filterStatus]);

  // Quick export
  const handleExportCSV = () => {
    const rows = filteredList.map((p) => {
      const displayId = p.participantId || (p.participantNumber ? `TB${String(p.participantNumber).padStart(3, '0')}` : 'TB');
      return {
        'ID': displayId,
        'Name': p.name,
        'College': p.college,
        'Phone': p.phone,
        'Attendance': p.isEntered ? 'Present' : 'Absent',
        'Check-in Time': p.enteredAt ? formatTimeOnly(p.enteredAt) : '—',
        'Fee': p.isVerified ? 'Paid' : 'Pending',
      };
    });
    exportToCSV(`Attendance_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-16 px-2 sm:px-4">

      {/* 1. Header with clear counter & tab switcher */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Attendance Station
            </h1>
          </div>

        </div>

        {/* Counter Pill & Tabs */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
            <span>{stats.present} / {stats.total} Present ({stats.percent}%)</span>
          </div>

          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('station')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'station'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Check-in
            </button>
            <button
              onClick={() => {
                setActiveTab('list');
                loadParticipants();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'list'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Manage ({stats.total})
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SIMPLE CHECK-IN STATION                                       */}
      {/* ===================================================================== */}
      {activeTab === 'station' && (
        <div className="space-y-4">

          {/* Unified Input Card */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">

            <form onSubmit={handleIdSubmit} className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Enter Participant ID or Number:
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="e.g. TB001, or simply 1, 2, 3..."
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white text-base sm:text-lg font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none transition-all uppercase"
                    disabled={loading}
                    autoFocus
                  />
                  {idInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setIdInput('');
                        inputRef.current?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
                    >
                      CLEAR
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !idInput.trim()}
                  className="px-5 sm:px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden xs:inline">Check</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Camera Scanner Toggle */}
            <div className="pt-2 border-t border-slate-100 flex flex-col xs:flex-row xs:items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Want to scan physical badge or ticket?</span>
              <button
                type="button"
                onClick={() => {
                  if (cameraOpen) {
                    stopCamera();
                  } else {
                    startCamera();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${cameraOpen
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
              >
                {cameraOpen ? (
                  <>
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Close Camera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Open Camera Scanner</span>
                  </>
                )}
              </button>
            </div>

            {/* Embedded Live Camera Scanner (Always mounted in DOM to prevent element-not-found error) */}
            <div className={`p-4 bg-slate-900 rounded-2xl space-y-3 animate-fadeIn ${cameraOpen ? 'block' : 'hidden'}`}>
              <div className="flex items-center justify-between text-white text-xs px-1">
                <span className="text-slate-300 font-medium">Align QR code within the square scan area</span>
                <button
                  type="button"
                  onClick={flipCamera}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Flip</span>
                </button>
              </div>
              <div className="w-full max-w-[280px] sm:max-w-[340px] mx-auto aspect-square rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center border border-slate-800">
                <div id="qr-camera-box" className="w-full h-full"></div>
              </div>
              {cameraError && (
                <p className="text-xs text-rose-400 text-center">{cameraError}</p>
              )}
            </div>

          </div>

          {/* ATTENDEE VERIFICATION & CONFIRMATION CARD */}
          {activeCandidate && (
            <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-lg p-5 sm:p-6 space-y-4 animate-scaleUp">

              {/* Duplicate Warning if Already Entered */}
              {isDuplicateAlert && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs sm:text-sm flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <strong>Already Marked Present earlier!</strong>
                      {duplicateTime && (
                        <div className="text-xs text-amber-700 mt-0.5">
                          Time checked-in: {formatTimeOnly(duplicateTime)}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttendance(activeCandidate.id, activeCandidate.name)}
                    className="px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold rounded-lg text-xs shrink-0"
                  >
                    Mark Absent
                  </button>
                </div>
              )}

              {/* Success Badge if Marked Present */}
              {!isDuplicateAlert && activeCandidate.isEntered && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs sm:text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>ATTENDANCE RECORDED &bull; PRESENT</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttendance(activeCandidate.id, activeCandidate.name)}
                    className="text-xs text-rose-600 hover:text-rose-800 underline font-bold"
                  >
                    Undo
                  </button>
                </div>
              )}

              {/* Attendee Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono font-black text-xs sm:text-sm">
                      {activeCandidate.participantId || (activeCandidate.participantNumber ? `TB${String(activeCandidate.participantNumber).padStart(3, '0')}` : 'TB')}
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      {activeCandidate.name}
                    </h2>
                  </div>
                  <p className="text-sm font-semibold text-blue-700 mt-1">
                    {activeCandidate.college}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeCandidate.department || 'IT'} &bull; {activeCandidate.phone}
                  </p>
                </div>

                {/* Fee Status Badge */}
                <div className="shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${activeCandidate.isVerified
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                    {activeCandidate.isVerified ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Fee Paid (₹{activeCandidate.amount || 250})</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>Fee Pending</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* ACTION PROMPT: Asking user to confirm attendance */}
              {!activeCandidate.isEntered ? (
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-bold text-slate-600 text-center">
                    Please confirm: Is {activeCandidate.name} present at the gate?
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmAttendance(activeCandidate.id, false)}
                      disabled={loading}
                      className="w-full sm:flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Check className="w-5 h-5" />
                      <span>✓ Confirm Attendance (Mark Present)</span>
                    </button>

                    {!activeCandidate.isVerified && (
                      <button
                        type="button"
                        onClick={() => handleConfirmAttendance(activeCandidate.id, true)}
                        disabled={loading}
                        className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
                      >
                        Verify Fee &amp; Mark Present
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveCandidate(null)}
                      className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">Ready for next participant</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCandidate(null);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Clear Card
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Quick Helper Note */}
          {!activeCandidate && (
            <div className="text-center py-6 text-slate-400 space-y-1">
              <Clock className="w-6 h-6 mx-auto text-slate-300" />
              <p className="text-xs font-medium">Type any Participant ID (e.g. TB001) or open the camera to verify.</p>
              <p className="text-[11px] text-slate-400">The system will ask you to confirm before marking them present.</p>
            </div>
          )}

        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ATTENDEE LIST & SIMPLE CRUD                                   */}
      {/* ===================================================================== */}
      {activeTab === 'list' && (
        <div className="space-y-4">

          {/* Controls Bar: Search, Filters, Add Button */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">

              {/* Search Box */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, TB ID, college..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add Participant</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-all"
                  title="Export to CSV"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={loadParticipants}
                  disabled={loadingList}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-all disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
                </button>
              </div>

            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mr-1">Filter:</span>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${filterStatus === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                All ({participants.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('present')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${filterStatus === 'present'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
              >
                Present ({stats.present})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('absent')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${filterStatus === 'absent'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
              >
                Absent ({stats.absent})
              </button>
            </div>
          </div>

          {/* Simple Clean Table & Mobile Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3 sm:px-4">ID</th>
                    <th className="py-2.5 px-3 sm:px-4">Name &amp; College</th>
                    <th className="py-2.5 px-3 sm:px-4">Status</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingList ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        <Clock className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-500" />
                        <span>Loading list...</span>
                      </td>
                    </tr>
                  ) : filteredList.length > 0 ? (
                    filteredList.map((p) => {
                      const displayId = p.participantId || (p.participantNumber ? `TB${String(p.participantNumber).padStart(3, '0')}` : 'TB');
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* TB ID */}
                          <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                              {displayId}
                            </span>
                          </td>

                          {/* Name & College */}
                          <td className="py-2.5 px-3 sm:px-4">
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{p.college}</div>
                          </td>

                          {/* Attendance Status */}
                          <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">
                            {p.isEntered ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Present</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                Absent
                              </span>
                            )}
                          </td>

                          {/* Simple Actions (CRUD) */}
                          <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Attendance */}
                              {p.isEntered ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttendance(p.id, p.name)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all"
                                  title="Mark Absent"
                                >
                                  Mark Absent
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCandidate(p);
                                    setActiveTab('station');
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                                  title="Confirm & Mark Present"
                                >
                                  Mark Present
                                </button>
                              )}

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => openEditModal(p)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => setDeleteModalParticipant(p)}
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No attendees match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Visible on screens < 640px) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {loadingList ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Clock className="w-5 h-5 animate-spin mx-auto mb-1 text-emerald-500" />
                  <span>Loading list...</span>
                </div>
              ) : filteredList.length > 0 ? (
                filteredList.map((p) => {
                  const displayId = p.participantId || (p.participantNumber ? `TB${String(p.participantNumber).padStart(3, '0')}` : 'TB');
                  return (
                    <div key={p.id} className="p-3.5 bg-white space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                          {displayId}
                        </span>
                        {p.isEntered ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Present</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                            Absent
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.college}</div>
                        {p.phone && <div className="text-[11px] font-mono text-slate-400 mt-0.5">{p.phone}</div>}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg active:scale-95"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalParticipant(p)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg active:scale-95"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {p.isEntered ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveAttendance(p.id, p.name)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold active:scale-95"
                          >
                            Mark Absent
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCandidate(p);
                              setActiveTab('station');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95"
                          >
                            Mark Present
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No attendees match your search.
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-2.5 border-t border-slate-200 text-slate-500 text-[11px] flex justify-between">
              <span>Showing {filteredList.length} of {participants.length} attendees</span>
            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD PARTICIPANT                                                */}
      {/* ===================================================================== */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <UserPlus className="w-5 h-5" />
                <span>Add New Participant</span>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">College *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SXCCE"
                  value={addForm.college}
                  onChange={(e) => setAddForm({ ...addForm, college: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Year</label>
                  <select
                    value={addForm.year}
                    onChange={(e) => setAddForm({ ...addForm, year: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={addForm.isVerified}
                    onChange={(e) => setAddForm({ ...addForm, isVerified: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>Registration Fee Paid (₹250)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-700">
                  <input
                    type="checkbox"
                    checked={addForm.markPresent}
                    onChange={(e) => setAddForm({ ...addForm, markPresent: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>Mark Attendance (Present) Right Now</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Participant
                </button>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: EDIT PARTICIPANT                                               */}
      {/* ===================================================================== */}
      {editModalParticipant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Edit className="w-5 h-5" />
                <span>Edit Participant</span>
              </div>
              <button onClick={() => setEditModalParticipant(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">College</label>
                <input
                  type="text"
                  required
                  value={editForm.college}
                  onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Status checkboxes */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.isVerified}
                    onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Registration Fee Paid</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-700">
                  <input
                    type="checkbox"
                    checked={editForm.isEntered}
                    onChange={(e) => setEditForm({ ...editForm, isEntered: e.target.checked })}
                    className="rounded text-emerald-600"
                  />
                  <span>Attendance: Present</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalParticipant(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DELETE CONFIRMATION                                            */}
      {/* ===================================================================== */}
      {deleteModalParticipant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-sm">Delete Participant?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to permanently delete <strong>{deleteModalParticipant.name}</strong>?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDeleteParticipant(deleteModalParticipant.id, deleteModalParticipant.name)}
                disabled={loading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalParticipant(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '16px',
            zIndex: 2147483647,
            maxWidth: '340px',
            width: 'calc(100vw - 32px)',
          }}
          className="animate-slideInRight"
        >
          <div
            className={`p-3 rounded-2xl shadow-xl border flex items-center justify-between gap-2.5 text-white text-xs font-semibold ${toast.type === 'success'
                ? 'bg-emerald-700 border-emerald-500'
                : toast.type === 'error'
                  ? 'bg-rose-700 border-rose-500'
                  : 'bg-slate-800 border-slate-700'
              }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              ) : toast.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-200 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-blue-200 shrink-0" />
              )}
              <span className="truncate">{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 text-white/70 hover:text-white shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
