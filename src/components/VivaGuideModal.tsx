import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Copy,
  Check,
  Search,
  ExternalLink,
  Printer,
  Sparkles,
  Layers,
  Cpu,
  Shield,
  Wifi,
  Radio,
  FileCode2,
} from 'lucide-react';

interface VivaGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicUrl?: string;
}

interface QuestionItem {
  id: string;
  category: 'core' | 'frontend' | 'backend' | 'networking' | 'demo';
  q: string;
  shortAnswer: string;
  detailedPoints: string[];
  keyTerms: string[];
}

const VIVA_QUESTIONS: QuestionItem[] = [
  {
    id: 'intro',
    category: 'core',
    q: 'Q1: Apne project ka introduction do (Elevator Pitch / Overview)?',
    shortAnswer:
      'Yeh ek browser-based Local Peer-to-Peer File Transfer aur Visual TCP Communication Lab hai, jo bina kisi internet cloud ya third-party login ke direct high-speed transfer aur live network protocol visualization provide karta hai.',
    detailedPoints: [
      'Problem Solved: Hum bina Google Drive, WhatsApp ya internet data use kiye local network par heavy files (images, documents, videos) ko instantly share kar sakte hain.',
      'Educational Value: TCP Packet Chunking (1024 B chunks), Throughput Speed Graph, Cryptographic SHA-256 Hash Verification aur Congestion Control ko screen par live visualize karta hai.',
      'Architecture: Node.js + Express backend with WebSocket full-duplex room signaling and React 19 + TypeScript frontend.',
    ],
    keyTerms: ['P2P File Transfer', 'TCP Chunking', 'WebSocket Signaling', 'SHA-256 Integrity', 'Zero-Cloud'],
  },
  {
    id: 'tech-stack',
    category: 'core',
    q: 'Q2: Is project mein Frontend aur Backend mein kya-kya use hua hai?',
    shortAnswer:
      'Frontend mein React 19, TypeScript, Vite, Tailwind CSS, Recharts, jsQR aur Web Crypto API use hua hai. Backend mein Node.js, Express.js, WebSocket (ws), Multer (memoryStorage), aur Node crypto module use hua hai.',
    detailedPoints: [
      'Frontend UI: React 19 (Hooks, Functional Components), Recharts (Live Speed Telemetry Chart), Lucide React (Icons).',
      'Frontend Sensors & Crypto: HTML5 getUserMedia + jsQR (Camera Scanner), Web Crypto Subtle API (Client SHA-256 calculation), Web Audio API (Scanner Audio Beep).',
      'Backend Server: Node.js + Express REST APIs (/api/upload, /api/download, /api/files/export, /api/files delete).',
      'Real-time Sync: ws (WebSocket) server on /ws for instant room multiplexing and broadcast events (FILE_SHARED, FILE_DELETED, ROOM_CLEARED).',
      'Storage: Multer memoryStorage (In-memory volatile RAM buffer for 10x faster I/O compared to hard disk).',
    ],
    keyTerms: ['React 19', 'TypeScript', 'Node.js', 'Express', 'WebSocket (ws)', 'Multer', 'Recharts', 'jsQR'],
  },
  {
    id: 'devices-connect',
    category: 'networking',
    q: 'Q3: Do alag-alag devices (Laptop aur Phone) aapas mein kaise connect hoti hain?',
    shortAnswer:
      'Room-based WebSocket Multiplexing ke through connect hoti hain. Device A room banata hai jiska dynamic QR code banta hai, aur Device B camera se scan karke ya link se usi room channel mein join ho jata hai.',
    detailedPoints: [
      'Step 1: URL parameter mein ?room=COMM-LAB hota hai.',
      'Step 2: Frontend qrcode library se us URL ka live QR code generate karta hai.',
      'Step 3: Phone camera se QR scan karta hai ya Optical Scanner kholkar scan karta hai.',
      'Step 4: Dono devices ka browser WebSocket handshake karta hai aur REGISTER packet bhejta hai with { roomId: "COMM-LAB", deviceId, deviceName }.',
      'Step 5: Server dono devices ko ek hi virtual room channel mein map karta hai aur live active peer count (e.g. 2 ONLINE) update karta hai.',
    ],
    keyTerms: ['WebSocket Handshake', 'Room Multiplexing', 'Dynamic QR Code', 'Virtual Room Channel', 'Peer Discovery'],
  },
  {
    id: 'rest-vs-ws',
    category: 'backend',
    q: 'Q4: REST API aur WebSocket dono kyun lagaye? Sirf ek se kaam kyun nahi kiya?',
    shortAnswer:
      'Heavy binary data (files) ke upload/download ke liye REST API best aur reliable hai, jabki instant notification aur real-time state sync ke liye WebSocket best hai.',
    detailedPoints: [
      'Kyunki WebSocket par 100MB+ ki heavy binary transfer karne par framing overhead aur socket congestion ho sakta hai.',
      'REST API (POST /api/upload) multipart stream handle karta hai aur progress events (xhr.upload.onprogress) accurately track karta hai.',
      'WebSocket sirf lightweight JSON signaling bhejta hai (FILE_SHARED, PEER_LIST, FILE_DELETED) jo 5 millisecond ke andar sabhi connected screens ko update karta hai.',
      'Yeh hybrid architecture industry standard hai (Zoom, WhatsApp Web, Slack bhi yahi use karte hain).',
    ],
    keyTerms: ['Hybrid Architecture', 'REST Multipart Streaming', 'Low-Latency WebSocket Signaling', 'xhr.upload.onprogress'],
  },
  {
    id: 'sha256',
    category: 'core',
    q: 'Q5: SHA-256 Checksum ka kya kaam hai aur yeh kaise calculate hota hai?',
    shortAnswer:
      'SHA-256 Data Integrity verify karta hai, yaani ensure karta hai ki transfer ke dauran file ka 1 single bit bhi corrupt ya modify nahi hua hai.',
    detailedPoints: [
      'Client-side: File choose hote hi browser window.crypto.subtle.digest("SHA-256", arrayBuffer) se 64-character hex hash generate karta hai.',
      'Server-side: File upload hone par Node.js crypto.createHash("sha256").update(buffer).digest("hex") dobara hash banata hai.',
      'Verification: Dono hashes compare hote hain. Agar match hue toh green verification checkmark aata hai.',
      'Importance: Network noise, bit flipping, ya packet loss detection ke liye cryptographic integrity verification zaroori hai.',
    ],
    keyTerms: ['SHA-256 Hash', 'Cryptographic Integrity', 'Bit Flipping Detection', 'Web Crypto API', 'Node crypto'],
  },
  {
    id: 'chunking',
    category: 'networking',
    q: 'Q6: Packet Chunking (1024 Bytes / 1 KB) kya hai aur kyun zaroori hai?',
    shortAnswer:
      'Computer Networks mein TCP protocol data ko maximum segment size (MSS/packets) mein tod kar bhejta hai. Humne use 1024 B chunks mein simulate aur visualize kiya hai.',
    detailedPoints: [
      'Badi files ko ek hi continuous frame mein bhejne par agar 1 bit bhi fail ho toh puri file dubara bhejni padti.',
      'Chunking se file 1024 bytes ke tukdon mein sequence number ke saath bheji jaati hai.',
      'Har chunk par acknowledgment calculate hoti hai, jisse UI par chunk number (e.g. Chunk #14/50) aur real-time delivery speed display hoti hai.',
    ],
    keyTerms: ['TCP Maximum Segment Size (MSS)', 'Sequence Number', 'Chunk Acknowledgment', 'Packetization'],
  },
  {
    id: 'congestion',
    category: 'networking',
    q: 'Q7: Network Congestion Warning screen par kaise detect aur trigger hoti hai?',
    shortAnswer:
      'Sliding Window algorithm use hota hai. Agar continuous 3 ya 4 samples speed ke 5 KB/s se kam aate hain, toh system Congestion Warning pulse trigger karta hai.',
    detailedPoints: [
      'Recharts AreaChart har 800ms par network throughput sample plot karta hai.',
      'Agar network throttle ho ya simulate button dabayein, speed low ho jaati hai.',
      'Consecutive low-speed counter (> 3 samples < 5 KB/s) threshold exceed hote hi chart ka color orange/gold ho jata hai aur CONGESTION DETECTED alert show hota hai.',
      'Yeh TCP ke Congestion Window Reduction (TCP Reno / CUBIC) behavior ko visually demonstrate karta hai.',
    ],
    keyTerms: ['Sliding Window', 'Throughput Telemetry', 'TCP Congestion Window', 'Packet Loss', 'Throttling'],
  },
  {
    id: 'camera-qr',
    category: 'frontend',
    q: 'Q8: Camera QR Scanner overlay kaise kaam karta hai?',
    shortAnswer:
      'HTML5 getUserMedia se device camera stream start hoti hai, video frames ko hidden canvas par render karke jsQR library se real-time decode kiya jata hai.',
    detailedPoints: [
      'Hardware Access: navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } }) rear camera request karta hai.',
      'Canvas Analysis: requestAnimationFrame loop mein 60 FPS par canvas.getContext("2d").getImageData() se pixels jsQR ko pass kiye jaate hain.',
      'Decoded Result: QR se URL ya Room ID milti hai, Web Audio API se synthetic A5 beep bajti hai, aur user automatically us room mein switch ho jata hai.',
      'Extra Controls: Torch (Flashlight toggle), Camera switcher, aur manual input fallback bhi include kiya gaya hai.',
    ],
    keyTerms: ['getUserMedia', 'jsQR', 'Offscreen Canvas', 'requestAnimationFrame', 'Web Audio API', 'Torch Constraints'],
  },
  {
    id: 'ram-storage',
    category: 'backend',
    q: 'Q9: Files server ki hard drive par save hoti hain ya RAM mein? Kyun?',
    shortAnswer:
      'Files server ke RAM (In-Memory Buffer) mein save hoti hain Multer memoryStorage ke zariye.',
    detailedPoints: [
      'Speed: RAM write speed (GB/s) hard drive ya SSD se kai guna tez hoti hai.',
      'Zero Disk Bloat: P2P transfer ke baad disk space bharne ya junk files jama hone ka koi risk nahi hota.',
      'Privacy: Server restart hote hi memory clean ho jaati hai, koi permanent storage footprint nahi bachta.',
    ],
    keyTerms: ['Multer memoryStorage', 'RAM Buffer', 'Zero-Disk Footprint', 'Volatile Memory', 'I/O Latency'],
  },
  {
    id: 'auto-download',
    category: 'frontend',
    q: 'Q10: "Auto-download all incoming files" feature kaise kaam karta hai?',
    shortAnswer:
      'Trusted Peer Mode mein jaise hi WebSocket se FILE_SHARED event receive hota hai, JavaScript programmatic anchor click se file direct user ke download folder mein save ho jaati hai.',
    detailedPoints: [
      'Checkbox toggle state localStorage mein save rehta hai.',
      'FILE_SHARED aane par triggerFileDownload(url, fileName) call hota hai jo temporary <a> tag create karke document.body.appendChild aur link.click() karta hai.',
      'User ko bina kisi manual click ke files automatically receive ho jaati hain.',
    ],
    keyTerms: ['Programmatic Download', 'Trusted Peer Mode', 'Event-Driven Trigger', 'localStorage Persistence'],
  },
  {
    id: 'export-json',
    category: 'backend',
    q: 'Q11: Export JSON feature kya generate karta hai aur iska kya use hai?',
    shortAnswer:
      'Yeh room mein received sabhi files ka complete cryptographic audit log export karta hai (.json format mein).',
    detailedPoints: [
      'Metadata include hota hai: export timestamp, application name, room ID, device info, total file count aur total formatted bytes.',
      'File details: har file ka ID, file name, exact bytes, MIME type, cryptographic SHA-256 hash, sender device name aur receive time.',
      'Use: Transfer history ka offline record rakhne aur security auditing ke liye.',
    ],
    keyTerms: ['Audit Trail', 'JSON Manifest', 'Blob API', 'Cryptographic Record', 'Session History'],
  },
  {
    id: 'delete-sync',
    category: 'backend',
    q: 'Q12: File delete karne par real-time sync kaise hota hai?',
    shortAnswer:
      'Delete button dabane par DELETE /api/files/:fileId endpoint call hota hai, server fileStorage Map se delete karke WebSocket par FILE_DELETED broadcast karta hai.',
    detailedPoints: [
      'Device A par Delete click hota hai.',
      'Backend fileId ko delete karta hai aur broadcastRoom(roomId, { type: "FILE_DELETED", fileId }) trigger karta hai.',
      'Room mein jude sabhi devices ka frontend setSharedFiles((prev) => prev.filter(f => f.id !== fileId)) se list update kar leta hai.',
      'Kahi bhi page reload karne ki zaroorat nahi padti.',
    ],
    keyTerms: ['DELETE Endpoint', 'In-Memory Map Deletion', 'FILE_DELETED Broadcast', 'Optimistic UI Update'],
  },
  {
    id: 'demo-script',
    category: 'demo',
    q: 'Q13: Examiner ko 30-Second Live Demo kaise dikhana hai?',
    shortAnswer:
      'Top bar se "Open 2nd Tab" dabayein -> Tab 1 se file choose karke "Share File Now" dabayein -> Tab 2 mein instant download banner dekhein -> "Delete" click karke live sync dikhayein!',
    detailedPoints: [
      'Step 1: Top bar mein "Open 2nd Tab" button dabayein. Dikhayein ki "2 ONLINE" peers connect ho gaye.',
      'Step 2: Tab 1 se koi image ya text file select karein. Dikhayein ki SHA-256 hash automatically calculate ho gaya.',
      'Step 3: "Share File Now" dabayein. Dikhayein ki 1024 B chunks transfer hue aur Tab 2 par 1 second mein green banner ke saath file aayi.',
      'Step 4: Tab 2 mein "Export JSON" dabakar file history download karke dikhayein.',
      'Step 5: Tab 1 par "Delete" dabayein aur dikhayein ki Tab 2 se bhi wo file bina page refresh kiye turant gayab ho gayi.',
    ],
    keyTerms: ['2nd Tab Emulation', 'Live Peer Discovery', 'Instant WebSocket Delivery', 'Real-Time Deletion'],
  },
];

