import {
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  LabelHTMLAttributes,
} from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/utils/cn'


export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  hint?: string
  onChange?: (value: string) => void
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      onChange,
      className,
      id,
      value,
      type = 'text',
      ...rest
    },
    ref
  ) => {
    const inputId = id || rest.name || 'input'

    return (
      <div className={cn('w-full', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-xs font-medium text-surface-700 dark:text-surface-300"
          >
            {label}
          </label>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value}
          className={cn(
            'w-full min-h-8 px-3 py-1.5',
            'rounded-md',
            'border bg-white dark:bg-surface-900',
            'text-xs text-surface-800 dark:text-surface-200',
            'placeholder:text-surface-400 dark:placeholder:text-surface-500',
            'transition-colors duration-150',
            'focus:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-primary-500/30',
            'disabled:cursor-not-allowed',
            'disabled:opacity-50',
            error
              ? 'border-red-500 focus-visible:ring-red-500/20'
              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
          )}
          aria-invalid={error ? 'true' : 'false'}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        />

        {/* Hint / Error */}
        {(hint || error) && (
          <div className="mt-1">
            {error ? (
              <p
                className="text-[11px] leading-relaxed text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-surface-400 dark:text-surface-500">
                {hint}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

/* -------------------------------------------------------------------------- */
/*                                 TEXTAREA                                   */
/* -------------------------------------------------------------------------- */

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string
  error?: string
  hint?: string
  maxLength?: number
  onChange?: (value: string) => void
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      maxLength,
      onChange,
      className,
      id,
      value,
      ...rest
    },
    ref
  ) => {
    const textareaId = id || rest.name || 'textarea'
    const length = typeof value === 'string' ? value.length : 0

    return (
      <div className={cn('w-full', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1 block text-xs font-medium text-surface-700 dark:text-surface-300"
          >
            {label}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          className={cn(
            'w-full min-h-[88px] px-3 py-2',
            'rounded-md',
            'border bg-white dark:bg-surface-900',
            'text-xs leading-relaxed',
            'text-surface-800 dark:text-surface-200',
            'placeholder:text-surface-400 dark:placeholder:text-surface-500',
            'resize-y',
            'transition-colors duration-150',
            'focus:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-primary-500/30',
            'disabled:cursor-not-allowed',
            'disabled:opacity-50',
            error
              ? 'border-red-500 focus-visible:ring-red-500/20'
              : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
          )}
          aria-invalid={error ? 'true' : 'false'}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        />

        {/* Hint / Counter / Error */}
        {(hint || error || maxLength) && (
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              {error ? (
                <p
                  className="text-[11px] leading-relaxed text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {error}
                </p>
              ) : hint ? (
                <p className="text-[11px] leading-relaxed text-surface-400 dark:text-surface-500">
                  {hint}
                </p>
              ) : null}
            </div>

            {maxLength && (
              <span
                className={cn(
                  'shrink-0 text-[10px]',
                  length > maxLength
                    ? 'text-red-500'
                    : 'text-surface-400 dark:text-surface-500'
                )}
              >
                {length}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

/* -------------------------------------------------------------------------- */
/*                                    LABEL                                   */
/* -------------------------------------------------------------------------- */

export interface LabelProps
  extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...rest }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block text-xs font-medium',
        'text-surface-700 dark:text-surface-300',
        className
      )}
      {...rest}
    >
      {children}
    </label>
  )
)

Label.displayName = 'Label'

/* -------------------------------------------------------------------------- */
/*                                 FILE INPUT                                 */
/* -------------------------------------------------------------------------- */

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
  (
    {
      label,
      error,
      hint,
      accept,
      onChange,
      className,
      id,
      multiple,
      value,
      disabled,
      ...rest
    },
    ref
  ) => {
    const inputId = id || rest.name || 'file-input'

    return (
      <div className={cn('w-full', className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-xs font-medium text-surface-700 dark:text-surface-300"
          >
            {label}
          </label>
        )}

        {/* File selector */}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="file"
            multiple={multiple}
            accept={accept}
            disabled={disabled}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            onChange={(e) =>
              onChange?.(e.target.files?.[0] ?? null)
            }
            aria-invalid={error ? 'true' : 'false'}
            {...rest}
          />

          <div
            className={cn(
              'flex min-h-8 items-center gap-2',
              'rounded-md',
              'border px-3 py-1.5',
              'bg-white dark:bg-surface-900',
              'transition-colors duration-150',

              disabled && 'cursor-not-allowed opacity-50',

              error
                ? 'border-red-500'
                : cn(
                    'border-surface-200 dark:border-surface-700',
                    'hover:border-surface-300 dark:hover:border-surface-600'
                  )
            )}
          >
            {/* Icon */}
            <Upload
              className="h-3.5 w-3.5 shrink-0 text-surface-400 dark:text-surface-500"
              aria-hidden="true"
            />

            {/* Filename */}
            <span className="min-w-0 flex-1 truncate text-xs text-surface-700 dark:text-surface-300">
              {value
                ? value.name
                : multiple
                  ? 'Selecione arquivos...'
                  : 'Selecione um arquivo...'}
            </span>
          </div>
        </div>

        {/* Hint / Error */}
        {(hint || error) && (
          <div className="mt-1">
            {error ? (
              <p
                className="text-[11px] leading-relaxed text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-surface-400 dark:text-surface-500">
                {hint}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

FileInput.displayName = 'FileInput'

export default Input
