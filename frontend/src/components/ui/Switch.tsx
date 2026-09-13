import { cn } from '@/utils/cn'

export interface SwitchProps {
  label?: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  id,
  disabled
}: SwitchProps) {
  const switchId =
    id || label?.toLowerCase().replace(/\s+/g, '-') || 'switch'

  return (
    <div className="flex items-start gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${switchId}-label` : undefined}
        aria-describedby={description ? `${switchId}-description` : undefined}
        id={switchId}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0',
          'items-center rounded-full',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2',
          'focus-visible:ring-primary-500/30',

          checked
            ? 'bg-primary-600'
            : 'bg-surface-200 dark:bg-surface-700',

          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none block h-3.5 w-3.5 rounded-full',
            'bg-white',
            'transition-transform duration-150',
            checked ? 'translate-x-4' : 'translate-x-1'
          )}
        />
      </button>

      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <label
              id={`${switchId}-label`}
              htmlFor={switchId}
              className={cn(
                'block text-xs font-medium',
                'text-surface-700 dark:text-surface-300',
                'cursor-pointer'
              )}
            >
              {label}
            </label>
          )}

          {description && (
            <p
              id={`${switchId}-description`}
              className="mt-0.5 text-[11px] leading-relaxed text-surface-500 dark:text-surface-400"
            >
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}