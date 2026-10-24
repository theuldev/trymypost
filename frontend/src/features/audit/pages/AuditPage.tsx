import { useState, useCallback, useEffect, useMemo } from "react"
import { Search, List, ChevronRight } from "lucide-react"
import { useTranslation } from "@/i18n"
import { useUIStore } from "@/store"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { Modal } from "@/components/ui/Modal"
import { Pagination } from "@/components/Pagination"
import { auditApi } from "@/services/audit"
import type { AuditLogItem, AuditSummary } from "@/types/audit"

function formatDate(iso: string, language: string) {
  return new Date(iso).toLocaleString(language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function jsonPretty(data: unknown) {
  if (data == null) return <span className="text-surface-400">—</span>
  return (
    <pre className="text-xs text-surface-500 dark:text-surface-400 overflow-x-auto whitespace-pre-wrap break-all bg-surface-50 dark:bg-surface-950 rounded-md p-3 border border-surface-200 dark:border-surface-800">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

export function AuditPage() {
  const { t, language } = useTranslation()
  const { addToast } = useUIStore()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [resourceIdSearch, setResourceIdSearch] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("")
  const [eventCategoryFilter, setEventCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [correlationIdFilter, setCorrelationIdFilter] = useState("")

  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const statusMeta = useMemo(
    () => ({
      success: { label: t("audit.status.success"), variant: "success" as const },
      pending: { label: t("audit.status.pending"), variant: "warning" as const },
      failure: { label: t("audit.status.failure"), variant: "danger" as const },
    }),
    [t]
  )

  const fetchSummary = useCallback(async () => {
    try {
      setSummary(await auditApi.getSummary())
    } catch {
      // summary is non-fatal
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const response = await auditApi.listLogs({
        page,
        page_size: pageSize,
        event_type: eventTypeFilter || undefined,
        event_category: eventCategoryFilter || undefined,
        status: statusFilter || undefined,
        resource_id: resourceIdSearch || undefined,
        correlation_id: correlationIdFilter || undefined,
      })
      setLogs(response.items)
      setTotal(response.total)
    } catch {
      addToast({ type: "error", message: t("audit.error.load") })
    } finally {
      setLoading(false)
    }
  }, [
    page,
    pageSize,
    eventTypeFilter,
    eventCategoryFilter,
    statusFilter,
    resourceIdSearch,
    correlationIdFilter,
    addToast,
    t,
  ])

  // Fetch on mount and whenever filters/page change
  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleResourceIdSearch = useCallback((value: string) => {
    setResourceIdSearch(value)
    setPage(1)
  }, [])

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value))
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasActiveFilters =
    resourceIdSearch || eventTypeFilter || eventCategoryFilter || statusFilter || correlationIdFilter

  const renderStatusBadge = (status: string) => {
    const meta = statusMeta[status as keyof typeof statusMeta]
    return (
      <Badge variant={meta?.variant ?? "neutral"} size="sm" className="text-[10px]">
        {meta?.label ?? status}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center mb-8">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <List className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>

          <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            {t("audit.title")}
          </h1>

          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t("audit.subtitle")}
          </p>

          {summary && summary.total_events > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-[11px] text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-400">
              <List className="h-3 w-3" />
              <span>
                {t("audit.summary.total")}:
                <strong className="ml-1">{summary.total_events}</strong>
              </span>
              {(summary.by_status?.failure ?? 0) > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {summary.by_status.failure} {t("audit.status.failure")}
                </span>
              )}
            </div>
          )}
        </header>

        {/* Filters */}
        <section className="space-y-3 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder={t("audit.filters.resourceId")}
                  value={resourceIdSearch}
                  onChange={(e) => handleResourceIdSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-surface-800 dark:text-surface-200 placeholder:text-surface-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select
                value={eventTypeFilter}
                onChange={(v) => {
                  setEventTypeFilter(v)
                  setPage(1)
                }}
                options={[
                  { value: "", label: t("audit.filters.eventType") },
                  { value: "email_generation_started", label: t("audit.eventType.started") },
                  { value: "email_generation_completed", label: t("audit.eventType.completed") },
                  { value: "email_generation_failed", label: t("audit.eventType.failed") },
                ]}
                className="w-full"
              />

              <Select
                value={eventCategoryFilter}
                onChange={(v) => {
                  setEventCategoryFilter(v)
                  setPage(1)
                }}
                options={[
                  { value: "", label: t("audit.filters.eventCategory") },
                  { value: "email", label: t("audit.category.email") },
                ]}
                className="w-full"
              />

              <Select
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v)
                  setPage(1)
                }}
                options={[
                  { value: "", label: t("audit.filters.status") },
                  { value: "success", label: t("audit.status.success") },
                  { value: "pending", label: t("audit.status.pending") },
                  { value: "failure", label: t("audit.status.failure") },
                ]}
                className="w-full"
              />

              <div className="relative">
                <input
                  type="text"
                  placeholder={t("audit.filters.correlation")}
                  value={correlationIdFilter}
                  onChange={(e) => {
                    setCorrelationIdFilter(e.target.value)
                    setPage(1)
                  }}
                  className="w-full pl-3 pr-4 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-surface-800 dark:text-surface-200 placeholder:text-surface-400"
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
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
                <List className="h-4 w-4 text-surface-400" />
              </div>
              <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
                {t("audit.empty")}
              </p>
              {hasActiveFilters && (
                <p className="mt-1 text-[11px] text-surface-400">{t("audit.empty.adjustFilters")}</p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-[11px] text-surface-400">
                <span>{t("audit.showing", { count: logs.length, total })}</span>
                <Select
                  value={pageSize.toString()}
                  onChange={handlePageSizeChange}
                  options={[
                    { value: "10", label: t("audit.perPage", { count: 10 }) },
                    { value: "20", label: t("audit.perPage", { count: 20 }) },
                    { value: "50", label: t("audit.perPage", { count: 50 }) },
                  ]}
                  className="w-28"
                />
              </div>

              <div className="divide-y divide-surface-200 dark:divide-surface-800">
                {logs.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => {
                      setSelectedLog(item)
                      setDetailOpen(true)
                    }}
                    className="group py-4 transition-colors cursor-pointer hover:bg-surface-100/50 dark:hover:bg-surface-900/50 -mx-3 px-3 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {renderStatusBadge(item.status)}

                          <span className="text-[11px] text-surface-400">
                            {item.event_category === "email"
                              ? t("audit.category.email")
                              : item.event_category}
                          </span>

                          <span className="text-surface-300 dark:text-surface-700">•</span>

                          <span className="text-[11px] text-surface-400">
                            {formatDate(item.created_at, language)}
                          </span>
                        </div>

                        <h3 className="text-xs font-semibold leading-snug text-surface-900 dark:text-surface-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {item.event_type === "email_generation_started"
                            ? t("audit.eventType.started")
                            : item.event_type === "email_generation_completed"
                              ? t("audit.eventType.completed")
                              : item.event_type === "email_generation_failed"
                                ? t("audit.eventType.failed")
                                : item.event_type}
                        </h3>

                        {item.message && (
                          <p className="mt-1 text-[11px] text-surface-600 dark:text-surface-400 truncate">
                            {item.message}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {item.resource_type && (
                            <Badge variant="outline" size="sm" className="text-[10px]">
                              {item.resource_type}
                            </Badge>
                          )}
                          {item.resource_id && (
                            <Badge variant="neutral" size="sm" className="text-[10px] font-mono">
                              {item.resource_id.slice(0, 8)}...
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLog(item)
                            setDetailOpen(true)
                          }}
                          title={t("audit.details.title")}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
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
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>

        {/* Details modal */}
        <Modal
          isOpen={detailOpen}
          onClose={() => {
            setDetailOpen(false)
            setSelectedLog(null)
          }}
          title={t("audit.details.title")}
          size="full"
          showCloseButton
        >
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-600 dark:text-surface-400">{t("audit.details.event")}</span>
                <span className="font-medium text-surface-900 dark:text-surface-100 truncate max-w-xs">
                  {selectedLog.event_type}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-600 dark:text-surface-400">{t("audit.details.category")}</span>
                <span className="font-medium text-surface-900 dark:text-surface-100">
                  {selectedLog.event_category}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-600 dark:text-surface-400">{t("audit.details.status")}</span>
                {renderStatusBadge(selectedLog.status)}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-600 dark:text-surface-400">{t("audit.details.resource")}</span>
                <span className="font-medium text-surface-900 dark:text-surface-100 truncate max-w-xs font-mono text-xs">
                  {selectedLog.resource_type || "—"}
                  {selectedLog.resource_id ? ` / ${selectedLog.resource_id}` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-600 dark:text-surface-400">
                  {t("audit.details.correlation")}
                </span>
                <span className="font-medium text-surface-900 dark:text-surface-100 truncate max-w-xs font-mono text-xs">
                  {selectedLog.correlation_id || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-600 dark:text-surface-400">{t("audit.details.duration")}</span>
                <span className="font-medium text-surface-900 dark:text-surface-100">
                  {selectedLog.duration_ms ? `${selectedLog.duration_ms} ms` : "—"}
                </span>
              </div>

              <div className="space-y-4 border-t border-surface-200 pt-4 dark:border-surface-800">
                <div>
                  <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                    {t("audit.details.request")}
                  </p>
                  {jsonPretty(selectedLog.request_data)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">
                    {t("audit.details.response")}
                  </p>
                  {jsonPretty(selectedLog.response_data)}
                </div>
                {selectedLog.error_details && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                      {t("audit.details.error")}
                    </p>
                    {jsonPretty(selectedLog.error_details)}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}

export default AuditPage
