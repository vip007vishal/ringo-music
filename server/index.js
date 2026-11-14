/**
 * server/index.js  –  Ringo Music API
 *
 * Endpoints:
 *   GET /api/songs           → all songs
 *   GET /api/songs/:id       → single song by id
 *   GET /api/songs/stream/:filename  → stream the audio file
 *   GET /health              → health check
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const SONGS_JSON = path.join(__dirname, "..", "data", "songs.json");
const SONGS_DIR = path.join(__dirname, "..", "songs");

app.use(cors());
app.use(express.json());

// ── Helper: load songs from disk each request (stays fresh) ──────────────────
function loadSongs() {
  if (!fs.existsSync(SONGS_JSON)) return { songs: [] };
  return JSON.parse(fs.readFileSync(SONGS_JSON, "utf-8"));
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── GET /api/songs  → list all songs ─────────────────────────────────────────
app.get("/api/songs", (req, res) => {
  const data = loadSongs();
  res.json(data);
});

// ── GET /api/songs/:id  → single song ────────────────────────────────────────
app.get("/api/songs/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = loadSongs();
  const song = data.songs.find((s) => s.id === id);
  if (!song) return res.status(404).json({ error: "Song not found" });
  res.json(song);
});

// ── GET /api/songs/stream/:filename  → stream audio ──────────────────────────
app.get("/api/songs/stream/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filePath = path.join(SONGS_DIR, filename);

  // Security: prevent path traversal
  if (!filePath.startsWith(SONGS_DIR)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Partial content (seekable stream)
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "audio/mpeg",
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🎵 Ringo Music API running on http://localhost:${PORT}`);
  console.log(`   GET /api/songs`);
  console.log(`   GET /api/songs/:id`);
  console.log(`   GET /api/songs/stream/:filename`);
});
