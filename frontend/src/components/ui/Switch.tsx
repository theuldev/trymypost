import { cn } from '@/utils/cn'

export interface SwitchProps {
  label?: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
}

export function Switch({ label, description, checked, onChange, id }: SwitchProps) {
  const switchId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={switchId}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors mt-0.5',
          checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
      <div>
        {label && (
          <label htmlFor={switchId} className="text-sm font-semibold text-slate-900 dark:text-slate-100 cursor-pointer">
            {label}
          </label>
        )}
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
    </div>
  )
} 