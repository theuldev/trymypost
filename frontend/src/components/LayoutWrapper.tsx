import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Sun, Moon } from 'lucide-react'
import { cn } from '../utils/cn'
import { useUIStore } from '../store'
import { Sidebar } from './Sidebar'

export function LayoutWrapper() {
  const { sidebarOpen, darkMode, toggleDarkMode, toggleSidebar, setSidebarOpen } = useUIStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex h-screen overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content - flex-1 sem padding extra, sidebar já ocupa espaço no flex */}
      <div className="flex-1 min-w-0 h-screen lg:h-full transition-all duration-300">
        {/* Mobile header (fixed sobre o conteúdo) */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="font-semibold text-slate-900 dark:text-slate-50">TryMyPost</h1>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>
          </div>
        </header>

        <main className={cn('pt-16 lg:pt-0 h-full overflow-y-auto overflow-x-hidden', mobileMenuOpen ? 'overflow-hidden' : '')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}