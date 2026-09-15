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
  UserCheck 
} from 'lucide-react';
import { formatDate, formatTimeOnly } from '@/lib/utils';
import { playSound } from '@/lib/audio';

interface ScanResult {
  found: boolean;
  participant?: {
    id: string;
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
  name: string;
  college: string;
  teamId: string;
  time: string;
  status: 'entered' | 'duplicate' | 'error';
}

export default function QRScannerPage() {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanLogItem[]>([]);
  const [cameraError, setCameraError] = useState('');

  const html5QrCodeRef = useRef<unknown>(null);
  const isProcessingRef = useRef(false);
  const lastScannedTextRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

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
        setScanHistory((prev) => [
          {
            id: Date.now().toString(),
            name: 'Unknown Pass',
            college: 'Unrecognized QR',
            teamId: rawText.slice(0, 16),
            time: new Date().toLocaleTimeString('en-IN', { hour12: true }),
            status: 'error',
          },
          ...prev.slice(0, 19),
        ]);
        return;
      }

      const p = data.participant;

      // Check if DUPLICATE ENTRY
      if (data.isDuplicate) {
        setScanHistory((prev) => [
          {
            id: Date.now().toString(),
            name: p.name,
            college: p.college,
            teamId: p.teamId || p.id,
            time: new Date().toLocaleTimeString('en-IN', { hour12: true }),
            status: 'duplicate',
          },
          ...prev.slice(0, 19),
        ]);
        return;
      }

