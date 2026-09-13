import { Plus } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'

import { Input, Select, Switch, Textarea, Slider } from '@/components/ui'
import type { GeneratePostRequest } from '@/types/common'
import { cn } from '@/utils/cn'

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
  showGuidelines: boolean
  setShowGuidelines: Dispatch<SetStateAction<boolean>>
  isSubmitting: boolean
  isGenerating: boolean
}

export function PlaygroundForm({
  formData,
  updateFormField,
  showGuidelines,
  setShowGuidelines,
  isSubmitting,
  isGenerating,
}: PlaygroundFormProps) {
  return (
    <div className="mt-8 space-y-6">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Topic
          </h2>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            What do you want to talk about?
          </p>
        </div>

        <Input
          value={formData.topic}
          onChange={(value) => updateFormField('topic', value)}
          placeholder="e.g. How AI is changing software development"
          disabled={isSubmitting || isGenerating}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Configuration
          </h2>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            Define who the content is for and how it should sound.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Writing style"
            value={formData.style}
            onChange={(value) =>
              updateFormField('style', value as GeneratePostRequest['style'])
            }
            options={STYLE_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Select
            label="Target audience"
            value={formData.audience}
            onChange={(value) =>
              updateFormField('audience', value as GeneratePostRequest['audience'])
            }
            options={AUDIENCE_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Select
            label="Experience level"
            value={formData.experience}
            onChange={(value) =>
              updateFormField('experience', value as GeneratePostRequest['experience'])
            }
            options={EXPERIENCE_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Select
            label="Content goal"
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
            Content
          </h2>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            Choose the structure and amount of content to generate.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Format"
            value={formData.format}
            onChange={(value) =>
              updateFormField('format', value as GeneratePostRequest['format'])
            }
            options={FORMAT_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Select
            label="Quantity"
            value={String(formData.quantity)}
            onChange={(value) => updateFormField('quantity', Number(value))}
            options={QUANTITY_OPTIONS}
            disabled={isSubmitting || isGenerating}
          />

          <Slider
            label="Post Size"
            value={formData.max_length ?? 2000}
            onChange={(value) => updateFormField('max_length', value)}
            min={10}
            max={10000}
            step={100}
            disabled={isSubmitting || isGenerating}
            minLabel="10 chars"
            maxLabel="10000 chars"
          />
        </div>

        <div>
          <Textarea
            label="Description"
            value={formData.guidelines}
            onChange={(value) => updateFormField('guidelines', value)}
            placeholder="Add additional context or details about the topic..."
            rows={4}
            disabled={isSubmitting || isGenerating}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Options
          </h2>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            Customize the generated content.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-800">
          <div className="divide-y divide-surface-200 dark:divide-surface-800">
            <div className="px-4 py-3">
              <Switch
                checked={formData.include_code}
                onChange={(checked) => updateFormField('include_code', checked)}
                label="Include code"
                description="Adds relevant code examples to the generated posts."
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Switch
                checked={formData.include_visual}
                onChange={(checked) => updateFormField('include_visual', checked)}
                label="Include visual"
                description="Generates a visual suggestion for the content."
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Switch
                checked={formData.include_hashtags ?? true}
                onChange={(checked) => updateFormField('include_hashtags', checked)}
                label="Generate hashtags"
                description="Generates popular and niche hashtags for the post."
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Switch
                checked={formData.include_hooks ?? true}
                onChange={(checked) => updateFormField('include_hooks', checked)}
                label="Generate hooks"
                description="Generates engaging opening hook variations."
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Switch
                checked={formData.include_review ?? true}
                onChange={(checked) => updateFormField('include_review', checked)}
                label="Quality review"
                description="Performs quality scoring, strengths, and improvement suggestions."
                disabled={isSubmitting || isGenerating}
              />
            </div>

            <div className="px-4 py-3">
              <Select
                label="Language"
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

      <section>
        <button
          type="button"
          onClick={() => setShowGuidelines((current) => !current)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
            'border-surface-200 hover:bg-surface-50',
            'dark:border-surface-800 dark:hover:bg-surface-900',
          )}
        >
          <div className="flex items-center gap-2">
            <Plus
              className={cn(
                'h-4 w-4 transition-transform',
                showGuidelines && 'rotate-45',
              )}
            />
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
                Additional guidelines
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Add specific instructions for the AI.
              </p>
            </div>
          </div>
        </button>

        {showGuidelines && (
          <div className="mt-3">
            <Textarea
              value={formData.guidelines}
              onChange={(value) => updateFormField('guidelines', value)}
              placeholder="Tell the AI anything else it should consider..."
              rows={5}
              disabled={isSubmitting || isGenerating}
            />
          </div>
        )}
      </section>
    </div>
  )
}
