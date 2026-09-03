import { useState, Fragment } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Lightbulb,
  History,
  Code,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useUIStore } from '../store'
import { Button } from '@/components/ui/Button'

const navigation = [
  { name: 'Playground', href: '/playground', icon: LayoutDashboard },
  { name: 'Temas Sugeridos', href: '/topics', icon: Lightbulb },
  { name: 'Histórico', href: '/history', icon: History },
  { name: 'Imagem de Código', href: '/code-image', icon: Code },
  { name: 'Configurações', href: '/settings', icon: Settings },
]

export function Layout() {
  const location = useLocation()
  const { sidebarOpen, darkMode, toggleDarkMode, toggleSidebar, setSidebarOpen } = useUIStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex h-screen">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 transition-all duration-300 ease-in-out flex flex-col lg:static',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
        aria-label="Menu principal"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-surface-200 dark:border-surface-700 min-h-[64px]">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="font-semibold text-surface-900 dark:text-surface-50 truncate">TryMyPost</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 truncate">Gerador de Posts</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" role="navigation" aria-label="Navegação principal">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive: active }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  'text-surface-600 dark:text-surface-400',
                  active
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'hover:bg-surface-100 dark:hover:bg-surface-800',
                  !sidebarOpen && 'justify-center px-2'
                )}
                aria-current={isActive ? 'page' : undefined}
                title={sidebarOpen ? undefined : item.name}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {sidebarOpen && <span className="font-medium text-sm truncate">{item.name}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Preferences Section */}
        <div className="p-3 border-t border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5 text-surface-400" aria-hidden="true" />
              {sidebarOpen && (
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Modo Escuro</span>
              )}
            </div>
            <button
              onClick={toggleDarkMode}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                darkMode ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'
              )}
              role="switch"
              aria-checked={darkMode}
              aria-label={darkMode ? 'Desativar modo escuro' : 'Ativar modo escuro'}
            >
              <span
                className={cn(
                  'translate-x-1 bg-white shadow-lg',
                  darkMode ? 'translate-x-6' : ''
                )}
              >
                <span className="inline-block h-4 w-4 rounded-full" />
              </span>
            </button>
          </div>
        </div>

        {/* Collapse button (desktop) */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'absolute -right-2 top-1/2 -translate-y-1/2 lg:block hidden p-2 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors shadow-md',
            sidebarOpen ? 'rotate-180' : ''
          )}
          aria-label={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
          aria-expanded={sidebarOpen}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </aside>

      {/* Main content */}
      <div className={cn(
        'flex-1 min-w-0 transition-all duration-300 h-screen lg:h-full',
        'lg:pl-20',  // collapsed sidebar width
        sidebarOpen ? 'lg:pl-64' : ''  // open sidebar width
      )}>
        {/* Mobile header */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="font-semibold text-surface-900 dark:text-surface-50">TryMyPost</h1>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
              aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
            >
              {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </button>
          </div>
        </header>

        <main className={cn('pt-16 lg:pt-0 h-full min-h-screen', mobileMenuOpen ? 'overflow-hidden' : '')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
