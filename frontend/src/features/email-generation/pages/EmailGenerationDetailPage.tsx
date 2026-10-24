import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Check,
  Copy,
  Download,
  FileText,
  Mail,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Share2,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Textarea } from "@/components/ui"
import { emailApi } from "@/services/emails"
import { useUIStore } from "@/store"
import { cn } from "@/utils/cn"
import { useTranslation } from "@/i18n"
import type { EmailGenerationResult, ExtractedJobInfo } from "@/types"

type DetailTab = "email" | "info"

export function EmailGenerationDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return null
  }

  return <EmailDetailView id={id} />
}

function EmailDetailView({ id }: { id: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<DetailTab>("email")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Edição do corpo (PATCH /emails/history/{id})
  const [body, setBody] = useState("")
  const [draft, setDraft] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const {
    data: result,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["email-detail", id],
    queryFn: () => emailApi.getDetail(id),
    enabled: Boolean(id),
  })

  // Sincroniza o corpo quando o resultado chega
  useEffect(() => {
    if (result?.body !== undefined) {
      setBody(result.body)
      setDraft(result.body)
      setIsEditing(false)
    }
  }, [result?.body])

  const deleteMutation = useMutation({
    mutationFn: () => emailApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-history"] })
      addToast({ type: "success", message: t("emailGeneration.detail.deleted") })
      navigate("/emails/history")
    },
    onError: () => {
      addToast({ type: "error", message: t("emailGeneration.detail.deleteError") })
    },
  })

  const handleCopy = async (text: string, key: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      addToast({ type: "success", message })
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      addToast({ type: "error", message: t("emailGeneration.detail.copyError") })
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      addToast({ type: "success", message: t("emailGeneration.detail.linkCopied") })
    } catch {
      addToast({ type: "error", message: t("emailGeneration.detail.copyError") })
    }
  }

  const handleDownload = () => {
    if (!result) return

    const content = `To: ${result.recipient_email || t("emailGeneration.results.recipientNotFound")}\nSubject: ${result.subject}\n\n${body}`

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${result.subject?.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "email"}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const startEditing = () => {
    setDraft(body)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setDraft(body)
    setIsEditing(false)
  }

  const handleSave = async () => {
    const newBody = draft.trim()
    if (!newBody) return
    setIsSaving(true)
    try {
      if (result?.email_id) {
        await emailApi.updateBody(result.email_id, newBody)
      }
      setBody(newBody)
      setIsEditing(false)
      addToast({ type: "success", message: t("emailGeneration.results.editing.saved") })
    } catch {
      addToast({ type: "error", message: t("emailGeneration.results.editing.saveError") })
    } finally {
      setIsSaving(false)
    }
  }

  const infoRows = useMemo(() => {
    const info = result?.extracted_info ?? ({} as ExtractedJobInfo)

    return [
      { label: t("emailGeneration.extractedInfo.jobTitle"), value: info.job_title },
      { label: t("emailGeneration.extractedInfo.company"), value: info.company_name },
      { label: t("emailGeneration.extractedInfo.recruiter"), value: info.recruiter_name },
      { label: t("emailGeneration.extractedInfo.recruiterEmail"), value: info.recruiter_email },
      { label: t("emailGeneration.extractedInfo.location"), value: info.location_modality },
      { label: t("emailGeneration.extractedInfo.salary"), value: info.salary_info },
      {
        label: t("emailGeneration.extractedInfo.salaryExpectation"),
        value: info.salary_expectation_required === undefined
          ? undefined
          : info.salary_expectation_required
            ? t("emailGeneration.extractedInfo.yes")
            : t("emailGeneration.extractedInfo.no"),
      },
      { label: t("emailGeneration.extractedInfo.requirements"), items: info.key_requirements },
      { label: t("emailGeneration.extractedInfo.technologies"), items: info.technologies },
      { label: t("emailGeneration.extractedInfo.experience"), items: info.experience_desired },
    ].filter((row) => row.value || (row.items && row.items.length > 0))
  }, [result, t])

  const tabsConfig = useMemo(
    () => [
      {
        key: "email",
        label: t("emailGeneration.detail.tabs.email"),
        icon: Mail,
        count: 1,
      },
      {
        key: "info",
        label: t("emailGeneration.detail.tabs.jobInfo"),
        icon: Briefcase,
        count: infoRows.length,
      },
    ],
    [infoRows, t]
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-4">
          <div className="h-6 bg-surface-200 dark:bg-surface-800 rounded w-1/4" />
          <div className="h-40 bg-surface-200 dark:bg-surface-800 rounded" />
        </div>
      </div>
    )
  }

  if (isError || !result) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-900">
              <AlertTriangle className="h-4 w-4 text-surface-400" />
            </div>

            <h1 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              {t("emailGeneration.detail.error.title")}
            </h1>

            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              {t("emailGeneration.detail.error.description")}
            </p>

            <div className="mt-5 flex justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                {t("emailGeneration.detail.error.retry")}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/emails/history")}
              >
                {t("emailGeneration.detail.error.back")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const extractedInfo = result.extracted_info || ({} as ExtractedJobInfo)
  const jobTitle = extractedInfo.job_title || t("emailGeneration.results.unknownPosition")
  const companyName = extractedInfo.company_name || t("emailGeneration.results.unknownCompany")
  const fullEmail = `To: ${result.recipient_email || t("emailGeneration.results.recipientNotFound")}\nSubject: ${result.subject}\n\n${body}`

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-surface-200 pb-5 dark:border-surface-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="success" size="sm" className="text-[10px]">
                  {t("emailGeneration.results.completed")}
                </Badge>

                <span className="text-[11px] text-surface-400">{jobTitle}</span>

                <span className="text-surface-300 dark:text-surface-700">•</span>

                <span className="text-[11px] text-surface-400">{companyName}</span>
              </div>

              <h1 className="text-base font-semibold leading-snug text-surface-900 dark:text-surface-50">
                {result.subject}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/emails/history")}
                title={t("emailGeneration.detail.back")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                title={t("emailGeneration.detail.share")}
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                title={t("emailGeneration.detail.downloadTxt")}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                title={t("emailGeneration.detail.delete")}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          </div>
        </header>

        <section className="mt-6">
          <div className="mb-6 border-b border-surface-200 dark:border-surface-800">
            <div className="flex flex-wrap gap-1">
              {tabsConfig.map((tab) => {
                const Icon = tab.icon

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as DetailTab)}
                    className={cn(
                      "flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors",
                      activeTab === tab.key
                        ? "border-primary-600 text-primary-600"
                        : "border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-surface-50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />

                    <span>{tab.label}</span>

                    {tab.count > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px]",
                          activeTab === tab.key
                            ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                            : "bg-surface-100 text-surface-500 dark:bg-surface-800"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* E-MAIL */}
          {activeTab === "email" && (
            <div className="space-y-5">
              <div className="divide-y divide-surface-200 dark:divide-surface-800">
                <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-primary-600" />

                    {result.recipient_email ? (
                      <span className="truncate font-mono text-xs text-surface-900 dark:text-surface-50">
                        {result.recipient_email}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500 dark:text-amber-400">
                        {t("emailGeneration.results.recipientNotFound")}
                      </span>
                    )}
                  </div>

                  {result.recipient_email && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(
                          result.recipient_email!,
                          "recipient",
                          t("emailGeneration.results.copied")
                        )
                      }
                      title={t("emailGeneration.results.copyEmail")}
                    >
                      {copiedKey === "recipient" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 py-2.5 last:pb-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-primary-600" />

                    <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-50">
                      {result.subject}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(result.subject, "subject", t("emailGeneration.results.copied"))
                    }
                    title={t("emailGeneration.results.copySubject")}
                  >
                    {copiedKey === "subject" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={draft}
                    onChange={setDraft}
                    rows={12}
                    className="text-xs leading-relaxed"
                    disabled={isSaving}
                    autoFocus
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !draft.trim()}
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                    >
                      {t("emailGeneration.results.editing.save")}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={isSaving}
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    >
                      {t("emailGeneration.results.editing.reset")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-l-2 border-primary-500 py-1 pl-4">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-surface-800 dark:text-surface-200">
                      {body}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(body, "body", t("emailGeneration.results.copied"))}
                      leftIcon={
                        copiedKey === "body" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {copiedKey === "body"
                        ? t("emailGeneration.results.copied")
                        : t("emailGeneration.results.copyBody")}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(fullEmail, "all", t("emailGeneration.results.copied"))
                      }
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                    >
                      {t("emailGeneration.results.copyAll")}
                    </Button>

                    {result.email_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={startEditing}
                        leftIcon={<Pencil className="h-3.5 w-3.5" />}
                      >
                        {t("emailGeneration.results.editing.edit")}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* INFORMAÇÕES DA VAGA */}
          {activeTab === "info" && (
            <div className="space-y-4">
              {infoRows.length > 0 ? (
                <div className="divide-y divide-surface-200 dark:divide-surface-800">
                  {infoRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row"
                    >
                      <span className="w-full text-xs font-medium text-surface-600 dark:text-surface-400 sm:w-48 sm:shrink-0">
                        {row.label}
                      </span>

                      <div className="min-w-0 flex-1">
                        {row.items ? (
                          <div className="flex flex-wrap gap-1.5">
                            {row.items.map((item, i) => (
                              <Badge key={i} variant="outline" size="sm" className="text-[10px]">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-surface-900 dark:text-surface-100">
                            {row.value}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-900">
                    <Briefcase className="h-4 w-4 text-surface-400" />
                  </div>

                  <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
                    {t("emailGeneration.detail.tabs.jobInfo")}
                  </p>

                  <p className="mt-1 text-[11px] text-surface-400">
                    {t("emailGeneration.detail.infoEmpty")}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title={t("emailGeneration.detail.deleteModal.title")}
          description={t("emailGeneration.detail.deleteModal.description")}
        >
          <p className="text-xs text-surface-600 dark:text-surface-400 mb-6">
            {t("emailGeneration.detail.deleteModal.confirm")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              {t("emailGeneration.detail.deleteModal.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {t("emailGeneration.detail.deleteModal.delete")}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default EmailGenerationDetailPage
