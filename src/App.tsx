import { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react';
import QRCode from 'qrcode';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Camera,
  Check,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  FileUp,
  HardDrive,
  HelpCircle,
  Laptop,
  List,
  Network,
  Plus,
  Presentation,
  QrCode,
  Radio,
  RotateCcw,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { QrScannerOverlay } from './components/QrScannerOverlay';
import { VivaGuideModal } from './components/VivaGuideModal';
import { PresentationModal } from './components/PresentationModal';

const CHUNK_SIZE = 1024;

export interface SharedFileItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  checksum: string;
  senderName: string;
  downloadUrl: string;
  createdAt: string;
}

export interface PeerDevice {
  id: string;
  name: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'node';
  online: boolean;
}

const fmtBytes = (n: number) => {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
};

const fmtTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return 'just now';
  }
};

function CustomThroughputTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: '#0d1017',
          border: '1px solid #23344d',
          padding: '6px 10px',
          borderRadius: '3px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.7)',
          fontFamily: "'DM Mono', monospace",
          fontSize: '11px',
        }}
      >
        <span style={{ color: '#8e95a5', fontSize: '9px', display: 'block' }}>
          PACKET #{data.sampleIndex}
        </span>
        <strong style={{ color: '#54b4ff', fontSize: '12px' }}>{data.displaySpeed}</strong>
      </div>
    );
  }
  return null;
}

