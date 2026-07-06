import { ZipReader, BlobReader, TextWriter, BlobWriter } from '@zip.js/zip.js'

self.onmessage = async (e) => {
  const { file } = e.data

  if (!file) {
    self.postMessage({ type: 'error', error: 'No file received.' })
    return
  }

  try {
    self.postMessage({ type: 'progress', percent: 0, progressText: 'Reading ZIP structure...' })

    const zipReader = new ZipReader(new BlobReader(file))
    const entries = await zipReader.getEntries()
    const total = entries.length

    if (total === 0) {
      throw new Error('The ZIP archive is empty.')
    }

    let processed = 0
    const jsonFiles = []   // message_N.json files
    const mediaFiles = {}  // zip path → Blob (keyed by exact ZIP path)
    const zipPaths = []

    for (const entry of entries) {
      zipPaths.push(entry.filename)

      if (!entry.directory) {
        const lower = entry.filename.toLowerCase()

        // ── Message JSON files ──────────────────────────────────────────────
        // Real export path: your_instagram_activity/messages/inbox/<thread>/message_N.json
        // Match any .json file inside an "inbox" folder named message*.json
        const isJson = lower.endsWith('.json')
        const isInInbox = lower.includes('/inbox/')
        const isMessageFile = /\/message_?\d*\.json$/.test(lower)

        if (isJson && isInInbox && isMessageFile) {
          const text = await entry.getData(new TextWriter())
          jsonFiles.push({ filename: entry.filename, content: text })
        }

        // ── Media files ─────────────────────────────────────────────────────
        // Instagram stores photos/videos with no extension AND with extension.
        // We collect both and key them by the full ZIP path so the parser can
        // look them up using the uri field from the JSON.
        else if (!isJson) {
          // Check if it's in a known media folder
          const isMediaFolder =
            lower.includes('/photos/') ||
            lower.includes('/videos/') ||
            lower.includes('/audio/')

          // Also check extension (some files do have .jpg etc.)
          const hasMediaExt = /\.(jpg|jpeg|png|gif|mp4|mov|ogg|mp3|wav|m4a|webm)$/i.test(lower)

          if (isMediaFolder || hasMediaExt) {
            // Determine MIME type from extension or folder name
            let mimeType = 'application/octet-stream'
            if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg'
            else if (lower.endsWith('.png'))  mimeType = 'image/png'
            else if (lower.endsWith('.gif'))  mimeType = 'image/gif'
            else if (lower.endsWith('.mp4'))  mimeType = 'video/mp4'
            else if (lower.endsWith('.mov'))  mimeType = 'video/quicktime'
            else if (lower.endsWith('.ogg'))  mimeType = 'audio/ogg'
            else if (lower.endsWith('.mp3'))  mimeType = 'audio/mpeg'
            else if (lower.endsWith('.wav'))  mimeType = 'audio/wav'
            else if (lower.endsWith('.m4a'))  mimeType = 'audio/mp4'
            else if (lower.endsWith('.webm')) mimeType = 'video/webm'
            // Extension-less photos (common in Instagram exports)
            else if (lower.includes('/photos/')) mimeType = 'image/jpeg'
            else if (lower.includes('/videos/')) mimeType = 'video/mp4'
            else if (lower.includes('/audio/'))  mimeType = 'audio/mp4'

            const blob = await entry.getData(new BlobWriter(mimeType))
            // Key by exact ZIP path — this matches what the JSON uri field contains
            mediaFiles[entry.filename] = blob
          }
        }
      }

      processed++

      if (processed % 20 === 0 || processed === total) {
        const percent = Math.round((processed / total) * 100)
        self.postMessage({
          type: 'progress',
          percent,
          progressText: `Extracted ${processed} of ${total} files…`,
        })
      }
    }

    await zipReader.close()

    if (jsonFiles.length === 0) {
      throw new Error(
        'No message JSON files were found in this ZIP.\n\n' +
        'Make sure you downloaded your Instagram data in JSON format:\n' +
        'Instagram → Settings → Your activity → Download your information → Format: JSON'
      )
    }

    self.postMessage({ type: 'done', jsonFiles, zipPaths, mediaFiles })
  } catch (err) {
    self.postMessage({ type: 'error', error: err.message || 'Error extracting ZIP file.' })
  }
}
