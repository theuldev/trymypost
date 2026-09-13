import { GenerationLoadingOverlay } from "@/components/ui/GenerationLoadingOverlay";

interface PlaygroundGenerationOverlayProps {
  currentStep: string;
  progress: number;
}

export function PlaygroundGenerationOverlay({
  currentStep,
  progress,
}: PlaygroundGenerationOverlayProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <GenerationLoadingOverlay
        currentStep={currentStep || "Gerando posts..."}
        progress={progress}
        message="A IA está analisando parâmetros e criando as variações do seu post..."
      />
    </div>
  );
}
