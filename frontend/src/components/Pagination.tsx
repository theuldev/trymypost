import { cn } from '@/utils/cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showPageNumbers?: boolean
  maxPageButtons?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  maxPageButtons = 5,
}: PaginationProps) {
  if (totalPages <= 1) return null

  let pages: number[] = []
  let start = 1
  let end = 1
  
  if (showPageNumbers) {
    start = Math.max(1, currentPage - Math.floor(maxPageButtons / 2))
    end = Math.min(totalPages, start + maxPageButtons - 1)
    
    if (end - start + 1 < maxPageButtons) {
      start = Math.max(1, end - maxPageButtons + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
  }

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Paginação">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {showPageNumbers && (
        <div className="flex items-center gap-1">
          {start > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  currentPage === 1
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
              >
                1
              </button>
              {start > 2 && (
                <span className="px-2 text-surface-400">...</span>
              )}
            </>
          )}
          
          {pages.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors min-w-[2.5rem]',
                currentPage === page
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              )}
            >
              {page}
            </button>
          ))}
          
          {end < totalPages && (
            <>
              {end < totalPages - 1 && (
                <span className="px-2 text-surface-400">...</span>
              )}
              <button
                onClick={() => onPageChange(totalPages)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  currentPage === totalPages
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                )}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Próxima página"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}
