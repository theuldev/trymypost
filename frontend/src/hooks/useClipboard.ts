import { useCallback } from 'react'
import { useUIStore } from '@/store'

export function useClipboard() {
  const { addToast } = useUIStore()

  const copy = useCallback(
    async (text: string, message = 'Copied to clipboard!') => {
      try {
        await navigator.clipboard.writeText(text)
        addToast({ type: 'success', message })
      } catch {
        addToast({ type: 'error', message: 'Failed to copy to clipboard.' })
      }
    },
    [addToast],
  )

  return { copy }
}
