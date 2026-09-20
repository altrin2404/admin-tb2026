'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  QrCode, 
  Camera, 
  CameraOff, 
  Upload, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RotateCw, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  UserCheck,
  Hash,
  ArrowRight,
  Sparkle,
  UserX,
  X
} from 'lucide-react';
import { formatDate, formatTimeOnly } from '@/lib/utils';
import { playSound } from '@/lib/audio';

interface ScanResult {
  found: boolean;
  participant?: {
    id: string;
    participantId?: string | null;
    participantNumber?: number | null;
    formattedParticipantId?: string | null;
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
    techEventsList: string[];
    nonTechEventsList: string[];
  };
  teamMembers?: Array<Record<string, unknown>>;
  isDuplicate?: boolean;
  enteredAt?: string | null;
  status: 'ready' | 'already_entered' | 'payment_pending';
  error?: string;
}

interface ScanLogItem {
  id: string;
  recordId?: string;
  name: string;
  college: string;
  teamId: string;
  participantId?: string;
  time: string;
  status: 'entered' | 'duplicate' | 'error' | 'removed';
}

export default function AttendancePage() {
  // Mode selection: 'id' (Participant ID enter) or 'qr' (Live QR Scanner)
  const [attendanceMode, setAttendanceMode] = useState<'id' | 'qr'>('id');
  
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [participantIdInput, setParticipantIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanLogItem[]>([]);
  const [cameraError, setCameraError] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((cur) => cur?.text === text ? null : cur);
    }, 4000);
  }, []);

  const html5QrCodeRef = useRef<unknown>(null);
  const isProcessingRef = useRef(false);
  const lastScannedTextRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const idInputRef = useRef<HTMLInputElement>(null);

  // Focus ID input when in ID mode
  useEffect(() => {
    if (attendanceMode === 'id') {
      setTimeout(() => idInputRef.current?.focus(), 100);
    }
  }, [attendanceMode]);

  const handleProcessScan = useCallback(async (rawText: string) => {
    const now = Date.now();
    if (
      rawText === lastScannedTextRef.current && 
      now - lastScannedTimeRef.current < 2500
    ) {
      return;
    }
    lastScannedTextRef.current = rawText;
    lastScannedTimeRef.current = now;

    try {
      setLoading(true);
      const res = await fetch('/api/entry/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: rawText }),
      });

      const data: ScanResult = await res.json();
      setLastScanResult(data);

      if (!res.ok || !data.found || !data.participant) {
        playSound('warning');
        setScanHistory((prev) => [
          {
            id: Date.now().toString(),
            name: 'Not Found',
            college: data.error || 'Unrecognized ID/QR',
            teamId: rawText.slice(0, 16),
            participantId: rawText.toUpperCase().startsWith('TB') ? rawText.toUpperCase() : undefined,
            time: new Date().toLocaleTimeString('en-IN', { hour12: true }),
            status: 'error',
          },
          ...prev.slice(0, 19),
        ]);
        return;
      }

      const p = data.participant;
      const displayId = p.participantId || (p.participantNumber ? `TB${String(p.participantNumber).padStart(3, '0')}` : undefined);

      // Check if DUPLICATE ENTRY (Already marked attendance)
      if (data.isDuplicate) {
        playSound('warning');
        setScanHistory((prev) => [
          {
            id: Date.now().toString(),
            name: p.name,
            college: p.college,
            teamId: p.teamId || p.id,
            participantId: displayId,
            time: new Date().toLocaleTimeString('en-IN', { hour12: true }),
            status: 'duplicate',
          },
          ...prev.slice(0, 19),
        ]);
        return;
      }

      if (autoCheckIn) {
        await executeCheckIn(p.id, false, false);
      } else {
        playSound('success');
      }

    } catch (err) {
      console.error('Scan processing error:', err);
    } finally {
      setLoading(false);
    }
  }, [autoCheckIn]);

  const executeCheckIn = async (participantId: string, forceOverride: boolean = false, verifyPayment: boolean = false) => {
    try {
      setLoading(true);
      const res = await fetch('/api/entry/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: participantId,
          forceOverride,
          verifyPayment,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playSound('success');
        const p = result.participant;
        setLastScanResult((prev) => prev ? {
          ...prev,
          isDuplicate: false,
          status: 'ready',
          participant: {
            ...prev.participant!,
            isEntered: true,
            enteredAt: result.enteredAt,
            isVerified: verifyPayment ? true : prev.participant!.isVerified,
          },
        } : null);

        const displayId = prevParticipantDisplayId();

        setScanHistory((prev) => [
          {
            id: Date.now().toString(),
            recordId: p.id,
            name: p.name,
            college: p.college,
            teamId: p.teamId || p.id,
            participantId: displayId,
            time: new Date().toLocaleTimeString('en-IN', { hour12: true }),
            status: 'entered',
          },
          ...prev.slice(0, 19),
        ]);

        showToast('success', `${p.name} marked Present (${displayId || 'TB'})`);
      } else if (result.duplicate) {
        playSound('warning');
        setLastScanResult((prev) => prev ? {
          ...prev,
          isDuplicate: true,
          status: 'already_entered',
          enteredAt: result.enteredAt,
        } : null);
        showToast('error', `Already checked in earlier`);
      }
    } catch (err) {
      console.error('Attendance check-in execution error:', err);
      showToast('error', 'Error recording attendance');
    } finally {
      setLoading(false);
    }
  };

  const executeUndo = async (participantRecordId: string, participantName?: string) => {
    if (!confirm(`Are you sure you want to REMOVE attendance for ${participantName || 'this participant'}? They will be marked as absent.`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/entry/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: participantRecordId }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        playSound('warning');
        setLastScanResult((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            isDuplicate: false,
            status: 'ready',
            participant: prev.participant ? {
              ...prev.participant,
              isEntered: false,
              enteredAt: null,
            } : undefined,
          };
        });

        // Update session scan history
        setScanHistory((prev) =>
          prev.map((item) =>
            item.recordId === participantRecordId || item.teamId === participantRecordId || (participantName && item.name === participantName)
              ? { ...item, status: 'removed' as const, college: 'Attendance Removed' }
              : item
          )
        );

        showToast('info', `Attendance removed for ${participantName || 'participant'}`);
      } else {
        showToast('error', result.error || 'Failed to remove attendance');
      }
    } catch (err) {
      console.error('Undo attendance error:', err);
      showToast('error', 'Network error: could not remove attendance');
    } finally {
      setLoading(false);
    }
  };

  const prevParticipantDisplayId = () => {
    if (!lastScanResult?.participant) return undefined;
    const p = lastScanResult.participant;
    return p.participantId || (p.participantNumber ? `TB${String(p.participantNumber).padStart(3, '0')}` : undefined);
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (html5QrCodeRef.current) {
        try {
          const current = html5QrCodeRef.current as { stop: () => Promise<void> };
          await current.stop();
        } catch {}
      }

      const qrScanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = qrScanner;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
      };

      await qrScanner.start(
        { facingMode: cameraFacing },
        config,
        (decodedText) => {
          if (!isProcessingRef.current) {
            handleProcessScan(decodedText);
          }
        },
        () => {}
      );

      setScannerActive(true);
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      setCameraError(
        'Unable to access camera. Please allow camera permissions or use the Participant ID entry option.'
      );
      setScannerActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        const scanner = html5QrCodeRef.current as { stop: () => Promise<void>; clear: () => void };
        await scanner.stop();
        scanner.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  };

  const toggleFacing = async () => {
    const nextMode = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextMode);
    if (scannerActive) {
      await stopCamera();
      setTimeout(startCamera, 300);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const { Html5Qrcode } = await import('html5-qrcode');
      const tempScanner = new Html5Qrcode('qr-file-temp');
      const decodedText = await tempScanner.scanFile(file, true);
      handleProcessScan(decodedText);
      tempScanner.clear();
    } catch (err) {
      console.error('Failed to parse QR from image:', err);
      alert('Could not find or decode a QR code from this image. Please ensure the QR is clear and well-lit.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Normalize: trim and uppercase so 'tb001' == 'TB001'
    const raw = participantIdInput.trim().toUpperCase();
    if (!raw) return;

    handleProcessScan(raw);
    setParticipantIdInput('');
    idInputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          const scanner = html5QrCodeRef.current as { stop: () => Promise<void> };
          scanner.stop().catch(() => {});
        } catch {}
      }
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      <div id="qr-file-temp" className="hidden"></div>

      {/* Header & Controls Bar */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <h1 className="text-base sm:text-2xl font-black text-slate-900 truncate">
              Attendance Station
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot"></span>
              Live
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate hidden xs:block">
            Participant ID (TB001...) or Live QR scanner
          </p>
        </div>

        {/* Auto Attendance Toggle */}
        <button
          onClick={() => setAutoCheckIn(!autoCheckIn)}
          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all active:scale-95 ${
            autoCheckIn
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Auto: {autoCheckIn ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Main Grid: Input Station (ID or QR) + Live Attendee Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left 7 Cols: Mode Switcher + Active Input View */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">
          
          {/* TWO PRIMARY OPTIONS SWITCHER TABS */}
          <div className="bg-slate-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200 grid grid-cols-2 gap-1.5 sm:gap-2 shadow-xs">
            <button
              type="button"
              onClick={() => {
                setAttendanceMode('id');
                if (scannerActive) stopCamera();
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all ${
                attendanceMode === 'id'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Hash className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Enter ID</span>
                <span className="hidden sm:inline">Enter Participant ID</span>
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono">
                TB001...
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAttendanceMode('qr');
                if (!scannerActive) startCamera();
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all ${
                attendanceMode === 'qr'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                <span className="sm:hidden">Scan QR</span>
                <span className="hidden sm:inline">Scan QR Code</span>
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono">
                Camera
              </span>
            </button>
          </div>

          {/* OPTION 1: PARTICIPANT ID ENTRY CARD */}
          {attendanceMode === 'id' && (
            <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-blue-200 shadow-xs space-y-3 sm:space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0 text-xs sm:text-sm">
                    #
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      Participant ID Entry
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 truncate hidden xs:block">
                      Type attendee master ID to record attendance
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  Option 1
                </span>
              </div>

              <form onSubmit={handleIdSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 mb-1">
                    Participant ID / Number
                  </label>
                  <div className="relative">
                    <input
                      ref={idInputRef}
                      type="text"
                      value={participantIdInput}
                      onChange={(e) => {
                        // Normalize to uppercase immediately — tb001 and TB001 are the same
                        setParticipantIdInput(e.target.value.toUpperCase());
                      }}
                      autoCapitalize="characters"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="e.g. TB001 or tb001 or 1, 2, 3..."
                      className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white text-base sm:text-lg font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-inner uppercase"
                      disabled={loading}
                      autoFocus
                    />
                    {participantIdInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setParticipantIdInput('');
                          idInputRef.current?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 active:scale-95"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Sparkle className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="truncate">
                      Case-insensitive: <strong>tb001</strong> = <strong>TB001</strong>. Type <strong>1</strong> for TB001.
                    </span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !participantIdInput.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Checking In...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Mark Attendance (Enter)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Preset Buttons for Rapid Testing/Lookup */}
              <div className="pt-2.5 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Rapid Numeric Shortcuts:
                </div>
                <div className="flex flex-wrap gap-1">
                  {['TB001', 'TB002', 'TB003', 'TB004', 'TB005'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setParticipantIdInput(preset);
                        handleProcessScan(preset);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-[11px] font-mono font-semibold text-slate-700 transition-colors active:scale-95"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* OPTION 2: QR SCANNER CARD */}
          {attendanceMode === 'qr' && (
            <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-sm relative animate-fadeIn space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      Live QR Code Gate Scanner
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Scan digital or physical badges / tickets in front of camera
                    </p>
                  </div>
                </div>

                {scannerActive && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleFacing}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 border border-slate-200"
                      title="Switch camera"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Flip</span>
                    </button>
                    <button
                      onClick={stopCamera}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-[11px] font-semibold border border-red-200"
                    >
                      <CameraOff className="w-3 h-3" />
                      <span>Stop</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Video Container */}
              <div className="relative w-full h-[260px] sm:h-[340px] md:h-[380px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 flex items-center justify-center">
                
                <div id="qr-reader" className="w-full h-full object-cover"></div>

                {!scannerActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mb-3">
                      <QrCode className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">Attendance Camera Standby</h3>
                    <p className="text-xs text-slate-300 max-w-xs mb-4">
                      Hold the participant&apos;s ticket or PDF pass QR code in front of the lens.
                    </p>
                    <button
                      onClick={startCamera}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Camera Scanner</span>
                    </button>
                  </div>
                )}

                {scannerActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-emerald-400 rounded-2xl relative shadow-2xl">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br"></div>
                      
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent scan-beam"></div>
                    </div>
                  </div>
                )}

              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {cameraError}
                </div>
              )}

              {/* Photo / Screenshot Upload Alternative */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500 text-center sm:text-left">
                  Attendee showing screenshot / downloaded pass?
                </span>
                <label className="flex items-center justify-center w-full sm:w-auto gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 transition-all">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Upload QR Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

            </div>
          )}

        </div>

        {/* Right 5 Cols: Live Result Card & Attendance History */}
        <div className="lg:col-span-5 space-y-3 sm:space-y-4">
          
          {/* Active Attendee Verification Card */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs min-h-[130px] sm:min-h-[300px] flex flex-col justify-between">
            
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Attendee Verification Card
                </span>
                {loading && (
                  <span className="text-[11px] sm:text-xs font-bold text-blue-600 animate-pulse flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Verifying...
                  </span>
                )}
              </div>

              {lastScanResult ? (
                <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4 animate-fadeIn">
                  
                  {/* DUPLICATE ENTRY ALERT BANNER */}
                  {lastScanResult.isDuplicate && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-red-50 border-2 border-red-400 text-red-800 space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
                        <span>ALREADY MARKED ATTENDANCE!</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-red-700 font-medium">
                        This attendee was <strong>ALREADY CHECKED IN</strong> at:
                      </p>
                      <div className="font-mono text-xs sm:text-sm font-bold bg-white p-2 rounded-lg text-red-800 border border-red-200 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                        {formatDate(lastScanResult.enteredAt)}
                      </div>
                      <p className="text-[10px] text-red-600">
                        Notice: Duplicate check-in blocks reusing tickets or ID numbers across attendees.
                      </p>
                    </div>
                  )}

                  {/* SUCCESS ENTRY BANNER */}
                  {!lastScanResult.isDuplicate && lastScanResult.participant?.isEntered && (
                    <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5 sm:gap-3">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
                      <div>
                        <div className="font-black text-[11px] sm:text-xs text-emerald-800 uppercase tracking-wide">
                          ATTENDANCE LOGGED &bull; PRESENT
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-emerald-700 font-mono mt-0.5">
                          Time: {formatTimeOnly(lastScanResult.participant.enteredAt)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Participant Information Card */}
                  {lastScanResult.participant && (
                    <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 sm:space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-mono font-black text-[11px] sm:text-xs shadow-xs">
                              {lastScanResult.participant.participantId || (lastScanResult.participant.participantNumber ? `TB${String(lastScanResult.participant.participantNumber).padStart(3, '0')}` : 'TB---')}
                            </span>
                            <div className="text-sm sm:text-base font-black text-slate-900 truncate">
                              {lastScanResult.participant.name}
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-blue-700 mt-1 truncate">
                            {lastScanResult.participant.college}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                            {lastScanResult.participant.department || 'IT'} &bull; {lastScanResult.participant.phone}
                          </div>
                        </div>

                        {/* Payment Badge */}
                        <span className={`px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black flex items-center gap-1 shrink-0 ${
                          lastScanResult.participant.isVerified
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {lastScanResult.participant.isVerified ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-700" />
                              <span>PAID ₹{lastScanResult.participant.amount || 200}</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3 text-amber-700" />
                              <span>PENDING</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Registered Events */}
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Registered Events:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            ...(lastScanResult.participant.techEventsList || []),
                            ...(lastScanResult.participant.nonTechEventsList || []),
                          ].map((ev, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200"
                            >
                              {ev}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Team ID */}
                      <div className="pt-1.5 border-t border-slate-200 flex justify-between text-[10px] font-mono text-slate-500">
                        <span>TEAM / REF:</span>
                        <span className="text-slate-800 font-bold truncate max-w-[150px]">
                          {lastScanResult.participant.teamId || lastScanResult.participant.id}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="space-y-2 pt-1">
                    {/* If Already Checked In or Duplicate: Show Remove Attendance & Override */}
                    {lastScanResult.participant && (lastScanResult.participant.isEntered || lastScanResult.isDuplicate) && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {lastScanResult.isDuplicate && (
                          <button
                            type="button"
                            onClick={() => executeCheckIn(lastScanResult.participant!.id, true, false)}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Override &amp; Re-Mark</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => executeUndo(lastScanResult.participant!.id, lastScanResult.participant!.name)}
                          disabled={loading}
                          className="flex-1 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 hover:border-rose-400 font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
                          title="Remove attendance for this participant (mark absent)"
                        >
                          <UserX className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Remove Attendance</span>
                        </button>
                      </div>
                    )}

                    {/* If Not Checked In Yet */}
                    {!lastScanResult.isDuplicate && !lastScanResult.participant?.isEntered && lastScanResult.participant && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => executeCheckIn(lastScanResult.participant!.id, false, false)}
                          disabled={loading}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Confirm Attendance (Mark Present)</span>
                        </button>

                        {!lastScanResult.participant?.isVerified && (
                          <button
                            type="button"
                            onClick={() => executeCheckIn(lastScanResult.participant!.id, false, true)}
                            disabled={loading}
                            className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify Fee &amp; Mark Attendance</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="py-6 sm:py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-1 sm:space-y-2">
                  <UserCheck className="w-8 h-8 sm:w-12 sm:h-12 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">Awaiting participant check-in...</p>
                  <p className="text-[11px] text-slate-400">
                    Enter Participant ID (e.g. TB001) or scan QR code to verify.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 flex justify-between">
              <span>Attendance Station: Gate A</span>
              <span className="text-emerald-600 font-semibold">&bull; Ready</span>
            </div>

          </div>

          {/* Recent Attendance Session Log */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Recent Attendance this Session</span>
              <span className="font-mono text-[11px] text-slate-500">{scanHistory.length} Recorded</span>
            </div>

            {scanHistory.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.participantId && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold text-[10px]">
                            {item.participantId}
                          </span>
                        )}
                        <span className="font-bold text-slate-900 truncate">{item.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">{item.college}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                          item.status === 'entered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'duplicate'
                            ? 'bg-red-100 text-red-800'
                            : item.status === 'removed'
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.status === 'entered' ? 'Present' : item.status === 'duplicate' ? 'Duplicate' : item.status === 'removed' ? 'Removed' : 'Error'}
                        </span>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5">{item.time}</div>
                      </div>
                      {item.status === 'entered' && (
                        <button
                          type="button"
                          onClick={() => executeUndo(item.recordId || item.teamId, item.name)}
                          title={`Remove attendance for ${item.name}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all active:scale-95"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No attendance recorded yet.
              </p>
            )}
          </div>

        </div>

      </div>

      {/* Fixed Bottom-Right Toast Alert Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '16px',
            zIndex: 2147483647,
            maxWidth: '360px',
            width: 'calc(100vw - 32px)',
          }}
          className="animate-slideInRight"
        >
          <div
            className={`p-3.5 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-white text-xs sm:text-sm font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-700 border-emerald-500'
                : toastMessage.type === 'error'
                ? 'bg-rose-700 border-rose-500'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
              ) : toastMessage.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-200 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-blue-200 shrink-0" />
              )}
              <span className="truncate">{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 text-white/70 hover:text-white shrink-0 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
