/**
 * Joy MediaShare - High-Quality Media Sharing Server
 * 
 * Strict Original Quality Policy:
 * All media is saved and served without any compression, resizing,
 * transcoding, or alteration of original bytes.
 */

import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import 'dotenv/config';

const require = createRequire(import.meta.url);
const QRCode = require('qrcode');
const archiver = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CONFIGURATION & ENVIRONMENT
// ==========================================
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || process.env.APP_URL || '').replace(/\/$/, '');
const UPLOAD_DIR = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR) 
  : path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Limits
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '1024', 10); // 1 GB default
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES_PER_SESSION = parseInt(process.env.MAX_FILES_PER_SESSION || '50', 10);
const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS || '72', 10); // 72 hours default
const SESSION_TTL_MS = SESSION_TTL_HOURS * 60 * 60 * 1000;

// Ensure storage directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ==========================================
// PERSISTENT METADATA STORE
// ==========================================
function loadSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading sessions metadata, starting with empty store:', err.message);
    return {};
  }
}

function saveSessions(sessions) {
  try {
    const tempFile = `${SESSIONS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(sessions, null, 2), 'utf8');
    fs.renameSync(tempFile, SESSIONS_FILE);
  } catch (err) {
    console.error('Error saving sessions metadata:', err.message);
  }
}

// In-memory cache synced with disk
let sessions = loadSessions();

// Track total upload sessions
let totalUploads = 0;

// Cleanup expired sessions periodically
function cleanExpiredSessions() {
  const now = Date.now();
  let modified = false;

  for (const [sessionId, session] of Object.entries(sessions)) {
    const expiresAt = new Date(session.expiresAt).getTime();
    if (expiresAt < now) {
      console.log(`Cleaning up expired session: ${sessionId}`);
      // Delete associated physical files
      if (Array.isArray(session.files)) {
        for (const file of session.files) {
          const filePath = path.join(UPLOAD_DIR, file.storedName);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (e) {
              console.error(`Failed to delete file ${filePath}:`, e.message);
            }
          }
        }
      }
      delete sessions[sessionId];
      modified = true;
    }
  }

  if (modified) {
    saveSessions(sessions);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanExpiredSessions, 30 * 60 * 1000);

// ==========================================
// FILE INTEGRITY & CHECKSUM HELPER
// ==========================================
function computeSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

function resolveBaseUrl(req) {
  if (PUBLIC_BASE_URL) return PUBLIC_BASE_URL;
  const forwardedProto = req.get('x-forwarded-proto');
  const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

// ==========================================
// MULTER STORAGE SETUP
// ==========================================
// Safe disk storage preserving original binary bytes completely unmodified
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate secure randomized storage filename to avoid collisions and path injection
    const randomHex = crypto.randomBytes(16).toString('hex');
    const rawExt = path.extname(file.originalname).toLowerCase();
    // Sanitize extension (only alphanumeric, length limit)
    const sanitizedExt = rawExt.replace(/[^a-z0-9.]/gi, '').slice(0, 10);
    cb(null, `${randomHex}-${Date.now()}${sanitizedExt}`);
  }
});

// Allowed media MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
  'video/x-msvideo', 'video/3gpp', 'video/ogg'
]);

const ALLOWED_EXTENSIONS = new Set([
  // Images
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg', '.heic', '.heif', '.bmp', '.tiff', '.tif',
  // Videos
  '.mp4', '.webm', '.mov', '.mkv', '.avi', '.3gp', '.ogv'
]);

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 1024MB per file
    files: MAX_FILES_PER_SESSION,
    fieldSize: MAX_FILE_SIZE_BYTES, // 1024MB field size for large multipart chunks
    fieldNameSize: 500,
    fields: 100,
    parts: 250,
    headerPairs: 2000
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    // Check extension or mime type
    if (ALLOWED_MIME_TYPES.has(mime) || ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not permitted: "${file.originalname}". Only original photo and video formats are supported.`));
    }
  }
});

// ==========================================
// EXPRESS APPLICATION
// ==========================================
const app = express();

