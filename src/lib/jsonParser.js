/**
 * Instagram DM JSON export parser — optimised for the real export structure:
 *
 *   your_instagram_activity/messages/inbox/<thread>/message_1.json
 *
 * JSON shape per message:
 * {
 *   "sender_name": "...", "timestamp_ms": 1783084236662,
 *   "content": "text",
 *   "photos":      [{ "uri": "your_instagram_activity/messages/inbox/.../photos/123" }],
 *   "videos":      [{ "uri": "..." }],
 *   "audio_files": [{ "uri": "..." }],
 *   "gifs":        [{ "uri": "..." }],
 *   "share":       { "link": "https://...", "share_text": "...", "original_content_owner": "..." },
 *   "reactions":   [{ "reaction": "\u00e2\u009d\u00a4", "actor": "Name" }],
 * }
 *
 * ENCODING: Instagram stores all non-ASCII (emoji, Tamil, Arabic …) as mojibake.
 * e.g.  🔥 → \u00f0\u009f\u0094\u00a5   ❤️ → \u00e2\u009d\u00a4
 * Fixed with decodeURIComponent(escape(str)).
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
const GHOST_PATTERNS = [
  /sent an attachment/i,
  /sent a photo/i,
  /sent a video/i,
  /sent an audio message/i,
  /sent a link/i,
  /liked a message/i,
  /reacted .+ to your message/i,
]

function isGhostContent(text) {
  return !!text && GHOST_PATTERNS.some((p) => p.test(text.trim()))
}

// ── Single JSON file parser ───────────────────────────────────────────────────
export function parseMessagesJSON(jsonContent) {
  let raw
  try {
    raw = JSON.parse(jsonContent)
  } catch (e) {
    console.error('Failed to parse JSON:', e)
    return { title: '', participants: [], messages: [] }
  }

  const title        = fixEncoding(raw.title ?? '')
  const participants = (raw.participants ?? []).map((p) => fixEncoding(p.name ?? '')).filter(Boolean)
  const messages     = []

  for (let idx = 0; idx < (raw.messages ?? []).length; idx++) {
    const m = raw.messages[idx]

    const sender      = fixEncoding(m.sender_name ?? '')
    const timestampMs = m.timestamp_ms
    if (!sender || !timestampMs) continue

    const timestamp = new Date(timestampMs).toISOString()

    // ── Content type ──────────────────────────────────────────────────────────
    let text      = fixEncoding(m.content ?? '')
    let mediaType = 'text'
    let mediaUri  = null  // exact ZIP path from the JSON uri field

    if (m.photos?.length > 0) {
      mediaType = 'photo'
      mediaUri  = m.photos[0].uri
      if (isGhostContent(text)) text = ''
    } else if (m.videos?.length > 0) {
      mediaType = 'video'
      mediaUri  = m.videos[0].uri
      if (isGhostContent(text)) text = ''
    } else if (m.audio_files?.length > 0) {
      mediaType = 'audio'
      mediaUri  = m.audio_files[0].uri
      if (isGhostContent(text)) text = ''
    } else if (m.gifs?.length > 0) {
      mediaType = 'gif'
      mediaUri  = m.gifs[0].uri
      if (isGhostContent(text)) text = ''
    } else if (m.sticker) {
      mediaType = 'sticker'
      mediaUri  = m.sticker.uri
      if (isGhostContent(text)) text = ''
    } else if (m.share) {
      mediaType = 'link'
      mediaUri  = m.share.link ?? null
      if (isGhostContent(text)) {
        text = m.share.share_text ? fixEncoding(m.share.share_text) : ''
      }
    }

    // ── Reactions ─────────────────────────────────────────────────────────────
    const reactions = (m.reactions ?? []).map((r) => ({
      emoji: fixEncoding(r.reaction ?? ''),
      actor: fixEncoding(r.actor ?? ''),
    }))

    messages.push({
      id:          `${sender}__${timestampMs}__${idx}`,
      sender,
      timestamp,
      timestampMs,
      text,
      mediaType,
      mediaUri,   // ZIP path — used by MessageBubble to fetch from IndexedDB
      reactions,
      // NOTE: No mediaBlob / mediaBlobUrl stored in message state.
      // MessageBubble fetches from IndexedDB lazily via getMediaItem(mediaUri).
      // This avoids blob URL invalidation on refresh and keeps conversations
      // serialisable without Blob objects embedded inside them.
    })
  }

  return { title, participants, messages }
}

// ── Merge + deduplicate + sort ────────────────────────────────────────────────
export function mergeAndSortMessages(messageArrays) {
  const combined = messageArrays.flat()
  const seen     = new Map()

  combined.forEach((msg) => {
    const key = `${msg.sender}||${msg.timestampMs}`
    if (!seen.has(key)) seen.set(key, msg)
  })

  return Array.from(seen.values()).sort((a, b) => a.timestampMs - b.timestampMs)
}

// ── Export-level processor ────────────────────────────────────────────────────
export function processInstagramExport(jsonFiles) {
  const groups = {}

  jsonFiles.forEach((file) => {
    const normalised = file.filename.replace(/\\/g, '/')
    const parts      = normalised.split('/')
    const inboxIdx   = parts.findIndex((p) => p.toLowerCase() === 'inbox')
    let convoId

    if (inboxIdx !== -1 && parts[inboxIdx + 1]) {
      convoId = parts[inboxIdx + 1]
    } else {
      convoId = parts.length >= 2 ? parts[parts.length - 2] : 'unknown'
    }

    if (!groups[convoId]) groups[convoId] = []
    groups[convoId].push(file)
  })

  const conversations = {}

  Object.keys(groups).forEach((convoId) => {
    const parsedLists    = []
    let resolvedTitle    = ''
    const allParticipants = new Set()

    groups[convoId].forEach((file) => {
      const { title, participants, messages } = parseMessagesJSON(file.content)
      parsedLists.push(messages)
      if (title && !resolvedTitle) resolvedTitle = title
      participants.forEach((p) => allParticipants.add(p))
    })

    const mergedMessages = mergeAndSortMessages(parsedLists)
    if (mergedMessages.length === 0) return

    const sendersFromMessages = new Set()
    mergedMessages.forEach((m) => { if (m.sender) sendersFromMessages.add(m.sender) })
    const combinedSenders = new Set([...allParticipants, ...sendersFromMessages])

    let name = resolvedTitle
    if (!name || /^(inbox|messages|conversation|instagramuser)$/i.test(name.trim())) {
      name = convoId
        .replace(/_[a-z0-9]{8,}$/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim()
    }

    conversations[convoId] = {
      id:          convoId,
      name:        name || convoId,
      messages:    mergedMessages,
      senders:     Array.from(combinedSenders).sort(),
      lastMessage: mergedMessages[mergedMessages.length - 1],
    }
  })

  return conversations
}
