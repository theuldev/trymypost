import { forwardRef, LabelHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...rest }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('text-sm font-medium text-surface-900 dark:text-surface-50', className)}
        {...rest}
      />
    )
  }
)

Label.displayName = 'Label'