// Helper to identify traffic source from Referer header
function getTrafficSource(req) {
  const referer = req.get('Referer') || req.get('Referrer');
  if (!referer) {
    return 'Direct';
  }
  try {
    const url = new URL(referer);
    const host = url.hostname.toLowerCase();
    if (host.includes('facebook') || host.includes('fb.com') || host.includes('fb.me')) {
      return 'Facebook';
    }
    if (host.includes('tiktok')) {
      return 'TikTok';
    }
    if (host.includes('instagram')) {
      return 'Instagram';
    }
    if (host.includes('twitter') || host.includes('t.co') || host.includes('x.com')) {
      return 'Twitter/X';
    }
    if (host.includes('youtube') || host.includes('youtu.be')) {
      return 'YouTube';
    }
    if (host.includes('whatsapp')) {
      return 'WhatsApp';
    }
    if (host.includes('google')) {
      return 'Google';
    }
    if (host.includes('linkedin')) {
      return 'LinkedIn';
    }
    if (host.includes('reddit')) {
      return 'Reddit';
    }
    return url.hostname;
  } catch (_) {
    return referer;
  }
}

// Simple console tracker for traffic source
app.use((req, res, next) => {
  // Only track for page navigations or API endpoints, avoiding static asset noise
  const isAsset = /\.(css|js|map|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/i.test(req.path);
  if (!isAsset) {
    const trafficSource = getTrafficSource(req);
    console.log(`🌐 Traffic Source: ${trafficSource}`);
  }
  next();
});

// Security and utility headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Configure Express body parser payload limits to 1024mb for large data
app.use(express.json({ limit: '1024mb' }));
app.use(express.urlencoded({ extended: true, limit: '1024mb' }));

// Serve static frontend from public folder
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Route aliases
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});
app.get('/gallery', (req, res) => {
  res.sendFile(path.join(publicDir, 'gallery.html'));
});
app.get('/gallery.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'gallery.html'));
});

// ==========================================
// API ROUTES
// ==========================================

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Joy MediaShare',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    config: {
      maxFileSizeMb: MAX_FILE_SIZE_MB,
      maxFilesPerSession: MAX_FILES_PER_SESSION,
      sessionTtlHours: SESSION_TTL_HOURS
    }
  });
});

// 2. Upload media and create new session
app.post('/api/upload', (req, res) => {
  // Set generous connection and socket timeout (30 minutes) for large 1GB transfers
  req.setTimeout(30 * 60 * 1000);
  res.setTimeout(30 * 60 * 1000);
  if (req.socket) {
    req.socket.setTimeout(30 * 60 * 1000);
    req.socket.setKeepAlive(true, 10000);
  }

  const uploadHandler = upload.array('media', MAX_FILES_PER_SESSION);

  uploadHandler(req, res, async (err) => {
    if (err) {
      console.error('Multer upload error:', err);
      // Clean up any successfully written files in this failed batch
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files) {
          try {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          } catch (_) {}
        }
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            error: `File size limit exceeded. Maximum allowed per file is ${MAX_FILE_SIZE_MB}MB.`
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: `Too many files. Maximum allowed per upload is ${MAX_FILES_PER_SESSION}.`
          });
        }
        if (err.code === 'LIMIT_FIELD_VALUE') {
          return res.status(413).json({
            success: false,
            error: `Field data size limit exceeded. Maximum allowed is ${MAX_FILE_SIZE_MB}MB.`
          });
        }
        return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ success: false, error: err.message || 'File upload failed.' });
    }

    const files = req.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided for upload.' });
    }

    try {
      // Generate cryptographically secure session ID (128-bit entropy hex)
      const sessionId = crypto.randomBytes(16).toString('hex');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

      // Process uploaded files and verify integrity (calculate SHA-256)
      const sessionFiles = [];
      let totalBytes = 0;

      for (const file of files) {
        const filePath = file.path;
        const stats = fs.statSync(filePath);
        const actualSize = stats.size;
        totalBytes += actualSize;

        // Compute SHA-256 checksum of original stored bytes
        const checksum = await computeSha256(filePath);

        // Determine safe sanitized original filename
        const safeOriginalName = path.basename(file.originalname).replace(/[\r\n\t]/g, '');

        sessionFiles.push({
          id: crypto.randomUUID(),
          originalName: safeOriginalName || 'unnamed_media',
          storedName: file.filename,
          size: actualSize,
          mimetype: file.mimetype || 'application/octet-stream',
          sha256: checksum,
          uploadedAt: now.toISOString()
        });
      }

      // Base share URL & QR code
      const baseUrl = resolveBaseUrl(req);
      const shareUrl = `${baseUrl}/gallery.html?session=${sessionId}`;

      // Generate QR Code data URL
      const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: {
          dark: '#0a1128',
          light: '#ffffff'
        }
      });

      // Construct session record
      const sessionRecord = {
        id: sessionId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        totalSize: totalBytes,
        fileCount: sessionFiles.length,
        files: sessionFiles
      };

      // Persist session
      sessions[sessionId] = sessionRecord;
      saveSessions(sessions);

      // Increment total successful upload sessions
      totalUploads++;
      const totalSizeMb = (totalBytes / (1024 * 1024)).toFixed(2);
      console.log(`📊 [NEW UPLOAD] Total Sessions Created: ${totalUploads} | Files Uploaded: ${sessionFiles.length} | Total Size: ${totalSizeMb} MB`);

      return res.status(201).json({
        success: true,
        sessionId,
        shareUrl,
        qrCodeDataUrl,
        fileCount: sessionFiles.length,
        totalSize: totalBytes,
        createdAt: sessionRecord.createdAt,
        expiresAt: sessionRecord.expiresAt,
        files: sessionFiles.map(f => ({
          id: f.id,
          originalName: f.originalName,
          size: f.size,
          mimetype: f.mimetype,
          sha256: f.sha256
        }))
      });
    } catch (procErr) {
      console.error('Error processing upload session:', procErr);
      // Clean up files on error
      if (files && Array.isArray(files)) {
        for (const file of files) {
          try {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
          } catch (_) {}
        }
      }
      return res.status(500).json({ success: false, error: 'Internal server error processing files.' });
    }
  });
});

