import React, { useState, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import { startZipExtraction } from '../lib/zipExtractor'
import { processInstagramExport, resolveMediaBlobs } from '../lib/jsonParser'
import { saveSession } from '../lib/storage'
import ProgressBar from './ProgressBar'

export default function UploadScreen() {
  const loading = useChatStore((state) => state.loading)
  const progress = useChatStore((state) => state.progress)
  const progressText = useChatStore((state) => state.progressText)
  const setLoading = useChatStore((state) => state.setLoading)
  const setProgress = useChatStore((state) => state.setProgress)
  const setConversations = useChatStore((state) => state.setConversations)
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId)

  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const processZipFile = (file) => {
    if (!file) return

    if (!file.name.endsWith('.zip')) {
      alert('Invalid file format. Please select your Instagram export ZIP file (downloaded in JSON format).')
      return
    }

    setLoading(true)
    setProgress(0, 'Initializing ZIP stream reader...')

    const onProgress = (percent, text) => {
      setProgress(percent, text)
    }

    const onDone = async ({ jsonFiles, zipPaths, mediaFiles }) => {
      try {
        setProgress(80, 'Analyzing conversation structures...')

        if (!jsonFiles || jsonFiles.length === 0) {
          throw new Error(
            'No message JSON files were found.\n\n' +
            'Make sure you downloaded your Instagram data in JSON format:\n' +
            'Instagram → Settings → Your activity → Download your information → Format: JSON'
          )
        }

        // Parse all conversations from JSON files
        const conversations = processInstagramExport(jsonFiles)
        const convoIds = Object.keys(conversations)

        if (convoIds.length === 0) {
          throw new Error('No valid conversations could be extracted. Check that the ZIP contains inbox/ message files.')
        }

        // Resolve media Blobs into message objects using exact ZIP URI paths
        setProgress(90, 'Resolving media attachments...')
        const allMessages = Object.values(conversations).flatMap((c) => c.messages)
        resolveMediaBlobs(allMessages, mediaFiles)

        // Default to the conversation with the most recent message
        const sortedConvoIds = [...convoIds].sort((a, b) => {
          const ta = conversations[a].lastMessage?.timestampMs ?? 0
          const tb = conversations[b].lastMessage?.timestampMs ?? 0
          return tb - ta
        })
        const defaultConvoId = sortedConvoIds[0]

        // Persist to IndexedDB (media Blobs are keyed by their ZIP path)
        setProgress(95, 'Saving session cache...')
        await saveSession(conversations, defaultConvoId, mediaFiles)

        // Hydrate Zustand store
        setConversations(conversations)
        if (defaultConvoId) setActiveConversationId(defaultConvoId)
        setLoading(false)
      } catch (err) {
        console.error(err)
        alert(`Failed to parse your Instagram export:\n\n${err.message}`)
        setLoading(false)
      }
    }

    const onError = (errorMessage) => {
      alert(`Extraction failed: ${errorMessage}`)
      setLoading(false)
    }

    // Spawn extraction worker
    startZipExtraction(file, onProgress, onDone, onError)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    processZipFile(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    processZipFile(file)
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] relative overflow-hidden font-sans">
      {/* Decorative Radial Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-pink-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full bg-orange-950/10 blur-[100px] pointer-events-none" />

      {/* Upload Box Container */}
      <div className="w-full max-w-lg px-6 relative z-10">
        <div className="text-center mb-8">
          {/* Logo Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 p-[3px] flex items-center justify-center shadow-lg shadow-pink-500/20 animate-bounce-slow">
            <div className="w-full h-full rounded-[21px] bg-black flex items-center justify-center">
              <span className="text-2xl">📸</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Instamp
          </h1>
          <p className="text-xs font-semibold text-neutral-400 max-w-sm mx-auto leading-relaxed">
            Privacy-first Instagram chat viewer. Everything runs entirely in your browser. No files are sent to any server.
          </p>
        </div>

        {/* Glassmorphic Upload Card */}
        <div className="bg-neutral-900/60 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-2xl">
          {!loading ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px]
                ${isDragOver 
                  ? 'border-pink-500 bg-pink-500/5 shadow-[0_0_15px_rgba(236,72,153,0.15)] scale-[1.01]' 
                  : 'border-white/10 hover:border-white/20 hover:bg-white/2'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <div className="w-12 h-12 mb-3 rounded-full bg-neutral-800/80 flex items-center justify-center border border-white/5 text-xl">
                📥
              </div>
              
              <h3 className="text-sm font-bold text-white mb-1">
                Upload your Instagram export ZIP
              </h3>
              
              <p className="text-[11px] font-semibold text-neutral-400 max-w-[280px] leading-normal">
                Drag & drop your ZIP here, or click to browse.<br />
                <span className="text-neutral-600">Export from Instagram → Settings → Your activity → Download your information → <strong className="text-neutral-400">JSON format</strong></span>
              </p>
              
              <div className="mt-4 px-3 py-1 bg-white/5 rounded-full border border-white/5 text-[9px] font-bold tracking-wider uppercase text-neutral-500">
                JSON format · ZIP files only
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6">
              <div className="w-10 h-10 border-4 border-t-purple-500 border-r-pink-500 border-b-transparent border-l-transparent rounded-full animate-spin mb-4" />
              <ProgressBar progress={progress} text={progressText} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
