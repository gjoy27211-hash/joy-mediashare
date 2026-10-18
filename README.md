# Joy MediaShare 📸 🎥

> High-Quality, Lossless Photo & Video Sharing Web Application with Instant QR Codes and Direct Downloads.

Joy MediaShare allows users to upload high-resolution photos and videos and immediately generate a secure, unique sharing session link and scannable QR code. Anyone accessing the session can view native previews and download the **exact original file bytes** with zero compression, zero transcoding, and full EXIF/color metadata preserved.

---

## 🌟 Core Features & Original Quality Guarantee

- **Strict Lossless Storage**: Uploaded files are written directly to disk via streaming Multer storage. No resizing, transcoding, re-encoding, or client-side Canvas operations ever touch the original media.
- **Full Metadata Preservation**: Original filenames, EXIF headers, camera settings, color spaces, orientation tags, and audio tracks remain 100% unaltered.
- **SHA-256 Checksum Verification**: Every file has its cryptographic SHA-256 hash calculated upon upload, displayed in the UI, and verified against downloaded bytes.
- **Instant Bearer Link & QR Code**: A unique 128-bit entropy session identifier is generated for each upload. An accompanying high-resolution QR code is dynamically rendered for mobile access.
- **Native Browser Playback & Previews**: Modern HTML5 video player with HTTP Range request support (`206 Partial Content`) for instant video scrubbing, alongside native image previews and lightbox full-screen modal.
- **Bulk Lossless Export**: A "Download All (Lossless ZIP)" feature archives files in `store: true` mode (zero compression container) preserving exact bytes.
- **Auto-Expiring Retention**: Configurable session time-to-live (TTL) with an automated cleanup worker that safely unlinks physical files and purges metadata.

---

## 🏗️ Project Architecture

```
├── server.js               # Node.js + Express backend server
├── public/
│   ├── index.html          # Upload page & QR share view (Vanilla HTML/JS)
│   ├── gallery.html        # Responsive media gallery & previews
│   └── style.css           # Clean cloud sharing styling
├── data/
│   └── sessions.json       # Persistent metadata store with atomic write
├── uploads/                # Physical media storage directory
├── package.json            # Node.js manifest and dependencies
├── .gitignore              # Git ignore rules
└── README.md               # Documentation and operations manual
```

---

## ⚙️ Environment Variables Configuration

Create a `.env` file in the project root to customize runtime settings:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | The network port the HTTP server listens on |
| `HOST` | `0.0.0.0` | Network binding interface |
| `PUBLIC_BASE_URL` | Auto-detected | Public domain URL used in generated share links & QR codes |
| `UPLOAD_DIR` | `./uploads` | Absolute or relative path to store uploaded media |
| `MAX_FILE_SIZE_MB` | `1024` | Maximum allowable file size in megabytes (default: 1 GB) |
| `MAX_FILES_PER_SESSION`| `50` | Maximum number of files permitted in a single upload batch |
| `SESSION_TTL_HOURS` | `72` | Number of hours before a session and its files are purged |

*Note on QR Codes in Local Development*: When running locally on `localhost`, QR codes encode `http://localhost:3000/...`. To test QR scanning from a real smartphone, either set `PUBLIC_BASE_URL=http://<YOUR_LOCAL_LAN_IP>:3000` or use a tunneling service (e.g. ngrok / Cloudflare Tunnel).

---

## 🚀 Installation & Local Running

### Prerequisites
- Node.js v18.0.0 or higher
- npm v9.0.0 or higher

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm run dev
# or for production:
npm start
```

Access the application in your browser at `http://localhost:3000`.

---

## 🧪 Testing & Verification Guide

### 1. Upload Test
1. Navigate to `http://localhost:3000`.
2. Drag and drop a high-resolution JPEG, PNG, or MP4 video into the upload dropzone (or click **Select Photos & Videos**).
3. Review the file queue list displaying individual file sizes.
4. Click **Upload & Create Share Session**. Observe the real-time progress bar.

### 2. Share & QR Verification
1. Upon upload completion, observe the generated shareable link and the rendered QR code.
2. Click **Copy Link** and verify clipboard notification.
3. Click **Download QR Code** to save the PNG image.
4. Scan the QR code with a smartphone camera connected to the same network (if testing across devices) or click **Open Gallery Now**.

### 3. Gallery & Lossless Verification
1. Inspect the loaded gallery at `/gallery.html?session=<id>`.
2. Verify image previews open in full-resolution lightbox modal.
3. For video files, test playback and scrubbing controls (HTTP Range support).
4. Click **Download Original** on any file.
5. In your terminal, compare the SHA-256 hash of the downloaded file with the hash badge displayed on the gallery card:
   ```bash
   # On Linux / macOS:
   shasum -a 256 /path/to/downloaded_file.jpg

   # On Windows (PowerShell):
   Get-FileHash -Algorithm SHA256 .\downloaded_file.jpg
   ```
   Both hashes must match identically byte-for-byte.

### 4. Lossless Bulk Export
1. Click **Download All (Lossless ZIP)** in the gallery header.
2. Unzip the downloaded archive and confirm all original files match their original sizes and checksums.

### 5. Multi-Session Isolation & Error Testing
1. Attempt to access `/gallery.html?session=non_existent_id`. Confirm a clean error page appears.
2. Attempt to upload an executable or unsupported file type (`.exe`, `.sh`). Confirm the server returns a 400 rejection message.

---

## 🔒 Security & Bearer Link Limitations

1. **Bearer Link Access Model**: Anyone with the session URL or QR code can access the gallery and download the files. Do not distribute the link publicly if the media is intended to be private.
2. **Path Traversal Protection**: Files are assigned random cryptographic filenames on disk and mapped through verified server-side metadata. Requests are validated to guarantee no paths escape `UPLOAD_DIR`.
3. **MIME & Extension Enforcement**: The server restricts uploads to legitimate media MIME types and file extensions, rejecting arbitrary or executable scripts.
4. **Denial of Service Limits**: Explicit limits on file size (`MAX_FILE_SIZE_MB`), batch counts (`MAX_FILES_PER_SESSION`), and automatic cleanup routines protect server disk space from exhaustion.

---

## 🌐 Production Deployment Notes

To deploy Joy MediaShare in a production environment:

1. **Persistent Disk Storage**: Ensure your host (VPS, AWS EC2, GCP Compute Engine, or persistent volume mount in Docker) provides persistent storage for the `uploads/` and `data/` directories. Ephemeral serverless containers without persistent volumes will lose uploaded files when instances restart.
2. **Reverse Proxy & HTTPS**: Run Express behind Nginx, Caddy, or Cloudflare with SSL/TLS enabled. In Nginx, ensure `client_max_body_size` matches your `MAX_FILE_SIZE_MB`:
   ```nginx
   client_max_body_size 1024M;
   ```
3. **Set `PUBLIC_BASE_URL`**: Set the public URL (e.g. `PUBLIC_BASE_URL=https://share.yourdomain.com`) in environment variables so that generated QR codes resolve properly on external networks and smartphones.