// 3. Get session details and file listing
app.get('/api/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  // Validate session ID format (hex string)
  if (!sessionId || !/^[a-f0-9]{32}$/i.test(sessionId)) {
    return res.status(400).json({ success: false, error: 'Invalid session identifier format.' });
  }

  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found or has expired.' });
  }

  // Check TTL
  const expiresAt = new Date(session.expiresAt).getTime();
  if (expiresAt < Date.now()) {
    delete sessions[sessionId];
    saveSessions(sessions);
    return res.status(410).json({ success: false, error: 'This sharing session has expired.' });
  }

  const baseUrl = resolveBaseUrl(req);
  const shareUrl = `${baseUrl}/gallery.html?session=${sessionId}`;

  // Generate QR code if needed
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#0a1128',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR data URL:', err);
  }

  res.json({
    success: true,
    id: session.id,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    fileCount: session.files.length,
    totalSize: session.totalSize,
    shareUrl,
    qrCodeDataUrl,
    files: session.files.map(f => ({
      id: f.id,
      originalName: f.originalName,
      size: f.size,
      mimetype: f.mimetype,
      sha256: f.sha256,
      uploadedAt: f.uploadedAt
    }))
  });
});

// 4. Download QR Code image directly
app.get('/api/sessions/:sessionId/qr', async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId || !/^[a-f0-9]{32}$/i.test(sessionId)) {
    return res.status(400).send('Invalid session identifier.');
  }

  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).send('Session not found.');
  }

  const baseUrl = resolveBaseUrl(req);
  const shareUrl = `${baseUrl}/gallery.html?session=${sessionId}`;

  try {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="JoyMediaShare-QR-${sessionId.slice(0, 8)}.png"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    QRCode.toFileStream(res, shareUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 600,
      color: {
        dark: '#0a1128',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('QR code stream error:', err);
    res.status(500).send('Could not generate QR code.');
  }
});

