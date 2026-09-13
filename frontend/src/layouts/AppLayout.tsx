import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useUIStore } from '@/store'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export function AppLayout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-50 dark:bg-surface-950">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuOpen={() => setMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
