import { cn } from '@/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline'
  size?: 'sm' | 'md'
}

export function Badge({ children, variant = 'neutral', size = 'md', className, ...props }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full font-medium transition-colors'
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  }
  
  const variantClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    neutral: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400',
    outline: 'bg-transparent border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400',
  }

  return (
    <span className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}>
      {children}
    </span>
  )
}