// 5. Download original file (Strict Lossless Streaming)
app.get('/api/sessions/:sessionId/files/:fileId/download', (req, res) => {
  const { sessionId, fileId } = req.params;

  if (!sessionId || !/^[a-f0-9]{32}$/i.test(sessionId)) {
    return res.status(400).json({ success: false, error: 'Invalid session ID format.' });
  }

  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found or expired.' });
  }

  const file = session.files.find(f => f.id === fileId);
  if (!file) {
    return res.status(404).json({ success: false, error: 'File not found in this session.' });
  }

  // Safe path verification to prevent path traversal
  const filePath = path.resolve(UPLOAD_DIR, file.storedName);
  if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(403).json({ success: false, error: 'Forbidden file access.' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Underlying media file is missing on server.' });
  }

  // Safe filename encoding for Content-Disposition header (RFC 5987 / UTF-8)
  const encodedFilename = encodeURIComponent(file.originalName).replace(/['()]/g, escape).replace(/\*/g, '%2A');
  const asciiFallback = file.originalName.replace(/[^\x20-\x7E]/g, '_');

  res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
  res.setHeader('Content-Length', file.size);
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`);
  res.setHeader('X-Original-SHA256', file.sha256);
  res.setHeader('Cache-Control', 'private, no-transform');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Stream original file directly to response
  const readStream = fs.createReadStream(filePath);
  readStream.on('error', (streamErr) => {
    console.error('File stream error:', streamErr);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to stream media file.' });
    }
  });

  readStream.pipe(res);
});

// 6. Preview media file (Supports HTTP Range Requests for Native Video Playback)
app.get('/api/sessions/:sessionId/files/:fileId/preview', (req, res) => {
  const { sessionId, fileId } = req.params;

  if (!sessionId || !/^[a-f0-9]{32}$/i.test(sessionId)) {
    return res.status(400).send('Invalid session identifier.');
  }

  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).send('Session not found or expired.');
  }

  const file = session.files.find(f => f.id === fileId);
  if (!file) {
    return res.status(404).send('File not found.');
  }

  // Path traversal guard
  const filePath = path.resolve(UPLOAD_DIR, file.storedName);
  if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(403).send('Forbidden.');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Media file missing.');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Handle HTTP Range request (crucial for seekable HTML5 video playback)
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize || (parts[1] && isNaN(end)) || end >= fileSize || start > end) {
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      return res.status(416).send('Requested Range Not Satisfiable');
    }

    const chunksize = (end - start) + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunksize,
      'Content-Type': file.mimetype || 'application/octet-stream'
    });

    const fileStream = fs.createReadStream(filePath, { start, end });
    fileStream.pipe(res);
  } else {
    res.setHeader('Content-Length', fileSize);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
});

// 7. Download all files in session as lossless uncompressed ZIP (store: true)
app.get('/api/sessions/:sessionId/download-all', (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || !/^[a-f0-9]{32}$/i.test(sessionId)) {
    return res.status(400).json({ success: false, error: 'Invalid session ID format.' });
  }

  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found or expired.' });
  }

  if (!session.files || session.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files to download in this session.' });
  }

  const zipFilename = `JoyMediaShare-${sessionId.slice(0, 8)}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
  res.setHeader('Cache-Control', 'no-cache');

  // Create archive supporting both Archiver v7 (function) and v8 (ZipArchive class)
  let archive;
  const zipOpts = {
    store: true, // Lossless storage mode: original bytes stored without alteration
    comment: 'Joy MediaShare - Original Quality Media Export'
  };

  if (typeof archiver === 'function') {
    archive = archiver('zip', zipOpts);
  } else if (archiver && archiver.ZipArchive) {
    archive = new archiver.ZipArchive(zipOpts);
  } else {
    return res.status(500).json({ success: false, error: 'ZIP archiver unavailable.' });
  }

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('Archiver warning:', err);
    } else {
      console.error('Archiver error:', err);
    }
  });

  archive.on('error', (err) => {
    console.error('Archiver fatal error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'ZIP archive generation failed.' });
    }
  });

  archive.pipe(res);

  // Track filenames to avoid collisions inside ZIP
  const usedNames = new Map();

  for (let i = 0; i < session.files.length; i++) {
    const file = session.files[i];
    const filePath = path.resolve(UPLOAD_DIR, file.storedName);

    if (fs.existsSync(filePath)) {
      let entryName = file.originalName;
      if (usedNames.has(entryName)) {
        const count = usedNames.get(entryName) + 1;
        usedNames.set(entryName, count);
        const parsed = path.parse(entryName);
        entryName = `${parsed.name}_${count}${parsed.ext}`;
      } else {
        usedNames.set(entryName, 1);
      }

      archive.file(filePath, { name: entryName });
    }
  }

  archive.finalize();
});

// ==========================================
// 404 & ERROR HANDLING MIDDLEWARE
// ==========================================
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// Catch-all static fallback for client routing
app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, 'index.html'));
});

// Global error handler (Never leaks stack traces or system internals)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    success: false,
    error: 'An unexpected server error occurred. Please try again.'
  });
});

// ==========================================
// START SERVER
// ==========================================
const server = app.listen(PORT, HOST, () => {
  console.log(`===============================================`);
  console.log(`Joy MediaShare Server running at http://${HOST}:${PORT}`);
  console.log(`Storage directory: ${UPLOAD_DIR}`);
  console.log(`Max file size: ${MAX_FILE_SIZE_MB}MB | TTL: ${SESSION_TTL_HOURS}h`);
  console.log(`Original Quality Policy: STRICT LOSSLESS PRESERVATION`);
  console.log(`===============================================`);
});

// Configure server timeouts for large 1GB file uploads without dropping connection
server.timeout = 30 * 60 * 1000; // 30 minutes
server.keepAliveTimeout = 120 * 1000; // 2 minutes
server.headersTimeout = 130 * 1000; // 130 seconds
if ('requestTimeout' in server) {
  server.requestTimeout = 30 * 60 * 1000; // 30 minutes
}

// Graceful termination
function handleShutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    saveSessions(sessions);
    console.log('Server shut down cleanly.');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
