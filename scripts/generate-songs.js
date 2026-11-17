#!/usr/bin/env node
/**
 * generate-songs.js
 * Reads embedded ID3 metadata (artists, singers, album, composer, year, duration)
 * from each audio file in /songs and auto-generates /data/songs.json.
 */

const fs = require("fs");
const path = require("path");
const mm = require("music-metadata");

const SONGS_DIR = path.join(__dirname, "..", "songs");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "songs.json");
const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/vip007vishal/ringo-music/main/songs";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"];

// Common promotional / piracy site watermarks found in Indian music tags
const WATERMARK_PATTERNS = [
  /[-–—|:]*\s*(https?:\/\/)?(www\.)?(masstamilan|isaimini|starmusiq|tamiltunes|senlyrics|tamilwire|123musiq|sensongs|mp3songdownload)(\.[a-z0-9]+)*\s*/gi,
  /\s*::\s*[a-z0-9.-]+/gi,
  /\[\s*(masstamilan|isaimini|starmusiq).*?\]/gi,
  /\s*-\s*masstamilan.*$/gi,
  /\s*-\s*isaimini.*$/gi,
  /\(MP3[_\s]?\d+K?\)/gi,
  /\b(Video Song|Lyric Video|Official Video|Audio Song|Lyrical Video|Full Video|Song With Lyrics)\b/gi
];

// YouTube channels or site watermarks mistakenly put in Artist / Album fields
const JUNK_ARTIST_NAMES = /^(SonyMusicSouthVEVO|Think Music India|New Music India|T-Series|Aditya Music|Zee Music South|Lahari Music|Sun TV|MassTamilan.*|isaimini.*|starmusiq.*)$/i;

function cleanString(str) {
  if (!str || typeof str !== "string") return "";
  let res = str;
  for (const pat of WATERMARK_PATTERNS) {
    res = res.replace(pat, " ");
  }
  return res
    .replace(/\|_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—|:,]+|[\s\-–—|:,]+$/g, "")
    .trim();
}

