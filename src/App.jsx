import React, { useEffect } from 'react'
import { useChatStore } from './store/chatStore'
import { loadSession } from './lib/storage'
import UploadScreen from './components/UploadScreen'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

export default function App() {
  const conversations           = useChatStore((state) => state.conversations)
  const setConversations        = useChatStore((state) => state.setConversations)
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId)
  const loading                 = useChatStore((state) => state.loading)
  const setLoading              = useChatStore((state) => state.setLoading)
  const setProgress             = useChatStore((state) => state.setProgress)

  const hasConversations = Object.keys(conversations).length > 0

  // Always dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // Restore cached session from IndexedDB on mount.
  // Media Blobs are loaded lazily by MessageBubble via getMediaItem() —
  // no blob URL pre-computation needed here.
  useEffect(() => {
    const restore = async () => {
      try {
        setLoading(true)
        setProgress(10, 'Restoring session…')

        const { conversations: cached, activeConversationId } = await loadSession()

        if (cached && Object.keys(cached).length > 0) {
          setConversations(cached)
          const firstId = Object.keys(cached)[0]
          setActiveConversationId(activeConversationId || firstId || '')
        }
      } catch (err) {
        console.error('Session restore failed:', err)
      } finally {
        setLoading(false)
      }
    }

    restore()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !hasConversations) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black gap-4">
        <div className="w-10 h-10 border-4 border-t-purple-500 border-r-pink-500 border-b-transparent border-l-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-neutral-500">Loading Instamp…</p>
      </div>
    )
  }

  return hasConversations ? (
    <div className="flex h-screen w-full overflow-hidden bg-black">
      <Sidebar />
      <ChatWindow />
    </div>
  ) : (
    <UploadScreen />
  )
}
