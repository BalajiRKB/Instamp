import React, { useState, useMemo } from 'react'
import { useChatStore } from '../store/chatStore'
import GalleryItem from './GalleryItem'

export default function RightSidebar() {
  const activeId = useChatStore((state) => state.activeConversationId)
  const isRightSidebarOpen = useChatStore((state) => state.isRightSidebarOpen)
  const toggleRightSidebar = useChatStore((state) => state.toggleRightSidebar)
  const filters = useChatStore((state) => state.filters)
  const setFilters = useChatStore((state) => state.setFilters)
  const resetFilters = useChatStore((state) => state.resetFilters)

  const activeConversation = useChatStore((state) =>
    activeId ? state.conversations[activeId] : null
  )

  const [activeTab, setActiveTab] = useState('media') // 'media', 'audio', 'links'

  // ── Compute Lists ──────────────────────────────────────────────────────────
  const { mediaMsgs, audioMsgs, linkMsgs, senders } = useMemo(() => {
    if (!activeConversation) return { mediaMsgs: [], audioMsgs: [], linkMsgs: [], senders: [] }

    const m = []
    const a = []
    const l = []

    // We process them backwards to show newest first
    for (let i = activeConversation.messages.length - 1; i >= 0; i--) {
      const msg = activeConversation.messages[i]
      if (msg.mediaType === 'photo' || msg.mediaType === 'video' || msg.mediaType === 'gif') {
        m.push(msg)
      } else if (msg.mediaType === 'audio') {
        a.push(msg)
      } else if (msg.mediaType === 'link') {
        l.push(msg)
      }
    }

    return {
      mediaMsgs: m,
      audioMsgs: a,
      linkMsgs: l,
      senders: activeConversation.senders,
    }
  }, [activeConversation])

  if (!isRightSidebarOpen || !activeConversation) return null

  return (
    <div className="w-full md:w-[320px] bg-[#0a0a0a] border-l border-neutral-900 flex flex-col h-full flex-shrink-0">
      
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-neutral-900 shrink-0">
        <h2 className="text-[15px] font-bold text-white tracking-tight">Details</h2>
        <button 
          onClick={toggleRightSidebar}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        
        {/* ── Contact Info ───────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-6 pt-2">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] mb-3">
            <div className="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-3xl font-black text-white">
              {activeConversation.name?.[0]?.toUpperCase() ?? 'D'}
            </div>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">{activeConversation.name}</h3>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            {activeConversation.messages.length.toLocaleString()} messages
          </p>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <div className="mb-6 bg-neutral-900/50 rounded-2xl p-4 border border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Search & Filter</h4>
              {(filters.search || filters.sender || filters.dateFrom || filters.dateTo) && (
                <button 
                  onClick={resetFilters}
                  className="text-[10px] font-bold text-pink-500 hover:text-pink-400 uppercase tracking-wider"
                >
                  Reset
                </button>
              )}
            </div>
          
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search messages..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="w-full text-xs bg-black border border-neutral-800 px-3 py-2.5 rounded-xl focus:outline-none focus:border-neutral-700 text-white placeholder:text-neutral-600"
              />
            </div>
            
            <select
              value={filters.sender}
              onChange={(e) => setFilters({ sender: e.target.value })}
              className="w-full text-xs bg-black border border-neutral-800 px-3 py-2.5 rounded-xl focus:outline-none focus:border-neutral-700 cursor-pointer text-white"
            >
              <option value="">All Participants</option>
              {senders.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              </select>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase mb-1 ml-1">From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ dateFrom: e.target.value })}
                    className="w-full text-xs bg-black border border-neutral-800 px-2 py-2 rounded-xl focus:outline-none focus:border-neutral-700 text-neutral-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase mb-1 ml-1">To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ dateTo: e.target.value })}
                    className="w-full text-xs bg-black border border-neutral-800 px-2 py-2 rounded-xl focus:outline-none focus:border-neutral-700 text-neutral-300"
                  />
                </div>
              </div>
            </div>
          </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex border-b border-neutral-800 mb-4">
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'media' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Media
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'audio' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Audio
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 pb-2 text-xs font-bold uppercase tracking-wider ${activeTab === 'links' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Links
          </button>
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────────── */}
        <div className="min-h-[200px]">
          {activeTab === 'media' && (
            mediaMsgs.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {mediaMsgs.map((msg) => (
                  <GalleryItem key={msg.id} message={msg} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-8">No photos or videos found.</p>
            )
          )}

          {activeTab === 'audio' && (
            audioMsgs.length > 0 ? (
              <div>
                {audioMsgs.map((msg) => (
                  <GalleryItem key={msg.id} message={msg} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-8">No audio messages found.</p>
            )
          )}

          {activeTab === 'links' && (
            linkMsgs.length > 0 ? (
              <div>
                {linkMsgs.map((msg) => (
                  <GalleryItem key={msg.id} message={msg} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-8">No links found.</p>
            )
          )}
        </div>

      </div>
    </div>
  )
}