export const VivaGuideModal: React.FC<VivaGuideModalProps> = ({ isOpen, onClose, publicUrl }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const shareableVivaUrl =
    publicUrl || `${window.location.origin}${window.location.pathname}?viva=true`;

  const copyVivaLink = () => {
    navigator.clipboard?.writeText(shareableVivaUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredQuestions = VIVA_QUESTIONS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.q.toLowerCase().includes(term) ||
      item.shortAnswer.toLowerCase().includes(term) ||
      item.keyTerms.some((t) => t.toLowerCase().includes(term));
    return matchesCategory && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(4, 6, 12, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      data-testid="viva-guide-modal"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          background: '#0d111a',
          border: '1px solid #23344d',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(59, 140, 255, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e2a3c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #101a2b, #0d121c)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                background: '#163359',
                border: '1px solid #285b9e',
                color: '#54b4ff',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  color: '#fff',
                  fontFamily: "'DM Mono', monospace",
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Complete Viva Preparation Guide</span>
                <span
                  style={{
                    background: '#1d3f27',
                    border: '1px solid #2de58a',
                    color: '#2de58a',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '2px',
                  }}
                >
                  FULL DETAIL
                </span>
              </h2>
              <span style={{ fontSize: '11px', color: '#8e95a5' }}>
                Computer Networks & Distributed Systems Viva Questions & Answers
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Share Link Button */}
            <button
              onClick={copyVivaLink}
              className="secondary-button"
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: copiedLink ? '#2de58a' : '#7ebaff',
                borderColor: copiedLink ? '#1f4830' : '#1e3860',
              }}
              title="Copy shareable link to this Viva Guide"
              data-testid="copy-viva-link-btn"
            >
              {copiedLink ? <Check size={13} color="#2de58a" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
            </button>

            {/* Print Button */}
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
              title="Print or Save as PDF"
            >
              <Printer size={13} />
              <span>Print / PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="icon-button"
              style={{ width: '34px', height: '34px' }}
              title="Close Guide (Esc)"
              data-testid="close-viva-modal-btn"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Shareable URL Banner */}
        <div
          style={{
            background: '#0a0e17',
            padding: '8px 20px',
            borderBottom: '1px solid #1a2230',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: "'DM Mono', monospace",
            fontSize: '11px',
            color: '#8e95a5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <span style={{ color: '#2de58a' }}>● SHAREABLE LINK:</span>
            <code
              style={{
                color: '#fff',
                background: '#121824',
                padding: '2px 8px',
                border: '1px solid #233147',
                borderRadius: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '520px',
              }}
            >
              {shareableVivaUrl}
            </code>
          </div>
          <button
            onClick={copyVivaLink}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b8cff',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: "'DM Mono', monospace",
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <Copy size={11} /> {copiedLink ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #1e2636',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            background: '#090d14',
          }}
        >
          {/* Categories */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Questions', icon: BookOpen },
              { id: 'core', label: 'Core / Pitch', icon: Sparkles },
              { id: 'frontend', label: 'Frontend Tech', icon: Cpu },
              { id: 'backend', label: 'Backend & APIs', icon: Layers },
              { id: 'networking', label: 'Networking & Security', icon: Shield },
              { id: 'demo', label: '30-Sec Live Demo', icon: Radio },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    background: isActive ? '#1c3e6b' : '#121622',
                    border: isActive ? '1px solid #3b8cff' : '1px solid #202738',
                    color: isActive ? '#fff' : '#8e95a5',
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontFamily: "'DM Mono', monospace",
                    borderRadius: '2px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={12} color={isActive ? '#54b4ff' : '#6c7a92'} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              width: '240px',
            }}
          >
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6c7a92',
              }}
            />
            <input
              type="text"
              placeholder="Search (e.g. SHA-256, Multer)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: '#121724',
                border: '1px solid #222d40',
                color: '#fff',
                fontSize: '11px',
                fontFamily: "'DM Mono', monospace",
                padding: '6px 10px 6px 28px',
                borderRadius: '2px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Scrollable Questions Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {filteredQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c7a92' }}>
              No questions found matching "{searchTerm}". Try another search term.
            </div>
          ) : (
            filteredQuestions.map((item, index) => (
              <div
                key={item.id}
                style={{
                  background: '#11151f',
                  border: '1px solid #1f283a',
                  borderLeft: '4px solid #3b8cff',
                  borderRadius: '2px',
                  padding: '16px 18px',
                }}
              >
                {/* Question Title */}
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '14px',
                    color: '#fff',
                    fontFamily: "'DM Mono', monospace",
                    fontWeight: 600,
                    lineHeight: '1.4',
                  }}
                >
                  {item.q}
                </h3>

                {/* Short Answer (Instant Speech) */}
                <div
                  style={{
                    background: '#161d2b',
                    border: '1px solid #22334d',
                    padding: '8px 12px',
                    borderRadius: '2px',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      font: "10px 'DM Mono', monospace",
                      color: '#2de58a',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    ⚡ DIRECT VIVA ANSWER (Bolne Ke Liye):
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#e2e8f0',
                      lineHeight: '1.5',
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {item.shortAnswer}
                  </p>
                </div>

                {/* Detailed Technical Points */}
                <div style={{ marginBottom: '10px' }}>
                  <span
                    style={{
                      font: "10px 'DM Mono', monospace",
                      color: '#8e95a5',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    TECHNICAL DEEP-DIVE & EXPLANATION:
                  </span>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: '20px',
                      color: '#94a3b8',
                      fontSize: '12px',
                      lineHeight: '1.6',
                    }}
                  >
                    {item.detailedPoints.map((pt, pIdx) => (
                      <li key={pIdx} style={{ marginBottom: '4px' }}>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Key Technical Keywords (Tags) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ font: "10px 'DM Mono', monospace", color: '#64748b' }}>KEYWORDS:</span>
                  {item.keyTerms.map((term, tIdx) => (
                    <span
                      key={tIdx}
                      style={{
                        background: '#0a0d14',
                        border: '1px solid #1f2738',
                        color: '#7ebaff',
                        fontSize: '10px',
                        fontFamily: "'DM Mono', monospace",
                        padding: '2px 6px',
                        borderRadius: '2px',
                      }}
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #1e2636',
            background: '#090d14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: "'DM Mono', monospace",
            fontSize: '11px',
            color: '#8e95a5',
          }}
        >
          <span>
            Total: <b style={{ color: '#fff' }}>{filteredQuestions.length} Questions</b> ready for examination.
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="secondary-button" onClick={copyVivaLink} style={{ padding: '6px 14px' }}>
              <Copy size={13} /> Copy Shareable Link
            </button>
            <button className="primary-button" onClick={onClose} style={{ padding: '6px 16px' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
