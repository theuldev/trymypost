import { Palette } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'

interface VisualCardProps {
  visual: any
}

export function VisualCard({ visual }: VisualCardProps) {
  return (
    <Card variant="bordered">
      <CardBody className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary-500" />
          <h3 className="font-medium text-surface-900 dark:text-surface-100 text-sm">
            Visual Suggestion
          </h3>
        </div>
        <div className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">
          {typeof visual === 'string' ? visual : JSON.stringify(visual, null, 2)}
        </div>
      </CardBody>
    </Card>
  )
}
