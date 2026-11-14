/**
 * server/watcher.js
 * Watches the /songs folder and auto-regenerates songs.json on any change.
 * Also starts the Express API server in the same process.
 *
 * Run: node server/watcher.js   (or: npm run watch)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SONGS_DIR = path.join(__dirname, "..", "songs");
const GENERATE_SCRIPT = path.join(__dirname, "..", "scripts", "generate-songs.js");

console.log("👀 Watching songs/ folder for changes…");

// Debounce regeneration (avoid double-firing)
let debounceTimer = null;
function regenerate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log("🔄 Songs folder changed – regenerating songs.json…");
    try {
      execSync(`node "${GENERATE_SCRIPT}"`, { stdio: "inherit" });
    } catch (e) {
      console.error("❌ Error regenerating songs.json:", e.message);
    }
  }, 500);
}

fs.watch(SONGS_DIR, { recursive: false }, (event, filename) => {
  if (filename) {
    console.log(`  📁 ${event}: ${filename}`);
    regenerate();
  }
});

// Also boot the API server
require("./index.js");
