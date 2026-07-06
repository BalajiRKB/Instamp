# High-Level Design (HLD) — Instamp

**Author:** Balaji R
**Status:** Draft v1
**Last updated:** July 2026

---

## 1. Purpose

Instamp lets a user upload their exported Instagram chat data (a ZIP file containing HTML message logs plus photos, videos, and audio) and view it as a clean, filterable, Instagram-style chat interface — entirely in the browser, with zero backend.

---

## 2. Goals

- Fully client-side processing — no chat data ever touches a server.
- Support large exports (hundreds of MB of media) without freezing the browser.
- Recreate a familiar, Instagram-like reading experience.
- Let users search, filter, and revisit their exported conversations easily.

## 2.1 Non-Goals

- Not a live Instagram DM client — it only reads static exports.
- No multi-user accounts, sync, or cloud storage in v1.
- No editing or sending of messages.

---

## 3. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                       │
│                                                                 │
│   ┌───────────┐    ┌────────────────┐    ┌─────────────────┐  │
│   │  Upload   │───▶│  Web Worker:    │───▶│   IndexedDB      │  │
│   │  ZIP file │    │  zip.js extract │    │  (LocalForage)   │  │
│   └───────────┘    │  + HTML parser  │    │  - messages JSON │  │
│                     └────────────────┘    │  - media blobs   │  │
│                                            └─────────────────┘  │
│                                                     │            │
│                                                     ▼            │
│                                      ┌─────────────────────────┐│
│                                      │   React App (Vite)      ││
│                                      │  - Chat renderer        ││
│                                      │  - Filters/search       ││
│                                      │  - Lightbox/players     ││
│                                      └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

Everything runs in-browser. There is no server component in v1.

---

## 4. Architecture Components

### 4.1 Upload Layer
- Accepts a `.zip` file via drag-drop or file picker.
- Validates file type and rough size sanity check before processing.

### 4.2 Extraction Engine (Web Worker)
- Uses **zip.js** in a dedicated Web Worker to stream-extract the ZIP without blocking the UI thread.
- Emits progress events back to the main thread (for a progress bar).
- Separates extracted entries into two buckets:
  - HTML message files (`message_*.html`)
  - Media files (`photos/`, `videos/`, `audio/`)

### 4.3 Parser Module
- Parses each `message_*.html` file using a DOM parser (same logic proven in the prototype).
- Extracts: sender, timestamp, text, and media references (relative file paths).
- Merges and sorts all messages chronologically across multiple `message_N.html` files.
- Resolves media references by matching relative paths to extracted media file entries.

### 4.4 Storage Layer (IndexedDB via LocalForage)
- Stores parsed message JSON under a `session` key.
- Stores each media file as a `Blob` keyed by its relative path.
- Enables the app to reload previous sessions without re-uploading the ZIP.

### 4.5 Rendering Layer (React + Tailwind)
- Reconstructs Instagram-style chat bubbles from parsed JSON.
- Resolves media blobs to `Blob URLs` on demand (lazy, via Intersection Observer) for performance.
- Component breakdown detailed in `LLD.md`.

### 4.6 Filter & Search Layer
- Client-side filtering on the in-memory JSON array (search text, sender, media type, date range).
- No re-parsing needed — filters just change what's rendered.

---

## 5. Data Flow (Summary)

1. User uploads ZIP.
2. Web Worker extracts files using zip.js, streaming to avoid memory spikes.
3. HTML files parsed into structured message objects.
4. Media files stored as Blobs in IndexedDB; message objects reference them by path.
5. React app reads from IndexedDB, renders chat UI.
6. Filters/search operate on the already-loaded JSON in memory.

Full sequence diagram in [`DATA_FLOW.md`](DATA_FLOW.md).

---

## 6. Technology Choices & Rationale

| Decision | Choice | Alternative Considered | Why Chosen |
|---|---|---|---|
| Unzip library | zip.js | JSZip | Streaming + Web Worker support handles large video-heavy exports without freezing tab |
| Storage | IndexedDB (LocalForage) | localStorage | localStorage has ~5-10MB limit; unsuitable for media blobs |
| Framework | React + Vite | Plain JS | Component reuse for bubbles/filters, easier to scale into open-source project |
| Styling | Tailwind CSS | Plain CSS | Faster to replicate Instagram's exact visual style |
| Hosting | Static (Vercel/Netlify) | Node backend | No backend needed since everything is client-side; keeps it free and privacy-safe |

---

## 7. Performance Considerations

- Media rendered lazily (Intersection Observer) — only visible bubbles resolve their Blob URL.
- Extraction happens in a Web Worker to keep scrolling/typing responsive during upload.
- Large chats (10k+ messages) are virtualized in the message list (windowing) to avoid rendering all DOM nodes at once.

---

## 8. Security & Privacy

- No network calls involving chat content — verified via no `fetch`/`axios` calls touching parsed data.
- All processing happens in-memory and in IndexedDB, scoped to the browser origin.
- Users can clear stored data via a "Clear session" button, which wipes IndexedDB.

---

## 9. Future Considerations

- Multi-conversation support (pick which thread inside a ZIP to view).
- Optional Tauri desktop build for offline power users.
- Export filtered results back to a shareable HTML file.

See [`ROADMAP.md`](ROADMAP.md) for phased delivery plan.
