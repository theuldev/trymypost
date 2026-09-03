import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { LayoutWrapper } from './components/LayoutWrapper'
import { useUIStore } from './store'
import { cn } from './utils/cn'

const Playground = lazy(() => import('./pages/Playground'))
const SuggestedTopics = lazy(() => import('./pages/SuggestedTopics'))
const History = lazy(() => import('./pages/History'))
const HistoryDetail = lazy(() => import('./pages/HistoryDetail'))
const PostResult = lazy(() => import('./pages/PostResult'))
const CodeImage = lazy(() => import('./pages/CodeImage'))
const Settings = lazy(() => import('./pages/Settings'))

function AppContent() {
  const { darkMode } = useUIStore()

  return (
    <div className={cn('min-h-screen transition-colors duration-200', darkMode ? 'dark' : '')}>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Navigate to="/playground" replace />} />
          <Route element={<LayoutWrapper />}>
            <Route path="/playground" element={<Playground />} />
            <Route path="/topics" element={<SuggestedTopics />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<HistoryDetail />} />
            <Route path="/post/:id" element={<PostResult />} />
            <Route path="/code-image" element={<CodeImage />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            padding: '1rem',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
    </div>
  )
}

export function App() {
  return <AppContent />
}
