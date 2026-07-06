import React, { useEffect } from 'react'
import { useChatStore } from './store/chatStore'
import { loadSession } from './lib/storage'
import UploadScreen from './components/UploadScreen'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

export default function App() {
  const conversations = useChatStore((state) => state.conversations)
  const setConversations = useChatStore((state) => state.setConversations)
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId)
  const loading = useChatStore((state) => state.loading)
  const setLoading = useChatStore((state) => state.setLoading)
  const setProgress = useChatStore((state) => state.setProgress)

  const hasConversations = Object.keys(conversations).length > 0

  // 1. Always use dark mode (Instamp is a dark-only app like Instagram)
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // 2. Restore Cached Session from IndexedDB
  useEffect(() => {
    const restoreSession = async () => {
      try {
        setLoading(true)
        setProgress(20, 'Restoring cached session...')
        
        const { conversations: cachedConversations, activeConversationId } = await loadSession()
        
        if (cachedConversations && Object.keys(cachedConversations).length > 0) {
          setConversations(cachedConversations)
          if (activeConversationId) {
            setActiveConversationId(activeConversationId)
          } else {
            // Default to the first conversation ID
            const firstId = Object.keys(cachedConversations)[0]
            if (firstId) setActiveConversationId(firstId)
          }
        }
      } catch (err) {
        console.error('Session restoration failed:', err)
      } finally {
        setLoading(false)
      }
    }
    
    restoreSession()
  }, [setConversations, setActiveConversationId, setLoading, setProgress])

  // If loading a cached session on boot, show a loader
  if (loading && !hasConversations) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#050505] font-sans">
        <div className="w-10 h-10 border-4 border-t-purple-500 border-r-pink-500 border-b-transparent border-l-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold text-neutral-400">Loading Instamp...</p>
      </div>
    )
  }

  // Display Sidebar + ChatWindow split pane if chats are loaded, otherwise show UploadScreen
  return hasConversations ? (
    <div className="flex h-screen w-full overflow-hidden bg-black">
      <Sidebar />
      <ChatWindow />
    </div>
  ) : (
    <UploadScreen />
  )
}
