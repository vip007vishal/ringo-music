#!/usr/bin/env node
/**
 * generate-songs.js
 * Scans the /songs folder and auto-generates /data/songs.json
 * Run: node scripts/generate-songs.js
 */

const fs = require("fs");
const path = require("path");

const SONGS_DIR = path.join(__dirname, "..", "songs");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "songs.json");
const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/vip007vishal/ringo-music/main/songs";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"];

function cleanName(str) {
  return str
    .replace(/\(MP3[_\s]?\d+K?\)/gi, "")  // remove (MP3_320K), (MP3 320K) etc.
    .replace(/\|_/g, " ")                  // remove YouTube separators
    .replace(/\s*_\s*/g, " ")              // underscores → spaces
    .replace(/\s*\|\s*/g, " ")             // pipes → spaces
    .replace(/\s+/g, " ")
    .trim();
}

function inferMeta(filename) {
  // Strip extension
  let base = filename.replace(/\.[^/.]+$/, "");

  // Clean YouTube-style filenames (contain _ as separator like "Title _ Artist _ ...")
  if (base.includes(" _ ")) {
    const parts = base.split(" _ ").map(p => cleanName(p)).filter(Boolean);
    // First part is usually the song title, rest are contributors/channel
    const title = parts[0];
    const artist = parts.length > 1 ? parts[1] : "Unknown Artist";
    return { title, artist };
  }

  // Try "Title-Artist.mp3" (hyphen separator, no spaces around it)
  const hyphenParts = base.split("-");
  if (hyphenParts.length >= 2) {
    // Check if last part looks like a site/artist tag (e.g. MassTamilan.dev, MassTamilan.io)
    const lastPart = hyphenParts[hyphenParts.length - 1].trim();
    const isSiteTag = /\.(dev|io|com|net|org|in)/i.test(lastPart);

    if (isSiteTag && hyphenParts.length >= 3) {
      // e.g. "A-Humble-Engineer-MassTamilan.io" → title="A Humble Engineer", artist=site
      const artist = lastPart;
      const title = cleanName(hyphenParts.slice(0, -1).join(" "));
      return { title, artist };
    }

    if (isSiteTag) {
      // e.g. "Badass-MassTamilan.dev" → title="Badass", artist="MassTamilan.dev"
      const title = cleanName(hyphenParts.slice(0, -1).join(" "));
      return { title, artist: lastPart };
    }

    // Generic "Word-Word" → title="Word Word" (no meaningful artist split)
    return { title: cleanName(base.replace(/-/g, " ")), artist: "Unknown Artist" };
  }

  // No separator — whole name is title
  return { title: cleanName(base), artist: "Unknown Artist" };
}

function generateSongs() {
  if (!fs.existsSync(SONGS_DIR)) {
    console.error("songs/ directory not found");
    process.exit(1);
  }

  const files = fs
    .readdirSync(SONGS_DIR)
    .filter((f) => AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();

  const songs = files.map((file, index) => {
    const { title, artist } = inferMeta(file);
    const encodedFile = encodeURIComponent(file);
    return {
      id: index + 1,
      title,
      artist,
      category: "Music",
      filename: file,
      audio: `${GITHUB_RAW_BASE}/${encodedFile}`,
    };
  });

  const output = { songs };
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`✅ songs.json updated with ${songs.length} song(s).`);
  songs.forEach((s) => console.log(`   [${s.id}] ${s.title} — ${s.artist}`));
}

generateSongs();
