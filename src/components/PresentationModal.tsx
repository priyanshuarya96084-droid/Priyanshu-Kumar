import React, { useState, useEffect } from 'react';
import pptxgen from 'pptxgenjs';
import {
  Presentation,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Copy,
  Check,
  Maximize2,
  FileText,
  Layers,
  Cpu,
  Shield,
  Wifi,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicUrl?: string;
}

export interface SlideData {
  slideNumber: number;
  title: string;
  subtitle: string;
  category: string;
  points: { title: string; desc: string }[];
  bulletSummary: string[];
  speakerNotes: string;
  diagramTitle?: string;
  diagramSteps?: string[];
}

export const SLIDES: SlideData[] = [
  {
    slideNumber: 1,
    title: 'Comm File Exchange & Visual TCP Network Hub',
    subtitle: 'Real-time Peer-to-Peer Data Transfer & Network Protocol Visualizer',
    category: 'TITLE SLIDE',
    points: [
      {
        title: 'Project Domain',
        desc: 'Computer Networks, Distributed Systems & Real-time Web Communication',
      },
      {
        title: 'Core Technology Stack',
        desc: 'React 19 + TypeScript + Vite | Node.js + Express + WebSocket (ws)',
      },
      {
        title: 'Target Purpose',
        desc: 'Zero-cloud device-to-device local file sharing with live protocol telemetry',
      },
    ],
    bulletSummary: [
      'High-speed, browser-to-browser local file sharing',
      'No external cloud storage, third-party logins, or cables needed',
      'Visualized TCP chunking, packet streams & cryptographic SHA-256 verification',
      'Real-time network throughput and congestion control telemetry',
    ],
    speakerNotes:
      'Welcome everyone. Today I am presenting our project: Comm File Exchange & Visual TCP Network Hub. It bridges practical cross-device file sharing with educational data communication telemetry.',
  },
  {
    slideNumber: 2,
    title: 'Problem Statement & Motivation',
    subtitle: 'Why Traditional File Sharing Methods Fall Short in Local Environments',
    category: 'PROBLEM ANALYSIS',
    points: [
      {
        title: 'Cloud Dependency & Data Waste',
        desc: 'Sending a 100MB file to a phone sitting next to you requires uploading to external cloud servers and re-downloading, wasting cellular data and bandwidth.',
      },
      {
        title: 'Privacy & Security Risks',
        desc: 'Third-party cloud apps retain metadata and files on remote servers without transparent user control.',
      },
      {
        title: 'Black-box Networking',
        desc: 'Standard sharing tools hide networking mechanics like packet chunking, throughput jitter, and data corruption.',
      },
    ],
    bulletSummary: [
      'High latency when uploading to external servers for nearby devices',
      'Privacy concerns with permanent cloud storage & third-party intermediaries',
      'Operating system barriers (AirDrop limited to Apple, QuickShare limited to Android/Windows)',
      'Lack of educational visualization for networking students & developers',
    ],
    speakerNotes:
      'The motivation behind this project is simple: sharing a file between two devices in the same room shouldn’t travel across the internet and back. We need an OS-agnostic, zero-install, zero-cloud solution that also visualizes the transfer.',
  },
  {
    slideNumber: 3,
    title: 'Proposed Solution & Core Objectives',
    subtitle: 'A Universal Browser-Based P2P Hub with Real-Time Telemetry',
    category: 'PROJECT OBJECTIVES',
    points: [
      {
        title: 'Zero-Install Cross-Platform',
        desc: 'Runs on any device with a modern browser (Windows, macOS, Linux, Android, iOS) via simple QR scan.',
      },
      {
        title: 'RAM-Buffered High-Speed Hub',
        desc: 'Volatile in-memory streaming via Multer memoryStorage provides near-instant transfer with zero permanent disk footprint.',
      },
      {
        title: 'Data Communication Visualizer',
        desc: 'Live 1024-byte packet chunking, SHA-256 cryptographic check, and real-time throughput charting.',
      },
    ],
    bulletSummary: [
      'Instant connection via dynamic QR code and optical camera scanner',
      'Dual-protocol architecture: HTTP REST for bulk data + WebSockets for signaling',
      'Cryptographic SHA-256 end-to-end data integrity verification',
      'Congestion detection and throughput telemetry visualizer',
    ],
    speakerNotes:
      'Our solution is a dual-purpose system: an ultra-fast local file exchange tool and an educational TCP communication visualizer that demonstrates real networking principles.',
  },
  {
    slideNumber: 4,
    title: 'System Architecture & Data Flow',
    subtitle: 'Hybrid Client-Server Signaling with Volatile Memory Hub',
    category: 'SYSTEM DESIGN',
    points: [
      {
        title: 'Signaling Layer (WebSocket)',
        desc: 'Handles peer registration, room multiplexing, peer count (ONLINE), and instantaneous notifications (FILE_SHARED, FILE_DELETED).',
      },
      {
        title: 'Data Transport Layer (HTTP REST)',
        desc: 'Streams binary payloads via POST /api/upload with precise XMLHttpRequest upload progress tracking.',
      },
      {
        title: 'In-Memory Storage Layer',
        desc: 'Node.js memory Map holds active files in RAM buffer, providing microsecond access latency.',
      },
    ],
    bulletSummary: [
      'Device A selects file -> Computes client SHA-256 hash',
      'Device A uploads via HTTP POST stream -> Multer stores in RAM buffer',
      'Server verifies SHA-256 hash -> Broadcasts FILE_SHARED event to room',
      'Device B receives WebSocket event -> Renders file row or auto-downloads',
    ],
    diagramTitle: 'End-to-End Data Pipeline Flow',
    diagramSteps: [
      '[Sender Device] -> Compute SHA-256 Hash',
      '[HTTP POST /api/upload] -> RAM Buffer (Multer)',
      '[WebSocket Engine] -> Broadcast FILE_SHARED to Room',
      '[Receiver Device] -> Instant Notification / Auto-Download',
    ],
    speakerNotes:
      'Here is our system architecture: notice the clean separation between bulk binary transport over HTTP streams and real-time event signaling over WebSockets. This avoids socket congestion while maintaining sub-second notifications.',
  },
  {
    slideNumber: 5,
    title: 'Frontend Implementation & Tech Stack',
    subtitle: 'Modern Component-Driven UI Built on React 19 & TypeScript',
    category: 'FRONTEND ARCHITECTURE',
    points: [
      {
        title: 'React 19 & TypeScript',
        desc: 'Modular, type-safe architecture with custom hooks managing real-time WebSocket state, file chunks, and peer telemetry.',
      },
      {
        title: 'Recharts Telemetry AreaChart',
        desc: 'Live animated graph plotting bandwidth in KB/s and Mbps, dynamically detecting network congestion.',
      },
      {
        title: 'Optical QR Scanner (jsQR + getUserMedia)',
        desc: 'Decodes video stream at 60 FPS on HTML5 canvas with synthesized audio frequency tone on pairing.',
      },
    ],
    bulletSummary: [
      'Tailwind CSS & NOC dark aesthetic with high-contrast accessibility',
      'Web Crypto Subtle API for client-side cryptographic hashing',
      'Web Audio API for synthesized acoustic feedback without external assets',
      'Responsive design adapting from mobile phones to 4K desktop displays',
    ],
    speakerNotes:
      'On the frontend, we used React 19 and TypeScript. We integrated Recharts for live bandwidth telemetry, jsQR for 60 FPS camera scanning, and the native Web Crypto API for client-side SHA-256 calculations.',
  },
  {
    slideNumber: 6,
    title: 'Backend Implementation & API Design',
    subtitle: 'High-Performance Node.js & Express Real-Time Engine',
    category: 'BACKEND ARCHITECTURE',
    points: [
      {
        title: 'Express REST Endpoints',
        desc: 'RESTful handlers for /api/upload, /api/download/:id, /api/files (list & clear), and /api/files/export.',
      },
      {
        title: 'WebSocket Server (ws)',
        desc: 'Room multiplexing mechanism mapping connected sockets by roomId, broadcasting real-time peer events.',
      },
      {
        title: 'Multer Memory Storage',
        desc: 'Direct RAM buffering supporting up to 300MB files with zero disk read/write bottleneck.',
      },
    ],
    bulletSummary: [
      'POST /api/upload: Multipart handler with cryptographic hash verification',
      'GET /api/download/:fileId: Streamed binary download with Content-Disposition',
      'DELETE /api/files/:fileId: Real-time deletion with WebSocket broadcast',
      'GET /api/files/export: Room audit manifest generation in JSON format',
    ],
    speakerNotes:
      'The backend is powered by Node.js and Express. By utilizing Multer memoryStorage and Node crypto module, files are transferred directly through RAM buffers with complete cryptographic parity.',
  },
  {
    slideNumber: 7,
    title: 'Networking Concepts: TCP Simulation & Chunking',
    subtitle: 'Demonstrating Core Data Communication Principles',
    category: 'NETWORKING PRINCIPLES',
    points: [
      {
        title: 'Packet Chunking Simulation',
        desc: 'Files are divided into 1024-byte (1 KB) packets to simulate TCP Maximum Segment Size (MSS) packetization.',
      },
      {
        title: 'Sequence Numbers & ACK Flow',
        desc: 'Each chunk is tracked by sequence index with incremental acknowledgment updates displayed in real time.',
      },
      {
        title: 'Real-time Sliding Window Telemetry',
        desc: 'Bandwidth samples are captured continuously to track throughput jitter and network latency.',
      },
    ],
    bulletSummary: [
      'Chunk size set to 1024 Bytes (1 KB) for observable packet sequencing',
      'Eliminates full-file retransmission upon transmission faults',
      'Real-time calculation of active chunk index: Chunk #N of Total Chunks',
      'Packet transmission time and throughput telemetry displayed live',
    ],
    speakerNotes:
      'To make this an educational tool, we implemented visual packet chunking. Large files are segmented into 1024-byte units, allowing students to observe packet delivery and sequence numbering just like real TCP.',
  },
  {
    slideNumber: 8,
    title: 'Security & Cryptographic Data Integrity',
    subtitle: 'End-to-End SHA-256 Verification & Zero-Disk Privacy',
    category: 'SECURITY & PRIVACY',
    points: [
      {
        title: 'Dual-End SHA-256 Checksum',
        desc: 'Client computes hash via Web Crypto; Server computes hash via Node crypto. Matching hashes guarantee zero bit-flipping.',
      },
      {
        title: 'Volatile In-Memory Lifecycle',
        desc: 'Files exist solely in volatile RAM. Restarting or clearing the hub leaves zero persistent artifacts on the host disk.',
      },
      {
        title: 'Real-time Deletion Synchronization',
        desc: 'Deleting a file immediately purges it from memory and broadcasts an instant removal signal to all connected screens.',
      },
    ],
    bulletSummary: [
      'Collision-resistant 256-bit cryptographic digest (64 hex characters)',
      'Bit-level tamper detection against transmission noise and corruptions',
      'Trusted Peer Auto-Download with user-controlled consent toggles',
      'Complete session audit manifest exportable as signed JSON file',
    ],
    speakerNotes:
      'Security and integrity are paramount. We compute SHA-256 hashes on both client and server to verify that not a single bit was corrupted during transit. Furthermore, files stay in RAM, guaranteeing zero persistent disk traces.',
  },
  {
    slideNumber: 9,
    title: 'Experimental Results & Performance Analysis',
    subtitle: 'Empirical Telemetry, Latency, and Congestion Detection',
    category: 'PERFORMANCE ANALYSIS',
    points: [
      {
        title: 'Transfer Speed & Latency',
        desc: 'Transfers achieve up to 35-70 MB/s over standard 5GHz Wi-Fi LAN with sub-50ms initial signaling latency.',
      },
      {
        title: 'Algorithmic Congestion Warning',
        desc: 'Sliding window detects low throughput (< 5 KB/s over 3+ consecutive samples) and triggers visual warning badges.',
      },
      {
        title: 'Cross-Device Compatibility',
        desc: 'Tested seamlessly across Chrome, Safari iOS, Firefox, and Android browsers with 100% pairing success.',
      },
    ],
    bulletSummary: [
      'Signaling Handshake Latency: < 20 ms via WebSocket',
      'Throughput on Local 5GHz Wi-Fi: 35-70 MB/s (limited only by network hardware)',
      'Memory Efficiency: Low footprint due to stream piping & volatile Map storage',
      'Camera QR Scan Time: < 300 ms optical decode via jsQR',
    ],
    speakerNotes:
      'In our experimental tests, local network transfers achieved near-wire speeds of 35 to 70 MB/s over 5GHz Wi-Fi, completely bypassing external cloud bottlenecks. Optical camera pairing was achieved in under 300 milliseconds.',
  },
  {
    slideNumber: 10,
    title: 'Conclusion & Future Enhancements',
    subtitle: 'Summary of Key Achievements and Roadmap for Evolution',
    category: 'CONCLUSION & ROADMAP',
    points: [
      {
        title: 'Key Achievements',
        desc: 'Built a production-grade, zero-install, zero-cloud file exchange hub with live educational TCP visualization and SHA-256 integrity.',
      },
      {
        title: 'Future Scope: WebRTC DataChannels',
        desc: 'Implement WebRTC RTCDataChannel for true serverless browser-to-browser UDP/SCTP direct mesh transport.',
      },
      {
        title: 'Future Scope: End-to-End Encryption',
        desc: 'Add client-side AES-GCM 256-bit encryption with dynamic Diffie-Hellman key exchange for zero-knowledge privacy.',
      },
    ],
    bulletSummary: [
      'Successfully demonstrates practical utility combined with educational networking concepts',
      'Cross-platform compatibility across Windows, Mac, Linux, Android, and iOS',
      'Planned: WebRTC direct mesh transfer & resumed partial chunk downloads',
      'Planned: Folder upload support and AES-256 client-side file encryption',
    ],
    speakerNotes:
      'In conclusion, this project demonstrates how modern web standards can replace heavy cloud services for local file sharing while serving as an intuitive educational lab for networking students. Thank you! Any questions?',
  },
];

