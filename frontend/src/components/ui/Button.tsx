import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      'inline-flex items-center justify-center',
      'gap-1.5',
      'font-medium',
      'rounded-md',
      'whitespace-nowrap',
      'transition-colors duration-150',
      'focus:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-primary-500/30',
      'focus-visible:ring-offset-1',
      'disabled:pointer-events-none',
      'disabled:opacity-50',
      fullWidth && 'w-full'
    )

    const variantClasses = {
      primary: cn(
        'bg-primary-600 text-white',
        'hover:bg-primary-700',
        'active:bg-primary-800'
      ),

      secondary: cn(
        'border border-surface-200',
        'bg-white text-surface-700',
        'hover:bg-surface-50',
        'active:bg-surface-100',
        'dark:border-surface-700',
        'dark:bg-surface-900',
        'dark:text-surface-200',
        'dark:hover:bg-surface-800',
        'dark:active:bg-surface-700'
      ),

      ghost: cn(
        'bg-transparent',
        'text-surface-600',
        'hover:bg-surface-100',
        'hover:text-surface-900',
        'active:bg-surface-200',
        'dark:text-surface-400',
        'dark:hover:bg-surface-800',
        'dark:hover:text-surface-100',
        'dark:active:bg-surface-700'
      ),

      danger: cn(
        'bg-red-600 text-white',
        'hover:bg-red-700',
        'active:bg-red-800'
      ),
    }

    const sizeClasses = {
      sm: cn(
        'min-h-7',
        'px-2.5 py-1',
        'text-xs',
        'gap-1'
      ),

      md: cn(
        'min-h-8',
        'px-3 py-1.5',
        'text-xs',
        'gap-1.5'
      ),

      lg: cn(
        'min-h-9',
        'px-4 py-2',
        'text-sm',
        'gap-1.5'
      ),
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <svg
            className="h-3.5 w-3.5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2.5"
            />

            <path
              className="opacity-90"
              fill="currentColor"
              d="M21 12a9 9 0 0 1-9 9v-2.5a6.5 6.5 0 0 0 6.5-6.5H21Z"
            />
          </svg>
        ) : (
          leftIcon && (
            <span className="flex shrink-0 items-center">
              {leftIcon}
            </span>
          )
        )}

        <span>{children}</span>

        {!loading && rightIcon && (
          <span className="flex shrink-0 items-center">
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
