import { forwardRef, useRef, useState, InputHTMLAttributes, MouseEvent, ChangeEvent } from 'react'
import { cn } from '@/utils/cn'
import { Upload, File, X } from 'lucide-react'

export interface FileInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  hint?: string
  accept?: string
  onChange?: (file: File | null) => void
  className?: string
  multiple?: boolean
  showFileName?: boolean
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ label, error, hint, accept, onChange, className, multiple, showFileName = true, id, ...rest }, ref) => {
    const inputId = id || rest.name || 'file-input'
    const inputRef = useRef<HTMLInputElement>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null
      setSelectedFile(file)
      onChange?.(file)
    }

    const clearFile = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setSelectedFile(null)
      onChange?.(null)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-900 dark:text-slate-50 mb-1 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            className={cn(
              'absolute inset-0 w-full h-full opacity-0 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            )}
            onChange={handleChange}
            aria-invalid={error ? 'true' : 'false'}
            {...rest}
          />
          <div className={cn(
            'flex items-center gap-3 px-3.5 py-2.5 border rounded-xl transition-all duration-150',
            'bg-white dark:bg-slate-900',
            error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700',
            selectedFile ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'hover:border-slate-300 dark:hover:border-slate-600'
          )}>
            <Upload className="h-5 w-5 text-slate-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {selectedFile && showFileName ? (
                <>
                  <File className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm text-slate-900 dark:text-slate-100 truncate">{selectedFile.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Remover arquivo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {multiple ? 'Selecione arquivos...' : 'Selecione um arquivo...'}
                </span>
              )}
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