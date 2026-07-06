import React, { useState, useEffect, useRef } from 'react'
import { getMediaItem } from '../lib/storage'
import { useChatStore } from '../store/chatStore'

/**
 * Renders a single Instagram DM message bubble.
 *
 * Media (photos, videos, audio) is loaded lazily from IndexedDB on mount
 * using getMediaItem(mediaUri). This means the component works identically
 * on first load, page refresh, and in all deployment environments —
 * there is no dependency on pre-computed blob URLs in message state.
 */
export default function MessageBubble({ message, isMe, isFirst, isLast, showSenderName }) {
  const { sender, timestamp, text, mediaType, mediaUri, reactions } = message
  const openLightbox = useChatStore((state) => state.openLightbox)

  // ── Lazy media loading ────────────────────────────────────────────────────
  // blobUrl is created fresh from IndexedDB each time the component mounts.
  // We revoke it on unmount to avoid memory leaks.
  const [blobUrl, setBlobUrl]     = useState(null)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [imgError, setImgError]   = useState(false)
  const revokeRef                 = useRef(null)

  useEffect(() => {
    if (!mediaUri || mediaType === 'text' || mediaType === 'link') return

    let cancelled = false
    setMediaLoading(true)
    setImgError(false)

    getMediaItem(mediaUri).then((blob) => {
      if (cancelled) return
      if (blob) {
        const url = URL.createObjectURL(blob)
        revokeRef.current = url
        setBlobUrl(url)
      }
      setMediaLoading(false)
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

  // ── Timestamp ─────────────────────────────────────────────────────────────
  const [showTime, setShowTime] = useState(false)

  const formattedTime = (() => {
    try {
      return new Date(timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      })
    } catch { return '' }
  })()

  // ── Bubble corner radius ──────────────────────────────────────────────────
  const tailRadius = isMe ? 'rounded-br-[5px]' : 'rounded-bl-[5px]'
  const radius     = `rounded-[22px] ${isLast ? tailRadius : ''}`

  // ── Colors ────────────────────────────────────────────────────────────────
  const meColor   = 'bg-gradient-to-br from-[#8338ec] via-[#c850c0] to-[#ffcc70] text-white'
  const themColor = 'bg-[#262626] text-white'

  // ── Media placeholder ─────────────────────────────────────────────────────
  const MediaPlaceholder = ({ icon, label }) => (
    <div className={`flex items-center gap-2.5 px-4 py-3 ${radius} bg-[#262626]`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-[13px] font-semibold text-white">{label}</p>
        {mediaLoading && (
          <p className="text-[10px] text-neutral-500 mt-0.5">Loading…</p>
        )}
      </div>
    </div>
  )

  // ── Content renderer ──────────────────────────────────────────────────────
  const renderContent = () => {
    switch (mediaType) {

      case 'photo':
        if (blobUrl && !imgError) {
          return (
            <div 
              className={`overflow-hidden ${radius} cursor-pointer group/img relative`}
              onClick={() => openLightbox(message)}
            >
              <img
                src={blobUrl}
                alt="Photo"
                onError={() => setImgError(true)}
                className="max-w-[260px] max-h-[320px] object-cover block"
              />
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors"></div>
              {text && (
                <div className={`px-3 py-1.5 text-[13px] text-white ${isMe ? meColor : themColor}`}>
                  {text}
                </div>
              )}
            </div>
          )
        }
        return <MediaPlaceholder icon={imgError ? '🖼️' : '🖼️'} label={imgError ? 'Photo (unavailable)' : 'Photo'} />

      case 'video':
        if (blobUrl) {
          return (
            <div 
              className={`overflow-hidden ${radius} bg-black cursor-pointer group/vid relative`}
              onClick={(e) => {
                // If they click the video player controls, don't open lightbox.
                // But clicking the video generally should open it.
                // It's better to just open it for video clicks and disable pointer events on the video locally,
                // or let them use the lightbox for better viewing.
                e.preventDefault()
                openLightbox(message)
              }}
            >
              <video src={blobUrl} className="max-w-[260px] max-h-[320px] block pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/vid:bg-black/40 transition-colors">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <span className="text-white text-lg ml-1">▶</span>
                </div>
              </div>
            </div>
          )
        }
        return <MediaPlaceholder icon="🎥" label="Video" />

      case 'audio':
        if (blobUrl) {
          return (
            <div className={`px-4 py-3 ${radius} bg-[#262626]`}>
              <audio src={blobUrl} controls className="h-8 max-w-[200px]" />
            </div>
          )
        }
        return <MediaPlaceholder icon="🎙️" label="Voice message" />

      case 'gif':
        if (blobUrl) {
          return (
            <div 
              className={`overflow-hidden ${radius} cursor-pointer`}
              onClick={() => openLightbox(message)}
            >
              <img src={blobUrl} alt="GIF" className="max-w-[260px] block" />
            </div>
          )
        }
        return <MediaPlaceholder icon="🎞️" label="GIF" />

      case 'sticker':
        if (blobUrl) {
          return <img src={blobUrl} alt="Sticker" className="w-20 h-20 object-contain" />
        }
        return <span className="text-4xl">🎭</span>

      case 'link': {
        const displayUrl = (() => {
          try { return new URL(mediaUri).hostname } catch { return mediaUri }
        })()
        return (
          <div className={`bg-[#262626] overflow-hidden max-w-[260px] ${radius}`}>
            <div className="px-3.5 py-3">
              {text && (
                <p className="text-[13px] text-white leading-snug mb-2 break-words">{text}</p>
              )}
              {mediaUri && (
                <a
                  href={mediaUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>🔗</span>
                  <span className="truncate">{displayUrl || mediaUri}</span>
                </a>
              )}
            </div>
          </div>
        )
      }

      default: { // 'text'
        if (!text) return null
        return (
          <div className={`px-[14px] py-[9px] ${radius} ${isMe ? meColor : themColor}`}>
            <p className="text-[14px] whitespace-pre-wrap break-words leading-[1.45] select-text">
              {text}
            </p>
          </div>
        )
      }
    }
  }

  const content = renderContent()
  if (!content) return null

  return (
    <div
      className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'} ${isFirst ? 'mt-3' : 'mt-[2px]'}`}
    >
      {/* Sender label — received, first of a run */}
      {!isMe && showSenderName && isFirst && (
        <span className="text-[11px] font-semibold text-neutral-400 mb-1 ml-8 tracking-wide">
          {sender}
        </span>
      )}

      <div className={`flex items-end gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Mini avatar — last bubble of received run only */}
        {!isMe && (
          <div
            className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center
              text-[9px] font-black bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600
              text-white transition-opacity ${isLast ? 'opacity-100' : 'opacity-0'}`}
          >
            {sender?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        {/* Bubble */}
        <div
          className="relative group cursor-default"
          onClick={() => setShowTime((v) => !v)}
        >
          {content}

          {/* Tap-to-peek timestamp */}
          {showTime && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-medium text-neutral-400
                whitespace-nowrap pointer-events-none px-2
                ${isMe ? 'right-full' : 'left-full'}`}
            >
              {formattedTime}
            </div>
          )}
        </div>
      </div>

      {/* Reactions */}
      {reactions?.length > 0 && (
        <div className={`flex gap-1 mt-0.5 ${isMe ? 'mr-8' : 'ml-8'}`}>
          {reactions.map((r, i) => (
            <span
              key={i}
              title={r.actor}
              className="text-sm bg-[#1a1a1a] border border-[#333] rounded-full px-1.5 py-0.5 leading-none"
            >
              {r.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Persistent timestamp below last bubble of a run */}
      {isLast && (
        <p className={`text-[10px] text-neutral-600 mt-1 px-1 ${isMe ? 'text-right' : 'text-left ml-8'}`}>
          {formattedTime}
        </p>
      )}
    </div>
  )
}
