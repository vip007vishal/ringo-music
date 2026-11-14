# Ringo Music

A lightweight music catalog + streaming API backed by a GitHub repository.

---

## 📂 Structure

```
ringo-music/
├── songs/                   ← Drop .mp3 files here
├── data/
│   └── songs.json           ← Auto-generated catalog (do not edit manually)
├── scripts/
│   └── generate-songs.js    ← Scans /songs and writes songs.json
├── server/
│   ├── index.js             ← Express API server
│   └── watcher.js           ← Watches /songs + runs the API
├── .github/workflows/
│   └── update-songs.yml     ← GitHub Action: auto-updates songs.json on push
└── package.json
```

---

## 🚀 Quick Start (Local)

```bash
npm install
npm run generate    # one-time: build songs.json from /songs
npm run watch       # start API + watch /songs for changes
```

API will be live at **http://localhost:3000**

---

## 🎵 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/songs` | All songs (from songs.json) |
| `GET` | `/api/songs/:id` | Single song by id |
| `GET` | `/api/songs/stream/:filename` | Stream audio (supports Range/seek) |

### Example responses

**GET /api/songs**
```json
{
  "songs": [
    {
      "id": 1,
      "title": "Badass",
      "artist": "MassTamilan.dev",
      "category": "Music",
      "filename": "Badass-MassTamilan.dev.mp3",
      "audio": "https://raw.githubusercontent.com/vip007vishal/ringo-music/main/songs/Badass-MassTamilan.dev.mp3"
    }
  ]
}
```

---

## ☁️ GitHub Raw URL (Free CDN)

Every song in `/songs` is publicly accessible via:
```
https://raw.githubusercontent.com/vip007vishal/ringo-music/main/songs/<filename>
```

The `audio` field in `songs.json` already points there.

---

## 🤖 Auto-update (GitHub Actions)

Whenever you **push a file into the `songs/` folder**, the GitHub Action at
`.github/workflows/update-songs.yml` automatically:
1. Runs `generate-songs.js`
2. Commits the updated `data/songs.json` back to the repo

No manual step needed.

---

## ➕ Adding a Song

1. Copy the `.mp3` into `songs/`  
2. `git add songs/YourSong.mp3 && git commit -m "add song" && git push`  
3. GitHub Action regenerates `songs.json` automatically ✅
