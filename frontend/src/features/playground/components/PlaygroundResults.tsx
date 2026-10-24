import { Copy, Tag, Code2, Flag, FileText, CheckCircle, Palette, Eye, Image as ImageIcon, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/i18n'
import { cn } from '@/utils/cn'

import { PlaygroundReviewCard } from './PlaygroundReviewCard'
import { VisualCard } from './VisualCard'

import type { PostVariation } from '@/types'
import type { ResultTab } from '../types'
export type { ResultTab }

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

const TAB_CONFIG: Array<{ key: ResultTab; labelKey: string; icon: LucideIcon }> = [
  { key: 'posts', labelKey: 'pg.tabPosts', icon: FileText },
  { key: 'code', labelKey: 'pg.tabCode', icon: Code2 },
  { key: 'hashtags', labelKey: 'pg.tabHashtags', icon: Tag },
  { key: 'hooks', labelKey: 'pg.tabHooks', icon: Flag },
  { key: 'review', labelKey: 'pg.tabReview', icon: CheckCircle },
  { key: 'visual', labelKey: 'pg.tabVisual', icon: Palette },
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
  showHeading = true,
}: PlaygroundResultsProps) {
  const { t } = useTranslation()
  const currentVariation = selectedVariation ?? generatedPosts[0] ?? null

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
      <div className="space-y-4">
        <div className="border-l-2 border-primary-500 py-1 pl-4">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-surface-800 dark:text-surface-200">
            {currentVariation.content}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(currentVariation.content)}
            leftIcon={<Copy className="h-3.5 w-3.5" />}
          >
            {t('pg.copy')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenPreview(currentVariation)}
            leftIcon={<Eye className="h-3.5 w-3.5" />}
          >
            {t('pg.preview')}
          </Button>
        </div>
      </div>
    )
  }

  const renderCodeContent = () => {
    const examples = currentVariation?.code_examples ?? []
    if (examples.length === 0) return null
    return (
      <div className="space-y-4">
        {examples.map((example, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-800"
          >
            <div className="flex items-center justify-between gap-3 border-b border-surface-200 px-3 py-2.5 dark:border-surface-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                  <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-50">
                    {t('pg.codeExample', { n: index + 1 })}
                  </span>
                </div>
                {example.language && (
                  <span className="ml-5 text-[10px] text-surface-400">
                    {example.language}
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(example.code)}
                  title={t('pg.copy')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleGenerateCodeImage(example.code, example.language)}
                  title={t('pg.codeImage')}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="bg-surface-900 px-4 py-3 dark:bg-black">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-surface-100">
                <code>{example.code}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderHashtagsContent = () => {
    const hashtags = currentVariation?.hashtags ?? []
    if (hashtags.length === 0) return null
    return (
      <div className="divide-y divide-surface-200 dark:divide-surface-800">
        {hashtags.map((hashtag, index) => (
          <div
            key={`${hashtag.tag}-${index}`}
            className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Tag className="h-3.5 w-3.5 shrink-0 text-primary-600" />
              <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-50">
                #{hashtag.tag.replace(/^#/, '')}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Badge variant="neutral" size="sm" className="text-[10px]">
                {hashtag.relevance}
              </Badge>
              {hashtag.estimated_volume && (
                <span className="text-[11px] text-surface-400">
                  {hashtag.estimated_volume}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(hashtag.tag)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderHooksContent = () => {
    const hooks = currentVariation?.hooks ?? []
    if (hooks.length === 0) return null
    return (
      <div className="divide-y divide-surface-200 dark:divide-surface-800">
        {hooks.map((hook, index) => (
          <div
            key={`${hook.text.slice(0, 20)}-${index}`}
            className="group flex gap-3 py-4 first:pt-0 last:pb-0"
          >
            <span className="shrink-0 pt-0.5 text-[11px] text-surface-400">
              {String(index + 1).padStart(2, '0')}
            </span>

            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="primary" size="sm" className="text-[10px]">
                  {hook.type}
                </Badge>
              </div>

              <p className="text-xs font-medium leading-relaxed text-surface-900 dark:text-surface-50">
                {hook.text}
              </p>

              {hook.why_it_works && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-surface-400">
                  <span className="font-medium text-surface-600 dark:text-surface-300">
                    {t('pg.whyItWorks')}
                  </span>{' '}
                  {hook.why_it_works}
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(hook.text)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
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
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            {t('pg.resultsTitle')}
          </h2>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t('pg.resultsSubtitle')}
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
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                currentVariation?.variation === post.variation
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400'
                  : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800',
              )}
            >
              {t('pg.variation', { n: post.variation })}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 border-b border-surface-200 dark:border-surface-800">
        <div className="flex flex-wrap gap-1">
          {availableTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as ResultTab)}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors',
                  effectiveTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-surface-50',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t(tab.labelKey)}</span>

                {tab.count > 0 && (
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
