# Instamp 

> A privacy-first tool to view your exported Instagram DMs the way Instagram actually shows them — with photos, videos, and voice notes rendered inline, not as broken file links.

---

## Why I built this

Instagram lets you export your chat history, but the export is a raw, ugly HTML dump — text is unformatted, media links are broken, and there's no way to search or filter through months of conversations. I wanted a tool that takes that messy export and turns it back into a clean, familiar chat experience — like reopening Instagram DMs, but offline and fully in your control.

No server. No uploads to the cloud. Your chats never leave your browser.

---

## Features

- 📥 Upload your Instagram data export ZIP directly — no manual extraction needed
- 💬 Instagram-style chat bubbles, grouped by day, sorted chronologically
- 🖼️ Inline photo viewing with lightbox
- 🎥 Inline video playback
- 🎙️ Voice note / audio playback styled like Instagram's voice messages
- 🔗 Shared reels and links rendered as proper preview cards
- 🔍 Full-text search across all messages (supports mixed-language/Tanglish text)
- 🧑‍🤝‍🧑 Filter by sender
- 🗂️ Filter by message type (text / photo / video / audio / link)
- 📅 Filter by date range
- 💾 Session persistence via IndexedDB — reopen the app without re-uploading
- 🔒 100% client-side — nothing is sent to any server

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + Vite |
| Styling | Tailwind CSS |
| ZIP extraction | zip.js (streaming, Web Worker based) |
| Local storage | IndexedDB via LocalForage |
| State management | Zustand |
| Deployment | Vercel / Netlify (static hosting) |
| Optional desktop build | Tauri |

See [`docs/HLD.md`](docs/HLD.md) for full architecture details and [`docs/LLD.md`](docs/LLD.md) for component-level design.

---

## How Instagram Export Works

When you request your data from Instagram (Settings → Accounts Centre → Download your information), you get a ZIP with this structure:

```
instagram-yourusername-date/
└── your_instagram_activity/
    └── messages/
        └── inbox/
            └── username_conversationid/
                ├── message_1.html
                ├── message_2.html   (if chat is long, split across files)
                ├── photos/
                │   └── *.jpg
                ├── videos/
                │   └── *.mp4
                └── audio/
                    └── *.ogg
```

Instamp parses this structure directly from the ZIP — no manual unzipping required.

---

## Getting Started (Development)

```bash
git clone https://github.com/BalajiRKB/Instamp.git
cd Instamp
npm install
npm run dev
```

Open `http://localhost:5173` and upload your Instagram export ZIP.

---

## Project Status

🚧 Early development — MVP in progress. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's built and what's next.

---

## Documentation

- [High-Level Design (HLD)](docs/HLD.md)
- [Low-Level Design (LLD)](docs/LLD.md)
- [Data Flow](docs/DATA_FLOW.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)

---

## Privacy

Instamp never uploads your data anywhere. All ZIP extraction, parsing, and rendering happens locally in your browser using Web Workers and IndexedDB. This project does not include any backend, analytics, or tracking.

---

## License

MIT © Balaji R
