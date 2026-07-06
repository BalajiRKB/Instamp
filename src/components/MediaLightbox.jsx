import React, { useState, useEffect, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import { getMediaItem } from '../lib/storage'

export default function MediaLightbox() {
  const item = useChatStore((state) => state.lightboxItem)
  const closeLightbox = useChatStore((state) => state.closeLightbox)
  
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const revokeRef = useRef(null)

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox()
    }
    if (item) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [item, closeLightbox])

  // Lazy load the blob url
  useEffect(() => {
    if (!item || !item.mediaUri) return

    let cancelled = false
    setLoading(true)
    setError(false)

    getMediaItem(item.mediaUri).then((blob) => {
      if (cancelled) return
      if (blob) {
        const url = URL.createObjectURL(blob)
        revokeRef.current = url
        setBlobUrl(url)
      } else {
        setError(true)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current)
        revokeRef.current = null
      }
      setBlobUrl(null)
    }
  }, [item])

  if (!item) return null

  const { mediaType, sender, timestamp, text, mediaUri } = item
  
  const formattedTime = timestamp ? new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : ''
  
  const filename = mediaUri.split('/').pop() || 'download'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button 
            onClick={closeLightbox}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-900 hover:bg-neutral-800 text-white transition-colors"
          >
            ✕
          </button>
          
          <div className="flex flex-col text-white">
            <span className="font-bold text-sm tracking-wide">{sender}</span>
            {formattedTime && (
              <span className="text-[11px] text-neutral-400 font-medium tracking-wide">
                {formattedTime}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {blobUrl && (
            <a 
              href={blobUrl}
              download={filename}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-full transition-colors flex items-center gap-2"
            >
              <span>↓</span> Download
            </a>
          )}
        </div>
      </div>

      {/* ── Media Container ────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0 relative" onClick={closeLightbox}>
        
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 gap-3">
            <div className="w-8 h-8 border-2 border-neutral-600 border-t-neutral-300 rounded-full animate-spin"></div>
            <span className="text-xs font-semibold tracking-widest uppercase">Loading media</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-neutral-500 gap-2">
            <span className="text-4xl">⚠️</span>
            <span className="text-sm font-semibold">Media unavailable</span>
          </div>
        )}

        {blobUrl && !error && (
          <div 
            className="w-full h-full flex items-center justify-center" 
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking the media itself
          >
            {(mediaType === 'photo' || mediaType === 'gif') && (
              <img 
                src={blobUrl} 
                alt="Lightbox media" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
              />
            )}
            
            {mediaType === 'video' && (
              <video 
                src={blobUrl} 
                controls 
                autoPlay
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-black" 
              />
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Text Overlay ────────────────────────────────────────────── */}
      {text && (
        <div className="p-6 bg-gradient-to-t from-black/90 to-transparent flex justify-center">
          <p className="max-w-3xl text-white text-[15px] leading-relaxed text-center break-words">
            {text}
          </p>
        </div>
      )}

    </div>
  )
}
