import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode      // avatar, bandeira ou ícone
  meta?: string         // texto secundário, ex: "(+998)"
}

export interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  hint?: string
  className?: string
}

export function Select({ options, value, onChange, placeholder, label, error, hint, className }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('w-full', className)} ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-900 dark:text-slate-50 mb-1 uppercase tracking-wide">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-left bg-white dark:bg-slate-900 border rounded-xl',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150',
            error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selected?.icon}
          <span className="flex-1 truncate text-slate-900 dark:text-slate-100">
            {selected?.label || placeholder || 'Selecione...'}
          </span>
          {selected?.meta && <span className="text-slate-400 text-sm">{selected.meta}</span>}
          <ChevronsUpDown className={cn('h-4 w-4 text-slate-400 transition-transform duration-200 flex-shrink-0', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150"
            role="listbox"
            aria-activedescendant={value}
          >
            {options.map((opt) => (
              <li
                key={opt.value}
                id={opt.value}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => { onChange(opt.value); setIsOpen(false) }}
                className={cn(
                  'flex items-center gap-2.5 px-3.5 py-2 text-sm cursor-pointer transition-colors duration-100',
                  opt.value === value 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 font-medium' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                {opt.icon}
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.meta && <span className="text-slate-400 text-xs">{opt.meta}</span>}
                {opt.value === value && (
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </li>
            ))}
          </div>
        )}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}