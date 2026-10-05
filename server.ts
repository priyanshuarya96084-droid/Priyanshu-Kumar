import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import os from 'os';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Configure multer for file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 }, // 300 MB limit
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Data structures
export interface TransferRecord {
  id: string;
  file_id: string;
  file_name: string;
  file_size: number;
  checksum: string;
  duration_ms: number;
  status: string;
  direction: 'SENT' | 'RECEIVED' | 'SHARED';
  sender_name: string;
  receiver_name: string;
  download_url: string;
  created_at: string;
}

interface StoredFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  checksum: string;
  buffer: Buffer;
  senderName: string;
  roomId: string;
  createdAt: number;
}

const fileStorage = new Map<string, StoredFile>();

// Seed sample transfer history
const transferHistory: TransferRecord[] = [
  {
    id: 'tx-seed-1',
    file_id: 'seed-1',
    file_name: 'network_architecture_spec.pdf',
    file_size: 1450000,
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    duration_ms: 1240,
    status: 'Completed',
    direction: 'SHARED',
    sender_name: 'Workstation Node',
    receiver_name: 'Room COMM-LAB',
    download_url: '#',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

// Helper to get local IP
function getLocalIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const ifaceName of Object.keys(interfaces)) {
      const iface = interfaces[ifaceName];
      if (iface) {
        for (const alias of iface) {
          if (alias.family === 'IPv4' && !alias.internal) {
            return alias.address;
          }
        }
      }
    }
  } catch (err) {
    console.error('Error getting local IP:', err);
  }
  return '192.168.1.24';
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/network-info', (req, res) => {
  res.json({
    ip: getLocalIp(),
    port: 8080,
    wsPort: 3000,
    status: 'Listening',
    activePeers: clients.size,
    storedFilesCount: fileStorage.size,
  });
});

// Get all files shared in a room
app.get('/api/files', (req, res) => {
  const room = (req.query.room as string || 'COMM-LAB').toUpperCase();
  const list: any[] = [];
  for (const file of fileStorage.values()) {
    if (file.roomId === room || !file.roomId) {
      list.push({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        checksum: file.checksum,
        senderName: file.senderName,
        downloadUrl: `/api/download/${file.id}`,
        createdAt: new Date(file.createdAt).toISOString(),
      });
    }
  }
  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(list);
});

// Export received files list as a JSON download
app.get('/api/files/export', (req, res) => {
  const room = (req.query.room as string || 'COMM-LAB').toUpperCase();
  const list: any[] = [];
  for (const file of fileStorage.values()) {
    if (file.roomId === room || !file.roomId) {
      list.push({
        id: file.id,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        checksum: file.checksum,
        senderName: file.senderName,
        downloadUrl: `/api/download/${file.id}`,
        createdAt: new Date(file.createdAt).toISOString(),
      });
    }
  }
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const dateStr = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="datacomm-received-files-${room.toLowerCase()}-${dateStr}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(
    JSON.stringify(
      {
        exportMetadata: {
          exportedAt: new Date().toISOString(),
          roomId: room,
          totalFiles: list.length,
          totalBytes: list.reduce((acc, f) => acc + (f.fileSize || 0), 0),
        },
        receivedFiles: list,
      },
      null,
      2
    )
  );
});

// Single multipart upload endpoint (Fast, handles all file types reliably)
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file received in request' });
    }

    const buffer = req.file.buffer;
    const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const fileName = req.file.originalname || 'shared_file';
    const fileSize = req.file.size;
    const fileType = req.file.mimetype || 'application/octet-stream';
    const senderName = req.body.senderName || 'Sender Node';
    const roomId = (req.body.roomId || 'COMM-LAB').toUpperCase();
    const durationMs = Number(req.body.durationMs) || 350;

    const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Store in memory
    fileStorage.set(fileId, {
      id: fileId,
      fileName,
      fileSize,
      fileType,
      checksum: computedHash,
      buffer,
      senderName,
      roomId,
      createdAt: Date.now(),
    });

    const downloadUrl = `/api/download/${fileId}`;

    const record: TransferRecord = {
      id: `tx-${Date.now()}`,
      file_id: fileId,
      file_name: fileName,
      file_size: fileSize,
      checksum: computedHash,
      duration_ms: durationMs,
      status: 'Completed',
      direction: 'SHARED',
      sender_name: senderName,
      receiver_name: `Room ${roomId}`,
      download_url: downloadUrl,
      created_at: new Date().toISOString(),
    };
    transferHistory.unshift(record);
    if (transferHistory.length > 50) transferHistory.pop();

    // Broadcast event to ALL connected clients in the room!
    broadcastRoom(roomId, {
      type: 'FILE_SHARED',
      file: {
        id: fileId,
        fileName,
        fileSize,
        fileType,
        checksum: computedHash,
        senderName,
        downloadUrl,
        createdAt: new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      fileId,
      fileName,
      fileSize,
      checksum: computedHash,
      downloadUrl,
      record,
    });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    res.status(500).json({ error: error?.message || 'Upload failed' });
  }
});

