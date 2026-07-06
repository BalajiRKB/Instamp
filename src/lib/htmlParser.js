/**
 * Parses a single Instagram export message HTML file.
 * Handles multiple export formats (old _3-* classes, new _a6-* classes, plain divs).
 *
 * @param {string} htmlContent - The raw HTML string.
 * @returns {{ conversationName: string, participants: string[], messages: Array }}
 */
export function parseMessagesHTML(htmlContent) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')

  // ── Conversation title ──────────────────────────────────────────────────────
  let conversationName = ''
  const titleEl = doc.querySelector('title')
  if (titleEl) {
    conversationName = titleEl.textContent
      .replace(/Instagram Messages/gi, '')
      .replace(/Chat with/gi, '')
      .replace(/Conversation with/gi, '')
      .trim()
  }

  // ── Participants block (appears at top of file) ─────────────────────────────
  // Instagram HTML exports list participants in a dedicated section
  const participants = []
  const participantEls = doc.querySelectorAll(
    '._a6-p, ._a6-q, ._2lek, ._2lel, ._3-96 ._2pio'
  )
  participantEls.forEach((el) => {
    const name = el.textContent.trim()
    if (name && !participants.includes(name)) participants.push(name)
  })

  // ── Message containers ──────────────────────────────────────────────────────
  // Try multiple selector strategies across export format versions
  let containers = Array.from(doc.querySelectorAll('div._a6-g'))
  if (containers.length === 0) {
    containers = Array.from(doc.querySelectorAll('div._3-95'))
  }
  if (containers.length === 0) {
    // Fallback: every top-level div.pam block
    containers = Array.from(doc.querySelectorAll('div.pam'))
  }

  const messages = []

  containers.forEach((container, idx) => {
    // ── 1. Sender name ─────────────────────────────────────────────────────────
    let sender = ''
    const senderEl =
      container.querySelector('._a6-h') ||
      container.querySelector('._2pio') ||
      container.querySelector('._2lek') ||
      container.querySelector('._2lel')

    if (senderEl) {
      sender = senderEl.textContent.trim()
    } else {
      // Fallback: first non-empty leaf div that is not the timestamp
      const firstDiv = container.querySelector('div')
      if (firstDiv) sender = firstDiv.textContent.trim()
    }

    if (!sender) return // skip containers without a sender

    // ── 2. Timestamp ──────────────────────────────────────────────────────────
    let timestampStr = ''
    const timeEl =
      container.querySelector('._a6-o') ||
      container.querySelector('._2lem') ||
      container.querySelector('._3-94')

    if (timeEl) {
      timestampStr = timeEl.textContent.trim()
    } else {
      // Walk divs from the bottom looking for a date-ish string
      const allDivs = Array.from(container.querySelectorAll('div'))
      for (let i = allDivs.length - 1; i >= 0; i--) {
        const t = allDivs[i].textContent.trim()
        // Match strings that look like dates/times
        if (t && /\d{4}/.test(t) && (t.includes(',') || t.includes('-') || /\d:\d\d/.test(t))) {
          timestampStr = t
          break
        }
      }
    }

    // ── 3. Normalize timestamp to ISO (with seconds preserved) ─────────────────
    let timestamp = null

    if (timestampStr) {
      // Remove directional marks and normalize whitespace
      const cleaned = timestampStr
        .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      // Try direct parse first
      let parsed = new Date(cleaned)
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed.toISOString()
      } else {
        // Try without timezone abbreviations
        const withoutTZ = cleaned.replace(/\s*(UTC|GMT|[A-Z]{2,4})$/i, '').trim()
        parsed = new Date(withoutTZ)
        if (!isNaN(parsed.getTime())) {
          timestamp = parsed.toISOString()
        }
      }
    }

    // If we still couldn't parse, skip this message (don't fabricate a time)
    if (!timestamp) return

    // ── 4. Content: text, media ───────────────────────────────────────────────
    let text = ''
    let mediaType = 'text'
    let mediaPath = null

    const img = container.querySelector('img')
    if (img) {
      mediaType = 'photo'
      mediaPath = img.getAttribute('src')
      text = img.getAttribute('alt') || ''
    }

    const video = container.querySelector('video source, video')
    if (video) {
      mediaType = 'video'
      mediaPath = video.getAttribute('src')
    }

    const audio = container.querySelector('audio source, audio')
    if (audio) {
      mediaType = 'audio'
      mediaPath = audio.getAttribute('src')
    }

    // Links / attachment references
    const anchors = Array.from(container.querySelectorAll('a'))
    for (const a of anchors) {
      const href = a.getAttribute('href')
      if (!href) continue
      if (href.startsWith('http://') || href.startsWith('https://')) {
        if (mediaType === 'text') {
          mediaType = 'link'
          mediaPath = href
          text = a.textContent.trim() || href
        }
      } else if (mediaType === 'text') {
        if (href.includes('/photos/') || href.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          mediaType = 'photo'
        } else if (href.includes('/videos/') || href.match(/\.(mp4|mov|webm)$/i)) {
          mediaType = 'video'
        } else if (href.includes('/audio/') || href.match(/\.(mp3|ogg|wav|m4a)$/i)) {
          mediaType = 'audio'
        }
        mediaPath = href
      }
    }

    // Extract text body for text messages
    if (mediaType === 'text') {
      const textEl =
        container.querySelector('._a6-p') ||
        container.querySelector('._2let')

      if (textEl) {
        text = textEl.textContent.trim()
      } else {
        // Collect leaf-text divs excluding sender/timestamp strings
        const divs = Array.from(container.querySelectorAll('div'))
        const parts = []
        divs.forEach((d) => {
          if (d.querySelector('div')) return // skip parent divs
          const t = d.textContent.trim()
          if (t && t !== sender && t !== timestampStr) parts.push(t)
        })
        text = parts.join('\n').trim()
      }
    }

    const id = `${sender}__${timestamp}__${idx}`
    messages.push({ id, sender, timestamp, text, mediaType, mediaPath })
  })

  return { conversationName, participants, messages }
}

