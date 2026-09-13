import { Copy, Tag, Code2, Flag, FileText, CheckCircle, Palette, Eye, Image as ImageIcon, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

import { STYLE_ICONS } from '@/constants/playground'

import { PlaygroundReviewCard } from './PlaygroundReviewCard'
import { VisualCard } from './VisualCard'

import type { PostVariation } from '@/types/common'
import type { ResultTab } from '../types'
export type { ResultTab }

const styleIcons = STYLE_ICONS as Record<string, LucideIcon>

interface PlaygroundResultsProps {
  generatedPosts: PostVariation[]
  selectedVariation: PostVariation | null
  activeTab: ResultTab
  setSelectedVariation: (post: PostVariation) => void
  setActiveTab: (tab: ResultTab) => void
  handleCopy: (text: string, message?: string) => void
  handleOpenPreview: (post: PostVariation) => void
  handleGenerateCodeImage: (code: string, language: string) => void
  style: string
  showHeading?: boolean
}

const TAB_CONFIG: Array<{ key: ResultTab; label: string; icon: LucideIcon }> = [
  { key: 'posts', label: 'Post', icon: FileText },
  { key: 'code', label: 'Code', icon: Code2 },
  { key: 'hashtags', label: 'Hashtags', icon: Tag },
  { key: 'hooks', label: 'Hooks', icon: Flag },
  { key: 'review', label: 'Review', icon: CheckCircle },
  { key: 'visual', label: 'Visual', icon: Palette },
]

export function PlaygroundResults({
  generatedPosts,
  selectedVariation,
  activeTab,
  setSelectedVariation,
  setActiveTab,
  handleCopy,
  handleOpenPreview,
  handleGenerateCodeImage,
  style,
  showHeading = true,
}: PlaygroundResultsProps) {
  const currentVariation = selectedVariation ?? generatedPosts[0] ?? null
  const StyleIcon = styleIcons[style] ?? FileText

  const availableTabs = useMemo(() => {
    if (!currentVariation) return []
    return TAB_CONFIG.map((tab) => {
      let count = 0
      switch (tab.key) {
        case 'posts':
          count = 1
          break
        case 'code':
          count = currentVariation.code_examples?.length ?? 0
          break
        case 'hashtags':
          count = currentVariation.hashtags?.length ?? 0
          break
        case 'hooks':
          count = currentVariation.hooks?.length ?? 0
          break
        case 'review':
          count = currentVariation.review ? 1 : 0
          break
        case 'visual':
          count = currentVariation.visual_suggestion ? 1 : 0
          break
      }
      return { ...tab, count }
    }).filter((tab) => tab.count > 0)
  }, [currentVariation])

  const effectiveTab: ResultTab = availableTabs.some((t) => t.key === activeTab)
    ? activeTab
    : 'posts'

  const selectVariation = (post: PostVariation) => {
    setSelectedVariation(post)
    setActiveTab('posts')
  }

  const renderPostsContent = () => {
    if (!currentVariation) return null
    return (
      <Card variant="bordered">
        <CardBody className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                Variation {currentVariation.variation}
              </span>
              <StyleIcon className="h-4 w-4 text-primary-500 dark:text-primary-400" />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(currentVariation.content)}
                leftIcon={<Copy className="h-3.5 w-3.5" />}
              >
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenPreview(currentVariation)}
                leftIcon={<Eye className="h-3.5 w-3.5" />}
              >
                Preview
              </Button>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-surface-700 dark:text-surface-300">
            {currentVariation.content}
          </p>
        </CardBody>
      </Card>
    )
  }

  const renderCodeContent = () => {
    const examples = currentVariation?.code_examples ?? []
    if (examples.length === 0) return null
    return (
      <div className="space-y-4">
        {examples.map((example, index) => (
          <Card key={index}>
            <CardBody className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  Code Example #{index + 1}
                  {example.language ? ` · ${example.language}` : ''}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(example.code)}
                    leftIcon={<Copy className="h-3.5 w-3.5" />}
                  >
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateCodeImage(example.code, example.language)}
                    leftIcon={<ImageIcon className="h-3.5 w-3.5" />}
                  >
                    Code Image
                  </Button>
                </div>
              </div>
              <pre className="rounded-xl border border-surface-800 bg-surface-900 p-4 text-xs font-mono leading-relaxed text-surface-100 overflow-x-auto max-h-96 overflow-y-auto dark:bg-black">
                {example.code}
              </pre>
            </CardBody>
          </Card>
        ))}
      </div>
    )
  }

  const renderHashtagsContent = () => {
    const hashtags = currentVariation?.hashtags ?? []
    if (hashtags.length === 0) return null
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {hashtags.map((hashtag, index) => (
          <Card key={`${hashtag.tag}-${index}`}>
            <CardBody className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 shrink-0 text-primary-600" />
                  <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-50">
                    {hashtag.tag}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{hashtag.relevance}</Badge>
                  {hashtag.estimated_volume && (
                    <span className="text-xs text-surface-500 dark:text-surface-400">
                      {hashtag.estimated_volume}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleCopy(hashtag.tag)}>
                <Copy className="h-4 w-4" />
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    )
  }

  const renderHooksContent = () => {
    const hooks = currentVariation?.hooks ?? []
    if (hooks.length === 0) return null
    return (
      <div className="space-y-4">
        {hooks.map((hook, index) => (
          <Card key={`${hook.text.slice(0, 20)}-${index}`}>
            <CardBody>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="primary">{hook.type}</Badge>
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    Hook #{index + 1}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(hook.text)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm font-medium leading-6 text-surface-900 dark:text-surface-50">
                {hook.text}
              </p>
              <div className="mt-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-900">
                <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
                  Why it works
                </p>
                <p className="mt-1 text-xs leading-5 text-surface-500 dark:text-surface-400">
                  {hook.why_it_works}
                </p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    )
  }

  const renderReviewContent = () => {
    if (!currentVariation?.review) return null
    return <PlaygroundReviewCard review={currentVariation.review} />
  }

  const renderVisualContent = () => {
    if (!currentVariation?.visual_suggestion) return null
    return <VisualCard visual={currentVariation.visual_suggestion} />
  }

  const renderActiveTabContent = () => {
    switch (effectiveTab) {
      case 'code':
        return renderCodeContent()
      case 'hashtags':
        return renderHashtagsContent()
      case 'hooks':
        return renderHooksContent()
      case 'review':
        return renderReviewContent()
      case 'visual':
        return renderVisualContent()
      case 'posts':
      default:
        return renderPostsContent()
    }
  }

  return (
    <section className={showHeading ? "mt-10" : "mt-6"}>
      {showHeading && (
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
            Generated Results
          </h2>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Review and refine the generated content.
          </p>
        </div>
      )}

      {generatedPosts.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {generatedPosts.map((post) => (
            <button
              key={post.variation}
              type="button"
              onClick={() => selectVariation(post)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                currentVariation?.variation === post.variation
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400'
                  : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800',
              )}
            >
              Variação {post.variation}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 overflow-x-auto border-b border-surface-200 dark:border-surface-800">
        <div className="flex min-w-max gap-1">
          {availableTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as ResultTab)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  effectiveTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-surface-50',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>

                {tab.count > 0 && tab.key !== 'posts' && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px]',
                      effectiveTab === tab.key
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'bg-surface-100 text-surface-500 dark:bg-surface-800',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {renderActiveTabContent()}
    </section>
  )
}

export default PlaygroundResults