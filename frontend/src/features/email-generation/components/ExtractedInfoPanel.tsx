import { Badge } from "@/components/ui"
import { useTranslation } from "@/i18n"
import type { ExtractedJobInfo } from "@/types"

interface ExtractedInfoPanelProps {
  info: ExtractedJobInfo
}

export function ExtractedInfoPanel({ info }: ExtractedInfoPanelProps) {
  const { t } = useTranslation()

  const renderArrayField = (items: string[], emptyMessage: string) => {
    if (!items.length) return <span className="text-surface-500 dark:text-surface-400 text-sm">{emptyMessage}</span>
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
        ))}
      </div>
    )
  }

  const renderField = (label: string, value: string | boolean | undefined, isBoolean = false) => {
    if (value === undefined || value === null || value === '') return null
    return (
      <div className="flex flex-col sm:flex-row gap-2 py-2 border-b border-surface-200 dark:border-surface-700 last:border-0">
        <span className="text-sm font-medium text-surface-600 dark:text-surface-400 w-full sm:w-48 flex-shrink-0">{label}</span>
        <span className="text-sm text-surface-900 dark:text-surface-100">
          {isBoolean ? (value ? t('emailGeneration.extractedInfo.yes') : t('emailGeneration.extractedInfo.no')) : value}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-surface-50 dark:bg-surface-900/50 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">{t('emailGeneration.extractedInfo.title')}</h3>
      <div className="space-y-0">
        {renderField(t('emailGeneration.extractedInfo.jobTitle'), info.job_title)}
        {renderField(t('emailGeneration.extractedInfo.company'), info.company_name)}
        {renderField(t('emailGeneration.extractedInfo.recruiter'), info.recruiter_name)}
        {renderField(t('emailGeneration.extractedInfo.recruiterEmail'), info.recruiter_email)}
        {renderField(t('emailGeneration.extractedInfo.location'), info.location_modality)}
        {renderField(t('emailGeneration.extractedInfo.salary'), info.salary_info)}
        {renderField(t('emailGeneration.extractedInfo.salaryExpectation'), info.salary_expectation_required, true)}
        
        <div className="flex flex-col sm:flex-row gap-2 py-2 border-b border-surface-200 dark:border-surface-700">
          <span className="text-sm font-medium text-surface-600 dark:text-surface-400 w-full sm:w-48 flex-shrink-0">{t('emailGeneration.extractedInfo.requirements')}</span>
          <div className="flex-1">{renderArrayField(info.key_requirements, '—')}</div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 py-2 border-b border-surface-200 dark:border-surface-700">
          <span className="text-sm font-medium text-surface-600 dark:text-surface-400 w-full sm:w-48 flex-shrink-0">{t('emailGeneration.extractedInfo.technologies')}</span>
          <div className="flex-1">{renderArrayField(info.technologies, '—')}</div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 py-2 last:border-0">
          <span className="text-sm font-medium text-surface-600 dark:text-surface-400 w-full sm:w-48 flex-shrink-0">{t('emailGeneration.extractedInfo.experience')}</span>
          <div className="flex-1">{renderArrayField(info.experience_desired, '—')}</div>
        </div>
      </div>
    </div>
  )
}