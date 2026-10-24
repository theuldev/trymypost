import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PostHistoryBase, PostHistoryDetail } from '../types'

interface UIState {
  sidebarOpen: boolean
  darkMode: boolean
  toasts: Toast[]
  modals: Record<string, boolean>
  appLanguage: string
  
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
  setAppLanguage: (lang: string) => void
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
      appLanguage: 'pt-BR',

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
      setAppLanguage: (lang) => set({ appLanguage: lang }),

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
      partialize: (state) => ({ darkMode: state.darkMode, sidebarOpen: state.sidebarOpen, appLanguage: state.appLanguage }),
    }
  )
)

interface PlaygroundDraft {
  mode: 'structured' | 'description'
  formData: Record<string, any>
  descData: Record<string, any>
}

interface GenerationState {
  currentTaskId: string | null
  currentStep: string
  progress: number
  isGenerating: boolean
  result: Record<string, any> | null
  style: string
  formData: Record<string, any> | null
  draft: PlaygroundDraft | null

  setGeneration: (taskId: string) => void
  setResult: (result: Record<string, any> | null) => void
  setStyle: (style: string) => void
  saveFormData: (formData: Record<string, any>) => void
  saveDraft: (draft: PlaygroundDraft) => void
  clearGeneration: () => void
  updateProgress: (step: string, progress: number) => void
}

export const useGenerationStore = create<GenerationState>((set) => ({
  currentTaskId: null,
  currentStep: '',
  progress: 0,
  isGenerating: false,
  result: null,
  style: 'Technical',
  formData: null,
  draft: null,

  setGeneration: (taskId) => set({
    currentTaskId: taskId,
    isGenerating: true,
    currentStep: 'Starting...',
    progress: 0,
    result: null,
  }),

  setResult: (result) => set({ result }),

  setStyle: (style) => set({ style }),

  saveFormData: (formData) => set({ formData }),

  saveDraft: (draft) => set({ draft }),

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

interface TopicsFormDraft {
  context: string
  quantity: number
  country: string
}

interface TopicsFormState {
  draft: TopicsFormDraft | null
  saveDraft: (draft: TopicsFormDraft) => void
}

export const useTopicsFormStore = create<TopicsFormState>((set) => ({
  draft: null,
  saveDraft: (draft) => set({ draft }),
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

export { useEmailGenerationStore } from './emailStore'