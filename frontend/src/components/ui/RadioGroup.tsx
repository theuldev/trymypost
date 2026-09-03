import { cn } from '@/utils/cn'

export interface RadioGroupProps {
  name: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function RadioGroup({ name, value, onChange, children, className }: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn('flex flex-wrap gap-3', className)}
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

export function RadioGroupItem({ value, children, className, disabled }: RadioGroupItemProps) {
  const id = `radio-${value.replace(/\s+/g, '-').toLowerCase()}`
  
  return (
    <label
      className={cn(
        'relative inline-flex items-center gap-2 cursor-pointer',
        'px-4 py-3 rounded-xl border-2 transition-all duration-150',
        'text-sm font-medium text-slate-900 dark:text-slate-100',
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-slate-50 dark:hover:bg-slate-800',
        'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
      )}
    >
      <input
        type="radio"
        name={id.split('-')[0]} // This is a simplification - in real app use context
        value={value}
        id={id}
        disabled={disabled}
        className="sr-only peer"
        aria-label={children as string}
      />
      <span className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150',
        'peer-checked:bg-blue-600 peer-checked:border-blue-600',
        'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2',
        'border-slate-300 dark:border-slate-600',
        'peer-checked:text-white',
        disabled && 'opacity-50'
      )}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </span>
      <span className="peer-disabled:opacity-50">{children}</span>
    </label>
  )
}