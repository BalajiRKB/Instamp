import React, { useState, useEffect, useRef } from 'react'
import { getMediaItem } from '../lib/storage'
import { useChatStore } from '../store/chatStore'

export default function GalleryItem({ message }) {
  const { mediaType, mediaUri, text } = message
  const openLightbox = useChatStore((state) => state.openLightbox)
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const revokeRef = useRef(null)

  useEffect(() => {
    if (!mediaUri || mediaType === 'text' || mediaType === 'link') return

    let cancelled = false
    setLoading(true)
    setError(false)

    getMediaItem(mediaUri).then((blob) => {
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
  }, [mediaUri, mediaType])

  if (mediaType === 'photo' || mediaType === 'gif') {
    return (
      <div 
        className="w-full aspect-square bg-neutral-900 border border-neutral-800 relative group overflow-hidden cursor-pointer"
        onClick={() => openLightbox(message)}
      >
        {blobUrl && !error ? (
          <img src={blobUrl} alt="Gallery item" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl text-neutral-600">{error ? '⚠️' : '🖼️'}</span>
          </div>
        )}
      </div>
    )
  }

  if (mediaType === 'video') {
    return (
      <div 
        className="w-full aspect-square bg-neutral-900 border border-neutral-800 relative group overflow-hidden cursor-pointer"
        onClick={() => openLightbox(message)}
      >
        {blobUrl && !error ? (
          <>
            <video src={blobUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute top-1.5 right-1.5 text-xs text-white bg-black/50 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold">
              <span className="text-[10px]">▶</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl text-neutral-600">🎥</span>
          </div>
        )}
      </div>
    )
  }

  if (mediaType === 'audio') {
    return (
      <div className="w-full flex items-center p-3 bg-neutral-900 rounded-xl mb-2 border border-neutral-800">
        <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mr-3 text-xl">
          🎙️
        </div>
        <div className="flex-1">
          <p className="text-xs text-neutral-400 font-semibold mb-1">Voice Message</p>
          {blobUrl ? (
            <audio src={blobUrl} controls className="h-7 w-full max-w-[200px]" />
          ) : (
            <p className="text-[11px] text-neutral-600">{loading ? 'Loading...' : 'Unavailable'}</p>
          )}
        </div>
      </div>
    )
  }

  if (mediaType === 'link') {
    const displayUrl = (() => {
      try { return new URL(mediaUri).hostname } catch { return mediaUri }
    })()
    
    return (
      <a 
        href={mediaUri} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block p-3 bg-neutral-900 hover:bg-neutral-800 transition-colors rounded-xl mb-2 border border-neutral-800"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl shrink-0">
            🔗
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium mb-1 truncate">{text || displayUrl}</p>
            <p className="text-[11px] text-blue-400 truncate">{displayUrl}</p>
          </div>
        </div>
      </a>
    )
  }

  return null
}
