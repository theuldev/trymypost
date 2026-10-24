import { useEffect, ReactNode, useState } from "react"
import { Copy, FileText, Mail, Pencil, RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Textarea } from "@/components/ui"
import { CopyButton } from "./CopyButton"
import { emailApi } from "@/services/emails"
import { useTranslation } from "@/i18n"
import { useUIStore } from "@/store"
import type { EmailGenerationResult } from "@/types"

interface EmailResultCardProps {
  result: EmailGenerationResult
  /** Notifica alterações no corpo do e-mail (edição local). */
  onBodyChange?: (body: string) => void
}

function ToolButton({
  onClick,
  title,
  active,
  disabled,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
          : "text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  )
}

export function EmailResultCard({ result, onBodyChange }: EmailResultCardProps) {
  const { t } = useTranslation()
  const { addToast } = useUIStore()

  const [body, setBody] = useState(result.body)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(result.body)
  const [isSaving, setIsSaving] = useState(false)

  // Sincroniza quando um novo resultado chega
  useEffect(() => {
    setBody(result.body)
    setDraft(result.body)
    setIsEditing(false)
  }, [result.body])

  const currentBody = isEditing ? draft : body

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
      if (result.email_id) {
        await emailApi.updateBody(result.email_id, newBody)
      }
      setBody(newBody)
      setIsEditing(false)
      onBodyChange?.(newBody)
      addToast({ type: "success", message: t("emailGeneration.results.editing.saved") })
    } catch {
      addToast({ type: "error", message: t("emailGeneration.results.editing.saveError") })
    } finally {
      setIsSaving(false)
    }
  }

  const fullEmail = `To: ${result.recipient_email || t("emailGeneration.results.recipientNotFound")}\nSubject: ${result.subject}\n\n${currentBody}`

  return (
    <div className="space-y-6">
      {/* Recipient Email */}
      <div className="bg-surface-50 dark:bg-surface-900/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <label className="text-xs font-medium text-surface-500 dark:text-surface-400">{t("emailGeneration.results.recipientLabel")}</label>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              {result.recipient_email ? (
                <>
                  <span className="font-mono text-sm text-surface-900 dark:text-surface-100 min-w-0 flex-1 truncate">{result.recipient_email}</span>
                  <CopyButton textToCopy={result.recipient_email} showLabel={false} />
                </>
              ) : (
                <span className="text-sm text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="h-4 w-4" />{t("emailGeneration.results.recipientNotFound")}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subject */}
      <div className="bg-surface-50 dark:bg-surface-900/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <label className="text-xs font-medium text-surface-500 dark:text-surface-400">{t("emailGeneration.results.subjectLabel")}</label>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              <span className="font-medium text-surface-900 dark:text-surface-100 flex-1 min-w-0">{result.subject}</span>
              <CopyButton textToCopy={result.subject} showLabel={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Body / Editor */}
      <div className="bg-surface-50 dark:bg-surface-900/50 rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <label className="text-xs font-medium text-surface-500 dark:text-surface-400">{t("emailGeneration.results.bodyLabel")}</label>

          <div className="flex items-center gap-1.5">
            {isEditing ? (
              <>
                <ToolButton
                  title={t("emailGeneration.results.editing.save")}
                  onClick={handleSave}
                  disabled={isSaving || !draft.trim()}
                  active
                >
                  <Save className="h-4 w-4" />
                </ToolButton>
                <ToolButton
                  title={t("emailGeneration.results.editing.reset")}
                  onClick={cancelEditing}
                  disabled={isSaving}
                >
                  <RotateCcw className="h-4 w-4" />
                </ToolButton>
              </>
            ) : (
              <>
                <ToolButton
                  title={t("emailGeneration.results.editing.edit")}
                  onClick={startEditing}
                >
                  <Pencil className="h-4 w-4" />
                </ToolButton>
                <CopyButton textToCopy={currentBody} showLabel={false} />
                <CopyButton textToCopy={fullEmail} icon={<Copy className="h-3.5 w-3.5" />} showLabel={false} />
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <Textarea
            value={draft}
            onChange={setDraft}
            rows={12}
            className="font-mono text-sm"
            disabled={isSaving}
            autoFocus
          />
        ) : (
          <div className="bg-white dark:bg-surface-950 border border-surface-200 dark:border-surface-700 rounded p-4 font-mono text-sm whitespace-pre-wrap text-surface-900 dark:text-surface-100 max-h-96 overflow-y-auto">
            {currentBody}
          </div>
        )}
      </div>
    </div>
  )
}