function cleanTitleWords(str) {
  return cleanString(str)
    .replace(/\b(Video Song|Lyric Video|Official Video|Audio Song|Lyrical Video|Full Video|Song With Lyrics|Video|Lyrical)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractMetadata(filePath, filename) {
  let meta = null;
  try {
    meta = await mm.parseFile(filePath, { skipCovers: true });
  } catch (err) {
    // If metadata parser fails, fallback to empty
  }

  const common = meta ? meta.common : {};
  const format = meta ? meta.format : {};

  let rawTitle = common.title || "";
  let rawArtist = common.artist || (Array.isArray(common.artists) ? common.artists.join(", ") : "");
  let rawAlbum = common.album || "";
  let rawComposer = Array.isArray(common.composer)
    ? common.composer.join(", ")
    : (common.composer || "");
  let rawYear = common.year || null;
  let duration = format.duration ? Math.round(format.duration) : null;

  let title = cleanString(rawTitle);
  let album = cleanString(rawAlbum);
  let composer = cleanString(rawComposer);
  let artist = cleanString(rawArtist);

  // Filter out site watermark in album
  if (/^(masstamilan|isaimini|starmusiq|sonymusic|think music|new music)/i.test(album)) {
    album = "";
  }

  // Filter out YouTube rip channel names as artists
  if (JUNK_ARTIST_NAMES.test(artist) || !artist) {
    artist = "";
  }

  // Handle YouTube titled files: e.g. "Kayal - Unna Ippo Paakkanum Video | Anandhi, Chandran | D. Imman"
  // or "Airaa | Kaariga Lyric Video | Nayanthara,Kalaiyarasan | Sarjun KM | Sundaramurthy KS | Madhan Karky"
  if (rawTitle.includes("|") || rawTitle.includes(" _ ")) {
    const delimiter = rawTitle.includes("|") ? "|" : " _ ";
    const segments = rawTitle
      .split(delimiter)
      .map((s) => cleanString(s))
      .filter(Boolean);

    if (segments.length > 0) {
      const first = segments[0];
      if (first.includes(" - ")) {
        const parts = first.split(" - ").map((s) => cleanString(s));
        if (!album) album = parts[0];
        title = cleanTitleWords(parts.slice(1).join(" - "));
      } else {
        if (!album) album = first;
        if (segments.length > 1) {
          title = cleanTitleWords(segments[1]);
        }
      }

      // Check remaining segments for known music directors / artists
      for (let i = 1; i < segments.length; i++) {
        const seg = segments[i];
        if (
          /Sundaramurthy|Yuvan Shankar Raja|D\.?\s*Imman|Anirudh|A\.?R\.?\s*Rahman|Santhosh Narayanan|Harris Jayaraj|Thaman|Sean Roldan|Hiphop Tamizha|G\.?\s*V\.?\s*Prakash/i.test(
            seg
          )
        ) {
          if (!composer) composer = seg;
          if (!artist) artist = seg;
        }
      }
    }
  }

  // Clean title if it contains "Album - Title"
  if (title.includes(" - ")) {
    const parts = title.split(" - ").map((s) => cleanString(s));
    if (!album) album = parts[0];
    title = cleanTitleWords(parts.slice(1).join(" - "));
  } else {
    title = cleanTitleWords(title);
  }

  // Filename heuristics for known tracks if tag data is missing
  if (filename.includes("Agent Vikram")) {
    title = "Agent Vikram (Background Score)";
    album = "Vikram";
    artist = "Anirudh Ravichander";
    composer = "Anirudh Ravichander";
  }

  // If artist was a watermark and fell back to empty, use composer
  if (!artist && composer) {
    artist = composer;
  }

  // Fallbacks
  if (!title) {
    title = cleanTitleWords(filename.replace(/\.[^/.]+$/, ""));
  }
  if (!artist) {
    artist = "Unknown Artist";
  }
  if (!album) {
    album = title;
  }
  if (!composer) {
    composer = artist !== "Unknown Artist" ? artist : "Unknown Composer";
  }

  // Final whitespace normalization
  title = title.replace(/\s+/g, " ").trim();
  artist = artist.replace(/\s+/g, " ").trim();
  album = album.replace(/\s+/g, " ").trim();
  composer = composer.replace(/\s+/g, " ").trim();

  return {
    title,
    artist,
    singers: artist,
    album,
    composer,
    year: rawYear,
    duration,
  };
}

async function generateSongs() {
  if (!fs.existsSync(SONGS_DIR)) {
    console.error("songs/ directory not found");
    process.exit(1);
  }

  const files = fs
    .readdirSync(SONGS_DIR)
    .filter((f) => AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()))
    .sort();

  console.log(`Scanning metadata from ${files.length} audio file(s)...`);

  const songs = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(SONGS_DIR, file);
    const meta = await extractMetadata(fullPath, file);
    const encodedFile = encodeURIComponent(file);

    songs.push({
      id: i + 1,
      title: meta.title,
      artist: meta.artist,
      singers: meta.singers,
      album: meta.album,
      composer: meta.composer,
      year: meta.year,
      duration: meta.duration,
      category: "Tamil",
      filename: file,
      audio: `${GITHUB_RAW_BASE}/${encodedFile}`,
    });
  }

  const output = { songs };
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ songs.json updated with ${songs.length} song(s) and accurate metadata:\n`);
  songs.forEach((s) => {
    console.log(`[${s.id}] "${s.title}"`);
    console.log(`    Artist/Singers: ${s.artist}`);
    console.log(`    Album: ${s.album} | Composer: ${s.composer} | Year: ${s.year || "N/A"} | Duration: ${s.duration}s`);
  });
}

generateSongs().catch((err) => {
  console.error("Error generating songs:", err);
  process.exit(1);
});
