import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { Label } from './Label'
import type { LabelProps } from './Label'

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  minLabel?: string
  maxLabel?: string
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      label,
      minLabel,
      maxLabel,
      min = 0,
      max = 100,
      step = 1,
      className,
      disabled,
      value,
      onChange,
      ...rest
    },
    ref,
  ) => {
    const id = `slider-${Math.random().toString(36).slice(2, 9)}`

    return (
      <div className={cn('space-y-1.5', className)}>
        {label && (
          <label className="flex items-center justify-between text-xs mb-1">
            <Label className="mb-0 text-xs flex items-center gap-1.5">
              {label}
              <span className="text-[10px] text-surface-400 font-medium">
                {minLabel ?? min} - {maxLabel ?? max}
              </span>
            </Label>
            <span className="text-xs font-mono font-medium text-primary-600 dark:text-primary-400 min-w-[3.5rem] text-right">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
          </label>
        )}
        <input
          ref={ref}
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange?.(Number(e.target.value))}
          disabled={disabled}
          className={cn(
            'w-full h-1.5 bg-surface-200 dark:bg-surface-800 rounded-lg appearance-none cursor-pointer accent-primary-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          {...rest}
        />
      </div>
    )
  }
)

Slider.displayName = 'Slider'