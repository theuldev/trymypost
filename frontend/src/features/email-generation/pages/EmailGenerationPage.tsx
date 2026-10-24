import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useUIStore } from "@/store"
import { useTranslation } from "@/i18n"
import { GenerationLoadingOverlay } from "@/components/ui/GenerationLoadingOverlay"
import { EmailGenerationForm } from "@/features/email-generation/components/EmailGenerationForm"
import { emailApi } from "@/services/emails"
import { API_BASE_URL } from "@/services/api"
import { playSuccessSound, primeAudio } from "@/utils/notificationSound"
import {
  useEmailGenerationStore,
  useGenerationStore,
} from "@/store"
import type { EmailGenerationResult } from "@/types"

interface NavigationState {
  initialDescription?: string
}

export function EmailGenerationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { addToast } = useUIStore()

  const {
    setGeneration,
    setResult,
    clearGeneration,
    updateProgress,
    currentTaskId,
    isGenerating,
    currentStep,
    progress,
    draftDescription,
    setDraftDescription,
  } = useEmailGenerationStore()

  const navigationState = location.state as NavigationState | null
  const initialDescription = navigationState?.initialDescription ?? draftDescription ?? ''

  const [description, setDescription] = useState(initialDescription)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Acompanha a geração via SSE (Server-Sent Events) — sem polling.
  useEffect(() => {
    if (!currentTaskId) {
      return
    }

    const taskId = currentTaskId
    const events = new EventSource(
      `${API_BASE_URL}/emails/generate/${taskId}/events`,
    )

    const handleTerminalState = async (status: string, error?: string) => {
      events.close()
      setIsSubmitting(false)
      clearGeneration()

      if (status === "completed") {
        try {
          const finalStatus = await emailApi.getStatus(taskId)
          setResult(finalStatus.result as EmailGenerationResult ?? null)
        } catch {
          addToast({
            type: "error",
            message: t("emailGeneration.toastGenerationError"),
          })
          return
        }

        playSuccessSound()

        addToast({
          type: "success",
          message: t("emailGeneration.toastGenerated"),
        })

        try {
          if (
            document.hidden &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("TryMyPost", { body: t("emailGeneration.toastGenerated") })
          }
        } catch {
          // Notificações indisponíveis
        }

        navigate("/emails/results")
        return
      }

      if (status === "failed") {
        const rawError = error ?? ""
        const isRateLimit =
          rawError.startsWith("RATE_LIMIT:") ||
          rawError.includes("429") ||
          /resource_exhausted|rate limit|quota exceeded/i.test(rawError)

        addToast({
          type: "error",
          duration: 8000,
          message: isRateLimit
            ? t("emailGeneration.toastRateLimited")
            : rawError || t("emailGeneration.toastGenerationError"),
        })
        return
      }

      if (status === "cancelled") {
        addToast({
          type: "info",
          message: t("emailGeneration.toastCancelled"),
        })
      }
    }

    events.onmessage = (event) => {
      let data: {
        status?: string
        current_step?: string | null
        progress?: number
        error?: string | null
      }
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }

      if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
        void handleTerminalState(data.status, data.error ?? undefined)
        return
      }

      updateProgress(
        data.current_step || t("emailGeneration.generating"),
        data.progress ?? 0,
      )
    }

    return () => events.close()
  }, [
    currentTaskId,
    addToast,
    clearGeneration,
    navigate,
    setResult,
    updateProgress,
    t,
  ])

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value)
    setDraftDescription(value)
    setError(null)
  }, [setDraftDescription])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (description.trim().length < 50 || isSubmitting || isGenerating) {
      if (description.trim().length < 50) {
        setError(t("emailGeneration.minLengthError"))
      }
      return
    }

    primeAudio()
    try {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission()
      }
    } catch {
      // Notifications indisponíveis
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await emailApi.generate({ job_description: description })
      setGeneration(response.task_id)
      addToast({
        type: "info",
        message: t("emailGeneration.toastGenerating"),
      })
    } catch (err) {
      setIsSubmitting(false)
      const message = err instanceof Error ? err.message : t("emailGeneration.toastGenerateFailed")
      setError(message)
      addToast({
        type: "error",
        message,
      })
    }
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <GenerationLoadingOverlay
          fullScreen
          currentStep={currentStep || t("emailGeneration.generating")}
          progress={progress}
          message={t("emailGeneration.loadingMessage")}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <main className="flex min-w-0">
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <header className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 002-2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
              {t("emailGeneration.title")}
            </h1>

            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              {t("emailGeneration.subtitle")}
            </p>
          </header>

          <EmailGenerationForm
            description={description}
            onChange={handleDescriptionChange}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isGenerating={isGenerating}
            error={error}
          />
        </div>
      </main>
    </div>
  )
}

export default EmailGenerationPage