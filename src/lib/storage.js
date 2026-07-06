import localforage from 'localforage'

// Configure localForage
localforage.config({
  name: 'Instamp',
  storeName: 'instamp_sessions',
  description: 'Stores parsed Instagram chat logs and media locally for session persistence'
})

const CONVERSATIONS_KEY = 'chat_conversations'
const ACTIVE_CONVO_KEY  = 'active_convo_id'
const MEDIA_PREFIX      = 'media/'

/**
 * Saves the full session to IndexedDB.
 * Conversations are stored as one JSON blob.
 * Each media file is stored separately under "media/<zipPath>".
 */
export async function saveSession(conversations, activeConversationId = '', mediaMap = {}) {
  try {
    // Strip non-serialisable mediaBlobUrl before storing (blob URLs die on refresh anyway)
    const sanitised = {}
    for (const [id, convo] of Object.entries(conversations)) {
      sanitised[id] = {
        ...convo,
        messages: convo.messages.map((m) => ({
          ...m,
          mediaBlobUrl: null, // never persist — regenerated on load
        })),
      }
    }

    await localforage.setItem(CONVERSATIONS_KEY, sanitised)
    if (activeConversationId) {
      await localforage.setItem(ACTIVE_CONVO_KEY, activeConversationId)
    }

    // Store each media Blob keyed by its exact ZIP path
    if (mediaMap) {
      for (const [path, blob] of Object.entries(mediaMap)) {
        if (blob) {
          await localforage.setItem(`${MEDIA_PREFIX}${path}`, blob)
        }
      }
    }
  } catch (error) {
    console.error('Failed to save session to IndexedDB:', error)
  }
}

/**
 * Loads conversations + active ID from IndexedDB.
 */
export async function loadSession() {
  try {
    const conversations      = await localforage.getItem(CONVERSATIONS_KEY)
    const activeConversationId = await localforage.getItem(ACTIVE_CONVO_KEY)
    return {
      conversations: conversations || null,
      activeConversationId: activeConversationId || '',
    }
  } catch (error) {
    console.error('Failed to load session from IndexedDB:', error)
    return { conversations: null, activeConversationId: '' }
  }
}

/**
 * Loads ALL stored media Blobs from IndexedDB and returns them as a
 * { [zipPath]: Blob } map — the same shape the worker produces.
 *
 * This is called on page restore so we can re-create fresh blob URLs.
 */
export async function loadAllMediaFiles() {
  const mediaFiles = {}
  try {
    await localforage.iterate((value, key) => {
      if (key.startsWith(MEDIA_PREFIX)) {
        const zipPath = key.slice(MEDIA_PREFIX.length) // strip the "media/" prefix
        if (value instanceof Blob) {
          mediaFiles[zipPath] = value
        } else if (value instanceof ArrayBuffer) {
          // Older entries may have been stored as ArrayBuffer
          mediaFiles[zipPath] = new Blob([value], { type: 'image/jpeg' })
        }
      }
    })
  } catch (error) {
    console.error('Failed to load media files from IndexedDB:', error)
  }
  return mediaFiles
}

/**
 * Retrieves a single media Blob by its ZIP path.
 */
export async function getMediaItem(zipPath) {
  try {
    const item = await localforage.getItem(`${MEDIA_PREFIX}${zipPath}`)
    if (!item) return null
    if (item instanceof Blob) return item
    if (item instanceof ArrayBuffer) return new Blob([item], { type: 'application/octet-stream' })
    return null
  } catch (error) {
    console.error(`Failed to fetch media item for ${zipPath}:`, error)
    return null
  }
}

/**
 * Clears all stored session data from IndexedDB.
 */
export async function clearSession() {
  try {
    await localforage.clear()
  } catch (error) {
    console.error('Failed to clear session from IndexedDB:', error)
  }
}
