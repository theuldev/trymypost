import { Menu, Moon } from 'lucide-react'
import { useUIStore } from '@/store'

interface HeaderProps {
  onMenuOpen: () => void
}

export function Header({ onMenuOpen }: HeaderProps) {
  const { darkMode, toggleDarkMode } = useUIStore()

  return (
    <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 shrink-0">
      <button
        onClick={onMenuOpen}
        className="p-1.5 rounded-md text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-150"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-xs font-semibold text-surface-800 dark:text-surface-200">
        TryMyPost
      </h1>
      <button
        onClick={toggleDarkMode}
        className="p-1.5 rounded-md text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-150"
        aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
      >
        <Moon className="h-5 w-5" />
      </button>
    </header>
  )
}
