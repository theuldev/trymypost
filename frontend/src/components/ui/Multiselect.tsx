import { useState, useRef, useEffect } from 'react'
import { X, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface MultiSelectOption {
  value: string
  label: string
  icon?: React.ReactNode // emoji, ícone ou <img> de avatar
}

export interface MultiSelectProps {
  label?: string
  hint?: string
  helpTooltip?: string
  placeholder?: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  maxItems?: number
  chipVariant?: 'primary' | 'secondary' // azul-sólido (Categories) ou azul-claro (Tags)
}

export function MultiSelect({
  label, hint, placeholder = 'Selecione...', options, value, onChange, maxItems, chipVariant = 'primary',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = options.filter((o) => value.includes(o.value))
  const available = options.filter((o) => !value.includes(o.value))
  const atLimit = maxItems ? value.length >= maxItems : false

  const toggle = (val: string) => {
    if (value.includes(val)) onChange(value.filter((v) => v !== val))
    else if (!atLimit) onChange([...value, val])
  }

  const chipClasses = chipVariant === 'primary'
    ? 'bg-blue-600 text-white'
    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'

  return (
    <div className="w-full" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
          {label}
        </label>
      )}
      <div
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex flex-wrap items-center gap-1.5 min-h-[42px] w-full px-2 py-1.5 bg-white dark:bg-slate-900',
          'border rounded-xl cursor-text transition-all duration-150',
          isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200 dark:border-slate-700'
        )}
      >
        {selected.map((opt) => (
          <span
            key={opt.value}
            className={cn('flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium', chipClasses)}
          >
            {opt.icon}
            {opt.label}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(opt.value) }}
              className="hover:opacity-70 rounded-full"
              aria-label={`Remover ${opt.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {selected.length === 0 && (
          <span className="px-1.5 text-sm text-slate-400">{placeholder}</span>
        )}
        <ChevronsUpDown className="h-4 w-4 text-slate-400 ml-auto mr-1 flex-shrink-0" />
      </div>

      {isOpen && available.length > 0 && (
        <ul className="relative">
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
            {available.map((opt) => (
              <li
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="flex items-center gap-2 px-3.5 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {opt.icon}
                {opt.label}
              </li>
            ))}
          </div>
        </ul>
      )}

      {hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}