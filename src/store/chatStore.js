import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  conversations: {},
  activeConversationId: null,
  isRightSidebarOpen: false,
  searchPeopleQuery: '',
  loading: false,
  progress: 0,
  progressText: '',
  filters: {
    search: '',
    sender: '',
    mediaType: '',
    dateFrom: '',
    dateTo: '',
  },

  setConversations: (conversations) => {
    set({ conversations })
  },

  setActiveConversationId: (id) => {
    set({ 
      activeConversationId: id,
      // Reset active message filters when changing conversations
      filters: {
        search: '',
        sender: '',
        mediaType: '',
        dateFrom: '',
        dateTo: '',
      }
    })
  },

  setSearchPeopleQuery: (query) => {
    set({ searchPeopleQuery: query })
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  resetFilters: () => {
    set({
      filters: {
        search: '',
        sender: '',
        mediaType: '',
        dateFrom: '',
        dateTo: '',
      }
    })
  },

  setLoading: (loading) => set({ loading }),
  
  setProgress: (progress, progressText = '') => set({ progress, progressText }),

  toggleRightSidebar: () => set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen })),

  clearSession: () => {
    set({
      conversations: {},
      activeConversationId: null,
      isRightSidebarOpen: false,
      searchPeopleQuery: '',
      loading: false,
      progress: 0,
      progressText: '',
      filters: {
        search: '',
        sender: '',
        mediaType: '',
        dateFrom: '',
        dateTo: '',
      }
    })
  }
}))
