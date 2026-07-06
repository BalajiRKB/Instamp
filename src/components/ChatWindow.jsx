import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react'
import { useChatStore } from '../store/chatStore'
import MessageBubble from './MessageBubble'
import DateSeparator from './DateSeparator'

export default function ChatWindow() {
  const activeId = useChatStore((state) => state.activeConversationId)

  const activeConversation = useChatStore((state) =>
    activeId ? state.conversations[activeId] : null
  )

  const senders = useMemo(
    () => (activeConversation ? activeConversation.senders : []),
    [activeConversation]
  )
  const messages = useMemo(
    () => (activeConversation ? activeConversation.messages : []),
    [activeConversation]
  )
  const conversationName = activeConversation?.name ?? ''

  const filters = useChatStore((state) => state.filters)
  const setFilters = useChatStore((state) => state.setFilters)
  const resetFilters = useChatStore((state) => state.resetFilters)

  // ── "Me" detection ──────────────────────────────────────────────────────────
  // The user picks which side is "them" — default is the person with FEWER
  // messages (i.e. the other person). The account owner typically sends more.
  const [currentUser, setCurrentUser] = useState('')

  useEffect(() => {
    if (!activeConversation || messages.length === 0) {
      setCurrentUser('')
      return
    }
    // Count messages per sender
    const counts = {}
    messages.forEach((m) => { counts[m.sender] = (counts[m.sender] || 0) + 1 })
    // The person who sent THE MOST messages is most likely the account owner
    const topSender = Object.keys(counts).reduce((a, b) =>
      counts[a] >= counts[b] ? a : b
    )
    setCurrentUser(topSender)
  }, [activeConversation]) // eslint-disable-line react-hooks/exhaustive-deps

  const feedRef = useRef(null)

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredMessages = useMemo(() => {
    if (messages.length === 0) return []
    const { search, sender, mediaType, dateFrom, dateTo } = filters
    if (!search && !sender && !mediaType && !dateFrom && !dateTo) return messages

    const searchLower = search?.toLowerCase().trim() ?? ''
    return messages.filter((msg) => {
      if (searchLower && !msg.text?.toLowerCase().includes(searchLower)) return false
      if (sender && msg.sender !== sender) return false
      if (mediaType && msg.mediaType !== mediaType) return false
      if (dateFrom || dateTo) {
        const t = new Date(msg.timestamp).getTime()
        if (dateFrom && t < new Date(dateFrom).getTime()) return false
        if (dateTo) {
          const end = new Date(dateTo); end.setHours(23, 59, 59, 999)
          if (t > end.getTime()) return false
        }
      }
      return true
    })
  }, [messages, filters])

  // ── Pagination & Scroll ───────────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(100)
  const prevHeightRef = useRef(0)

  // Reset pagination when active chat or filters change
  useEffect(() => {
    setVisibleCount(100)
    prevHeightRef.current = 0
  }, [activeId, filters])

  const displayedMessages = useMemo(() => {
    return filteredMessages.slice(Math.max(0, filteredMessages.length - visibleCount))
  }, [filteredMessages, visibleCount])

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && visibleCount < filteredMessages.length) {
      // Reached top — load more messages
      prevHeightRef.current = e.target.scrollHeight
      setVisibleCount((prev) => Math.min(prev + 100, filteredMessages.length))
    }
  }

  useLayoutEffect(() => {
    if (feedRef.current) {
      if (prevHeightRef.current > 0) {
        // Adjust scroll to maintain position after loading older messages
        feedRef.current.scrollTop = feedRef.current.scrollHeight - prevHeightRef.current
        prevHeightRef.current = 0
      } else {
        // New chat or filter change: snap to bottom
        feedRef.current.scrollTop = feedRef.current.scrollHeight
      }
    }
  }, [displayedMessages])

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black p-10 select-none">
        <div className="w-20 h-20 rounded-full border-[2px] border-neutral-700 flex items-center justify-center text-4xl mb-5">
          ✈️
        </div>
        <h2 className="text-sm font-bold text-white tracking-tight mb-1.5">
          Your Messages
        </h2>
        <p className="text-xs text-neutral-500 max-w-[220px] text-center leading-relaxed">
          Select a conversation from the sidebar to view your Instagram DMs.
        </p>
      </div>
    )
  }

  // ── Group messages by calendar day ─────────────────────────────────────────
  // Group by local date string (YYYY-MM-DD) so messages appear under the right day header
  const groupedByDate = useMemo(() => {
    const map = {}
    displayedMessages.forEach((msg) => {
      const d = new Date(msg.timestamp)
      // Use local date parts to avoid UTC-offset confusion
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(msg)
    })
    return map
  }, [displayedMessages])

  const sortedDates = useMemo(() => Object.keys(groupedByDate).sort(), [groupedByDate])

  return (
    <div className="flex-1 flex flex-col h-full bg-black">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex flex-col border-b border-neutral-900 px-4 py-3 bg-black sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] flex-shrink-0">
              <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-[11px] font-black text-white">
                {conversationName?.[0]?.toUpperCase() ?? 'D'}
              </div>
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-white tracking-tight leading-none mb-0.5">
                {conversationName}
              </h2>
              <p className="text-[10px] text-neutral-500">
                {messages.length.toLocaleString()} messages
              </p>
            </div>
          </div>

          {/* "I am" selector */}
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-full">
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">I am</span>
            <select
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
              className="text-[11px] font-semibold text-white bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {senders.map((s) => (
                <option key={s} value={s} className="bg-neutral-900">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search messages..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full text-[11px] bg-neutral-900 border border-neutral-800 px-3.5 py-2 rounded-xl focus:outline-none text-white placeholder:text-neutral-600"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={filters.sender}
            onChange={(e) => setFilters({ sender: e.target.value })}
            className="text-[11px] bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-xl focus:outline-none cursor-pointer text-white"
          >
            <option value="" className="bg-neutral-900">All</option>
            {senders.map((s) => (
              <option key={s} value={s} className="bg-neutral-900">{s}</option>
            ))}
          </select>

          <span className="text-[10px] font-semibold text-neutral-500 whitespace-nowrap">
            {filteredMessages.length} shown
          </span>

          {(filters.search || filters.sender) && (
            <button
              onClick={resetFilters}
              className="text-[10px] font-black text-pink-500 hover:text-pink-400 uppercase tracking-wider whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </header>

      {/* ── Message Feed ───────────────────────────────────────────────────── */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col"
        style={{ background: '#000' }}
      >
        {visibleCount < filteredMessages.length && (
          <div className="text-center py-2">
            <div className="inline-block w-4 h-4 border-2 border-neutral-600 border-t-neutral-300 rounded-full animate-spin"></div>
          </div>
        )}
        {filteredMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 py-10 gap-2">
            <span className="text-3xl">🔍</span>
            <span className="text-xs font-semibold">No messages match your filter.</span>
          </div>
        ) : (
          sortedDates.map((dateStr) => {
            const dayMessages = groupedByDate[dateStr]
            return (
              <div key={dateStr}>
                <DateSeparator dateString={dateStr} />
                {dayMessages.map((msg, i, arr) => {
                  const isMe = msg.sender === currentUser
                  // Consecutive run detection
                  const prevMsg = arr[i - 1]
                  const nextMsg = arr[i + 1]
                  const isFirst = !prevMsg || prevMsg.sender !== msg.sender
                  const isLast = !nextMsg || nextMsg.sender !== msg.sender
                  const showSenderName = !isMe && isFirst

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMe={isMe}
                      isFirst={isFirst}
                      isLast={isLast}
                      showSenderName={showSenderName}
                    />
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
