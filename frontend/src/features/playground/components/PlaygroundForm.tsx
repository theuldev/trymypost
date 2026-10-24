import { Input, Select, Switch, Slider } from '@/components/ui'
import type { GeneratePostRequest } from '@/types'
import { useTranslation } from '@/i18n'

import {
  AUDIENCE_OPTIONS,
  EXPERIENCE_OPTIONS,
  FORMAT_OPTIONS,
  LANGUAGE_OPTIONS,
  OBJECTIVE_OPTIONS,
  QUANTITY_OPTIONS,
  STYLE_OPTIONS,
} from '@/constants/playground'

export type UpdateFormField = <K extends keyof GeneratePostRequest>(
  field: K,
  value: GeneratePostRequest[K],
) => void

interface PlaygroundFormProps {
  formData: GeneratePostRequest
  updateFormField: UpdateFormField
  isSubmitting: boolean
  isGenerating: boolean
}

export function PlaygroundForm({
  formData,
  updateFormField,
  isSubmitting,
  isGenerating,
}: PlaygroundFormProps) {
  const { t } = useTranslation()

  return (
    <div className="mt-8 space-y-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            {t('pg.topicTitle')}
          </h2>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t('pg.topicSubtitle')}
          </p>
        </div>

        <Input
          value={formData.topic}
          onChange={(value) => updateFormField('topic', value)}
          placeholder={t('pg.topicPlaceholder')}
          disabled={isSubmitting || isGenerating}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            {t('pg.configTitle')}
          </h2>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t('pg.configSubtitle')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('pg.styleLabel')}
            value={formData.style}
            onChange={(value) =>
              updateFormField('style', value as GeneratePostRequest['style'])
            }
            options={STYLE_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Select
            label={t('pg.audienceLabel')}
            value={formData.audience}
            onChange={(value) =>
              updateFormField('audience', value as GeneratePostRequest['audience'])
            }
            options={AUDIENCE_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Select
            label={t('pg.experienceLabel')}
            value={formData.experience}
            onChange={(value) =>
              updateFormField('experience', value as GeneratePostRequest['experience'])
            }
            options={EXPERIENCE_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Select
            label={t('pg.goalLabel')}
            value={formData.objective}
            onChange={(value) =>
              updateFormField('objective', value as GeneratePostRequest['objective'])
            }
            options={OBJECTIVE_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            {t('pg.contentTitle')}
          </h2>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t('pg.contentSubtitle')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('pg.formatLabel')}
            value={formData.format}
            onChange={(value) =>
              updateFormField('format', value as GeneratePostRequest['format'])
            }
            options={FORMAT_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Select
            label={t('pg.quantityLabel')}
            value={String(formData.quantity)}
            onChange={(value) => updateFormField('quantity', Number(value))}
            options={QUANTITY_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Slider
            label={t('pg.postSizeLabel')}
            value={formData.max_length ?? 2000}
            onChange={(value) => updateFormField('max_length', value)}
            min={10}
            max={10000}
            step={100}
            disabled={isSubmitting || isGenerating || formData.max_length == null}
            minLabel={t('pg.chars', { n: 10 })}
            maxLabel={t('pg.chars', { n: 10000 })}
          />

          <div className="flex items-end pb-0.5">
            <Switch
              checked={formData.max_length == null}
              onChange={(checked) =>
                updateFormField('max_length', checked ? undefined : 2000)
              }
              label={t('pg.autoLength')}
              description={t('pg.autoLengthDesc')}
              disabled={isSubmitting || isGenerating}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            {t('pg.optionsTitle')}
          </h2>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t('pg.optionsSubtitle')}
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-800">
          <div className="divide-y divide-surface-200 dark:divide-surface-800">
            <div className="px-4 py-3">
              <Switch
                checked={formData.include_code}
                onChange={(checked) => updateFormField('include_code', checked)}
                label={t('pg.includeCode')}
                description={t('pg.includeCodeDesc')}
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Switch
                checked={formData.include_visual}
                onChange={(checked) => updateFormField('include_visual', checked)}
                label={t('pg.includeVisual')}
                description={t('pg.includeVisualDesc')}
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Switch
                checked={formData.include_hashtags ?? true}
                onChange={(checked) => updateFormField('include_hashtags', checked)}
                label={t('pg.genHashtags')}
                description={t('pg.genHashtagsDesc')}
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Switch
                checked={formData.include_hooks ?? true}
                onChange={(checked) => updateFormField('include_hooks', checked)}
                label={t('pg.genHooks')}
                description={t('pg.genHooksDesc')}
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Switch
                checked={formData.include_review ?? true}
                onChange={(checked) => updateFormField('include_review', checked)}
                label={t('pg.qualityReview')}
                description={t('pg.qualityReviewDesc')}
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Switch
                checked={formData.use_rag ?? false}
                onChange={(checked) => updateFormField('use_rag', checked)}
                label={t('pg.useRag')}
                description={t('pg.useRagDesc')}
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Select
                label={t('pg.languageLabel')}
                value={formData.language}
                onChange={(value) =>
                  updateFormField('language', value as GeneratePostRequest['language'])
                }
                options={LANGUAGE_OPTIONS}
                disabled={isSubmitting || isGenerating}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
