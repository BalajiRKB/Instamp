import React, { useEffect } from 'react'
import { useChatStore } from './store/chatStore'
import { loadSession, loadAllMediaFiles } from './lib/storage'
import { resolveMediaBlobs } from './lib/jsonParser'
import UploadScreen from './components/UploadScreen'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

export default function App() {
  const conversations          = useChatStore((state) => state.conversations)
  const setConversations       = useChatStore((state) => state.setConversations)
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId)
  const loading                = useChatStore((state) => state.loading)
  const setLoading             = useChatStore((state) => state.setLoading)
  const setProgress            = useChatStore((state) => state.setProgress)

  const hasConversations = Object.keys(conversations).length > 0

  // Always dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // Restore cached session from IndexedDB on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        setLoading(true)
        setProgress(10, 'Restoring session...')

        const { conversations: cached, activeConversationId } = await loadSession()

        if (cached && Object.keys(cached).length > 0) {
          setProgress(40, 'Loading media from cache...')

          // Re-load all media Blobs from IndexedDB and generate fresh blob URLs.
          // Blob URLs from the previous session are dead after a page refresh —
          // we must recreate them from the stored Blobs every time.
          const mediaFiles = await loadAllMediaFiles()

          if (Object.keys(mediaFiles).length > 0) {
            setProgress(70, 'Resolving media previews...')
            const allMessages = Object.values(cached).flatMap((c) => c.messages)
            resolveMediaBlobs(allMessages, mediaFiles)
          }

          setConversations(cached)

          const firstId = Object.keys(cached)[0]
          setActiveConversationId(activeConversationId || firstId || '')
        }
      } catch (err) {
        console.error('Session restoration failed:', err)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Boot loader
  if (loading && !hasConversations) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black font-sans gap-4">
        <div className="w-10 h-10 border-4 border-t-purple-500 border-r-pink-500 border-b-transparent border-l-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-neutral-500">Loading Instamp...</p>
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
