import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export interface CardProps {
  variant?: 'default' | 'bordered' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  children?: React.ReactNode
  onClick?: React.MouseEventHandler<HTMLDivElement>
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className, children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 shadow-card hover:shadow-card-hover transition-shadow duration-200',
      bordered: 'bg-white dark:bg-surface-900 border-2 border-surface-200 dark:border-surface-700',
      elevated: 'bg-white dark:bg-surface-900 shadow-lg border border-surface-100 dark:border-surface-800',
    }

    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-6',
    }

    return (
      <div
        ref={ref}
        className={cn('rounded-xl', variantClasses[variant], paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 py-4 border-b border-surface-200 dark:border-surface-700', className)} {...props}>
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

export const CardBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
)

CardBody.displayName = 'CardBody'

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 py-4 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 rounded-b-xl flex items-center gap-3', className)} {...props}>
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'
