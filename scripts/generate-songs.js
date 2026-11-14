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

function slugify(name) {
  return name
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferMeta(filename) {
  // Try to parse "Title - Artist.mp3" or "Artist - Title.mp3"
  const base = filename.replace(/\.[^/.]+$/, "");
  const parts = base.split(/\s*-\s*/);
  if (parts.length >= 2) {
    return { title: parts[0].trim(), artist: parts.slice(1).join(" - ").trim() };
  }
  return { title: slugify(filename), artist: "Unknown Artist" };
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
