import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useChatStore } from '../store/chatStore'
import { getMediaItem } from '../lib/storage'
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch'

const ZoomControls = () => {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  return (
    <div className="absolute bottom-4 right-4 flex gap-2 z-10">
      <button 
        onClick={() => zoomOut()} 
        className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors border border-white/10"
        title="Zoom Out"
      >
        <span className="text-xl leading-none -mt-0.5">−</span>
      </button>
      <button 
        onClick={() => resetTransform()} 
        className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors border border-white/10 text-xs font-bold"
        title="Reset Zoom"
      >
        1x
      </button>
      <button 
        onClick={() => zoomIn()} 
        className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors border border-white/10"
        title="Zoom In"
      >
        <span className="text-xl leading-none -mt-0.5">+</span>
      </button>
    </div>
  )
}

export default function MediaLightbox() {
  const item = useChatStore((state) => state.lightboxItem)
  const closeLightbox = useChatStore((state) => state.closeLightbox)
  const openLightbox = useChatStore((state) => state.openLightbox)
  
  const activeId = useChatStore((state) => state.activeConversationId)
  const activeConversation = useChatStore((state) => activeId ? state.conversations[activeId] : null)

  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const revokeRef = useRef(null)

  // ── Compute Gallery Context for Prev/Next ─────────────────────────────────
  const mediaMsgs = useMemo(() => {
    if (!activeConversation) return []
    return activeConversation.messages.filter(
      (m) => m.mediaType === 'photo' || m.mediaType === 'video' || m.mediaType === 'gif'
    )
  }, [activeConversation])

  const currentIndex = useMemo(() => {
    if (!item || mediaMsgs.length === 0) return -1
    return mediaMsgs.findIndex((m) => m.id === item.id)
  }, [item, mediaMsgs])

  const handlePrev = (e) => {
    if (e) e.stopPropagation()
    if (currentIndex > 0) openLightbox(mediaMsgs[currentIndex - 1])
  }

  const handleNext = (e) => {
    if (e) e.stopPropagation()
    if (currentIndex !== -1 && currentIndex < mediaMsgs.length - 1) {
      openLightbox(mediaMsgs[currentIndex + 1])
    }
  }

  // ── Keyboard Navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox()
      else if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowRight') handleNext()
    }
    if (item) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [item, closeLightbox, currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy Load Media Blob ──────────────────────────────────────────────────
  useEffect(() => {
    if (!item || !item.mediaUri) return

    let cancelled = false
    setLoading(true)
    setError(false)

    // Revoke previous blob if changing item without closing
    if (revokeRef.current) {
      URL.revokeObjectURL(revokeRef.current)
      revokeRef.current = null
      setBlobUrl(null)
    }

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

  const hasPrev = currentIndex > 0
  const hasNext = currentIndex !== -1 && currentIndex < mediaMsgs.length - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={closeLightbox}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-900 hover:bg-neutral-800 text-white transition-colors border border-white/10"
          >
            ✕
          </button>
          
          <div className="flex flex-col text-white drop-shadow-md">
            <span className="font-bold text-sm tracking-wide">{sender}</span>
            {formattedTime && (
              <span className="text-[11px] text-neutral-300 font-medium tracking-wide">
                {formattedTime}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          {blobUrl && (
            <a 
              href={blobUrl}
              download={filename}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-full transition-colors flex items-center gap-2 border border-white/10"
            >
              <span>↓</span> Download
            </a>
          )}
        </div>
      </div>

      {/* ── Media Container with Zoom/Pan ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center relative select-none">
        
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 gap-3 z-10">
            <div className="w-8 h-8 border-2 border-neutral-600 border-t-neutral-300 rounded-full animate-spin"></div>
            <span className="text-xs font-semibold tracking-widest uppercase">Loading media</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-neutral-500 gap-2 z-10">
            <span className="text-4xl">⚠️</span>
            <span className="text-sm font-semibold">Media unavailable</span>
          </div>
        )}

        {blobUrl && !error && (
          <div className="w-full h-full relative group">
            {mediaType === 'video' ? (
              // Videos don't usually need pan/zoom as much, and native controls interfere
              <div 
                className="w-full h-full flex items-center justify-center p-12"
                onClick={closeLightbox}
              >
                <video 
                  src={blobUrl} 
                  controls 
                  autoPlay
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-black" 
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ) : (
              // Photos and GIFs get full zoom/pan capabilities
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
                doubleClick={{ step: 1 }}
              >
                <ZoomControls />
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                  <img 
                    src={blobUrl} 
                    alt="Lightbox media" 
                    className="max-w-full max-h-full object-contain"
                    style={{ maxHeight: '100vh' }}
                  />
                </TransformComponent>
              </TransformWrapper>
            )}
          </div>
        )}

        {/* ── Navigation Arrows ──────────────────────────────────────────────── */}
        {hasPrev && (
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/10 z-20 group"
            title="Previous (Left Arrow)"
          >
            <span className="text-2xl -ml-1 opacity-70 group-hover:opacity-100 transition-opacity">‹</span>
          </button>
        )}

        {hasNext && (
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all border border-white/10 z-20 group"
            title="Next (Right Arrow)"
          >
            <span className="text-2xl -mr-1 opacity-70 group-hover:opacity-100 transition-opacity">›</span>
          </button>
        )}
      </div>

      {/* ── Bottom Text Overlay ────────────────────────────────────────────── */}
      {text && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex justify-center z-20 pointer-events-none">
          <p className="max-w-3xl text-white text-[15px] leading-relaxed text-center break-words pointer-events-auto px-16">
            {text}
          </p>
        </div>
      )}

    </div>
  )
}
