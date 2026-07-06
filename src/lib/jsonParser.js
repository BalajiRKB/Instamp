/**
 * Instagram DM JSON export parser — optimised for the real export structure:
 *
 *   your_instagram_activity/messages/inbox/<thread>/message_1.json
 *   your_instagram_activity/messages/inbox/<thread>/message_2.json
 *   your_instagram_activity/messages/photos/<id>          ← shared media (no ext)
 *   your_instagram_activity/messages/inbox/<thread>/photos/<id>  ← per-convo media
 *
 * JSON shape per file:
 * {
 *   "title": "Contact Name",
 *   "participants": [{ "name": "..." }],
 *   "thread_path": "inbox/contact_17925972318018288",
 *   "messages": [
 *     {
 *       "sender_name": "Balaji RKB",
 *       "timestamp_ms": 1783084236662,
 *       "content": "text here",
 *       "photos":      [{ "uri": "your_instagram_activity/messages/inbox/.../photos/<id>" }],
 *       "videos":      [{ "uri": "..." }],
 *       "audio_files": [{ "uri": "..." }],
 *       "gifs":        [{ "uri": "..." }],
 *       "share":       { "link": "https://...", "share_text": "...", "original_content_owner": "..." },
 *       "reactions":   [{ "reaction": "\u00e2\u009d\u00a4", "actor": "Name" }],
 *       "is_geoblocked_for_viewer": false
 *     }
 *   ]
 * }
 *
 * ENCODING NOTE: Instagram stores ALL non-ASCII text (emoji, Tamil, Arabic …)
 * as mojibake — UTF-8 byte sequences interpreted as Latin-1.
 * e.g.  🔥  →  \u00f0\u009f\u0094\u00a5
 *        ❤️  →  \u00e2\u009d\u00a4
 * We fix this with fixEncoding() on every string field.
 */

// ── Encoding fix ──────────────────────────────────────────────────────────────
function fixEncoding(str) {
  if (!str || typeof str !== 'string') return str ?? ''
  try {
    return decodeURIComponent(escape(str))
  } catch {
    return str
  }
}

// Ghost content strings Instagram inserts for media-only messages
const GHOST_CONTENT_PATTERNS = [
  /sent an attachment/i,
  /sent a photo/i,
  /sent a video/i,
  /sent an audio message/i,
  /sent a link/i,
  /liked a message/i,
  /reacted .+ to your message/i,
]

function isGhostContent(text) {
  if (!text) return false
  return GHOST_CONTENT_PATTERNS.some((p) => p.test(text.trim()))
}

// ── Single JSON file parser ────────────────────────────────────────────────────
export function parseMessagesJSON(jsonContent) {
  let raw
  try {
    raw = JSON.parse(jsonContent)
  } catch (e) {
    console.error('Failed to parse JSON:', e)
    return { title: '', participants: [], messages: [] }
  }

  const title = fixEncoding(raw.title ?? '')
  const participants = (raw.participants ?? []).map((p) => fixEncoding(p.name ?? '')).filter(Boolean)

  const messages = []

  for (let idx = 0; idx < (raw.messages ?? []).length; idx++) {
    const m = raw.messages[idx]

    const sender = fixEncoding(m.sender_name ?? '')
    if (!sender) continue

    const timestampMs = m.timestamp_ms
    if (!timestampMs) continue
    const timestamp = new Date(timestampMs).toISOString()

    // ── Content type resolution ───────────────────────────────────────────────
    let text = fixEncoding(m.content ?? '')
    let mediaType = 'text'
    let mediaUri = null   // the raw uri from JSON (used to look up in mediaFiles map)

    if (m.photos && m.photos.length > 0) {
      mediaType = 'photo'
      mediaUri = m.photos[0].uri     // e.g. "your_instagram_activity/messages/inbox/.../photos/123456"
      // Suppress ghost caption like "Balaji RKB sent a photo."
      if (isGhostContent(text)) text = ''
    } else if (m.videos && m.videos.length > 0) {
      mediaType = 'video'
      mediaUri = m.videos[0].uri
      if (isGhostContent(text)) text = ''
    } else if (m.audio_files && m.audio_files.length > 0) {
      mediaType = 'audio'
      mediaUri = m.audio_files[0].uri
      if (isGhostContent(text)) text = ''
    } else if (m.gifs && m.gifs.length > 0) {
      mediaType = 'gif'
      mediaUri = m.gifs[0].uri
      if (isGhostContent(text)) text = ''
    } else if (m.sticker) {
      mediaType = 'sticker'
      mediaUri = m.sticker.uri
      if (isGhostContent(text)) text = ''
    } else if (m.share) {
      mediaType = 'link'
      mediaUri = m.share.link ?? null
      // Use share_text as the body if content is a ghost string
      if (isGhostContent(text)) {
        text = m.share.share_text ? fixEncoding(m.share.share_text) : ''
      }
    }

    // ── Reactions ─────────────────────────────────────────────────────────────
    const reactions = (m.reactions ?? []).map((r) => ({
      emoji: fixEncoding(r.reaction ?? ''),
      actor: fixEncoding(r.actor ?? ''),
    }))

    const id = `${sender}__${timestampMs}__${idx}`
    messages.push({
      id,
      sender,
      timestamp,
      timestampMs,
      text,
      mediaType,
      mediaUri,   // exact ZIP path — used to resolve the Blob from mediaFiles
      mediaBlob: null,
      reactions,
    })
  }

  return { title, participants, messages }
}

