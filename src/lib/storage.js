import localforage from 'localforage'

// Configure localForage
localforage.config({
  name: 'Instamp',
  storeName: 'instamp_sessions',
  description: 'Stores parsed Instagram chat logs and media locally for session persistence'
})

const CONVERSATIONS_KEY = 'chat_conversations'
const ACTIVE_CONVO_KEY = 'active_convo_id'
const MEDIA_PREFIX = 'media/'

/**
 * Saves the session data to IndexedDB.
 * @param {Object} conversations - Mapped list of conversations.
 * @param {string} activeConversationId - Active conversation selection.
 * @param {Map|Object} mediaMap - Optional map of normalized media path -> Blob
 */
export async function saveSession(conversations, activeConversationId = '', mediaMap = {}) {
  try {
    await localforage.setItem(CONVERSATIONS_KEY, conversations)
    if (activeConversationId) {
      await localforage.setItem(ACTIVE_CONVO_KEY, activeConversationId)
    }
    
    // Save media files
    if (mediaMap) {
      const keys = Object.keys(mediaMap)
      for (const path of keys) {
        const data = mediaMap[path]
        if (data) {
          await localforage.setItem(`${MEDIA_PREFIX}${path}`, data)
        }
      }
    }
  } catch (error) {
    console.error('Failed to save session to IndexedDB:', error)
  }
}

/**
 * Loads the saved session from IndexedDB.
 * @returns {Promise<{conversations: Object, activeConversationId: string}>}
 */
export async function loadSession() {
  try {
    const conversations = await localforage.getItem(CONVERSATIONS_KEY)
    const activeConversationId = await localforage.getItem(ACTIVE_CONVO_KEY)
    
    return {
      conversations: conversations || null,
      activeConversationId: activeConversationId || ''
    }
  } catch (error) {
    console.error('Failed to load session from IndexedDB:', error)
    return { conversations: null, activeConversationId: '' }
  }
}

/**
 * Retrieves a media item by its normalized path.
 * @param {string} normalizedPath - The media path relative to directories like photos/, videos/, audio/.
 * @returns {Promise<Blob|null>}
 */
export async function getMediaItem(normalizedPath) {
  try {
    const item = await localforage.getItem(`${MEDIA_PREFIX}${normalizedPath}`)
    if (!item) return null
    
    if (item instanceof Blob) {
      return item
    }
    
    if (item instanceof ArrayBuffer) {
      let type = 'application/octet-stream'
      if (normalizedPath.endsWith('.jpg') || normalizedPath.endsWith('.jpeg')) type = 'image/jpeg'
      else if (normalizedPath.endsWith('.png')) type = 'image/png'
      else if (normalizedPath.endsWith('.gif')) type = 'image/gif'
      else if (normalizedPath.endsWith('.mp4')) type = 'video/mp4'
      else if (normalizedPath.endsWith('.ogg') || normalizedPath.endsWith('.mp3')) type = 'audio/ogg'
      
      return new Blob([item], { type })
    }
    
    return null
  } catch (error) {
    console.error(`Failed to fetch media item for ${normalizedPath}:`, error)
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