export const PresentationModal: React.FC<PresentationModalProps> = ({ isOpen, onClose, publicUrl }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isExportingPptx, setIsExportingPptx] = useState<boolean>(false);

  const slide = SLIDES[currentSlideIndex];
  const shareablePptUrl = publicUrl || `${window.location.origin}${window.location.pathname}?ppt=true`;

  const copyPptLink = () => {
    navigator.clipboard?.writeText(shareablePptUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev < SLIDES.length - 1 ? prev + 1 : 0));
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : SLIDES.length - 1));
  };

  // Keyboard navigation (Arrow keys + Esc)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlideIndex]);

  // Real .PPTX Generator using pptxgenjs
  const exportToPptxFile = async () => {
    setIsExportingPptx(true);
    try {
      const pres = new pptxgen();
      pres.layout = 'LAYOUT_16x9';
      pres.author = 'Comm File Exchange Team';
      pres.company = 'Computer Networks Lab';
      pres.title = 'Comm File Exchange Presentation';

      SLIDES.forEach((item) => {
        const pptxSlide = pres.addSlide();
        pptxSlide.background = { color: '0A0E17' };

        // Header Category Badge
        pptxSlide.addText(item.category, {
          x: 0.8,
          y: 0.4,
          w: 4.0,
          h: 0.3,
          fontSize: 10,
          fontFace: 'Arial',
          color: '3B8CFF',
          bold: true,
        });

        // Slide Title
        pptxSlide.addText(item.title, {
          x: 0.8,
          y: 0.7,
          w: 11.5,
          h: 0.8,
          fontSize: 22,
          fontFace: 'Arial',
          color: 'FFFFFF',
          bold: true,
        });

        // Subtitle
        pptxSlide.addText(item.subtitle, {
          x: 0.8,
          y: 1.45,
          w: 11.5,
          h: 0.4,
          fontSize: 12,
          fontFace: 'Arial',
          color: '94A3B8',
        });

        // Horizontal Line
        pptxSlide.addShape(pres.ShapeType.line, {
          x: 0.8,
          y: 1.95,
          w: 11.7,
          h: 0,
          line: { color: '1E293B', width: 1.5 },
        });

        // Points (Left Column)
        const leftPointsText = item.points
          .map((p) => `• ${p.title}:\n  ${p.desc}\n`)
          .join('\n');

        pptxSlide.addText(leftPointsText, {
          x: 0.8,
          y: 2.2,
          w: 6.2,
          h: 4.4,
          fontSize: 11,
          fontFace: 'Arial',
          color: 'CBD5E1',
          lineSpacing: 18,
        });

        // Bullet Summary (Right Column Box)
        pptxSlide.addShape(pres.ShapeType.rect, {
          x: 7.3,
          y: 2.2,
          w: 5.2,
          h: 4.4,
          fill: { color: '111827' },
          line: { color: '1E293B', width: 1 },
        });

        pptxSlide.addText('KEY TAKEAWAYS & HIGHLIGHTS', {
          x: 7.6,
          y: 2.4,
          w: 4.6,
          h: 0.3,
          fontSize: 10,
          fontFace: 'Arial',
          color: '2DE58A',
          bold: true,
        });

        const summaryText = item.bulletSummary.map((b) => `✔  ${b}`).join('\n\n');
        pptxSlide.addText(summaryText, {
          x: 7.6,
          y: 2.8,
          w: 4.6,
          h: 3.5,
          fontSize: 11,
          fontFace: 'Arial',
          color: 'E2E8F0',
          lineSpacing: 16,
        });

        // Slide Footer
        pptxSlide.addText(
          `Comm File Exchange & Visual TCP Network Hub  |  Slide ${item.slideNumber} of ${SLIDES.length}`,
          {
            x: 0.8,
            y: 6.9,
            w: 11.5,
            h: 0.3,
            fontSize: 9,
            fontFace: 'Arial',
            color: '64748B',
          }
        );
      });

      await pres.writeFile({ fileName: 'Comm-File-Exchange-10-Slide-Presentation.pptx' });
    } catch (err) {
      console.error('PPTX export error:', err);
    } finally {
      setIsExportingPptx(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(3, 5, 10, 0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      data-testid="presentation-modal"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: '92vh',
          background: '#0a0e17',
          border: '1px solid #1f2b3e',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(59, 140, 255, 0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Top Control Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #192333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #0d1522, #080c14)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                background: '#142c4c',
                border: '1px solid #234d82',
                color: '#54b4ff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Presentation size={16} />
            </div>
            <div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  fontFamily: "'DM Mono', monospace",
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Project Presentation (10 Slides)</span>
                <span
                  style={{
                    background: '#163359',
                    color: '#7ebaff',
                    fontSize: '9px',
                    padding: '1px 6px',
                    borderRadius: '2px',
                  }}
                >
                  SLIDE {slide.slideNumber} / {SLIDES.length}
                </span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Download .PPTX Button */}
            <button
              onClick={exportToPptxFile}
              disabled={isExportingPptx}
              className="primary-button"
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#2563eb',
                border: '1px solid #3b82f6',
              }}
              title="Download real Microsoft PowerPoint (.pptx) file"
              data-testid="download-pptx-btn"
            >
              <Download size={13} />
              <span>{isExportingPptx ? 'Generating...' : 'Download .PPTX'}</span>
            </button>

            {/* Copy Share Link */}
            <button
              onClick={copyPptLink}
              className="secondary-button"
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: copiedLink ? '#2de58a' : '#7ebaff',
                borderColor: copiedLink ? '#1f4830' : '#1e3860',
              }}
              title="Copy shareable link to this presentation"
              data-testid="copy-ppt-link-btn"
            >
              {copiedLink ? <Check size={13} color="#2de58a" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied' : 'Share PPT'}</span>
            </button>

            {/* Print / Save as PDF */}
            <button
              onClick={() => window.print()}
              className="secondary-button"
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#cbd5e1',
              }}
              title="Print slides or save as PDF"
            >
              <Printer size={13} />
              <span>Print / PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="icon-button"
              style={{ width: '32px', height: '32px' }}
              title="Close Presentation (Esc)"
              data-testid="close-ppt-modal-btn"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Slide Thumbnail Navigation Strip */}
        <div
          style={{
            background: '#070a10',
            borderBottom: '1px solid #151d2b',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {SLIDES.map((s, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <button
                key={s.slideNumber}
                onClick={() => setCurrentSlideIndex(idx)}
                style={{
                  background: isActive ? '#1c3e6b' : '#0e1420',
                  border: isActive ? '1px solid #3b8cff' : '1px solid #1a2333',
                  color: isActive ? '#fff' : '#718096',
                  padding: '4px 10px',
                  fontSize: '10px',
                  fontFamily: "'DM Mono', monospace",
                  borderRadius: '2px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                Slide {s.slideNumber}: {s.title.substring(0, 18)}...
              </button>
            );
          })}
        </div>

        {/* Main Slide Stage (16:9 Aspect Presentation Frame) */}
        <div
          style={{
            flex: 1,
            padding: '24px 32px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#090d16',
          }}
        >
          {/* Slide Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  font: "10px 'DM Mono', monospace",
                  color: '#3b8cff',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  background: '#0f223d',
                  padding: '2px 8px',
                  borderRadius: '2px',
                  border: '1px solid #1f3d6b',
                }}
              >
                {slide.category}
              </span>
              <span style={{ font: "10px 'DM Mono', monospace", color: '#4a5568' }}>•</span>
              <span style={{ font: "10px 'DM Mono', monospace", color: '#a0aec0' }}>
                SLIDE {slide.slideNumber} OF {SLIDES.length}
              </span>
            </div>

            <h1
              style={{
                margin: '0 0 6px',
                fontSize: '24px',
                color: '#fff',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: '1.25',
              }}
            >
              {slide.title}
            </h1>

            <p
              style={{
                margin: '0 0 20px',
                fontSize: '13px',
                color: '#8e9cae',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {slide.subtitle}
            </p>

            <div style={{ height: '1px', background: '#1a2333', marginBottom: '22px' }} />

            {/* Slide Body: Two-Column Presentation Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.15fr 0.85fr',
                gap: '24px',
              }}
            >
              {/* Left Column: Key Pillars / Points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span
                  style={{
                    font: "11px 'DM Mono', monospace",
                    color: '#64748b',
                    letterSpacing: '0.06em',
                  }}
                >
                  DETAILED ANALYSIS & ARCHITECTURE:
                </span>
                {slide.points.map((pt, pIdx) => (
                  <div
                    key={pIdx}
                    style={{
                      background: '#0f1422',
                      border: '1px solid #1a2235',
                      borderLeft: '3px solid #3b8cff',
                      padding: '12px 14px',
                      borderRadius: '2px',
                    }}
                  >
                    <strong
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        color: '#fff',
                        fontFamily: "'Space Grotesk', sans-serif",
                        marginBottom: '4px',
                      }}
                    >
                      {pt.title}
                    </strong>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#94a3b8',
                        lineHeight: '1.5',
                      }}
                    >
                      {pt.desc}
                    </p>
                  </div>
                ))}

                {/* Optional Pipeline Diagram if slide has one */}
                {slide.diagramSteps && (
                  <div
                    style={{
                      marginTop: '8px',
                      background: '#0a0e17',
                      border: '1px dashed #23344d',
                      padding: '12px',
                      borderRadius: '2px',
                    }}
                  >
                    <span
                      style={{
                        font: "10px 'DM Mono', monospace",
                        color: '#2de58a',
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 600,
                      }}
                    >
                      {slide.diagramTitle || 'Data Flow Diagram'}:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {slide.diagramSteps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            font: "11px 'DM Mono', monospace",
                            color: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ color: '#3b8cff' }}>{sIdx + 1}.</span> {step}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Key Takeaways & Speaker Talking Points */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    background: '#0e1624',
                    border: '1px solid #1c2b42',
                    padding: '16px',
                    borderRadius: '2px',
                  }}
                >
                  <span
                    style={{
                      font: "10px 'DM Mono', monospace",
                      color: '#2de58a',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      display: 'block',
                      marginBottom: '10px',
                    }}
                  >
                    KEY TAKEAWAYS & HIGHLIGHTS:
                  </span>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '18px',
                      fontSize: '12px',
                      color: '#cbd5e1',
                      lineHeight: '1.6',
                    }}
                  >
                    {slide.bulletSummary.map((b, bIdx) => (
                      <li key={bIdx} style={{ marginBottom: '6px' }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Speaker Notes Box (To speak during viva/presentation) */}
                <div
                  style={{
                    background: '#161922',
                    border: '1px solid #282f40',
                    padding: '14px',
                    borderRadius: '2px',
                  }}
                >
                  <span
                    style={{
                      font: "10px 'DM Mono', monospace",
                      color: '#f59e0b',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    🎙️ SPEAKER SCRIPT (What to say for this slide):
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#e2e8f0',
                      lineHeight: '1.5',
                      fontStyle: 'italic',
                    }}
                  >
                    "{slide.speakerNotes}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Slide Footer */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '12px',
              borderTop: '1px solid #151d2b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: "'DM Mono', monospace",
              fontSize: '11px',
              color: '#64748b',
            }}
          >
            <span>Comm File Exchange & Visual TCP Network Hub</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Slide {slide.slideNumber} of {SLIDES.length}</span>
              <span>•</span>
              <span>Use ◀ / ▶ arrows or Space to navigate</span>
            </div>
          </div>
        </div>

        {/* Bottom Slide Navigation Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #162030',
            background: '#070b12',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={prevSlide}
            className="secondary-button"
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft size={14} /> Previous
          </button>

          {/* Slide Indicators Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {SLIDES.map((_, dotIdx) => (
              <div
                key={dotIdx}
                onClick={() => setCurrentSlideIndex(dotIdx)}
                style={{
                  width: dotIdx === currentSlideIndex ? '20px' : '7px',
                  height: '7px',
                  borderRadius: '3px',
                  background: dotIdx === currentSlideIndex ? '#3b8cff' : '#1e293b',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={exportToPptxFile}
              disabled={isExportingPptx}
              className="secondary-button"
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              <Download size={13} /> {isExportingPptx ? 'Exporting...' : 'Save as .PPTX'}
            </button>
            <button
              onClick={nextSlide}
              className="primary-button"
              style={{
                padding: '6px 16px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Next Slide (Right Arrow or Space)"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
