import {
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  PenLine,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { PlaygroundForm } from "@/features/playground/components/PlaygroundForm";
import {
  DescriptionForm,
  type DescriptionFormData,
} from "@/features/playground/components/DescriptionForm";
import { GenerationLoadingOverlay } from "@/components/ui/GenerationLoadingOverlay";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui";

import { useTranslation } from "@/i18n";

import { FORMATS } from "@/constants/playground";

import { postsApi } from "@/services/posts";
import { API_BASE_URL } from "@/services/api";
import { playSuccessSound, primeAudio } from "@/utils/notificationSound";
import {
  useGenerationStore,
  useUIStore,
} from "@/store";

import type {
  GeneratePostRequest,
  GeneratePostPayload,
  InputMode,
} from "@/types";

import type { UpdateFormField } from "@/features/playground/components/PlaygroundForm";

interface NavigationState {
  initialTopic?: string;
  initialDescription?: string;
  initialFormat?: string;
}

export function PlaygroundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { t } = useTranslation();
  const { addToast } = useUIStore();

  const {
    setGeneration,
    setResult,
    setStyle,
    saveFormData,
    saveDraft,
    draft,
    clearGeneration,
    updateProgress,
    currentTaskId,
    isGenerating,
    currentStep,
    progress,
  } = useGenerationStore();

  const navigationState =
    location.state as NavigationState | null;

  const savedFormData =
    draft?.formData as Partial<GeneratePostRequest> | undefined;

  const savedDescData =
    draft?.descData as Partial<DescriptionFormData> | undefined;

  const initialFormat =
    navigationState?.initialFormat &&
    FORMATS.includes(
      navigationState.initialFormat as (typeof FORMATS)[number],
    )
      ? (navigationState.initialFormat as GeneratePostRequest["format"])
      : (savedFormData?.format ?? FORMATS[0]);

  const [mode, setMode] = useState<InputMode>(
    navigationState?.initialDescription
      ? "description"
      : (draft?.mode ?? "structured"),
  );

  const [formData, setFormData] =
    useState<GeneratePostRequest>({
      style: "Technical",
      audience: "Senior Developers",
      experience: "Advanced (5-10 years)",
      objective: "Authority / Personal Branding",
      include_code: false,
      include_visual: true,
      include_hashtags: true,
      include_hooks: true,
      include_review: true,
      use_rag: false,
      quantity: 3,
      language: "en",
      max_length: 2000,
      ...savedFormData,
      topic: navigationState?.initialTopic ?? savedFormData?.topic ?? "",
      format: initialFormat,
    });

  const [descData, setDescData] =
    useState<DescriptionFormData>({
      visual_brief: "",
      quantity: 3,
      language: "en",
      max_length: 2000,
      include_code: false,
      include_visual: true,
      include_hashtags: true,
      include_hooks: true,
      include_review: true,
      use_rag: false,
      ...savedDescData,
      description: navigationState?.initialDescription
        ? [navigationState?.initialTopic, navigationState.initialDescription]
            .filter(Boolean)
            .join("\n\n")
        : (savedDescData?.description ?? ""),
    });

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const isFormValid =
    mode === "description"
      ? descData.description.trim().length > 0
      : formData.topic.trim().length > 0;

  const updateFormField: UpdateFormField =
    useCallback(
      (field, value) => {
        setFormData((current) => ({
          ...current,
          [field]: value,
        }));
      },
      [],
    );

  const updateDescField = useCallback(
    <K extends keyof DescriptionFormData>(
      field: K,
      value: DescriptionFormData[K],
    ) => {
      setDescData((current) => ({
        ...current,
        [field]: value,
      }));
    },
    [],
  );

  // Acompanha a geração via SSE (Server-Sent Events) — sem polling.
  useEffect(() => {
    if (!currentTaskId) {
      return;
    }

    const taskId = currentTaskId;
    const events = new EventSource(
      `${API_BASE_URL}/posts/generate/${taskId}/events`,
    );

    const handleTerminalState = async (status: string, error?: string) => {
      events.close();
      setIsSubmitting(false);
      clearGeneration();

      if (status === "completed") {
        try {
          const finalStatus = await postsApi.getStatus(taskId);
          setResult(finalStatus.result ?? null);
        } catch {
          addToast({
            type: "error",
            message: t("pg.toastGenerationError"),
          });
          return;
        }

        playSuccessSound();

        addToast({
          type: "success",
          message: t("pg.toastGenerated"),
        });

        // Notificação nativa quando a aba está em background.
        try {
          if (
            document.hidden &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("TryMyPost", { body: t("pg.toastGenerated") });
          }
        } catch {
          // Notificações indisponíveis — o toast já cobre o aviso.
        }

        navigate("/playground/results");
        return;
      }

      if (status === "failed") {
        const rawError = error ?? "";
        const isRateLimit =
          rawError.startsWith("RATE_LIMIT:") ||
          rawError.includes("429") ||
          /resource_exhausted|rate limit|quota exceeded/i.test(rawError);

        addToast({
          type: "error",
          duration: 8000,
          message: isRateLimit
            ? t("pg.toastRateLimited")
            : rawError || t("pg.toastGenerationError"),
        });
        return;
      }

      if (status === "cancelled") {
        addToast({
          type: "info",
          message: t("pg.toastCancelled"),
        });
      }
    };

    events.onmessage = (event) => {
      let data: {
        status?: string;
        current_step?: string | null;
        progress?: number;
        error?: string | null;
      };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
        void handleTerminalState(data.status, data.error ?? undefined);
        return;
      }

      updateProgress(
        data.current_step || t("pg.processing"),
        data.progress ?? 0,
      );
    };

    // Em caso de queda de conexão o EventSource reconecta sozinho e o
    // backend reemite o estado atual ao conectar.
    return () => events.close();
  }, [
    currentTaskId,
    addToast,
    clearGeneration,
    navigate,
    setResult,
    updateProgress,
    t,
  ]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!isFormValid || isSubmitting || isGenerating) {
      return;
    }

    // Prepara áudio/notificação dentro do gesto do usuário (autoplay policy).
    primeAudio();
    try {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch {
      // Notifications indisponíveis — segue apenas com toast + som.
    }

    setIsSubmitting(true);

    const payload: GeneratePostPayload =
      mode === "description"
        ? {
            input_mode: "description",
            description: descData.description,
            visual_brief: descData.visual_brief || undefined,
            topic: descData.description.slice(0, 120),
            quantity: descData.quantity,
            language: descData.language,
            max_length: descData.max_length,
            include_code: descData.include_code,
            include_visual: descData.include_visual,
            include_hashtags: descData.include_hashtags,
            include_hooks: descData.include_hooks,
            include_review: descData.include_review,
            use_rag: descData.use_rag,
          }
        : {
            ...formData,
            input_mode: "structured",
            guidelines: undefined,
          };

    try {
      const response =
        await postsApi.generate(payload);

      setStyle(formData.style);
      saveFormData(formData);
      saveDraft({ mode, formData, descData });
      setGeneration(response.task_id);

      addToast({
        type: "info",
        message: t("pg.toastGenerating"),
      });
    } catch (error) {
      setIsSubmitting(false);

      addToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : t("pg.toastGenerateFailed"),
      });
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <GenerationLoadingOverlay
          fullScreen
          currentStep={currentStep || t("pg.generatingPosts")}
          progress={progress}
          message={t("pg.loadingMessage")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <main className="flex min-w-0">
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl px-4 py-10"
        >
          <header className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
              <LayoutDashboard className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
              {t("pg.newPost")}
            </h1>

            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              {t("pg.subtitle")}
            </p>

            <SegmentedControl
              className="mx-auto mt-4"
              options={[
                { value: "structured", icon: ListChecks, label: t("pg.tab.structured") },
                { value: "description", icon: PenLine, label: t("pg.tab.description") },
              ]}
              value={mode}
              onChange={(v) => setMode(v as InputMode)}
            />
          </header>

          {mode === "structured" ? (
            <PlaygroundForm
              formData={formData}
              updateFormField={updateFormField}
              isSubmitting={isSubmitting}
              isGenerating={isGenerating}
            />
          ) : (
            <DescriptionForm
              formData={descData}
              updateFormField={updateDescField}
              isSubmitting={isSubmitting}
              isGenerating={isGenerating}
            />
          )}

          <div className="mt-10 flex flex-col items-stretch gap-4 border-t border-surface-200 pt-6 dark:border-surface-700 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              size="md"
              loading={
                isGenerating || isSubmitting
              }
              disabled={
                !isFormValid ||
                isSubmitting ||
                isGenerating
              }
              className="w-full sm:w-auto sm:min-w-[200px]"
            >
              {isGenerating || isSubmitting
                ? t("pg.generatingPosts")
                : t("pg.generateButton")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default PlaygroundPage;