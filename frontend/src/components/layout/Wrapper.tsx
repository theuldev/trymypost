import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface WrapperProps {
  children: ReactNode
  className?: string
}

export function Wrapper({ children, className }: WrapperProps) {
  return (
    <div className={cn('mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}
