// Checkbox.tsx
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface CheckboxProps {
  label?: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function Checkbox({ label, description, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'flex items-center justify-center h-5 w-5 rounded-md border flex-shrink-0 mt-0.5 transition-colors',
          checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 dark:border-slate-600'
        )}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </button>
      <div>
        {label && <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</span>}
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}