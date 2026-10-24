import { useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ArrowLeft, Mail, Copy, FileText, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { EmailResultCard } from "@/features/email-generation/components/EmailResultCard"
import { ExtractedInfoPanel } from "@/features/email-generation/components/ExtractedInfoPanel"
import { useTranslation } from "@/i18n"
import { useUIStore } from "@/store"
import { useEmailGenerationStore } from "@/store"
import type { EmailGenerationResult, ExtractedJobInfo } from "@/types"

export function EmailGenerationResultsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { addToast } = useUIStore()
  const { result, clearGeneration, setResult } = useEmailGenerationStore()

  // If no result, go back to generation page
  useEffect(() => {
    if (!result) {
      navigate("/emails")
    }
  }, [result, navigate])

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      addToast({ type: 'success', message: `${label} ${t('emailGeneration.results.copied')}` })
    } catch {
      addToast({ type: 'error', message: 'Failed to copy' })
    }
  }

  if (!result) {
    return null
  }

  const extractedInfo = result.extracted_info || ({} as ExtractedJobInfo)
  const jobTitle = extractedInfo.job_title || t('emailGeneration.results.unknownPosition')
  const companyName = extractedInfo.company_name || t('emailGeneration.results.unknownCompany')

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-surface-200 pb-5 dark:border-surface-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Breadcrumb
                className="mb-3"
                items={[
                  { label: t('emailGeneration.title'), to: "/emails" },
                  { label: t('emailGeneration.results.title') },
                ]}
              />

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="success" size="sm" className="text-[10px]">
                  {t('emailGeneration.results.completed')}
                </Badge>

                <span className="text-[11px] text-surface-400">
                  {jobTitle}
                </span>

                {companyName && (
                  <>
                    <span className="text-surface-300 dark:text-surface-700">•</span>
                    <span className="text-[11px] text-surface-400">
                      {companyName}
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-base font-semibold leading-snug text-surface-900 dark:text-surface-50">
                {result.subject}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/emails")}
                leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              >
                {t('emailGeneration.results.backButton')}
              </Button>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <EmailResultCard
            result={result}
            onBodyChange={(body) => setResult({ ...result, body })}
          />

          <ExtractedInfoPanel info={result.extracted_info} />
        </div>
      </div>
    </div>
  )
}

export default EmailGenerationResultsPage