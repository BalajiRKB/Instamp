import React, { useMemo } from 'react'
import { useChatStore } from '../store/chatStore'
import { clearSession as clearStorage } from '../lib/storage'
import Avatar from './Avatar'

export default function Sidebar() {
  const conversations = useChatStore((state) => state.conversations)
  const activeId = useChatStore((state) => state.activeConversationId)
  const setActiveId = useChatStore((state) => state.setActiveConversationId)
  const searchQuery = useChatStore((state) => state.searchPeopleQuery)
  const setSearchQuery = useChatStore((state) => state.setSearchPeopleQuery)
  const clearStore = useChatStore((state) => state.clearSession)

  const handleClear = async () => {
    if (window.confirm('Clear session? All local data will be removed.')) {
      await clearStorage()
      clearStore()
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const relativeTime = (isoString) => {
    if (!isoString) return ''
    try {
      const diff = Date.now() - new Date(isoString).getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 1) return 'now'
      const hrs = Math.floor(mins / 60)
      if (hrs < 1) return `${mins}m`
      const days = Math.floor(hrs / 24)
      if (days < 1) return `${hrs}h`
      const wks = Math.floor(days / 7)
      if (days < 7) return `${days}d`
      return `${wks}w`
    } catch {
      return ''
    }
  }

  const lastSnippet = (lastMsg) => {
    if (!lastMsg) return 'No messages'
    const { mediaType, text, sender } = lastMsg
    const prefix = sender ? `${sender}: ` : ''
    switch (mediaType) {
      case 'text':  return prefix + (text?.substring(0, 50) || '…')
      case 'photo': return `${prefix}📷 Photo`
      case 'video': return `${prefix}🎥 Video`
      case 'audio': return `${prefix}🎙️ Voice note`
      case 'link':  return `${prefix}🔗 Link`
      default:      return `${prefix}Attachment`
    }
  }

  // ── Memoised list ────────────────────────────────────────────────────────────
  const list = useMemo(() => {
    let entries = Object.values(conversations).map((c) => ({
      id: c.id,
      name: c.name,
      lastMessage: c.lastMessage,
      count: c.messages.length,
    }))

    // Sort most recent first
    entries.sort((a, b) => {
      const ta = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0
      const tb = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0
      return tb - ta
    })

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      entries = entries.filter((e) => e.name.toLowerCase().includes(q))
    }

    return entries
  }, [conversations, searchQuery])

  const mobileHidden = activeId ? 'hidden md:flex' : 'flex'

  return (
    <div className={`${mobileHidden} w-full md:w-[340px] flex-col h-full bg-black border-r border-neutral-900 select-none flex-shrink-0`}>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center px-4 py-3.5 border-b border-neutral-900">
        <h1 className="text-[15px] font-bold text-white tracking-tight">Messages</h1>
        <button
          onClick={handleClear}
          className="text-[11px] font-semibold text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
        >
          Clear session
        </button>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-b border-neutral-900">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-[13px] bg-neutral-900 border-none px-4 py-2 rounded-xl focus:outline-none text-white placeholder:text-neutral-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Conversation list ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <div className="p-8 text-center text-[12px] text-neutral-600">
            {searchQuery ? 'No results.' : 'No conversations found.'}
          </div>
        ) : (
          list.map((convo) => {
            const isActive = activeId === convo.id
            const snippet = lastSnippet(convo.lastMessage)
            const time = relativeTime(convo.lastMessage?.timestamp)

            return (
              <button
                key={convo.id}
                onClick={() => setActiveId(convo.id)}
                className={`w-full flex items-center px-4 py-3 cursor-pointer transition-colors border-l-2 ${
                  isActive
                    ? 'bg-neutral-900 border-pink-500'
                    : 'border-transparent hover:bg-neutral-900/50'
                }`}
              >
                {/* Avatar */}
                <Avatar convoId={convo.id} name={convo.name} sizeClasses="w-[54px] h-[54px]" textClasses="text-[14px]" />

                {/* Text content */}
                <div className="ml-3 flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[13px] font-semibold text-white truncate pr-2">
                      {convo.name}
                    </span>
                    <span className="text-[11px] text-neutral-500 flex-shrink-0">
                      {time}
                    </span>
                  </div>
                  <p className="text-[12px] text-neutral-500 truncate mt-0.5 leading-tight">
                    {snippet}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
