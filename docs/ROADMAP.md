# Roadmap — Instamp

**Author:** Balaji R

Tracking progress from MVP to full public release.

---

## Phase 0 — Prototype (Done ✅)
- [x] Parse a single exported `message_N.html` file into structured JSON
- [x] Render basic Instagram-style chat bubbles (text only) in static HTML
- [x] Add search, sender, media-type, and date filters
- [x] Validate parsing logic against a real multi-thousand-message export

## Phase 1 — MVP (In Progress 🚧)
- [ ] Scaffold React + Vite project structure
- [ ] Integrate zip.js in a Web Worker for streaming ZIP extraction
- [ ] Port existing HTML parser logic into `lib/htmlParser.js`
- [ ] Build `mediaResolver.js` to match media paths from HTML to extracted ZIP entries
- [ ] Render text-only messages via React components (`MessageBubble`, `DateSeparator`)
- [ ] Basic upload screen with progress bar

## Phase 2 — Media Support
- [ ] `PhotoBubble` with thumbnail + lightbox viewer
- [ ] `VideoBubble` with native player
- [ ] `AudioBubble` styled as voice-note player
- [ ] `LinkCard` for shared reels/links with caption preview
- [ ] Lazy Blob URL resolution via Intersection Observer

## Phase 3 — Persistence & Performance
- [ ] IndexedDB integration via LocalForage for session persistence
- [ ] Virtualized message list (react-window) for large chats
- [ ] "Clear session" button to wipe stored data
- [ ] Handle multi-file exports (`message_1.html`, `message_2.html`, ...) seamlessly

## Phase 4 — Polish & Public Release
- [ ] Tailwind CSS visual polish to match Instagram DM look closely
- [ ] Mobile-responsive layout
- [ ] Error handling for corrupted ZIPs / missing media
- [ ] Deploy to Vercel/Netlify as a public static site
- [ ] Write usage guide with screenshots in README

## Phase 5 — Stretch Goals
- [ ] Multi-conversation picker (choose which thread inside a ZIP to view)
- [ ] Export filtered view back to a shareable standalone HTML file
- [ ] Tauri desktop build for offline power users
- [ ] Basic chat statistics dashboard (message count, most active times, word frequency)

---

## Contribution

Once Phase 1 is stable, this repo will be opened up for community contributions. See [`CONTRIBUTING.md`](../CONTRIBUTING.md).
