/**
 * Spawns the ZIP extraction Web Worker and monitors its progress.
 * 
 * @param {File} file - The ZIP file object uploaded by the user.
 * @param {Function} onProgress - Callback for progress updates: (percent, text) => {}
 * @param {Function} onDone - Callback for successful completion: (data) => {}
 * @param {Function} onError - Callback for errors: (errorText) => {}
 * @returns {Function} - Cancel function to terminate the worker prematurely.
 */
export function startZipExtraction(file, onProgress, onDone, onError) {
  // Use Vite's native URL constructor for importing worker files
  const worker = new Worker(
    new URL('../workers/extract.worker.js', import.meta.url),
    { type: 'module' }
  )

  worker.onmessage = (e) => {
    const { type, percent, progressText, jsonFiles, zipPaths, mediaFiles, error } = e.data
    
    if (type === 'progress') {
      onProgress(percent, progressText)
    } else if (type === 'done') {
      onDone({ jsonFiles, zipPaths, mediaFiles })
      worker.terminate()
    } else if (type === 'error') {
      onError(error)
      worker.terminate()
    }
  }

  worker.onerror = (err) => {
    console.error('Worker error:', err)
    onError('Worker failed to run. Make sure your browser supports modern Web Workers.')
    worker.terminate()
  }

  // Send the File object to the worker
  worker.postMessage({ file })

  // Return a cancellation hook
  return () => {
    worker.terminate()
  }
}
