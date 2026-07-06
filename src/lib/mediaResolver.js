/**
 * Normalizes a path string by extracting the suffix starting from
 * the media folders (photos/, videos/, audio/).
 * 
 * E.g., "your_instagram_activity/messages/inbox/john_123/photos/image_1.jpg"
 * becomes "photos/image_1.jpg".
 * 
 * @param {string} path - The raw path from the ZIP or the HTML.
 * @returns {string} - The normalized path suffix.
 */
export function normalizePath(path) {
  if (!path) return ''
  
  // Normalize slashes
  const cleanPath = path.replace(/\\/g, '/').trim()
  
  // Extract photos/, videos/, or audio/ suffix
  const match = cleanPath.match(/(photos|videos|audio)\/.*$/i)
  if (match) {
    return match[0].toLowerCase()
  }
  
  return cleanPath.toLowerCase()
}

/**
 * Creates a map of original HTML media paths to the actual ZIP entry paths.
 * 
 * @param {Array} messages - List of parsed messages.
 * @param {Array<string>} zipPaths - List of all relative file paths found in the ZIP.
 * @returns {Object} - A mapping of raw mediaPath -> zipPath.
 */
export function matchMediaPaths(messages, zipPaths) {
  const zipPathMap = new Map()
  
  // Index ZIP paths by their normalized suffixes
  zipPaths.forEach((zp) => {
    const norm = normalizePath(zp)
    if (norm) {
      zipPathMap.set(norm, zp)
    }
  })
  
  const pathMatches = {}
  
  messages.forEach((msg) => {
    if (msg.mediaPath && msg.mediaType !== 'link') {
      const normMsgPath = normalizePath(msg.mediaPath)
      
      if (zipPathMap.has(normMsgPath)) {
        pathMatches[msg.mediaPath] = zipPathMap.get(normMsgPath)
      } else {
        // Fallback: match by filename only if suffix matching fails
        const filename = normMsgPath.split('/').pop()
        if (filename) {
          const found = zipPaths.find((zp) => {
            const normZp = normalizePath(zp)
            return normZp.endsWith('/' + filename) || normZp === filename
          })
          if (found) {
            pathMatches[msg.mediaPath] = found
          }
        }
      }
    }
  })
  
  return pathMatches
}
