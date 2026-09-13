import {
  Lightbulb,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PlaygroundForm } from "@/features/playground/components/PlaygroundForm";
import { GenerationLoadingOverlay } from "@/components/ui/GenerationLoadingOverlay";
import { Button } from "@/components/ui/Button";

import { FORMATS } from "@/constants/playground";

import { postsApi } from "@/services/posts";
import {
  useGenerationStore,
  useUIStore,
} from "@/store";

import type {
  GeneratePostRequest,
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

  const { addToast } = useUIStore();

  const {
    setGeneration,
    setResult,
    setStyle,
    saveFormData,
    clearGeneration,
    updateProgress,
    currentTaskId,
    isGenerating,
    currentStep,
    progress,
  } = useGenerationStore();

  const navigationState =
    location.state as NavigationState | null;

  const initialFormat =
    navigationState?.initialFormat &&
    FORMATS.includes(
      navigationState.initialFormat as (typeof FORMATS)[number],
    )
      ? (navigationState.initialFormat as GeneratePostRequest["format"])
      : FORMATS[0];

  const [formData, setFormData] =
    useState<GeneratePostRequest>({
      topic: navigationState?.initialTopic ?? "",
      style: "Technical",
      audience: "Senior Developers",
      experience: "Advanced (5-10 years)",
      objective: "Authority / Personal Branding",
      format: initialFormat,
      include_code: false,
      include_visual: true,
      include_hashtags: true,
      include_hooks: true,
      include_review: true,
      guidelines: navigationState?.initialDescription ?? "",
      quantity: 3,
      language: "en",
      max_length: 2000,
    });

  const [showGuidelines, setShowGuidelines] =
    useState(Boolean(navigationState?.initialDescription));

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const isFormValid =
    formData.topic.trim().length > 0;

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

  const {
    data: taskStatus,
  } = useQuery({
    queryKey: ["generation", currentTaskId],
    queryFn: () =>
      postsApi.getStatus(currentTaskId!),
    enabled: Boolean(currentTaskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (
        status === "processing" ||
        status === "pending"
      ) {
        return 2000;
      }

      return false;
    },
  });

  useEffect(() => {
    if (!taskStatus) {
      return;
    }

    if (taskStatus.status === "completed") {
      setResult(taskStatus.result ?? null);
      setIsSubmitting(false);
      clearGeneration();

      addToast({
        type: "success",
        message: "Posts generated successfully!",
      });

      navigate("/playground/results");

      return;
    }

    if (taskStatus.status === "failed") {
      setIsSubmitting(false);
      clearGeneration();

      addToast({
        type: "error",
        message:
          taskStatus.error ||
          "Generation error",
      });

      return;
    }

    if (taskStatus.status === "cancelled") {
      setIsSubmitting(false);
      clearGeneration();

      addToast({
        type: "info",
        message: "Generation cancelled.",
      });

      return;
    }

    if (taskStatus.status === "processing") {
      updateProgress(
        taskStatus.current_step ||
          "Processing...",
        taskStatus.progress,
      );
    }
  }, [
    taskStatus,
    addToast,
    setResult,
    clearGeneration,
    updateProgress,
    navigate,
  ]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!isFormValid || isSubmitting || isGenerating) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await postsApi.generate(formData);

      setStyle(formData.style);
      saveFormData(formData);
      setGeneration(response.task_id);

      addToast({
        type: "info",
        message:
          "Your posts are being generated...",
      });
    } catch (error) {
      setIsSubmitting(false);

      addToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate posts.",
      });
    }
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <GenerationLoadingOverlay
          fullScreen
          currentStep={currentStep || "Gerando posts..."}
          progress={progress}
          message="A IA está analisando os parâmetros e criando as variações do seu post..."
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
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>

            <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
              New Post
            </h1>

            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              Configure the parameters and generate
              content variations with AI.
            </p>
          </header>

          <PlaygroundForm
            formData={formData}
            updateFormField={updateFormField}
            showGuidelines={showGuidelines}
            setShowGuidelines={setShowGuidelines}
            isSubmitting={isSubmitting}
            isGenerating={isGenerating}
          />

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
                ? "Generating posts..."
                : "Generate Posts"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default PlaygroundPage;