import localforage from 'localforage'

localforage.config({
  name: 'Instamp',
  storeName: 'instamp_sessions',
  description: 'Instagram chat cache — conversations and media blobs',
})

const CONVERSATIONS_KEY = 'chat_conversations'
const ACTIVE_CONVO_KEY  = 'active_convo_id'
const MEDIA_PREFIX      = 'media/'

// ── Save ──────────────────────────────────────────────────────────────────────
/**
 * Persists conversations and media Blobs to IndexedDB.
 *
 * Conversations are stored as pure JSON (no Blobs embedded) so they
 * serialise reliably across all localforage drivers and browsers.
 * Media Blobs are stored separately under "media/<zipPath>" keys.
 */
export async function saveSession(conversations, activeConversationId = '', mediaFiles = {}) {
  try {
    // Strip ALL non-serialisable fields from messages before storing.
    // Blob URLs die on refresh. Blobs embedded in complex objects can cause
    // quota issues and may not deserialise correctly in all environments.
    const serialisable = {}
    for (const [id, convo] of Object.entries(conversations)) {
      serialisable[id] = {
        ...convo,
        messages: convo.messages.map(({ mediaBlob, mediaBlobUrl, ...rest }) => rest),
      }
    }

    await localforage.setItem(CONVERSATIONS_KEY, serialisable)
    if (activeConversationId) {
      await localforage.setItem(ACTIVE_CONVO_KEY, activeConversationId)
    }

    // Store each media Blob under its exact ZIP path as the key.
    // Stored separately so they don't bloat the conversations JSON.
    // Each save is wrapped individually — a quota error on one file
    // won't prevent the others from being saved.
    for (const [path, blob] of Object.entries(mediaFiles)) {
      if (blob instanceof Blob) {
        try {
          await localforage.setItem(`${MEDIA_PREFIX}${path}`, blob)
        } catch (quotaErr) {
          // Silently skip — the message will fall back to a placeholder
          console.warn(`Media quota exceeded for ${path}:`, quotaErr.message)
        }
      }
    }
  } catch (err) {
    console.error('saveSession failed:', err)
  }
}

// ── Load conversations ────────────────────────────────────────────────────────
export async function loadSession() {
  try {
    const conversations        = await localforage.getItem(CONVERSATIONS_KEY)
    const activeConversationId = await localforage.getItem(ACTIVE_CONVO_KEY)
    return {
      conversations:       conversations || null,
      activeConversationId: activeConversationId || '',
    }
  } catch (err) {
    console.error('loadSession failed:', err)
    return { conversations: null, activeConversationId: '' }
  }
}

// ── Single media item lookup ───────────────────────────────────────────────────
/**
 * Fetches a single media Blob from IndexedDB by its ZIP path (the uri field
 * from the JSON export). Used by MessageBubble for lazy, on-demand loading.
 *
 * @param {string} zipPath - e.g. "your_instagram_activity/messages/inbox/.../photos/123"
 * @returns {Promise<Blob|null>}
 */
export async function getMediaItem(zipPath) {
  if (!zipPath) return null
  try {
    const item = await localforage.getItem(`${MEDIA_PREFIX}${zipPath}`)
    if (!item) return null
    if (item instanceof Blob) return item
    // Fallback for environments that return ArrayBuffer
    if (item instanceof ArrayBuffer) {
      const ext  = zipPath.split('.').pop().toLowerCase()
      const mime = ext === 'mp4' ? 'video/mp4'
                 : ext === 'ogg' ? 'audio/ogg'
                 : ext === 'mp3' ? 'audio/mpeg'
                 : 'image/jpeg'
      return new Blob([item], { type: mime })
    }
    return null
  } catch (err) {
    console.error(`getMediaItem failed for ${zipPath}:`, err)
    return null
  }
}

// ── Clear ─────────────────────────────────────────────────────────────────────
export async function clearSession() {
  try {
    await localforage.clear()
  } catch (err) {
    console.error('clearSession failed:', err)
  }
}
