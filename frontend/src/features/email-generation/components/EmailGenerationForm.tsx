import { useState } from "react"
import { Textarea } from "@/components/ui"
import { useTranslation } from "@/i18n"

interface EmailGenerationFormProps {
  description: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  isGenerating: boolean
  error?: string
}

export function EmailGenerationForm({
  description,
  onChange,
  onSubmit,
  isSubmitting,
  isGenerating,
  error,
}: EmailGenerationFormProps) {
  const { t } = useTranslation()
  const [charCount, setCharCount] = useState(description.length)

  const handleTextareaChange = (value: string) => {
    setCharCount(value.length)
    onChange(value)
  }

  const isValid = description.trim().length >= 50

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="job-description" className="block text-sm font-medium text-surface-900 dark:text-surface-100">
          {t('emailGeneration.jobDescriptionLabel')}
        </label>
        <Textarea
          id="job-description"
          value={description}
          onChange={handleTextareaChange}
          placeholder={t('emailGeneration.jobDescriptionPlaceholder')}
          rows={12}
          className="font-mono text-sm"
          disabled={isGenerating}
        />
        <div className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
          <span>{charCount} / 10000 caracteres</span>
          {!isValid && description.length > 0 && (
            <span className="text-amber-500">{t('emailGeneration.minLengthError')}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-md text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t border-surface-200 dark:border-surface-700">
        <button
          type="submit"
          disabled={!isValid || isSubmitting || isGenerating}
          className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating || isSubmitting ? t('emailGeneration.generating') : t('emailGeneration.generateButton')}
        </button>
      </div>
    </form>
  )
}