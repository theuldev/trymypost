import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'secondary' | 'danger' | 'primary'
  children: React.ReactNode
  ariaLabel?: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 'sm', variant = 'ghost', children, ariaLabel, className, ...rest }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8 p-0',
      md: 'h-10 w-10 p-0',
      lg: 'h-12 w-12 p-0',
    }

    const variantClasses = {
      ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
      secondary: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700',
      danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
      primary: 'text-white bg-blue-600 hover:bg-blue-700',
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        aria-label={ariaLabel}
        {...rest}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'