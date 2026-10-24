import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useTranslation } from "@/i18n"
import { useUIStore } from "@/store"

interface CopyButtonProps {
  textToCopy: string
  label?: string
  icon?: React.ReactNode
  onSuccess?: () => void
  showLabel?: boolean
}

export function CopyButton({ textToCopy, label, icon, onSuccess, showLabel = true }: CopyButtonProps) {
  const { t } = useTranslation()
  const { addToast } = useUIStore()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      addToast({ type: 'success', message: t('emailGeneration.results.copied') })
      onSuccess?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addToast({ type: 'error', message: 'Failed to copy' })
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5 flex-shrink-0"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : (icon || <Copy className="h-4 w-4" />)}
      {label && showLabel && !copied && <span className="text-xs whitespace-nowrap">{label}</span>}
      {copied && label && <span className="text-xs text-emerald-500 whitespace-nowrap">{t('emailGeneration.results.copied')}</span>}
    </Button>
  )
}