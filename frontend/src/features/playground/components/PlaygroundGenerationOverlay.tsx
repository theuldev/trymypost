import { GenerationLoadingOverlay } from "@/components/ui/GenerationLoadingOverlay";
import { useTranslation } from "@/i18n";

interface PlaygroundGenerationOverlayProps {
  currentStep: string;
  progress: number;
}

export function PlaygroundGenerationOverlay({
  currentStep,
  progress,
}: PlaygroundGenerationOverlayProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <GenerationLoadingOverlay
        currentStep={currentStep || t("pg.generatingPosts")}
        progress={progress}
        message={t("pg.loadingMessage")}
      />
    </div>
  );
}
