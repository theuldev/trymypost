import { cn } from '@/utils/cn'
import type { LucideIcon } from 'lucide-react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Segmento no estilo das tabs do Exportar Código (Code / From Post). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'flex w-fit items-center gap-1 rounded-md bg-surface-100 p-1 dark:bg-surface-800',
        className,
      )}
      role="tablist"
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const active = optionValue === value
        return (
          <button
            key={optionValue}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(optionValue)}
            className={cn(
              'flex items-center gap-1.5 rounded px-3 py-1 text-[11px] font-medium transition-colors',
              active
                ? 'bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-surface-50'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </button>
        )
      })}
    </div>
  )
}
