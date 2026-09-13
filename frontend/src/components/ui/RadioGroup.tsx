import { cn } from '@/utils/cn'

export interface RadioGroupProps {
  name: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function RadioGroup({
  name,
  value,
  onChange,
  children,
  className,
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        'flex flex-wrap gap-2',
        className
      )}
    >
      {children}
    </div>
  )
}

export interface RadioGroupItemProps {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function RadioGroupItem({
  value,
  children,
  className,
  disabled,
}: RadioGroupItemProps) {
  const id = `radio-${value.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <label
      htmlFor={id}
      className={cn(
        'relative inline-flex items-center gap-2',
        'min-h-8 px-3 py-1.5',
        'rounded-md border',
        'text-xs font-medium',
        'text-surface-700 dark:text-surface-300',
        'border-surface-200 dark:border-surface-700',
        'bg-white dark:bg-surface-900',
        'transition-colors duration-150',

        !disabled && [
          'cursor-pointer',
          'hover:bg-surface-50 dark:hover:bg-surface-800',
          'hover:border-surface-300 dark:hover:border-surface-600',
        ],

        disabled && [
          'cursor-not-allowed',
          'opacity-50',
        ],

        className
      )}
    >
      <input
        type="radio"
        value={value}
        id={id}
        disabled={disabled}
        className="peer sr-only"
      />

      <span
        className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center',
          'rounded-full border',
          'border-surface-300 dark:border-surface-600',
          'transition-colors duration-150',

          'peer-checked:border-primary-600',
          'peer-checked:bg-primary-600',

          'peer-focus-visible:ring-2',
          'peer-focus-visible:ring-primary-500/30',

          'peer-disabled:opacity-50'
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            'bg-white',
            'opacity-0',
            'transition-opacity duration-150',
            'peer-checked:opacity-100'
          )}
        />
      </span>

      <span className="truncate">
        {children}
      </span>
    </label>
  )
}