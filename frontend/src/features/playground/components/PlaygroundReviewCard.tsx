import { AlertTriangle, CheckCircle, Sparkles } from 'lucide-react'
import { useTranslation } from '@/i18n'

export interface ReviewData {
  score?: number
  strengths?: string[]
  improvements?: string[]
  suggestions?: string[]
}

interface PlaygroundReviewCardProps {
  review: ReviewData
}

const SECTION_CONFIG = [
  { key: 'strengths' as const, labelKey: 'pg.strengths', color: 'text-emerald-500', Icon: CheckCircle },
  { key: 'improvements' as const, labelKey: 'pg.improvements', color: 'text-amber-500', Icon: AlertTriangle },
  { key: 'suggestions' as const, labelKey: 'pg.suggestions', color: 'text-primary-500', Icon: Sparkles },
]

export function PlaygroundReviewCard({ review }: PlaygroundReviewCardProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {review.score !== undefined && (
        <div className="flex items-center justify-between border-b border-surface-200 pb-3 dark:border-surface-800">
          <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
            {t('pg.qualityReview')}
          </span>
          <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            {review.score} / 10
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SECTION_CONFIG.map(({ key, labelKey, color, Icon }) => {
          const items = review[key]
          if (!items || items.length === 0) return null
          return (
            <div key={key}>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-surface-900 dark:text-surface-50">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {t(labelKey)}
              </h4>
              <ul className="space-y-1 text-xs text-surface-600 dark:text-surface-400">
                {items.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className={`mt-0.5 ${color}`}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
