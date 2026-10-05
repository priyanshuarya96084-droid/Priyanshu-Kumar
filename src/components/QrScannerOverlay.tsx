import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  Zap,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Maximize2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface QrScannerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (roomId: string) => void;
  currentRoomId: string;
}

export const QrScannerOverlay: React.FC<QrScannerOverlayProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  currentRoomId,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [detectedRoom, setDetectedRoom] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'matched' | 'error'>('idle');
  const [manualRoomInput, setManualRoomInput] = useState<string>('');

  // Audio beep using Web Audio API (synthesized locally, no asset files needed)
  const playSuccessBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.14); // Quick octave jump

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio playback is optional
    }
  }, []);

  // Helper to extract clean room ID from scanned QR data
  const extractRoomId = useCallback((data: string): string | null => {
    if (!data) return null;
    const trimmed = data.trim();

    try {
      // 1. Check if it's a URL with query param
      if (trimmed.includes('?room=') || trimmed.includes('&room=')) {
        const urlStr = trimmed.startsWith('http') ? trimmed : `http://localhost/${trimmed.replace(/^\/?/, '')}`;
        const url = new URL(urlStr);
        const r = url.searchParams.get('room');
        if (r && r.trim().length > 0) {
          return r.trim().toUpperCase();
        }
      }

      // 2. Check if it's JSON
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        const r = parsed.room || parsed.roomId;
        if (r && typeof r === 'string') {
          return r.trim().toUpperCase();
        }
      }

      // 3. Check for pattern "room: ROOM_ID" or "room=ROOM_ID"
      const match = trimmed.match(/(?:room|roomid)[:=]\s*([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }

      // 4. Standalone room code (e.g. COMM-LAB, ALPHA-7, ROOM-123)
      if (/^[A-Za-z0-9_-]{3,24}$/.test(trimmed)) {
        return trimmed.toUpperCase();
      }
    } catch (err) {
      console.warn('QR parse fallback', err);
    }

    return null;
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  // Toggle flashlight / torch if hardware supports it
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed', err);
    }
  };

  // Switch camera if multiple exist
  const switchCamera = async () => {
    if (availableDevices.length <= 1) return;
    const currentIndex = availableDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    setSelectedDeviceId(availableDevices[nextIndex].deviceId);
  };

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);
    setDetectedRoom(null);
    setScanStatus('scanning');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
      setErrorMessage('Camera access is not supported by your browser environment.');
      setScanStatus('error');
      return;
    }

    try {
      // Find video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setTorchAvailable(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        startScanLoop();
      }
    } catch (err: any) {
      console.error('Camera init error:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device found on this system.');
      } else {
        setErrorMessage(err.message || 'Unable to start camera.');
      }
      setScanStatus('error');
    }
  }, [selectedDeviceId, stopCamera]);

  // Main QR detection loop using jsQR
  const startScanLoop = useCallback(() => {
    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width === 0 || height === 0) {
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Analyze at responsive scale for 60fps throughput
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          const room = extractRoomId(code.data);
          if (room) {
            setDetectedRoom(room);
            setScanStatus('matched');
            playSuccessBeep();

            // Try device vibration if available
            try {
              if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
            } catch {}

            // Delay briefly so the user sees the confirmation reticle before connecting
            setTimeout(() => {
              stopCamera();
              onScanSuccess(room);
              onClose();
            }, 650);
            return;
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [extractRoomId, onClose, onScanSuccess, playSuccessBeep, stopCamera]);

  // Handle open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setDetectedRoom(null);
      setScanStatus('idle');
      setErrorMessage(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Handle ESC key to exit overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fallback direct join
  const handleManualJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRoomInput.trim()) return;
    const room = manualRoomInput.trim().toUpperCase();
    playSuccessBeep();
    stopCamera();
    onScanSuccess(room);
    onClose();
  };

  // Demo scan test
  const handleSimulateScan = () => {
    const demoRooms = ['COMM-LAB', 'DEV-NET', 'SECURE-MESH', 'STUDIO-ALPHA'];
    const pick = demoRooms.find((r) => r !== currentRoomId) || 'ROOM-DEMO';
    setDetectedRoom(pick);
    setScanStatus('matched');
    playSuccessBeep();
    setTimeout(() => {
      stopCamera();
      onScanSuccess(pick);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 12, 0.94)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      data-testid="qr-scanner-overlay"
    >
      {/* Top HUD Controls */}
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              background: '#102540',
              border: '1px solid #204c80',
              display: 'grid',
              placeItems: 'center',
              color: '#3b8cff',
            }}
          >
            <Camera size={16} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '14px',
                fontFamily: "'DM Mono', monospace",
                fontWeight: 600,
                letterSpacing: '1px',
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              Optical Room Scanner
            </h2>
            <span style={{ fontSize: '11px', color: '#8e95a5', fontFamily: "'DM Mono', monospace" }}>
              Current Room: <b style={{ color: '#3b8cff' }}>{currentRoomId}</b>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {torchAvailable && (
            <button
              onClick={toggleTorch}
              className="icon-button"
              title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
              style={{
                width: '36px',
                height: '36px',
                background: torchOn ? '#2de58a' : '#131824',
                color: torchOn ? '#000' : '#8e95a5',
                border: '1px solid #232c3f',
              }}
            >
              <Zap size={16} />
            </button>
          )}

          {availableDevices.length > 1 && (
            <button
              onClick={switchCamera}
              className="icon-button"
              title="Switch Camera (Front/Back)"
              style={{
                width: '36px',
                height: '36px',
                background: '#131824',
                color: '#8e95a5',
                border: '1px solid #232c3f',
              }}
            >
              <RotateCcw size={16} />
            </button>
          )}

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="icon-button"
            title="Close Scanner (Esc)"
            style={{
              width: '36px',
              height: '36px',
              background: '#1f2430',
              color: '#fff',
              border: '1px solid #2e3547',
            }}
            data-testid="close-scanner-btn"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Viewfinder Frame */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          aspectRatio: '1 / 1',
          maxHeight: '440px',
          background: '#000',
          border: scanStatus === 'matched' ? '2px solid #2de58a' : '2px solid #202b3d',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow:
            scanStatus === 'matched'
              ? '0 0 35px rgba(45, 229, 138, 0.45)'
              : '0 10px 40px rgba(0, 0, 0, 0.8)',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Video feed */}
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: hasPermission && !errorMessage ? 'block' : 'none',
          }}
          playsInline
          muted
        />

        {/* HUD Targeting Box Overlays */}
        {hasPermission && !errorMessage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Darkened perimeter mask */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, transparent 40%, rgba(5, 7, 12, 0.65) 85%)',
              }}
            />

            {/* Target reticle frame */}
            <div
              style={{
                position: 'relative',
                width: '68%',
                height: '68%',
                boxShadow: scanStatus === 'matched' ? '0 0 20px #2de58a' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Corner brackets */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '24px',
                  height: '24px',
                  borderTop: `3px solid ${scanStatus === 'matched' ? '#2de58a' : '#3b8cff'}`,
                  borderLeft: `3px solid ${scanStatus === 'matched' ? '#2de58a' : '#3b8cff'}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '24px',
                  height: '24px',
                  borderTop: `3px solid ${scanStatus === 'matched' ? '#2de58a' : '#3b8cff'}`,
                  borderRight: `3px solid ${scanStatus === 'matched' ? '#2de58a' : '#3b8cff'}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '24px',
                  height: '24px',
                  borderBottom: `3px solid ${scanStatus === 'matched' ? '#2de58a' : '#3b8cff'}`,
                  borderLeft: `3px solid ${scanStatus === 'matched' ? '#2de58a' : '#3b8cff'}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '24px',
                  height: '24px',
                  borderBottom: `3px solid ${scanStatus === 'matched' ? '#2de58a' : '#3b8cff'}`,
                  borderRight: `3px solid ${scanStatus === 'matched' ? '#2de58a' : '#3b8cff'}`,
                }}
              />

              {/* Sweeping laser scan line animation */}
              {scanStatus === 'scanning' && (
                <div
                  style={{
                    position: 'absolute',
                    left: '4px',
                    right: '4px',
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #3b8cff, #2de58a, #3b8cff, transparent)',
                    boxShadow: '0 0 10px #3b8cff, 0 0 20px #2de58a',
                    animation: 'scannerLaser 2.2s ease-in-out infinite alternate',
                  }}
                />
              )}

              {/* Center crosshair */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '12px',
                  height: '12px',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.4,
                  pointerEvents: 'none',
                }}
              >
                <div style={{ position: 'absolute', top: '5px', left: 0, right: 0, height: '1px', background: '#3b8cff' }} />
                <div style={{ position: 'absolute', left: '5px', top: 0, bottom: 0, width: '1px', background: '#3b8cff' }} />
              </div>
            </div>

            {/* Matched Room Banner inside Viewfinder */}
            {scanStatus === 'matched' && detectedRoom && (
              <div
                style={{
                  position: 'absolute',
                  background: 'rgba(10, 35, 22, 0.95)',
                  border: '1px solid #2de58a',
                  padding: '10px 18px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#2de58a',
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 600,
                  fontSize: '13px',
                  boxShadow: '0 0 20px rgba(45, 229, 138, 0.5)',
                  animation: 'popIn 0.2s ease-out',
                }}
              >
                <CheckCircle2 size={18} />
                <span>JOINING ROOM: {detectedRoom}</span>
              </div>
            )}
          </div>
        )}

        {/* Error / No Permission State */}
        {errorMessage && (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              color: '#cbd5e1',
            }}
          >
            <AlertCircle size={36} color="#f43f5e" />
            <strong style={{ fontSize: '14px', color: '#fff' }}>Camera Unavailable</strong>
            <p style={{ fontSize: '12px', color: '#8e95a5', margin: 0, maxWidth: '280px', lineHeight: '1.5' }}>
              {errorMessage}
            </p>
            <button
              onClick={startCamera}
              className="primary-button"
              style={{ marginTop: '8px', padding: '8px 16px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} /> Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* Action Strip & Instructions */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          marginTop: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: "'DM Mono', monospace",
            fontSize: '11px',
            color: '#8e95a5',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: scanStatus === 'matched' ? '#2de58a' : scanStatus === 'scanning' ? '#3b8cff' : '#f43f5e',
                boxShadow: scanStatus === 'scanning' ? '0 0 8px #3b8cff' : 'none',
              }}
            />
            {scanStatus === 'matched'
              ? 'Room QR Validated'
              : scanStatus === 'scanning'
              ? 'Align QR within brackets'
              : 'Scanner Standby'}
          </span>

          {/* Quick Simulation / Test Scan Button */}
          <button
            onClick={handleSimulateScan}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b8cff',
              fontSize: '11px',
              fontFamily: "'DM Mono', monospace",
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
            }}
            title="Test scanner with a sample room QR"
            data-testid="simulate-qr-scan-btn"
          >
            <Sparkles size={12} /> Test Scan Demo
          </button>
        </div>

        {/* Manual Room Entry Fallback */}
        <form
          onSubmit={handleManualJoin}
          style={{
            display: 'flex',
            gap: '8px',
            background: '#0d111a',
            border: '1px solid #1f283d',
            padding: '4px',
            borderRadius: '3px',
          }}
        >
          <input
            type="text"
            placeholder="Or type Room ID (e.g. COMM-LAB)"
            value={manualRoomInput}
            onChange={(e) => setManualRoomInput(e.target.value.toUpperCase())}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              fontFamily: "'DM Mono', monospace",
              padding: '6px 10px',
              outline: 'none',
            }}
            data-testid="manual-room-input"
          />
          <button
            type="submit"
            className="secondary-button"
            disabled={!manualRoomInput.trim()}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              borderColor: '#2b5d9e',
              color: '#7ebaff',
            }}
          >
            Join
          </button>
        </form>
      </div>

      <style>{`
        @keyframes scannerLaser {
          0% {
            top: 4px;
            opacity: 0.9;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: calc(100% - 6px);
            opacity: 0.9;
          }
        }
        @keyframes popIn {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