/**
 * Merges multiple message arrays, deduplicates, and sorts chronologically.
 *
 * @param {Array<Array>} messageArrays
 * @returns {Array}
 */
export function mergeAndSortMessages(messageArrays) {
  const combined = messageArrays.flat()
  const seen = new Map()

  combined.forEach((msg) => {
    // Key on sender + exact ISO timestamp + text snippet to dedupe paginated files
    const key = `${msg.sender}||${msg.timestamp}||${(msg.text || '').substring(0, 80)}||${msg.mediaPath || ''}`
    if (!seen.has(key)) seen.set(key, msg)
  })

  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

/**
 * Groups HTML files by conversation directory, parses and merges each group.
 *
 * @param {Array<{filename: string, content: string}>} htmlFiles
 * @returns {Object} Map of convoId → conversation object
 */
export function processInstagramExport(htmlFiles) {
  const groups = {}

  htmlFiles.forEach((file) => {
    const parts = file.filename.replace(/\\/g, '/').split('/')
    const inboxIdx = parts.findIndex((p) => p.toLowerCase() === 'inbox')
    let convoId

    if (inboxIdx !== -1 && parts[inboxIdx + 1]) {
      convoId = parts[inboxIdx + 1]
    } else {
      // Use the parent directory as fallback
      convoId = parts.length >= 2 ? parts[parts.length - 2] : 'unknown'
    }

    if (!groups[convoId]) groups[convoId] = []
    groups[convoId].push(file)
  })

  const conversations = {}

  Object.keys(groups).forEach((convoId) => {
    const files = groups[convoId]
    const parsedLists = []
    let resolvedName = ''
    const allParticipants = new Set()

    files.forEach((file) => {
      const { conversationName, participants, messages } = parseMessagesHTML(file.content)
      parsedLists.push(messages)
      if (conversationName && !resolvedName) resolvedName = conversationName
      participants.forEach((p) => allParticipants.add(p))
    })

    const mergedMessages = mergeAndSortMessages(parsedLists)
    if (mergedMessages.length === 0) return

    // Collect senders from actual messages (most reliable)
    const sendersFromMessages = new Set()
    mergedMessages.forEach((m) => { if (m.sender) sendersFromMessages.add(m.sender) })

    // Merge participant declarations + message senders
    const combinedSenders = new Set([...allParticipants, ...sendersFromMessages])

    // Build a display name from the folder slug if the title is generic
    let name = resolvedName
    if (!name || /^(inbox|messages|conversation)$/i.test(name.trim())) {
      // Instagram folder names are like "firstname_lastname_12345abc"
      // Strip the trailing hash suffix
      name = convoId
        .replace(/_[a-z0-9]{10,}$/i, '') // remove trailing hash
        .replace(/_/g, ' ')              // underscores → spaces
        .replace(/\b\w/g, (c) => c.toUpperCase()) // Title Case
        .trim()
    }

    const lastMessage = mergedMessages[mergedMessages.length - 1]

    conversations[convoId] = {
      id: convoId,
      name: name || convoId,
      messages: mergedMessages,
      senders: Array.from(combinedSenders).sort(),
      lastMessage
    }
  })

  return conversations
}
