import { useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Trash2 } from "lucide-react"
import { useTranslation } from "@/i18n"
import { useUIStore } from "@/store"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { Modal } from "@/components/ui/Modal"
import { Pagination } from "@/components/Pagination"
import { emailApi } from "@/services/emails"
import type { EmailGenerationHistoryItem, EmailGenerationHistoryResponse } from "@/types"

const PAGE_SIZE = 10

export function EmailHistoryPage() {
  const navigate = useNavigate()
  const { t, language } = useTranslation()
  const { addToast } = useUIStore()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [search, setSearch] = useState("")
  const [history, setHistory] = useState<EmailGenerationHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const response: EmailGenerationHistoryResponse = await emailApi.listHistory({
        page,
        page_size: pageSize,
        search: search || undefined,
      })
      setHistory(response.items)
      setTotal(response.total)
    } catch {
      addToast({ type: "error", message: t("emailGeneration.history.loadError") })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, addToast, t])

  // Fetch on mount and whenever page/pageSize/search change
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleDelete = (id: string) => {
    setShowDeleteConfirm(id)
  }

  const confirmDelete = (id: string) => {
    emailApi.delete(id).then(() => {
      addToast({ type: "success", message: t("emailGeneration.history.toastDeleteSuccess") })
      fetchHistory()
    }).catch(() => {
      addToast({ type: "error", message: t("emailGeneration.history.toastDeleteError") })
    })
    setShowDeleteConfirm(null)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value))
    setPage(1)
  }

  const handlePageChange = (n: number) => {
    setPage(n)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center mb-8">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
            <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 002-2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            {t("emailGeneration.history.title")}
          </h1>

          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t("emailGeneration.history.subtitle")}
          </p>
        </header>

        <section className="space-y-3 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder={t("emailGeneration.history.searchPlaceholder")}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-surface-800 dark:text-surface-200 placeholder:text-surface-400"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 border-t border-surface-200 pt-4 dark:border-surface-800">
          {loading ? (
            <div className="divide-y divide-surface-200 dark:divide-surface-800">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-4 animate-pulse space-y-2">
                  <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-3/4" />
                  <div className="h-3 bg-surface-200 dark:bg-surface-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
                <svg className="h-4 w-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 002-2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
                {t("emailGeneration.history.empty")}
              </p>
              <p className="mt-1 text-[11px] text-surface-400">
                {search ? t("emailGeneration.history.adjustFilters") : "Clique em \"Gerar Novo E-mail\" para começar"}
              </p>
              {!search && (
                <Button
                  onClick={() => navigate("/emails")}
                  leftIcon={<svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                  className="mt-4"
                  size="sm"
                >
                  {t("emailGeneration.history.generateNew")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-[11px] text-surface-400">
                <span>
                  {t("emailGeneration.history.showing", { count: history.length, total })}
                </span>
                <Select
                  value={pageSize.toString()}
                  onChange={handlePageSizeChange}
                  options={[
                    { value: "5", label: t("emailGeneration.history.perPage", { count: 5 }) },
                    { value: "10", label: t("emailGeneration.history.perPage", { count: 10 }) },
                    { value: "20", label: t("emailGeneration.history.perPage", { count: 20 }) },
                  ]}
                  className="w-28"
                />
              </div>

              <div className="divide-y divide-surface-200 dark:divide-surface-800">
                {history.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => navigate(`/emails/history/${item.id}`)}
                    className="group py-4 transition-colors cursor-pointer hover:bg-surface-100/50 dark:hover:bg-surface-900/50 -mx-3 px-3 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className="text-[11px] text-surface-400">
                            {item.job_title}
                          </span>

                          {item.company_name && (
                            <>
                              <span className="text-surface-300 dark:text-surface-700">@</span>
                              <span className="text-[11px] text-surface-400">
                                {item.company_name}
                              </span>
                            </>
                          )}

                          <span className="text-surface-300 dark:text-surface-700">•</span>

                          <span className="text-[11px] text-surface-400">
                            {new Date(item.created_at).toLocaleDateString(language)}
                          </span>
                        </div>

                        <h3 className="text-xs font-semibold leading-snug text-surface-900 dark:text-surface-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {item.subject}
                        </h3>

                        <p className="mt-1 text-[11px] text-surface-600 dark:text-surface-400 line-clamp-2">
                          {item.subject.slice(0, 150) + "..."}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(item.id)
                          }}
                          className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title={t("emailGeneration.history.deleteTooltip")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 flex justify-center border-t border-surface-200 pt-4 dark:border-surface-800">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </div>

        <Modal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          title={t("emailGeneration.history.deleteModal.title")}
          description={t("emailGeneration.history.deleteModal.description")}
        >
          <p className="text-xs text-surface-600 dark:text-surface-400 mb-6">
            {t("emailGeneration.history.deleteModal.confirm")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>
              {t("emailGeneration.history.deleteModal.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (showDeleteConfirm) confirmDelete(showDeleteConfirm)
              }}
            >
              {t("emailGeneration.history.deleteModal.delete")}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default EmailHistoryPage