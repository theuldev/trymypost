import { Loader2 } from "lucide-react";

export interface GenerationLoadingOverlayProps {
  isVisible?: boolean;
  title?: string;
  subtitle?: string;
  currentStep?: string;
  progress?: number;
  message?: string;
  fullScreen?: boolean;
}

export function GenerationLoadingOverlay({
  isVisible = true,
  title,
  subtitle,
  currentStep = "Processando...",
  progress = 0,
  message,
  fullScreen = false,
}: GenerationLoadingOverlayProps) {
  if (!isVisible) return null;

  const displayTitle = title || currentStep;
  const displaySubtitle =
    subtitle || message || "A IA está gerando o conteúdo. Isso pode levar alguns segundos...";

  if (fullScreen) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center py-16">
        <div className="mx-auto w-full max-w-md space-y-5 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-surface-50">
            <Loader2 className="h-4 w-4 animate-spin text-primary-600 dark:text-primary-400" />
            <span>{displayTitle}</span>
          </div>

          {progress > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
              <div
                className="h-full rounded-full bg-primary-600 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}

          <p className="text-xs text-surface-500 dark:text-surface-400">
            {displaySubtitle}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 border-t border-surface-200 pt-6 dark:border-surface-800">
      <div className="mx-auto max-w-sm space-y-3 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-surface-900 dark:text-surface-50">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600 dark:text-primary-400" />
          <span>{displayTitle}</span>
        </div>

        {progress > 0 && (
          <div className="w-full h-1 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}

        <p className="text-[11px] text-surface-500 dark:text-surface-400">
          {displaySubtitle}
        </p>
      </div>
    </div>
  );
}
