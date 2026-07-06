# Data Flow — Instamp

**Author:** Balaji R

---

## 1. End-to-End Sequence

```
User                UploadScreen         extract.worker        htmlParser/mediaResolver     IndexedDB          ChatWindow
 |                        |                     |                          |                    |                  |
 |--Selects ZIP file----->|                     |                          |                    |                  |
 |                        |--postMessage(file)->|                          |                    |                  |
 |                        |                     |--zip.js stream read----->|                    |                  |
 |                        |<--progress events---|                          |                    |                  |
 |                        |                     |--entries: html + media-->|                    |                  |
 |                        |                     |                          |--parse HTML------->|                  |
 |                        |                     |                          |--normalize paths-->|                  |
 |                        |                     |                          |--save messages---->|                  |
 |                        |                     |                          |--save media blobs->|                  |
 |                        |<----------------done signal--------------------|                    |                  |
 |                        |------------------------------------------------------------------->load from DB------>|
 |                                                                                                                  |
 |<----------------------------------------------- Rendered chat UI ----------------------------------------------|
 |
 |--Types in search box-->|.....................................................................................>|
 |                                                                                     (filters applied in-memory, no re-parse)
```

---

## 2. Detailed Steps

1. **File Selection**
   User drops or selects a `.zip` file in `UploadScreen`.

2. **Handoff to Worker**
   The main thread transfers the `File` object to `extract.worker.js` via `postMessage` (using Transferable Objects for efficiency).

3. **Streaming Extraction**
   `zip.js` reads the ZIP as a stream, entry by entry, avoiding loading the entire archive into memory at once. As each entry is read, the worker classifies it:
   - `.html` → added to `htmlFiles[]`
   - `photos/*`, `videos/*`, `audio/*` → added to `mediaFiles[]` as `{path, blob}`

4. **Progress Reporting**
   After every N entries processed, the worker posts a `{type: 'progress', percent}` message so the UI can show a progress bar.

5. **Parsing**
   Once extraction completes, `htmlParser.js` parses each HTML file into message objects (sender, timestamp, text, raw media reference).

6. **Merging & Sorting**
   All parsed message arrays (from `message_1.html`, `message_2.html`, etc.) are concatenated, timestamps normalized, and the full list sorted chronologically.

7. **Media Path Resolution**
   `mediaResolver.js` matches each message's raw media reference to an entry in `mediaFiles[]` using suffix matching on `photos/`, `videos/`, `audio/` folder names.

8. **Persistence**
   The final message array (JSON) and media blob map are saved into IndexedDB via LocalForage, so the session survives page reloads.

9. **Rendering**
   `ChatWindow` reads from the Zustand store (hydrated from IndexedDB), renders virtualized message bubbles grouped by day.

10. **Lazy Media Loading**
    As the user scrolls, `MessageBubble` components resolve their `Blob` to a `Blob URL` only when they enter the viewport (via Intersection Observer), keeping memory usage low even with thousands of media messages.

11. **Filtering**
    Search/sender/media-type/date filters operate purely on the in-memory message array — no re-parsing or re-extraction needed, so filtering feels instant.

---

## 3. Why This Flow Avoids Common Pitfalls

- **No UI freeze**: extraction and parsing happen off the main thread (Web Worker).
- **No memory blowup**: streaming unzip + lazy Blob URL creation instead of loading all media upfront.
- **No repeated uploads**: IndexedDB persistence means the ZIP only needs to be processed once per session.
- **No data leaves the browser**: every step above happens locally; there is no network request carrying chat content.
