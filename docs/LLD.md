# Low-Level Design (LLD) — Instamp

**Author:** Balaji R
**Status:** Draft v1

---

## 1. Folder Structure

```
instamp/
├── public/
├── src/
│   ├── components/
│   │   ├── UploadScreen.jsx
│   │   ├── ChatWindow.jsx
│   │   ├── MessageBubble.jsx
│   │   ├── PhotoBubble.jsx
│   │   ├── VideoBubble.jsx
│   │   ├── AudioBubble.jsx
│   │   ├── LinkCard.jsx
│   │   ├── DateSeparator.jsx
│   │   ├── FilterBar.jsx
│   │   ├── Lightbox.jsx
│   │   └── ProgressBar.jsx
│   ├── workers/
│   │   └── extract.worker.js
│   ├── lib/
│   │   ├── zipExtractor.js
│   │   ├── htmlParser.js
│   │   ├── mediaResolver.js
│   │   └── storage.js
│   ├── store/
│   │   └── chatStore.js        # Zustand store
│   ├── App.jsx
│   └── main.jsx
├── docs/
│   ├── HLD.md
│   ├── LLD.md
│   ├── DATA_FLOW.md
│   └── ROADMAP.md
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 2. Component Responsibilities

### `UploadScreen.jsx`
- Renders drag-and-drop zone + file picker.
- On file select, dispatches to `extract.worker.js` and shows `ProgressBar`.

### `extract.worker.js`
- Runs in a Web Worker.
- Uses `zip.js` to stream-read ZIP entries.
- Separates entries into `htmlFiles[]` and `mediaFiles[]` (as ArrayBuffers).
- Posts progress messages back (`{type: 'progress', percent}`) and final result (`{type: 'done', htmlFiles, mediaFiles}`).

### `lib/htmlParser.js`
- Input: raw HTML string of a `message_N.html` file.
- Uses `DOMParser` to walk the DOM.
- Extracts per message: `sender`, `timestamp`, `text`, `mediaRefs[]` (relative paths found in `<img>`, `<a href>`, `<audio src>`).
- Output: array of message objects.

```js
// Message object shape
{
  id: string,
  sender: string,
  timestamp: string,   // ISO string after normalization
  text: string,
  mediaType: 'text' | 'photo' | 'video' | 'audio' | 'link',
  mediaPath: string | null   // relative path matching a mediaFiles entry
}
```

### `lib/mediaResolver.js`
- Input: array of message objects + `mediaFiles` map (path → ArrayBuffer/Blob).
- Normalizes path prefixes (strips `your_instagram_activity/messages/inbox/.../` prefix differences).
- Attaches a `blobUrl` (or defers creation until render time, for lazy loading).

### `lib/storage.js`
- Wraps LocalForage.
- `saveSession(messages, mediaMap)` — stores parsed JSON + blobs in IndexedDB.
- `loadSession()` — retrieves last session on app start.
- `clearSession()` — wipes stored data.

### `store/chatStore.js` (Zustand)
- Holds: `messages[]`, `filters {search, sender, mediaType, dateFrom, dateTo}`, `loading`, `progress`.
- Derived selector: `filteredMessages` computed from `messages` + `filters`.

### `ChatWindow.jsx`
- Subscribes to `filteredMessages` from store.
- Groups messages by day, renders `DateSeparator` + `MessageBubble` per message.
- Implements virtualization (e.g. `react-window`) for large message counts.

### `MessageBubble.jsx`
- Dispatches to `PhotoBubble` / `VideoBubble` / `AudioBubble` / `LinkCard` based on `mediaType`, else renders plain text bubble.
- Uses Intersection Observer to lazily call `URL.createObjectURL()` only when bubble scrolls into view; revokes URL when unmounted to avoid memory leaks.

### `PhotoBubble.jsx`
- Renders `<img>` thumbnail; click opens `Lightbox.jsx` with full-size view.

### `VideoBubble.jsx`
- Renders native `<video controls>` with lazy `src` assignment.

### `AudioBubble.jsx`
- Renders `<audio controls>` styled as a voice-note pill (waveform icon + play button).

### `LinkCard.jsx`
- Renders shared reel/link previews with caption text and clickable original URL.

### `FilterBar.jsx`
- Search input, sender dropdown, media type dropdown, date range pickers.
- Updates `filters` in `chatStore` on change (debounced search input).

---

## 3. Key Algorithms

### 3.1 Multi-file Message Merging
1. Parse each `message_N.html` independently into arrays.
2. Concatenate all arrays.
3. Normalize timestamps to `Date` objects.
4. Sort ascending by timestamp.
5. Deduplicate if any overlapping messages exist across files (rare edge case, compare sender+timestamp+text).

### 3.2 Media Path Matching
1. Instagram HTML references paths like:
   `your_instagram_activity/messages/inbox/cutie15_.../photos/123.jpg`
2. ZIP entries have paths relative to ZIP root, which may or may not include that full prefix.
3. Normalize both sides by taking the substring from `photos/`, `videos/`, or `audio/` onward, then match on that suffix.

### 3.3 Lazy Blob URL Resolution
1. On mount, `MessageBubble` registers with an `IntersectionObserver`.
2. When bubble enters viewport, resolve `mediaPath` → `Blob` (from IndexedDB or in-memory map) → `URL.createObjectURL(blob)`.
3. On unmount, call `URL.revokeObjectURL()` to free memory.

---

## 4. Error Handling

| Scenario | Handling |
|---|---|
| Corrupted ZIP | Show toast: "Could not read file — please re-export from Instagram." |
| Missing media file referenced in HTML | Render placeholder: "Media unavailable" |
| Very large ZIP (>1GB) | Warn user before processing, show estimated time |
| Unsupported browser (no Web Worker/IndexedDB) | Show compatibility warning banner |

---

## 5. Testing Strategy

- Unit tests for `htmlParser.js` and `mediaResolver.js` using sample fixture HTML files.
- Component tests (React Testing Library) for `MessageBubble` variants.
- Manual QA checklist for large real-world exports (1000+ messages, mixed media).
