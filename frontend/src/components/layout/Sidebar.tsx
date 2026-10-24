import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Lightbulb,
  History,
  CalendarDays,
  Database,
  Image,
  Edit3,
  Settings,
  Moon,
  ChevronLeft,
  Mail,
  Inbox,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store'
import { useTranslation } from '@/i18n'
import { Switch } from '@/components/ui'

const navigationSections = [
  {
    key: 'navigation',
    items: [
      { key: 'playground', href: '/', icon: LayoutDashboard, end: true },
      { key: 'topics', href: '/topics', icon: Lightbulb },
      { key: 'history', href: '/history', icon: History },
      { key: 'calendar', href: '/calendar', icon: CalendarDays },
      { key: 'storage', href: '/storage', icon: Database },
    ],
  },
  {
    key: 'email',
    items: [
      { key: 'emailGeneration', href: '/emails', icon: Mail, end: true  },
      { key: 'emailHistory', href: '/emails/history', icon: Inbox },
    ],
  },
  {
    key: 'audit',
    items: [
      { key: 'audit', href: '/audit', icon: ClipboardList },
    ],
  },
  {
    key: 'tools',
    items: [
      { key: 'codeImage', href: '/tools/code-image', icon: Image },
      { key: 'editor', href: '/tools/editor', icon: Edit3 },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

export function Sidebar({ isOpen, onToggle, onClose }: SidebarProps) {
  const location = useLocation()
  const { darkMode, toggleDarkMode } = useUIStore()
  const { t } = useTranslation()

const navigationItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors duration-150',
    isActive
      ? 'bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 font-medium'
      : 'text-surface-700 dark:text-surface-300 hover:bg-surface-100/60 dark:hover:bg-surface-800/50 hover:text-surface-900 dark:hover:text-surface-100',
    !isOpen && 'justify-center px-2'
  )

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 transition-all duration-300 ease-in-out flex flex-col lg:static overflow-hidden select-none',
        isOpen ? 'w-64 p-4' : 'w-20 p-3'
      )}
      aria-label={t('sidebar.mainMenu')}
    >
      <div className="flex-1 overflow-y-auto space-y-4">
        {navigationSections.map((section) => (
          <div key={section.key}>
            {isOpen && (
              <p className="px-3 pb-1.5 text-[11px] font-medium text-surface-400 dark:text-surface-500">
                {t(`sidebar.${section.key}`)}
              </p>
            )}

            <nav className="space-y-0.5">
             {section.items.map((item) => {
  const label = t(`sidebar.${item.key}`)
  const Icon = item.icon

  return (
    <NavLink
      key={item.key}
      to={item.href}
      end={item.end}
      onClick={onClose}
      className={navigationItemClass}
      title={!isOpen ? label : undefined}
    >
      <Icon className="h-4 w-4 flex-shrink-0 text-surface-500 dark:text-surface-400" />

      {isOpen && (
        <span className="truncate">
          {label}
        </span>
      )}
    </NavLink>
  )
})}
            </nav>
          </div>
        ))}

        <div>
          <div
            className={cn(
              'flex items-center justify-between px-3 py-1.5 rounded-md text-xs text-surface-700 dark:text-surface-300',
              !isOpen && 'justify-center px-2'
            )}
          >
            <div className="flex items-center gap-2.5">
              <Moon className="h-4 w-4 flex-shrink-0 text-surface-500 dark:text-surface-400" />

              {isOpen && (
                <span>{t('sidebar.darkMode')}</span>
              )}
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
        </div>

        <div className="pt-2 border-t border-surface-200 dark:border-surface-800">
          <nav className="space-y-0.5">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={navigationItemClass}
              title={!isOpen ? t('sidebar.settings') : undefined}
            >
              <Settings className="h-4 w-4 flex-shrink-0 text-surface-500 dark:text-surface-400" />

              {isOpen && (
                <span className="truncate">
                  {t('sidebar.settings')}
                </span>
              )}
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
        aria-label={
          isOpen
            ? t('sidebar.collapse')
            : t('sidebar.expand')
        }
      >
        <ChevronLeft
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            !isOpen && 'rotate-180'
          )}
        />
      </button>
    </aside>
  )
}
