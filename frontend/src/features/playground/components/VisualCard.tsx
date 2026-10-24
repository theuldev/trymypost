import { Badge } from '@/components/ui/Badge'

interface VisualSuggestion {
  visual_description?: string
  code_example?: string
  suggested_tools?: string[]
}

interface VisualCardProps {
  visual: VisualSuggestion | string
}

export function VisualCard({ visual }: VisualCardProps) {
  if (typeof visual === 'string') {
    return (
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-surface-700 dark:text-surface-300">
        {visual}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {visual.visual_description && (
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-surface-700 dark:text-surface-300">
          {visual.visual_description}
        </p>
      )}

      {visual.code_example && (
        <pre className="max-h-48 overflow-y-auto rounded-md bg-surface-900 p-3 font-mono text-xs text-surface-100">
          {visual.code_example}
        </pre>
      )}

      {visual.suggested_tools && visual.suggested_tools.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2">
          {visual.suggested_tools.map((tool, i) => (
            <Badge key={i} variant="neutral" size="sm" className="text-[10px]">
              {tool}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