// Download file endpoint
app.get('/api/download/:fileId', (req, res) => {
  const file = fileStorage.get(req.params.fileId);
  if (!file) {
    return res.status(404).send('File not found or transfer expired');
  }
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
  res.setHeader('Content-Type', file.fileType);
  res.setHeader('Content-Length', file.buffer.length);
  res.setHeader('Cache-Control', 'no-cache');
  res.send(file.buffer);
});

// Delete single file endpoint
app.delete('/api/files/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const file = fileStorage.get(fileId);
  if (!file) {
    return res.status(404).json({ error: 'File not found or already deleted' });
  }

  const roomId = file.roomId || 'COMM-LAB';
  const fileName = file.fileName;
  fileStorage.delete(fileId);

  // Broadcast deletion to all peers in the room
  broadcastRoom(roomId, {
    type: 'FILE_DELETED',
    fileId,
    fileName,
    roomId,
  });

  res.json({ success: true, fileId, fileName });
});

// Clear all files in a room endpoint
app.delete('/api/files', (req, res) => {
  const room = (req.query.room as string || 'COMM-LAB').toUpperCase();
  let deletedCount = 0;

  for (const [id, file] of fileStorage.entries()) {
    if (file.roomId === room || !file.roomId) {
      fileStorage.delete(id);
      deletedCount++;
    }
  }

  // Broadcast room cleared event
  broadcastRoom(room, {
    type: 'ROOM_CLEARED',
    roomId: room,
    deletedCount,
  });

  res.json({ success: true, deletedCount, roomId: room });
});

// History endpoint
app.get('/api/transfers', (req, res) => {
  res.json(transferHistory);
});

// WebSocket Server on /ws for instant room sync & peer discovery
interface ClientMeta {
  ws: WebSocket;
  id: string;
  name: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'node';
  roomId: string;
  lastSeen: number;
}

const wss = new WebSocketServer({ noServer: true });
const clients = new Map<WebSocket, ClientMeta>();

function broadcastRoom(roomId: string, message: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const [ws, meta] of clients.entries()) {
    if (meta.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function getRoomDevices(roomId: string) {
  const devices: any[] = [];
  for (const meta of clients.values()) {
    if (meta.roomId === roomId) {
      devices.push({
        id: meta.id,
        name: meta.name,
        deviceType: meta.deviceType,
        online: true,
      });
    }
  }
  return devices;
}

wss.on('connection', (ws: WebSocket) => {
  clients.set(ws, {
    ws,
    id: `dev-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Peer Device',
    deviceType: 'desktop',
    roomId: 'COMM-LAB',
    lastSeen: Date.now(),
  });

  ws.on('message', (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString());
      const meta = clients.get(ws);
      if (!meta) return;

      switch (msg.type) {
        case 'REGISTER': {
          meta.id = msg.id || meta.id;
          meta.name = msg.name || meta.name;
          meta.deviceType = msg.deviceType || meta.deviceType;
          meta.roomId = (msg.roomId || 'COMM-LAB').toUpperCase();

          ws.send(
            JSON.stringify({
              type: 'REGISTERED',
              deviceId: meta.id,
              roomId: meta.roomId,
            })
          );

          broadcastRoom(meta.roomId, {
            type: 'PEER_LIST',
            peers: getRoomDevices(meta.roomId),
          });
          break;
        }

        case 'PING': {
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        }
      }
    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on('close', () => {
    const meta = clients.get(ws);
    if (meta) {
      const roomId = meta.roomId;
      clients.delete(ws);
      broadcastRoom(roomId, {
        type: 'PEER_LIST',
        peers: getRoomDevices(roomId),
      });
    }
  });
});

// Upgrade HTTP to WS
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Dev / Prod mounting
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[DataComm File Share Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
