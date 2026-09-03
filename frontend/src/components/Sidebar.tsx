import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Lightbulb,
  History,
  Code,
  Settings,
  ChevronLeft,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '../utils/cn'
import { useUIStore } from '../store'

const navigation = [
  { name: 'Playground', href: '/playground', icon: LayoutDashboard },
  { name: 'Temas Sugeridos', href: '/topics', icon: Lightbulb },
  { name: 'Histórico', href: '/history', icon: History },
  { name: 'Imagem de Código', href: '/code-image', icon: Code },
  { name: 'Configurações', href: '/settings', icon: Settings },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

export function Sidebar({ isOpen, onToggle, onClose }: SidebarProps) {
  const location = useLocation()
  const { darkMode, toggleDarkMode } = useUIStore()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out flex flex-col lg:static overflow-hidden',
        isOpen ? 'w-64' : 'w-20'
      )}
      aria-label="Menu principal"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700 min-h-[64px]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        {isOpen && (
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="font-semibold text-slate-900 dark:text-slate-50 truncate">TryMyPost</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Gerador de Posts</p>
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
                'text-slate-600 dark:text-slate-400',
                active
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                !isOpen && 'justify-center px-2'
              )}
              aria-current={isActive ? 'page' : undefined}
              title={isOpen ? undefined : item.name}
              onClick={onClose}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {isOpen && <span className="font-medium text-sm truncate">{item.name}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Preferences Section */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="h-5 w-5 text-slate-400" aria-hidden="true" />
            {isOpen && (
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Modo Escuro</span>
            )}
          </div>
          <button
            onClick={toggleDarkMode}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              darkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
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

      {/* Collapse button (desktop) - inside sidebar */}
      <button
        onClick={onToggle}
        className={cn(
          'lg:block hidden w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mt-auto mx-3',
          isOpen ? 'rotate-180' : ''
        )}
        aria-label={isOpen ? 'Recolher menu' : 'Expandir menu'}
        aria-expanded={isOpen}
      >
        <ChevronLeft className="h-5 w-5 mx-auto" />
      </button>
    </aside>
  )
}