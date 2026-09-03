import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { Upload } from 'lucide-react'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  hint?: string
  onChange?: (value: string) => void
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, onChange, className, id, value, type = 'text', ...rest }, ref) => {
    const inputId = id || rest.name || 'input'

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-900 dark:text-slate-50 mb-1 uppercase tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          className={cn(
            'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border rounded-xl',
            'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150',
            error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
          )}
          aria-invalid={error ? 'true' : 'false'}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        />
        <div className="flex items-center justify-between mt-1.5">
          {hint && !error ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          ) : error ? (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
          ) : <span />}
        </div>
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string
  error?: string
  hint?: string
  maxLength?: number
  onChange?: (value: string) => void
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, maxLength, onChange, className, id, value, ...rest }, ref) => {
    const textareaId = id || rest.name || 'textarea'
    const length = typeof value === 'string' ? value.length : 0

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={cn(
            'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border rounded-xl resize-y min-h-[100px]',
            'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150',
            error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
          )}
          aria-invalid={error ? 'true' : 'false'}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        />
        <div className="flex items-center justify-between mt-1.5">
          {hint && !error ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          ) : error ? (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
          ) : <span />}
          {maxLength && (
            <span className={cn('text-xs', length > maxLength ? 'text-red-500' : 'text-slate-400')}>
              {length}/{maxLength}
            </span>
          )}
        </div>
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...rest }, ref) => (
    <label
      ref={ref}
      className={cn('block text-sm font-medium text-slate-700 dark:text-slate-300', className)}
      {...rest}
    >
      {children}
    </label>
  )
)

Label.displayName = 'Label'

export interface FileInputProps {
  label?: string
  error?: string
  hint?: string
  accept?: string
  onChange?: (file: File | null) => void
  multiple?: boolean
  value?: File | null
  className?: string
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ label, error, hint, accept, onChange, className, id, multiple, value, ...rest }, ref) => {
    const inputId = id || rest.name || 'file-input'

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-900 dark:text-slate-50 mb-1 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="file"
            multiple={multiple}
            accept={accept}
            className={cn(
              'absolute inset-0 w-full h-full opacity-0 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            )}
            onChange={(e) => onChange?.(e.target.files?.[0] ?? null)}
            aria-invalid={error ? 'true' : 'false'}
            {...rest}
          />
          <div className={cn(
            'flex items-center gap-3 px-3.5 py-2.5 border rounded-xl transition-all duration-150',
            'bg-white dark:bg-slate-900',
            'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
          )}>
            <Upload className="h-5 w-5 text-slate-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm text-slate-900 dark:text-slate-100 truncate">
                {value ? value.name : (multiple ? 'Selecione arquivos...' : 'Selecione um arquivo...')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          {hint && !error ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          ) : error ? (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
          ) : <span />}
        </div>
      </div>
    )
  }
)

FileInput.displayName = 'FileInput'