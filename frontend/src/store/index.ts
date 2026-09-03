import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PostHistoryBase, PostHistoryDetail } from '../types'

interface UIState {
  sidebarOpen: boolean
  darkMode: boolean
  toasts: Toast[]
  modals: Record<string, boolean>
  
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  openModal: (key: string) => void
  closeModal: (key: string) => void
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      darkMode: false,
      toasts: [],
      modals: {},

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleDarkMode: () => set((state) => {
        const newDark = !state.darkMode
        document.documentElement.classList.toggle('dark', newDark)
        return { darkMode: newDark }
      }),
      setDarkMode: (dark) => {
        document.documentElement.classList.toggle('dark', dark)
        set({ darkMode: dark })
      },

      addToast: (toast) => {
        const id = Math.random().toString(36).slice(2)
        const newToast = { ...toast, id }
        set((state) => ({ toasts: [...state.toasts, newToast] }))
        
        if (toast.duration !== 0) {
          setTimeout(() => get().removeToast(id), toast.duration ?? 3000)
        }
        return id
      },

      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      })),

      openModal: (key) => set((state) => ({
        modals: { ...state.modals, [key]: true }
      })),
      closeModal: (key) => set((state) => {
        const newModals = { ...state.modals }
        delete newModals[key]
        return { modals: newModals }
      }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({ darkMode: state.darkMode, sidebarOpen: state.sidebarOpen }),
    }
  )
)

interface GenerationState {
  currentTaskId: string | null
  currentStep: string
  progress: number
  isGenerating: boolean
  
  setGeneration: (taskId: string) => void
  clearGeneration: () => void
  updateProgress: (step: string, progress: number) => void
}

export const useGenerationStore = create<GenerationState>((set) => ({
  currentTaskId: null,
  currentStep: '',
  progress: 0,
  isGenerating: false,

  setGeneration: (taskId) => set({
    currentTaskId: taskId,
    isGenerating: true,
    currentStep: 'Iniciando...',
    progress: 0,
  }),

  clearGeneration: () => set({
    currentTaskId: null,
    isGenerating: false,
    currentStep: '',
    progress: 0,
  }),

  updateProgress: (step, progress) => set({
    currentStep: step,
    progress,
  }),
}))

interface HistoryState {
  selectedPost: PostHistoryDetail | null
  viewMode: 'grid' | 'list'
  
  setSelectedPost: (post: PostHistoryDetail | null) => void
  setViewMode: (mode: 'grid' | 'list') => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      selectedPost: null,
      viewMode: 'list',

      setSelectedPost: (post) => set({ selectedPost: post }),
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'history-store',
      partialize: (state) => ({ viewMode: state.viewMode }),
    }
  )
)