// ── Merge + deduplicate + sort ─────────────────────────────────────────────────
export function mergeAndSortMessages(messageArrays) {
  const combined = messageArrays.flat()
  const seen = new Map()

  combined.forEach((msg) => {
    // Deduplicate across paginated message_1.json / message_2.json files
    const key = `${msg.sender}||${msg.timestampMs}`
    if (!seen.has(key)) seen.set(key, msg)
  })

  // Sort oldest → newest
  return Array.from(seen.values()).sort((a, b) => a.timestampMs - b.timestampMs)
}

// ── Export-level processor ────────────────────────────────────────────────────
/**
 * Groups JSON files by inbox subfolder, parses and merges each group.
 *
 * Works with the real export path:
 *   your_instagram_activity/messages/inbox/<convoId>/message_N.json
 *
 * @param {Array<{ filename: string, content: string }>} jsonFiles
 * @returns {Object} Map of convoId → conversation object
 */
export function processInstagramExport(jsonFiles) {
  const groups = {}

  jsonFiles.forEach((file) => {
    // Normalise backslashes (Windows ZIPs)
    const normalised = file.filename.replace(/\\/g, '/')

    // Find the "inbox" segment regardless of leading path depth
    const inboxIdx = normalised.split('/').findIndex((p) => p.toLowerCase() === 'inbox')
    const parts = normalised.split('/')
    let convoId

    if (inboxIdx !== -1 && parts[inboxIdx + 1]) {
      convoId = parts[inboxIdx + 1]
    } else {
      // Fallback: parent directory of the file
      convoId = parts.length >= 2 ? parts[parts.length - 2] : 'unknown'
    }

    if (!groups[convoId]) groups[convoId] = []
    groups[convoId].push(file)
  })

  const conversations = {}

  Object.keys(groups).forEach((convoId) => {
    const files = groups[convoId]
    const parsedLists = []
    let resolvedTitle = ''
    const allParticipants = new Set()

    files.forEach((file) => {
      const { title, participants, messages } = parseMessagesJSON(file.content)
      parsedLists.push(messages)
      if (title && !resolvedTitle) resolvedTitle = title
      participants.forEach((p) => allParticipants.add(p))
    })

    const mergedMessages = mergeAndSortMessages(parsedLists)
    if (mergedMessages.length === 0) return

    // Collect senders from actual messages
    const sendersFromMessages = new Set()
    mergedMessages.forEach((m) => { if (m.sender) sendersFromMessages.add(m.sender) })
    const combinedSenders = new Set([...allParticipants, ...sendersFromMessages])

    // Build display name — prefer the JSON title, fall back to cleaning the slug
    let name = resolvedTitle
    if (!name || /^(inbox|messages|conversation|instagramuser)$/i.test(name.trim())) {
      name = convoId
        .replace(/_[a-z0-9]{8,}$/i, '') // strip trailing Instagram numeric hash
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim()
    }

    const lastMessage = mergedMessages[mergedMessages.length - 1]

    conversations[convoId] = {
      id: convoId,
      name: name || convoId,
      messages: mergedMessages,
      senders: Array.from(combinedSenders).sort(),
      lastMessage,
    }
  })

  return conversations
}

/**
 * Resolves media Blobs from the worker's mediaFiles map into message objects.
 * The JSON uri field is the exact ZIP path, so we do a direct lookup.
 *
 * @param {Array} messages - All messages across all conversations
 * @param {Object} mediaFiles - Map of zip path → Blob from the worker
 */
export function resolveMediaBlobs(messages, mediaFiles) {
  if (!mediaFiles || Object.keys(mediaFiles).length === 0) return

  messages.forEach((msg) => {
    if (msg.mediaUri && !msg.mediaBlob) {
      const blob = mediaFiles[msg.mediaUri]
      if (blob) {
        msg.mediaBlob = blob
        msg.mediaBlobUrl = URL.createObjectURL(blob)
      }
    }
  })
}
