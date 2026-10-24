import { create } from 'zustand'
import type { EmailGenerationResult } from '../types'

interface EmailGenerationState {
  currentTaskId: string | null
  currentStep: string
  progress: number
  isGenerating: boolean
  result: EmailGenerationResult | null
  draftDescription: string

  setGeneration: (taskId: string) => void
  setResult: (result: EmailGenerationResult | null) => void
  clearGeneration: () => void
  updateProgress: (step: string, progress: number) => void
  setDraftDescription: (desc: string) => void
}

export const useEmailGenerationStore = create<EmailGenerationState>((set) => ({
  currentTaskId: null,
  currentStep: '',
  progress: 0,
  isGenerating: false,
  result: null,
  draftDescription: '',

  setGeneration: (taskId) => set({
    currentTaskId: taskId,
    isGenerating: true,
    currentStep: 'Starting...',
    progress: 0,
    result: null,
  }),

  setResult: (result) => set({ result }),

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

  setDraftDescription: (desc) => set({ draftDescription: desc }),
}))