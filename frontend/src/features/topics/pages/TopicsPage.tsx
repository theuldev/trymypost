import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Lightbulb, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui";
import { GenerationLoadingOverlay } from "@/components/ui/GenerationLoadingOverlay";
import { topicsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import type { TopicSuggestion } from "@/types";

const COUNTRY_OPTIONS = [
  { value: "Brazil", label: "Brasil" },
  { value: "United States", label: "Estados Unidos" },
  { value: "Portugal", label: "Portugal" },
  { value: "Spain", label: "Espanha" },
  { value: "United Kingdom", label: "Reino Unido" },
  { value: "Canada", label: "Canadá" },
  { value: "Germany", label: "Alemanha" },
  { value: "France", label: "França" },
  { value: "Netherlands", label: "Países Baixos" },
  { value: "Australia", label: "Austrália" },
];

const QUANTITY_OPTIONS = Array.from({ length: 10 }, (_, index) => {
  const value = String(index + 1);
  return {
    value,
    label: value,
  };
});

export function TopicsPage() {
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const [context, setContext] = useState("");
  const [quantity, setQuantity] = useState(5);
  const [selectedCountry, setSelectedCountry] = useState("Brazil");
  const [isLoading, setIsLoading] = useState(false);

  const transformTopics = (apiTopics: any[]): TopicSuggestion[] => {
    return apiTopics.map((t) => ({
      title: t.topic || "",
      description: t.justification || "",
      suggested_format: t.suggested_format || "Any format",
      angle: t.angle || t.justification || "",
      suggested_hashtags: t.suggested_hashtags || [],
    }));
  };

  const suggestMutation = useMutation({
    mutationFn: topicsApi.suggest,
    onSuccess: (data) => {
      const topics = transformTopics(data.topics);
      setIsLoading(false);

      addToast({
        type: "success",
        message: `${data.topics.length} topics suggested!`,
      });

      navigate("/topics/results", {
        state: {
          topics,
        },
      });
    },
    onError: () => {
      setIsLoading(false);

      addToast({
        type: "error",
        message: "Error suggesting topics",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!context.trim()) {
      addToast({
        type: "warning",
        message: "Please enter a context first",
      });
      return;
    }

    setIsLoading(true);

    suggestMutation.mutate({
      context,
      country: selectedCountry,
      quantity,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <GenerationLoadingOverlay
          fullScreen
          isVisible={isLoading}
          title="Generating AI suggestions..."
          subtitle="Creating tailored topic ideas for your content strategy"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>

          <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            Suggested Topics
          </h1>

          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            Generate content ideas based on your context.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                Context
              </h2>

              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                Describe the subject, audience or direction you want to explore.
              </p>
            </div>

            <Textarea
              value={context}
              onChange={setContext}
              placeholder="e.g. React performance, advanced TypeScript, developer career..."
              rows={4}
              disabled={isLoading}
            />
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                Configuration
              </h2>

              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                Define how many ideas you want and how they should be structured.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Quantity"
                value={String(quantity)}
                onChange={(value) => setQuantity(Number(value))}
                options={QUANTITY_OPTIONS}
                disabled={isLoading}
              />
              <Select
                label="Country"
                value={selectedCountry}
                onChange={setSelectedCountry}
                options={COUNTRY_OPTIONS}
                disabled={isLoading}
              />
            </div>
          </section>

          <div className="flex justify-end border-t border-surface-200 pt-4 dark:border-surface-800">
            <Button
              type="submit"
              loading={isLoading}
              leftIcon={<Sparkles className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Generating..." : "Suggest topics"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TopicsPage;