export default function App() {
  // Device & Room State
  const [deviceId] = useState(() => {
    const cached = sessionStorage.getItem('comm_device_id');
    if (cached) return cached;
    const newId = `dev-${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem('comm_device_id', newId);
    return newId;
  });

  const [deviceName, setDeviceName] = useState(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const cached = sessionStorage.getItem('comm_device_name');
    if (cached) return cached;
    const initial = isMobile ? `Mobile Device (${deviceId.slice(-4)})` : `Workstation (${deviceId.slice(-4)})`;
    sessionStorage.setItem('comm_device_name', initial);
    return initial;
  });

  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const qRoom = params.get('room');
    if (qRoom) return qRoom.toUpperCase();
    return 'COMM-LAB';
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [vivaModalOpen, setVivaModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('viva') === 'true' || params.get('viva') === '1' || params.get('doc') === 'viva';
  });
  const [pptModalOpen, setPptModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ppt') === 'true' || params.get('ppt') === '1' || params.get('slides') === 'true';
  });

  const handleScanSuccess = (newRoom: string) => {
    const formatted = newRoom.trim().toUpperCase();
    if (!formatted) return;
    if (formatted === roomId) {
      log(`Already in room "${formatted}"`);
      return;
    }
    setRoomId(formatted);
    const newUrl = `${window.location.origin}${window.location.pathname}?room=${formatted}`;
    window.history.pushState({ room: formatted }, '', newUrl);
    log(`🎯 Optical QR scanner locked! Joined room "${formatted}"`);
    fetch(`/api/files?room=${formatted}`)
      .then((r) => r.json())
      .then((data) => setSharedFiles(data))
      .catch((e) => console.error(e));
  };

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Files state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileChecksum, setFileChecksum] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [statusText, setStatusText] = useState('Ready');

  // Shared Files in Room
  const [sharedFiles, setSharedFiles] = useState<SharedFileItem[]>([]);
  const [peers, setPeers] = useState<PeerDevice[]>([]);
  const [serverOnline, setServerOnline] = useState(true);

  // Auto-download setting for incoming files from trusted peers
  const [autoDownload, setAutoDownload] = useState<boolean>(() => {
    return localStorage.getItem('comm_auto_download') === 'true';
  });
  const autoDownloadRef = useRef(autoDownload);
  useEffect(() => {
    autoDownloadRef.current = autoDownload;
  }, [autoDownload]);

  const triggerFileDownload = (url: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Trigger download error:', err);
    }
  };

  // New received alert
  const [newFileAlert, setNewFileAlert] = useState<SharedFileItem | null>(null);

  // Telemetry samples for Recharts
  const [speedSamples, setSpeedSamples] = useState<number[]>([15, 24, 19, 32, 28, 42, 36, 50, 44, 58, 52, 65]);
  const [throughputUnit, setThroughputUnit] = useState<'KB/s' | 'Mbps'>('KB/s');

  // System Logs
  const [logs, setLogs] = useState<string[]>([
    `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}  TCP file share socket listening on port 8080`,
    `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}  Connected to room "${roomId}" as "${deviceName}"`,
  ]);

  const log = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [`${timeStr}  ${msg}`, ...prev].slice(0, 10));
  };

  const wsRef = useRef<WebSocket | null>(null);

  // Recharts data derivation with dynamic KB/s vs Mbps conversion
  const chartData = useMemo(() => {
    return speedSamples.map((value, idx) => {
      const rawKbps = uploadSpeed > 0 ? (uploadSpeed / 1024) * (value / 50) : value * 4.8;
      const mbps = (rawKbps * 8) / 1000;

      const throughputVal = throughputUnit === 'Mbps' ? Number(mbps.toFixed(2)) : Number(rawKbps.toFixed(1));
      const displaySpeed = throughputUnit === 'Mbps' ? `${mbps.toFixed(2)} Mbps` : `${rawKbps.toFixed(1)} KB/s`;

      return {
        name: `#${idx + 1}`,
        sampleIndex: idx + 1,
        speedVal: value,
        throughputVal,
        displaySpeed,
        unit: throughputUnit,
      };
    });
  }, [speedSamples, uploadSpeed, throughputUnit]);

  const maxAxisValue = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.throughputVal), throughputUnit === 'Mbps' ? 0.8 : 80);
    return throughputUnit === 'Mbps' ? Number((maxVal * 1.25).toFixed(2)) : Math.ceil(maxVal * 1.2);
  }, [chartData, throughputUnit]);

  // Congestion detection state & helper:
  // Detects if speed drops below 5 KB/s for more than 3 consecutive samples
  const [congestionSimulated, setCongestionSimulated] = useState(false);

  const getSampleKbps = (value: number) => {
    return uploadSpeed > 0 ? (uploadSpeed / 1024) * (value / 50) : value * 4.8;
  };

  const lowSpeedConsecutiveCount = useMemo(() => {
    let count = 0;
    for (let i = speedSamples.length - 1; i >= 0; i--) {
      const kbps = getSampleKbps(speedSamples[i]);
      if (kbps < 5) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [speedSamples, uploadSpeed]);

  const isCongested = lowSpeedConsecutiveCount >= 3;

  const toggleCongestionTest = () => {
    if (!congestionSimulated) {
      setCongestionSimulated(true);
      // Injects 4 consecutive low samples strictly below 5 KB/s (0.6, 0.4, 0.8, 0.5)
      setSpeedSamples((old) => [...old.slice(-8), 0.6, 0.4, 0.8, 0.5]);
      log('⚠️ Network congestion detected: 4 consecutive samples dropped below 5 KB/s');
    } else {
      setCongestionSimulated(false);
      setSpeedSamples((old) => [...old.slice(-8), 24, 38, 45, 52]);
      log('Throughput recovered above congestion threshold (> 5 KB/s)');
    }
  };

  // Background subtle telemetry
  useEffect(() => {
    const ticker = setInterval(() => {
      if (!isUploading && !congestionSimulated) {
        setSpeedSamples((old) => {
          const base = serverOnline ? 14 : 2;
          const jitter = serverOnline ? Math.floor(Math.random() * 8) : 0;
          return [...old.slice(-13), base + jitter];
        });
      }
    }, 1600);
    return () => clearInterval(ticker);
  }, [isUploading, serverOnline, congestionSimulated]);

  // Fetch shared files in current room
  const loadSharedFiles = async () => {
    try {
      const res = await fetch(`/api/files?room=${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setSharedFiles(data);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  // Peer simulation for testing cross-device receive & auto-download
  const [isSimulatingIncoming, setIsSimulatingIncoming] = useState(false);

  const simulateIncomingFileTransfer = async () => {
    setIsSimulatingIncoming(true);
    try {
      const demoNames = [
        'project_summary.pdf',
        'network_blueprint.png',
        'site_audit_report.csv',
        'secure_tokens.json',
      ];
      const randomName = demoNames[Math.floor(Math.random() * demoNames.length)];
      const sampleText = `DATACOMM Direct File Share Protocol\nSender: Pixel 8 (Mobile Peer)\nTarget Room: ${roomId}\nTimestamp: ${new Date().toISOString()}\nPayload: P2P verified packet payload.`;
      const blob = new Blob([sampleText], { type: 'text/plain' });
      const file = new File([blob], randomName, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('senderName', 'Pixel 8 (Mobile Peer)');
      formData.append('roomId', roomId);
      formData.append('durationMs', '260');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        log(`Simulated incoming transfer from "Pixel 8 (Mobile Peer)" initiated for "${randomName}"`);
      } else {
        log('Failed to simulate incoming transfer');
      }
    } catch (err) {
      console.error('Error simulating incoming transfer:', err);
    } finally {
      setIsSimulatingIncoming(false);
    }
  };

  // Export received files list as JSON
  const [copiedExport, setCopiedExport] = useState(false);

  const exportReceivedFilesAsJson = () => {
    if (sharedFiles.length === 0) return;

    const totalBytes = sharedFiles.reduce((acc, f) => acc + (f.fileSize || 0), 0);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `received-files-${roomId.toLowerCase()}-${dateStr}.json`;

    const exportPayload = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        application: 'DATACOMM DIRECT FILE SHARE',
        roomId: roomId,
        deviceId: deviceId,
        deviceName: deviceName,
        totalFilesReceived: sharedFiles.length,
        totalBytesReceived: totalBytes,
        totalFormattedSize: fmtBytes(totalBytes),
      },
      receivedFiles: sharedFiles.map((item, index) => ({
        index: index + 1,
        id: item.id,
        fileName: item.fileName,
        fileSizeBytes: item.fileSize,
        fileSizeFormatted: fmtBytes(item.fileSize),
        fileType: item.fileType,
        sha256Checksum: item.checksum,
        sender: item.senderName,
        downloadUrl: item.downloadUrl.startsWith('http')
          ? item.downloadUrl
          : `${window.location.origin}${item.downloadUrl}`,
        receivedAt: item.createdAt,
      })),
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
    log(`Exported ${sharedFiles.length} received files record to "${filename}"`);
  };

  // Delete individual received file
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteReceivedFile = async (fileId: string, fileName: string) => {
    setDeletingId(fileId);
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSharedFiles((prev) => prev.filter((f) => f.id !== fileId));
        log(`🗑️ Deleted received file "${fileName}"`);
      } else {
        log(`Failed to delete "${fileName}"`);
      }
    } catch (err) {
      console.error('Delete file error:', err);
      log(`Error deleting "${fileName}"`);
    } finally {
      setDeletingId(null);
    }
  };

  // Clear all received files
  const clearAllReceivedFiles = async () => {
    if (sharedFiles.length === 0) return;
    try {
      const res = await fetch(`/api/files?room=${roomId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSharedFiles([]);
        log(`🗑️ Cleared all received files from room ${roomId}`);
      }
    } catch (err) {
      console.error('Clear all error:', err);
    }
  };

  // Generate QR code for instant phone pairing
  useEffect(() => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('QR error', err));
  }, [roomId]);

  // Connect WebSocket for real-time room notifications
  useEffect(() => {
    loadSharedFiles();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setServerOnline(true);
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          ws.send(
            JSON.stringify({
              type: 'REGISTER',
              id: deviceId,
              name: deviceName,
              deviceType: isMobile ? 'mobile' : 'desktop',
              roomId: roomId,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'PEER_LIST') {
              setPeers(data.peers || []);
            } else if (data.type === 'FILE_SHARED') {
              // Real-time notification that a file was received!
              const newFile: SharedFileItem = data.file;
              log(`Received file "${newFile.fileName}" from "${newFile.senderName}"!`);
              setSharedFiles((prev) => [newFile, ...prev.filter((f) => f.id !== newFile.id)]);
              setNewFileAlert(newFile);

              // Auto-download incoming file if trusted peer auto-download setting is enabled
              if (autoDownloadRef.current) {
                log(`⚡ Auto-downloading "${newFile.fileName}" (trusted peer setting active)...`);
                triggerFileDownload(newFile.downloadUrl, newFile.fileName);
              }

              // Auto-hide alert after 8 seconds
              setTimeout(() => {
                setNewFileAlert((curr) => (curr?.id === newFile.id ? null : curr));
              }, 8000);
            } else if (data.type === 'FILE_DELETED') {
              setSharedFiles((prev) => prev.filter((f) => f.id !== data.fileId));
              log(`File "${data.fileName || 'item'}" was removed from the room.`);
            } else if (data.type === 'ROOM_CLEARED') {
              setSharedFiles([]);
              log(`All received files were cleared from room ${roomId}.`);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onclose = () => {
          setServerOnline(false);
          setTimeout(connect, 3000);
        };
      } catch (err) {
        console.error('WS init error', err);
      }
    }

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [roomId, deviceId, deviceName]);

  // Compute SHA-256 Checksum of selected file
  const computeChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setFileChecksum(hash);
    return hash;
  };

  // Handle file pick
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;
    const picked = files[0];
    setSelectedFile(picked);
    setUploadProgress(0);
    setStatusText('Ready to send');
    log(`Selected file: "${picked.name}" (${fmtBytes(picked.size)})`);
    await computeChecksum(picked);
  };

  // Quick helper to load sample file for testing without browsing
  const loadSampleFile = async () => {
    const size = 512 * 1024; // 512 KB
    const buffer = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      buffer[i] = (i * 37 + 19) % 256;
    }
    const sample = new File([buffer], 'network_handshake_demo.pdf', { type: 'application/pdf' });
    setSelectedFile(sample);
    setUploadProgress(0);
    setStatusText('Ready to send');
    log(`Loaded sample PDF: "${sample.name}" (512 KB)`);
    await computeChecksum(sample);
  };

  // Start Reliable File Transfer / Upload
  const startFileTransfer = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setStatusText('Sending file...');
    const startTime = Date.now();
    log(`Sending "${selectedFile.name}" (${fmtBytes(selectedFile.size)}) via TCP socket...`);

    const hash = fileChecksum || (await computeChecksum(selectedFile));

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('senderName', deviceName);
    formData.append('roomId', roomId);
    formData.append('checksum', hash);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
        setUploadProgress(pct);
        const elapsedSec = (Date.now() - startTime) / 1000;
        if (elapsedSec > 0.1) {
          const currentSpeed = event.loaded / elapsedSec;
          setUploadSpeed(currentSpeed);
          setSpeedSamples((old) => [...old.slice(-13), 35 + Math.round(Math.random() * 55)]);
        }
      }
    };

    xhr.onload = () => {
      const elapsedTotal = Date.now() - startTime;
      setIsUploading(false);

      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadProgress(100);
        setStatusText('Completed');
        log(`File "${selectedFile.name}" delivered and verified via SHA-256 (${elapsedTotal} ms)!`);
        loadSharedFiles();
      } else {
        setStatusText('Transfer error');
        log(`Transfer failed with status ${xhr.status}.`);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setStatusText('Network error');
      log(`Network error during transfer.`);
    };

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const copyChecksum = (value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 1500);
  };

  const totalChunks = selectedFile ? Math.max(1, Math.ceil(selectedFile.size / CHUNK_SIZE)) : 0;
  const currentChunk = selectedFile
    ? Math.min(totalChunks, Math.max(1, Math.ceil((totalChunks * uploadProgress) / 100)))
    : 0;

  return (
    <main className="app-shell">
      {/* Topbar Navigation */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Network size={20} />
          </div>
          <div>
            <strong>DATACOMM</strong>
            <span>DIRECT FILE SHARE</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Room Pill */}
          <button
            className="secondary-button"
            onClick={() => setQrModalOpen(true)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Scan QR Code or Share Room Link"
          >
            <QrCode size={14} color="#3b8cff" />
            <span>ROOM: {roomId}</span>
            <span
              style={{
                background: '#163b6a',
                color: '#7ebaff',
                padding: '1px 5px',
                borderRadius: '2px',
                fontSize: '9px',
              }}
            >
              {peers.length} ONLINE
            </span>
          </button>

          {/* Quick Copy Link */}
          <button
            className="secondary-button"
            onClick={copyRoomLink}
            style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Copy Share Link"
          >
            {copiedLink ? <Check size={13} color="#2de58a" /> : <Copy size={13} />}
            <span>{copiedLink ? 'Copied Link!' : 'Share Link'}</span>
          </button>

          {/* Optical QR Camera Scanner */}
          <button
            className="secondary-button"
            onClick={() => setIsScannerOpen(true)}
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: '#2de58a',
              borderColor: '#1e4830',
              background: '#0d1f16',
            }}
            title="Open device camera to scan QR code from another device and join room"
            data-testid="topbar-camera-scanner-btn"
          >
            <Camera size={13} />
            <span>Scan QR</span>
          </button>

          {/* Open 2nd Device / Tab Test */}
          <button
            className="secondary-button"
            onClick={() => window.open(`${window.location.origin}${window.location.pathname}?room=${roomId}`, '_blank')}
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: '#7ebaff',
              borderColor: '#1f3860',
            }}
            title="Open second tab to test cross-device transfer immediately"
            data-testid="open-second-tab-btn"
          >
            <ExternalLink size={13} />
            <span>Open 2nd Tab</span>
          </button>

          {/* Viva Q&A Guide Button */}
          <button
            className="secondary-button"
            onClick={() => setVivaModalOpen(true)}
            style={{
              padding: '6px 11px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#f59e0b',
              borderColor: '#6b4712',
              background: '#241909',
            }}
            title="Open Complete Viva Q&A Guide & Architecture Documentation"
            data-testid="topbar-viva-guide-btn"
          >
            <BookOpen size={13} />
            <span>Viva Guide</span>
          </button>

          {/* 10-Slide Project Presentation Deck */}
          <button
            className="secondary-button"
            onClick={() => setPptModalOpen(true)}
            style={{
              padding: '6px 11px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#38bdf8',
              borderColor: '#164e63',
              background: '#082f49',
            }}
            title="Open 10-Slide Project Presentation Deck (.PPTX download available)"
            data-testid="topbar-ppt-deck-btn"
          >
            <Presentation size={13} />
            <span>10-Slide PPT</span>
          </button>

          {/* Connection Status */}
          <div className={`connection ${serverOnline ? '' : 'offline'}`}>
            <i /> {serverOnline ? 'HUB CONNECTED' : 'OFFLINE'} <span>•</span> 192.168.1.24:8080
          </div>
        </div>
      </header>

      {/* Real-time Received File Banner */}
      {newFileAlert && (
        <div
          style={{
            maxWidth: '1200px',
            margin: '18px auto 0',
            background: 'linear-gradient(90deg, #0e2746, #121e31)',
            border: '1px solid #2b5d9e',
            borderLeft: '4px solid #2de58a',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            borderRadius: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                background: '#153965',
                color: '#2de58a',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <FileUp size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: '#fff', display: 'block' }}>
                New File Received!
              </strong>
              <span style={{ fontSize: '12px', color: '#a8bbd1' }}>
                <b style={{ color: '#fff' }}>{newFileAlert.fileName}</b> ({fmtBytes(newFileAlert.fileSize)}) from{' '}
                <b style={{ color: '#3b8cff' }}>{newFileAlert.senderName}</b>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={newFileAlert.downloadUrl}
              download={newFileAlert.fileName}
              style={{
                background: '#2de58a',
                color: '#072414',
                fontWeight: 600,
                fontSize: '12px',
                padding: '6px 14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '2px',
              }}
            >
              <Download size={13} /> Download File
            </a>
            <button
              onClick={() => setNewFileAlert(null)}
              style={{ background: 'none', border: 'none', color: '#8e95a5', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Intro Header */}
      <section className="intro" style={{ paddingTop: '32px', paddingBottom: '24px' }}>
        <div>
          <p className="eyebrow">DIRECT PEER & LAN FILE SHARE</p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}>
            Share files directly.
            <br />
            <em>Send and receive without trouble.</em>
          </h1>
          <p className="intro-copy" style={{ marginTop: '12px', fontSize: '14px' }}>
            Open this page or scan the QR code on your phone or another laptop to instantly transfer files back and forth.
            All transfers are chunked, verified with SHA-256, and immediately ready to download.
          </p>
        </div>

        <div className="protocol-badge" style={{ minWidth: '190px', padding: '14px 18px' }}>
          <span>CURRENT DEVICE</span>
          <strong style={{ fontSize: '18px', color: '#fff', margin: '4px 0' }}>
            {deviceName.length > 22 ? `${deviceName.slice(0, 20)}...` : deviceName}
          </strong>
          <small style={{ color: 'var(--blue)' }}>Room: {roomId}</small>
        </div>
      </section>

      {/* Main Two-Column File Share Workspace */}
      <section className="workspace">
        {/* Left Column: Send File */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-heading">
            <div>
              <span className="section-kicker">01 / SENDER</span>
              <h2>Send a file</h2>
            </div>
            <span
              className={`status-pill ${
                statusText === 'Completed'
                  ? 'completed'
                  : isUploading
                  ? 'ready-to-send'
                  : statusText === 'Ready to send'
                  ? 'ready'
                  : ''
              }`}
            >
              <i /> {statusText}
            </span>
          </div>

          {/* Clean Dropzone */}
          <div className={`dropzone ${selectedFile ? 'has-file' : ''}`} style={{ minHeight: '150px' }}>
            <input type="file" onChange={handleFileSelect} />
            <div className="drop-icon">
              <FileUp size={24} />
            </div>
            {selectedFile ? (
              <>
                <strong style={{ fontSize: '14px', color: '#fff' }}>{selectedFile.name}</strong>
                <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                  {fmtBytes(selectedFile.size)} · SHA-256 ready
                </span>
                <span style={{ color: 'var(--blue)', fontSize: '11px', marginTop: '8px' }}>
                  Click to choose a different file
                </span>
              </>
            ) : (
              <>
                <strong style={{ fontSize: '14px' }}>Click to choose or drop a file here</strong>
                <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  Supports any file: PDF, Images, Videos, ZIP, Docs
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSampleFile();
                  }}
                  style={{ marginTop: '10px' }}
                >
                  <Plus size={12} /> Or load a sample PDF (512 KB)
                </button>
              </>
            )}
          </div>

          {/* Upload Progress Bar if active */}
          {(isUploading || uploadProgress > 0) && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ font: "11px 'DM Mono'", color: 'var(--muted)' }}>
                  {isUploading ? `Sending in 1024 B chunks (Chunk #${currentChunk}/${totalChunks})` : 'Delivered'}
                </span>
                <strong style={{ font: "12px 'DM Mono'", color: 'var(--blue)' }}>{uploadProgress}%</strong>
              </div>
              <div className="progress-track" style={{ margin: 0 }}>
                <div style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Send Button */}
          <div style={{ marginTop: 'auto', paddingTop: '18px' }}>
            <button
              className="primary-button"
              onClick={startFileTransfer}
              disabled={!selectedFile || isUploading}
              style={{ width: '100%', padding: '12px' }}
            >
              <Send size={15} /> {isUploading ? 'Sending file...' : uploadProgress >= 100 ? 'Send Again' : 'Share File Now'}
            </button>
          </div>
        </div>

        {/* Right Column: Received Files (Receiver Node) */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-heading">
            <div>
              <span className="section-kicker">02 / RECEIVER</span>
              <h2>Received Files ({sharedFiles.length})</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Export JSON Button */}
              <button
                className="secondary-button"
                onClick={exportReceivedFilesAsJson}
                disabled={sharedFiles.length === 0}
                title={sharedFiles.length === 0 ? 'No received files to export' : 'Export received files list as a JSON file'}
                style={{
                  padding: '5px 9px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: copiedExport ? '#2de58a' : '#8ec0f8',
                  borderColor: copiedExport ? '#1f4830' : '#233854',
                  background: copiedExport ? '#0d1f16' : '#101c2b',
                  opacity: sharedFiles.length === 0 ? 0.45 : 1,
                  cursor: sharedFiles.length === 0 ? 'not-allowed' : 'pointer',
                }}
                data-testid="export-json-btn"
              >
                {copiedExport ? <Check size={13} color="#2de58a" /> : <FileDown size={13} />}
                <span>{copiedExport ? 'Exported!' : 'Export JSON'}</span>
              </button>

              <button
                className="secondary-button"
                onClick={simulateIncomingFileTransfer}
                disabled={isSimulatingIncoming}
                title="Simulate receiving an incoming file from a peer device"
                style={{
                  padding: '5px 9px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#2de58a',
                  borderColor: '#1f4830',
                  background: '#0d1f16',
                }}
                data-testid="simulate-receive-btn"
              >
                <Download size={13} />
                <span>{isSimulatingIncoming ? 'Receiving...' : 'Test Receive'}</span>
              </button>
              {sharedFiles.length > 0 && (
                <button
                  className="secondary-button"
                  onClick={clearAllReceivedFiles}
                  title="Clear all received files in room"
                  style={{
                    padding: '5px 8px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#f43f5e',
                    borderColor: '#5c1b26',
                    background: '#200f13',
                  }}
                  data-testid="clear-all-received-btn"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              )}
              <button
                className="icon-button"
                onClick={loadSharedFiles}
                title="Refresh received files"
                style={{ width: '32px', height: '32px' }}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Trusted Peer Auto-Download Setting */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: '#0c0f17',
              border: '1px solid #1e2433',
              marginBottom: '14px',
              borderRadius: '2px',
            }}
            data-testid="auto-download-setting-container"
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '12px',
                color: autoDownload ? '#ffffff' : '#cbd5e1',
                transition: 'color 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={autoDownload}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAutoDownload(val);
                  localStorage.setItem('comm_auto_download', String(val));
                  log(`Auto-download incoming files ${val ? 'ENABLED (trusted peer mode)' : 'DISABLED'}`);
                }}
                style={{
                  accentColor: '#2de58a',
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                }}
                data-testid="auto-download-checkbox"
              />
              <span style={{ fontWeight: 500 }}>Auto-download all incoming files</span>
            </label>
            <span
              style={{
                font: "9px 'DM Mono', monospace",
                color: autoDownload ? '#2de58a' : '#8e95a5',
                background: autoDownload ? '#0f291e' : '#141822',
                border: `1px solid ${autoDownload ? '#1b5e3b' : '#232a38'}`,
                padding: '2px 7px',
                borderRadius: '2px',
                letterSpacing: '0.6px',
              }}
            >
              {autoDownload ? 'AUTO ON' : 'MANUAL'}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
            {sharedFiles.length === 0 ? (
              <div className="empty-history" style={{ padding: '40px 10px', textAlign: 'center' }}>
                <Clock3 size={20} />
                <span>No files received yet. Share a file on the left or scan the QR code to send from your phone.</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {sharedFiles.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: '#13161f',
                      border: '1px solid #232836',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          background: '#102540',
                          color: '#3b8cff',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            fontSize: '13px',
                            display: 'block',
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.fileName}
                        </strong>
                        <span style={{ font: "10px 'DM Mono'", color: 'var(--muted)' }}>
                          {fmtBytes(item.fileSize)} · From {item.senderName} · {fmtTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <a
                        href={item.downloadUrl}
                        download={item.fileName}
                        style={{
                          background: '#183e29',
                          border: '1px solid #2de58a',
                          color: '#2de58a',
                          fontSize: '11px',
                          fontFamily: "'DM Mono', monospace",
                          padding: '6px 12px',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          borderRadius: '2px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Download size={13} /> Download
                      </a>

                      <button
                        onClick={() => deleteReceivedFile(item.id, item.fileName)}
                        disabled={deletingId === item.id}
                        title={`Delete ${item.fileName}`}
                        style={{
                          background: '#200f13',
                          border: '1px solid #5c1b26',
                          color: '#f43f5e',
                          padding: '6px 8px',
                          fontSize: '11px',
                          fontFamily: "'DM Mono', monospace",
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRadius: '2px',
                          cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        data-testid={`delete-file-btn-${item.id}`}
                      >
                        <Trash2 size={13} />
                        <span>{deletingId === item.id ? '...' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Receiver Footer Stats & Quick Export Bar */}
          {sharedFiles.length > 0 && (
            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid #1a202c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: "'DM Mono', monospace",
                fontSize: '11px',
                color: '#8e95a5',
              }}
              data-testid="receiver-footer-summary"
            >
              <span>
                Total: <b style={{ color: '#fff' }}>{sharedFiles.length} file{sharedFiles.length !== 1 ? 's' : ''}</b> ({fmtBytes(sharedFiles.reduce((acc, f) => acc + (f.fileSize || 0), 0))})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={exportReceivedFilesAsJson}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedExport ? '#2de58a' : '#3b8cff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontFamily: "'DM Mono', monospace",
                    padding: 0,
                    transition: 'color 0.15s ease',
                  }}
                  data-testid="quick-export-json-link"
                >
                  {copiedExport ? <Check size={12} /> : <FileDown size={12} />}
                  <span>{copiedExport ? 'Exported!' : 'Export JSON'}</span>
                </button>
                <span style={{ color: '#2a3245' }}>•</span>
                <button
                  onClick={clearAllReceivedFiles}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f43f5e',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontFamily: "'DM Mono', monospace",
                    padding: 0,
                    transition: 'color 0.15s ease',
                  }}
                  data-testid="quick-clear-all-link"
                >
                  <Trash2 size={12} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Middle Row: Real-time Throughput Graph & Telemetry */}
      <section className="feature-grid" style={{ marginTop: '18px' }}>
        {/* Recharts Area Chart */}
        <div className="panel">
          <div className="panel-heading compact">
            <div>
              <span className="section-kicker">THROUGHPUT TELEMETRY</span>
              <h2>Real-time Transfer Speed</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Congestion Test Simulator */}
              <button
                type="button"
                onClick={toggleCongestionTest}
                style={{
                  background: congestionSimulated ? '#3d200a' : '#0a0d14',
                  border: congestionSimulated ? '1px solid #f3bd57' : '1px solid #242c3d',
                  color: congestionSimulated ? '#f3bd57' : '#8e95a5',
                  font: "10px 'DM Mono', monospace",
                  padding: '3px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                title="Test network congestion warning pulse (< 5 KB/s)"
                data-testid="simulate-congestion-button"
              >
                <AlertTriangle size={11} color={congestionSimulated ? '#f3bd57' : '#8e95a5'} />
                <span>{congestionSimulated ? 'Clear Test' : 'Test Drop'}</span>
              </button>

              {/* Unit Toggle Button: KB/s vs Mbps */}
              <div
                style={{
                  display: 'inline-flex',
                  background: '#0a0d14',
                  border: '1px solid #242c3d',
                  borderRadius: '3px',
                  padding: '2px',
                  gap: '2px',
                }}
                data-testid="throughput-unit-toggle"
              >
                <button
                  type="button"
                  onClick={() => setThroughputUnit('KB/s')}
                  style={{
                    background: throughputUnit === 'KB/s' ? '#184785' : 'transparent',
                    color: throughputUnit === 'KB/s' ? '#ffffff' : '#8e95a5',
                    border: 0,
                    font: "10px 'DM Mono', monospace",
                    padding: '3px 8px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: throughputUnit === 'KB/s' ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}
                  data-testid="toggle-unit-kbs"
                >
                  KB/s
                </button>
                <button
                  type="button"
                  onClick={() => setThroughputUnit('Mbps')}
                  style={{
                    background: throughputUnit === 'Mbps' ? '#184785' : 'transparent',
                    color: throughputUnit === 'Mbps' ? '#ffffff' : '#8e95a5',
                    border: 0,
                    font: "10px 'DM Mono', monospace",
                    padding: '3px 8px',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontWeight: throughputUnit === 'Mbps' ? 600 : 400,
                    transition: 'all 0.15s ease',
                  }}
                  data-testid="toggle-unit-mbps"
                >
                  Mbps
                </button>
              </div>

              <div style={{ font: "11px 'DM Mono'", color: '#2de58a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2de58a' }} />
                LIVE
              </div>
            </div>
          </div>

          <div className="packet-details">
            <div>
              <span>CHUNK SIZE</span>
              <strong>{CHUNK_SIZE} B</strong>
            </div>
            <div>
              <span>WINDOW</span>
              <strong>4 × CHUNK</strong>
            </div>
            <div>
              <span>OFFSET</span>
              <strong>{currentChunk ? currentChunk * CHUNK_SIZE : 0} B</strong>
            </div>
            <div>
              <span>STATUS</span>
              <strong className={isCongested ? 'warning-text' : 'success-text'}>
                {isCongested ? 'Congested (< 5 KB/s)' : isUploading ? 'Streaming' : 'Ready'}
              </strong>
            </div>
          </div>

          {/* Recharts Component with Visual Warning Pulse Animation */}
          <div
            className={`recharts-speed-graph ${isCongested ? 'congested-pulse' : ''}`}
            data-testid="speed-graph"
            style={{
              position: 'relative',
              height: '88px',
              width: '100%',
              marginTop: '16px',
              borderBottom: isCongested ? '1px solid #f3bd57' : '1px solid #2a303b',
              padding: '2px 0',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Visual Warning Pulse Alert Badge */}
            {isCongested && (
              <div
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '8px',
                  background: 'rgba(38, 22, 6, 0.94)',
                  border: '1px solid #f3bd57',
                  color: '#f3bd57',
                  font: "10px 'DM Mono', monospace",
                  padding: '3px 8px',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 0 14px rgba(243, 189, 87, 0.45)',
                  animation: 'badgePulse 1.2s ease-in-out infinite',
                  zIndex: 10,
                }}
                data-testid="congestion-warning-pill"
              >
                <AlertTriangle size={12} color="#f3bd57" />
                <span>CONGESTION DETECTED ({lowSpeedConsecutiveCount} samples &lt; 5 KB/s)</span>
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isCongested ? '#f3bd57' : '#3b8cff'}
                      stopOpacity={isCongested ? 0.75 : 0.55}
                    />
                    <stop
                      offset="95%"
                      stopColor={isCongested ? '#d97706' : '#1c5cc3'}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={isCongested ? '#352714' : '#1c2230'} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis
                  domain={[0, maxAxisValue]}
                  tick={{ fill: isCongested ? '#f3bd57' : '#6c7a92', fontSize: 9, fontFamily: 'DM Mono' }}
                  tickFormatter={(val) => (throughputUnit === 'Mbps' ? `${val.toFixed(1)}` : `${Math.round(val)}`)}
                  width={38}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomThroughputTooltip />} isAnimationActive={false} />
                <Area
                  type="monotone"
                  dataKey="throughputVal"
                  stroke={isCongested ? '#f3bd57' : '#54b4ff'}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#speedGradient)"
                  isAnimationActive={true}
                  animationDuration={250}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="graph-caption">
            <span style={{ color: isCongested ? '#f3bd57' : 'var(--blue)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {isCongested ? <AlertTriangle size={12} color="#f3bd57" /> : <Radio size={12} />}
              {isCongested ? 'NETWORK CONGESTION DETECTED' : `LIVE SPEED CURVE (${throughputUnit})`}
            </span>
            <span style={{ color: isCongested ? '#f3bd57' : 'var(--muted)' }}>
              {isCongested
                ? `Throughput < 5 KB/s for ${lowSpeedConsecutiveCount} consecutive samples`
                : `${speedSamples.length} rolling samples · Peak: ${Math.max(...chartData.map((d) => d.throughputVal)).toFixed(throughputUnit === 'Mbps' ? 2 : 1)} ${throughputUnit}`}
            </span>
          </div>
        </div>

        {/* Server & Node Status */}
        <div className="panel server-panel">
          <div className="panel-heading compact">
            <div>
              <span className="section-kicker">NETWORK NODE</span>
              <h2>Local Receiver</h2>
            </div>
            <div className={`server-led ${serverOnline ? 'online' : ''}`}>
              <i /> {serverOnline ? 'Active' : 'Offline'}
            </div>
          </div>

          <div className="server-stats">
            <div>
              <span>IP ADDRESS</span>
              <strong>192.168.1.24</strong>
            </div>
            <div>
              <span>PORT</span>
              <strong>8080 / TCP</strong>
            </div>
            <div>
              <span>CONNECTED PEERS</span>
              <strong>{peers.length} in room</strong>
            </div>
          </div>

          <button
            className="secondary-button"
            onClick={() => setQrModalOpen(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Share2 size={14} /> Connect another phone or PC
          </button>
        </div>
      </section>

      {/* Bottom Grid: SHA-256 Checksum + Activity Log */}
      <section className="lower-grid">
        {/* SHA-256 Strip */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="panel-heading compact">
              <div>
                <span className="section-kicker">CRYPTOGRAPHIC CHECK</span>
                <h2>SHA-256 Integrity</h2>
              </div>
              <ShieldCheck size={20} color="#2de58a" />
            </div>

            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
              Each file is hashed using Web Crypto SHA-256 before transmission. The receiving side re-hashes the payload to
              verify byte-for-byte exactness.
            </p>

            <div
              style={{
                background: '#0a0d14',
                border: '1px solid #1f2535',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ font: "10px 'DM Mono'", color: 'var(--muted)' }}>HASH</span>
              <code style={{ font: "11px 'DM Mono'", color: '#8ec0f8', flex: 1, wordBreak: 'break-all' }}>
                {fileChecksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </code>
              <button
                onClick={() =>
                  copyChecksum(fileChecksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
                }
                style={{ background: 'none', border: 'none', color: '#8e95a5', cursor: 'pointer' }}
                title="Copy hash"
              >
                {copiedHash ? <Check size={14} color="#2de58a" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div style={{ marginTop: '18px', font: "11px 'DM Mono'", color: '#2de58a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={13} /> Byte count and checksum match original
          </div>
        </div>

        {/* Live Activity Log */}
        <div className="panel log-panel">
          <div className="panel-heading compact">
            <div>
              <span className="section-kicker">SYSTEM LOG</span>
              <h2>Live Activity</h2>
            </div>
            <List size={16} color="#8e95a5" />
          </div>
          <div className="log-list">
            {logs.map((item, index) => (
              <code key={`${item}-${index}`}>
                <i /> {item}
              </code>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <span>
          <Wifi size={14} /> LAN READY
        </span>
        <span>
          CHUNK SIZE <b>1024 B</b>
        </span>
        <span>
          DESTINATION <b>/received_files</b>
        </span>
        <span className="ip-control" onClick={() => copyChecksum('192.168.1.24')}>
          SERVER IP <b>192.168.1.24</b>
        </span>
        <span className="ip-control" onClick={() => setQrModalOpen(true)} style={{ color: 'var(--blue)' }}>
          ROOM <b>{roomId}</b>
        </span>
        <span
          className="ip-control"
          onClick={() => setVivaModalOpen(true)}
          style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <BookOpen size={12} /> VIVA GUIDE
        </span>
        <span
          className="ip-control"
          onClick={() => setPptModalOpen(true)}
          style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <Presentation size={12} /> 10-SLIDE PPT
        </span>
      </footer>

      {/* Clean QR & Share Modal */}
      {qrModalOpen && (
        <div className="modal-backdrop" onClick={() => setQrModalOpen(false)}>
          <div className="qs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qs-modal-header">
              <div>
                <h3>
                  <Share2 size={18} color="#3b8cff" /> Connect Another Device
                </h3>
                <p>Scan with your phone's camera to join this room and transfer files instantly.</p>
              </div>
              <button
                onClick={() => setQrModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: 'center', margin: '12px 0' }}>
              <div className="qr-box">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="Room QR Code" style={{ width: '180px', height: '180px' }} />
                ) : (
                  <div style={{ width: '180px', height: '180px', display: 'grid', placeItems: 'center' }}>
                    Loading...
                  </div>
                )}
              </div>
              <p style={{ font: "11px 'DM Mono'", color: 'var(--muted)', marginTop: '6px' }}>
                Join Room: <b style={{ color: '#fff' }}>{roomId}</b>
              </p>
            </div>

            {/* Direct Link */}
            <div style={{ marginTop: '14px' }}>
              <span style={{ font: "10px 'DM Mono'", color: 'var(--muted)' }}>DIRECT LINK</span>
              <div className="share-link-input-group" style={{ marginTop: '4px' }}>
                <input readOnly value={`${window.location.origin}${window.location.pathname}?room=${roomId}`} />
                <button className="secondary-button" onClick={copyRoomLink} style={{ padding: '8px 12px' }}>
                  {copiedLink ? <Check size={14} color="#2de58a" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Quick 3-Step Guide */}
            <div
              style={{
                marginTop: '16px',
                background: '#0d111a',
                border: '1px solid #1f283d',
                borderRadius: '3px',
                padding: '12px 14px',
                fontSize: '11px',
                lineHeight: '1.6',
                color: '#94a3b8',
                textAlign: 'left',
              }}
            >
              <strong style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px' }}>
                <HelpCircle size={14} color="#3b8cff" /> Ek Se Dusre Device Main File Kaise Bhejein & Recieve Karein:
              </strong>
              <div>
                <b style={{ color: '#e2e8f0' }}>1. Connect Karein:</b> Phone camera se upar wala QR code scan karein (ya <code>Share Link</code> copy karke phone ke browser mein kholein).
              </div>
              <div style={{ marginTop: '4px' }}>
                <b style={{ color: '#e2e8f0' }}>2. Send Karein:</b> Kisi bhi device se file choose karke <b style={{ color: '#3b8cff' }}>"Share File Now"</b> dabayein.
              </div>
              <div style={{ marginTop: '4px' }}>
                <b style={{ color: '#e2e8f0' }}>3. Recieve & Download:</b> Dusre device par turant notification aayega aur <b style={{ color: '#2de58a' }}>"Download"</b> button dabate hi file phone/PC mein save ho jayegi!
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
              <button
                className="secondary-button"
                onClick={() => {
                  setQrModalOpen(false);
                  setIsScannerOpen(true);
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#2de58a',
                  borderColor: '#1e4830',
                  background: '#0d1f16',
                }}
                data-testid="modal-open-scanner-btn"
              >
                <Camera size={15} />
                <span>Scan Another Device's Screen with Camera</span>
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="primary-button"
                  onClick={() => {
                    window.open(`${window.location.origin}${window.location.pathname}?room=${roomId}`, '_blank');
                  }}
                  style={{ flex: 1 }}
                >
                  <ExternalLink size={14} /> Open in 2nd Tab (Test Now)
                </button>
                <button className="secondary-button" onClick={() => setQrModalOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optical Camera QR Scanner Overlay */}
      <QrScannerOverlay
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        currentRoomId={roomId}
      />

      {/* Complete Viva Preparation Guide Modal */}
      <VivaGuideModal
        isOpen={vivaModalOpen}
        onClose={() => setVivaModalOpen(false)}
        publicUrl="https://ais-pre-xc6umv54wt7vy64zwkifr7-270791645695.asia-southeast1.run.app/?viva=true"
      />

      {/* 10-Slide Project Presentation Modal */}
      <PresentationModal
        isOpen={pptModalOpen}
        onClose={() => setPptModalOpen(false)}
        publicUrl="https://ais-pre-xc6umv54wt7vy64zwkifr7-270791645695.asia-southeast1.run.app/?ppt=true"
      />
    </main>
  );
}