      if (autoCheckIn) {
        await executeCheckIn(p.id, false, false);
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

        setScanHistory((prev) => [
          {
            id: Date.now().toString(),
            name: p.name,
            college: p.college,
            teamId: p.teamId || p.id,
            time: new Date().toLocaleTimeString('en-IN', { hour12: true }),
            status: 'entered',
          },
          ...prev.slice(0, 19),
        ]);
      } else if (result.duplicate) {
        playSound('warning');
        setLastScanResult((prev) => prev ? {
          ...prev,
          isDuplicate: true,
          status: 'already_entered',
          enteredAt: result.enteredAt,
        } : null);
      }
    } catch (err) {
      console.error('Check-in execution error:', err);
    } finally {
      setLoading(false);
    }
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
        'Unable to access camera. Please allow camera permissions or use the Photo Upload / Manual Search option below.'
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
    <div className="space-y-6 animate-fadeIn">
      <div id="qr-file-temp" className="hidden"></div>

      {/* Header & Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <QrCode className="w-6 h-6 text-emerald-600" />
              Live QR Entry Gate Station
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot"></span>
              Live Gate Station
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time participant check-in, automatic duplicate entry blocking, and manual override.
          </p>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setAutoCheckIn(!autoCheckIn)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              autoCheckIn
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auto Check-In: {autoCheckIn ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Camera & Scanner + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Cols: Camera Viewport & Fallback Inputs */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Scanner Viewport Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative">
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Live Camera Viewfinder</span>
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
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/20 border border-blue-400 flex items-center justify-center mb-3">
                    <QrCode className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">Gate Camera Standby</h3>
                  <p className="text-xs text-slate-300 max-w-xs mb-4">
                    Position the participant&apos;s ticket or badge QR code in front of the camera.
                  </p>
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Gate Scanner</span>
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
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {cameraError}
              </div>
            )}

            {/* Photo / Screenshot Upload Alternative */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 text-center sm:text-left">
                Participant showing ticket image or screenshot?
              </span>
              <label className="flex items-center justify-center w-full sm:w-auto gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 transition-all">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload QR Image / Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

          </div>

          {/* Rapid Manual Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>Manual Entry Pass Lookup (Smudged / Lost Pass)</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualInput.trim()) {
                  handleProcessScan(manualInput.trim());
                  setManualInput('');
                }
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter Team ID (e.g. TB26-4050-UFPA), Phone, or Name..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={loading || !manualInput.trim()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs"
              >
                Search & Enter
              </button>
            </form>
          </div>

        </div>

        {/* Right 5 Cols: Live Result Card & Scan History */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Active Scan Result Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs min-h-[290px] flex flex-col justify-between">
            
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Attendee Verification Card
                </span>
                {loading && (
                  <span className="text-xs font-bold text-blue-600 animate-pulse flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Verifying...
                  </span>
                )}
              </div>

              {lastScanResult ? (
                <div className="mt-4 space-y-4 animate-fadeIn">
                  
                  {/* DUPLICATE ENTRY ALERT BANNER */}
                  {lastScanResult.isDuplicate && (
                    <div className="p-4 rounded-xl bg-red-50 border-2 border-red-400 text-red-800 space-y-2">
                      <div className="flex items-center gap-2 font-black text-sm text-red-700">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <span>DUPLICATE ENTRY ALERT!</span>
                      </div>
                      <p className="text-xs text-red-700 font-medium">
                        This pass was <strong>ALREADY USED</strong> for campus entry at:
                      </p>
                      <div className="font-mono text-sm font-bold bg-white p-2 rounded-lg text-red-800 border border-red-200 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-600" />
                        {formatDate(lastScanResult.enteredAt)}
                      </div>
                      <p className="text-[10px] text-red-600">
                        Notice: Duplicate entry blocks sharing tickets across attendees.
                      </p>
                    </div>
                  )}

                  {/* SUCCESS ENTRY BANNER */}
                  {!lastScanResult.isDuplicate && lastScanResult.participant?.isEntered && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                      <div>
                        <div className="font-black text-xs text-emerald-800 uppercase tracking-wide">
                          ENTRY GRANTED &bull; ATTENDANCE LOGGED
                        </div>
                        <div className="text-[11px] text-emerald-700 font-mono mt-0.5">
                          Entered: {formatTimeOnly(lastScanResult.participant.enteredAt)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Participant Information Card */}
                  {lastScanResult.participant && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-base font-black text-slate-900">
                            {lastScanResult.participant.name}
                          </div>
                          <div className="text-xs font-semibold text-blue-700 mt-0.5">
                            {lastScanResult.participant.college}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {lastScanResult.participant.department || 'IT'} &bull; {lastScanResult.participant.phone}
                          </div>
                        </div>

                        {/* Payment Badge */}
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${
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
                              <span>UTR PENDING</span>
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
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-[10px] font-mono text-slate-500">
                        <span>TEAM / REF:</span>
                        <span className="text-slate-800 font-bold">
                          {lastScanResult.participant.teamId || lastScanResult.participant.id}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Manual Override Action for Duplicates */}
                  {lastScanResult.isDuplicate && lastScanResult.participant && (
                    <button
                      onClick={() => executeCheckIn(lastScanResult.participant!.id, true, false)}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs"
                    >
                      Override Duplicate Alert & Re-Grant Entry
                    </button>
                  )}

                  {/* If Not Checked In Yet */}
                  {!lastScanResult.isDuplicate && !lastScanResult.participant?.isEntered && (
                    <div className="space-y-2">
                      <button
                        onClick={() => executeCheckIn(lastScanResult.participant!.id, false, false)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Grant Gate Entry</span>
                      </button>

                      {!lastScanResult.participant?.isVerified && (
                        <button
                          onClick={() => executeCheckIn(lastScanResult.participant!.id, false, true)}
                          className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify Payment & Grant Entry</span>
                        </button>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <QrCode className="w-12 h-12 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">Awaiting next pass scan...</p>
                  <p className="text-[11px] text-slate-400">
                    Scan results and participant details will appear here instantly.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
              <span>Station: Gate A (Main Entrance)</span>
              <span className="text-emerald-600 font-semibold">&bull; Online</span>
            </div>

          </div>

          {/* Recent Scans Session Log */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Recent Scans this Session</span>
              <span className="font-mono text-[11px] text-slate-500">{scanHistory.length} Total</span>
            </div>

            {scanHistory.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {scanHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.college}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        item.status === 'entered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'duplicate'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.status}
                      </span>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">
                No scans recorded yet.
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
