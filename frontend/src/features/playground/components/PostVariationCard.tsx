import { Copy, Eye, FileText, Code2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { PostVariation } from '@/types/common'

interface PostVariationCardProps {
  post: PostVariation
  index: number
  isSelected: boolean
  onSelect: () => void
  onCopy: () => void
  onPreview: () => void
  onGenerateCodeImage: () => void
  styleIcon?: LucideIcon
}

export function PostVariationCard({
  post,
  index,
  isSelected,
  onSelect,
  onCopy,
  onPreview,
  onGenerateCodeImage,
  styleIcon: StyleIcon = FileText,
}: PostVariationCardProps) {
  return (
    <Card
      variant="bordered"
      className={cn(
        'group cursor-pointer rounded-2xl border transition-all duration-150',
        isSelected
          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
          : 'border-surface-200 hover:border-surface-300 dark:border-surface-800',
      )}
      onClick={onSelect}
    >
      <CardBody className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              Variation {post.variation || index + 1}
            </span>

            <StyleIcon className="h-4 w-4 text-primary-500 dark:text-primary-400" />
          </div>

          <div
            className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            role="group"
            aria-label="Post actions"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                onCopy()
              }}
              leftIcon={<Copy className="h-3.5 w-3.5" />}
            >
              Copy
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                onPreview()
              }}
              leftIcon={<Eye className="h-3.5 w-3.5" />}
            >
              Preview
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                onGenerateCodeImage()
              }}
              leftIcon={<Code2 className="h-3.5 w-3.5" />}
            >
              Code Image
            </Button>
          </div>
        </div>

        <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-surface-700 dark:text-surface-300">
          {post.content}
        </p>
      </CardBody>
    </Card>
  )
}
