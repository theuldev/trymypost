import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Lightbulb,
  History,
  Code,
  Edit3,
  Settings,
  Moon,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store'
import { Switch } from '@/components/ui'

const mainNavigation = [
  { name: 'Playground', href: '/playground', icon: LayoutDashboard },
  { name: 'Temas Sugeridos', href: '/topics', icon: Lightbulb },
  { name: 'Histórico', href: '/history', icon: History },
]

const toolsNavigation = [
  { name: 'Imagem de Código', href: '/code-image', icon: Code },
  { name: 'Editor de Posts', href: '/editor', icon: Edit3 },
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
        'fixed inset-y-0 left-0 z-50 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 transition-all duration-300 ease-in-out flex flex-col lg:static overflow-hidden select-none',
        isOpen ? 'w-64 p-4' : 'w-20 p-3'
      )}
      aria-label="Menu principal"
    >
      <div className={cn('flex items-center gap-3 pb-3 mb-2 border-b border-surface-200 dark:border-surface-800', !isOpen && 'justify-center')}>
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center font-semibold text-xs text-surface-700 dark:text-surface-200">
            TP
          </div>
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-surface-900" />
        </div>

        {isOpen && (
          <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
            <div className="truncate">
              <p className="text-xs font-semibold text-surface-800 dark:text-surface-200 truncate leading-tight">TryMyPost</p>
              <p className="text-[11px] text-surface-400 dark:text-surface-500 truncate leading-tight">gerador@trymypost.io</p>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
              Pro
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <div>
          {isOpen && (
            <p className="px-3 pb-1.5 text-[11px] font-medium text-surface-400 dark:text-surface-500">
              Navegação
            </p>
          )}
          <nav className="space-y-0.5">
            {mainNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive: active }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors duration-150',
                      active
                        ? 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 font-medium'
                        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100/60 dark:hover:bg-surface-800/50 hover:text-surface-900 dark:hover:text-surface-100',
                      !isOpen && 'justify-center px-2'
                    )
                  }
                  aria-current={isActive ? 'page' : undefined}
                  title={!isOpen ? item.name : undefined}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0 text-surface-500 dark:text-surface-400" />
                  {isOpen && <span className="truncate">{item.name}</span>}
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div>
          {isOpen && (
            <p className="px-3 pb-1.5 text-[11px] font-medium text-surface-400 dark:text-surface-500">
              Ferramentas
            </p>
          )}
          <nav className="space-y-0.5">
            {toolsNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={({ isActive: active }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors duration-150',
                      active
                        ? 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 font-medium'
                        : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100/60 dark:hover:bg-surface-800/50 hover:text-surface-900 dark:hover:text-surface-100',
                      !isOpen && 'justify-center px-2'
                    )
                  }
                  aria-current={isActive ? 'page' : undefined}
                  title={!isOpen ? item.name : undefined}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0 text-surface-500 dark:text-surface-400" />
                  {isOpen && <span className="truncate">{item.name}</span>}
                </NavLink>
              )
            })}

            <div
              className={cn(
                'flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-surface-700 dark:text-surface-300',
                !isOpen && 'justify-center px-2'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Moon className="h-4 w-4 flex-shrink-0 text-surface-500 dark:text-surface-400" />
                {isOpen && <span>Modo Escuro</span>}
              </div>
              {isOpen && (
                <Switch
                  label=""
                  checked={darkMode}
                  onChange={toggleDarkMode}
                  id="dark-mode-switch"
                />
              )}
            </div>
          </nav>
        </div>

        <div className="pt-2 border-t border-surface-200 dark:border-surface-800">
          <nav className="space-y-0.5">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive: active }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors duration-150',
                  active
                    ? 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 font-medium'
                    : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100/60 dark:hover:bg-surface-800/50 hover:text-surface-900 dark:hover:text-surface-100',
                  !isOpen && 'justify-center px-2'
                )
              }
              aria-current={location.pathname === '/settings' ? 'page' : undefined}
              title={!isOpen ? 'Configurações' : undefined}
            >
              <Settings className="h-4 w-4 flex-shrink-0 text-surface-500 dark:text-surface-400" />
              {isOpen && <span className="truncate">Configurações</span>}
            </NavLink>
          </nav>
        </div>
      </div>

      <button
        onClick={onToggle}
        className={cn(
          'hidden lg:flex items-center justify-center h-6 w-6 rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors mt-2 self-end',
          !isOpen && 'self-center'
        )}
        aria-label={isOpen ? 'Recolher menu' : 'Expandir menu'}
      >
        <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform duration-200', !isOpen && 'rotate-180')} />
      </button>
    </aside>
  )
}
