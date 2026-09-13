import { AlertTriangle, CheckCircle, Sparkles } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

export interface ReviewData {
  score?: number
  strengths?: string[]
  improvements?: string[]
  suggestions?: string[]
}

interface PlaygroundReviewCardProps {
  review: ReviewData
}

export function PlaygroundReviewCard({ review }: PlaygroundReviewCardProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Quality Review" />

        <CardBody>
          <div className="space-y-6">
            {review.strengths && review.strengths.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-surface-900 dark:text-surface-50">
                  Strengths
                </h4>

                <ul className="space-y-2">
                  {review.strengths.map((strength, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-sm text-surface-600 dark:text-surface-300"
                    >
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {review.improvements && review.improvements.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-surface-900 dark:text-surface-50">
                  Improvements
                </h4>

                <ul className="space-y-2">
                  {review.improvements.map((improvement, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-sm text-surface-600 dark:text-surface-300"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {review.suggestions && review.suggestions.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-surface-900 dark:text-surface-50">
                  Optimization Suggestions
                </h4>

                <ul className="space-y-2">
                  {review.suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="flex gap-2 text-sm text-surface-600 dark:text-surface-300"
                    >
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
