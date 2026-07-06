import React, { useState } from 'react'

/**
 * Renders a single message bubble in the exact Instagram DM style.
 *
 * Props:
 *   message        – message object (sender, timestamp, text, mediaType, mediaUri, mediaBlobUrl, reactions)
 *   isMe           – true = right-aligned (you / sender)
 *   isFirst        – first message in a consecutive same-sender run
 *   isLast         – last message in a consecutive same-sender run
 *   showSenderName – render the sender label above (received messages only)
 */
export default function MessageBubble({ message, isMe, isFirst, isLast, showSenderName }) {
  const { sender, timestamp, text, mediaType, mediaUri, mediaBlobUrl, reactions } = message
  const [showTime, setShowTime] = useState(false)
  const [imgError, setImgError] = useState(false)

  // ── Timestamp ─────────────────────────────────────────────────────────────
  const formattedTime = (() => {
    try {
      return new Date(timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    } catch {
      return ''
    }
  })()

  // ── Bubble corner radius ───────────────────────────────────────────────────
  // Instagram: pill shape, with the tail corner (bottom-left or bottom-right)
  // only squared on the LAST bubble of a consecutive run.
  const radius = isMe
    ? `rounded-[22px] ${isLast ? 'rounded-br-[5px]' : ''}`
    : `rounded-[22px] ${isLast ? 'rounded-bl-[5px]' : ''}`

  // ── Colors ────────────────────────────────────────────────────────────────
  const isMedia = mediaType !== 'text'
  const bubbleColor = isMedia
    ? '' // media bubbles are transparent/borderless
    : isMe
      ? 'bg-gradient-to-br from-[#8338ec] via-[#c850c0] to-[#ffcc70] text-white'
      : 'bg-[#262626] text-white'

  // ── Content renderer ──────────────────────────────────────────────────────
  const renderContent = () => {
    switch (mediaType) {
      case 'photo':
        return (
          <div className={`overflow-hidden ${isLast ? (isMe ? 'rounded-[22px] rounded-br-[5px]' : 'rounded-[22px] rounded-bl-[5px]') : 'rounded-[22px]'}`}>
            {mediaBlobUrl && !imgError ? (
              <img
                src={mediaBlobUrl}
                alt="Photo"
                onError={() => setImgError(true)}
                className="max-w-[260px] max-h-[320px] object-cover block"
              />
            ) : (
              <div className="bg-[#262626] px-4 py-3 flex items-center gap-2.5 max-w-[220px]">
                <span className="text-2xl">🖼️</span>
                <div>
                  <p className="text-[13px] font-semibold text-white">Photo</p>
                  {text && <p className="text-[11px] text-neutral-400 mt-0.5">{text}</p>}
                </div>
              </div>
            )}
            {text && mediaBlobUrl && !imgError && (
              <div className={`px-3 py-1.5 text-[13px] text-white ${isMe ? 'bg-gradient-to-br from-[#8338ec] via-[#c850c0] to-[#ffcc70]' : 'bg-[#262626]'}`}>
                {text}
              </div>
            )}
          </div>
        )

      case 'video':
        return (
          <div className={`overflow-hidden ${radius}`}>
            {mediaBlobUrl ? (
              <video
                src={mediaBlobUrl}
                controls
                className="max-w-[260px] max-h-[320px] block bg-black"
              />
            ) : (
              <div className="bg-[#262626] px-4 py-3 flex items-center gap-2.5 max-w-[220px]">
                <span className="text-2xl">🎥</span>
                <p className="text-[13px] font-semibold text-white">Video</p>
              </div>
            )}
          </div>
        )

      case 'audio':
        return (
          <div className={`bg-[#262626] px-4 py-3 flex items-center gap-2.5 max-w-[240px] ${radius}`}>
            {mediaBlobUrl ? (
              <audio src={mediaBlobUrl} controls className="h-8 w-[180px]" />
            ) : (
              <>
                <span className="text-2xl">🎙️</span>
                <p className="text-[13px] font-semibold text-white">Voice message</p>
              </>
            )}
          </div>
        )

      case 'gif':
        return (
          <div className={`overflow-hidden ${radius}`}>
            {mediaBlobUrl ? (
              <img src={mediaBlobUrl} alt="GIF" className="max-w-[260px] block" />
            ) : (
              <div className="bg-[#262626] px-4 py-3 flex items-center gap-2 max-w-[220px]">
                <span className="text-2xl">🎞️</span>
                <p className="text-[13px] font-semibold text-white">GIF</p>
              </div>
            )}
          </div>
        )

      case 'link': {
        const displayUrl = (() => {
          try { return new URL(mediaUri).hostname } catch { return mediaUri }
        })()
        return (
          <div className={`bg-[#262626] overflow-hidden max-w-[260px] ${radius}`}>
            <div className="px-3.5 py-3">
              {text && <p className="text-[13px] text-white leading-snug mb-2">{text}</p>}
              <a
                href={mediaUri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors truncate"
              >
                <span>🔗</span>
                <span className="truncate">{displayUrl || mediaUri}</span>
              </a>
            </div>
          </div>
        )
      }

      case 'sticker':
        return (
          <div>
            {mediaBlobUrl ? (
              <img src={mediaBlobUrl} alt="Sticker" className="w-20 h-20 object-contain" />
            ) : (
              <span className="text-3xl">🎭</span>
            )}
          </div>
        )

      default: // 'text'
        if (!text) return null
        return (
          <div className={`px-[14px] py-[9px] ${radius} ${bubbleColor}`}>
            <p className="text-[14px] whitespace-pre-wrap break-words leading-[1.45] select-text">
              {text}
            </p>
          </div>
        )
    }
  }

  const content = renderContent()
  if (!content) return null  // skip completely empty messages

  return (
    <div className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'} ${isFirst ? 'mt-3' : 'mt-[2px]'}`}>
      {/* Sender label — received messages, first of a run */}
      {!isMe && showSenderName && isFirst && (
        <span className="text-[11px] font-semibold text-neutral-400 mb-1 ml-8 tracking-wide">
          {sender}
        </span>
      )}

      <div className={`flex items-end gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Mini avatar — shown only on last bubble of received run */}
        {!isMe && (
          <div
            className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-[9px] font-black
              bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white
              ${isLast ? 'opacity-100' : 'opacity-0'}`}
          >
            {sender?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        {/* The bubble / media content */}
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
      {reactions && reactions.length > 0 && (
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

      {/* Always-visible timestamp below last bubble of a run */}
      {isLast && (
        <p className={`text-[10px] text-neutral-600 mt-1 px-1 ${isMe ? 'text-right' : 'text-left ml-8'}`}>
          {formattedTime}
        </p>
      )}
    </div>
  )
}
