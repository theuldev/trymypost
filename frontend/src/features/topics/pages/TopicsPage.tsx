import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Lightbulb, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui";
import { GenerationLoadingOverlay } from "@/components/ui/GenerationLoadingOverlay";
import { topicsApi } from "@/services/posts";
import { useTopicsFormStore, useUIStore } from "@/store";
import { useTranslation } from "@/i18n";
import type { TopicSuggestion } from "@/types";

const COUNTRY_OPTIONS = [
  { value: "Brazil", labelKey: "topics.country.brazil" },
  { value: "United States", labelKey: "topics.country.unitedStates" },
  { value: "Portugal", labelKey: "topics.country.portugal" },
  { value: "Spain", labelKey: "topics.country.spain" },
  { value: "United Kingdom", labelKey: "topics.country.unitedKingdom" },
  { value: "Canada", labelKey: "topics.country.canada" },
  { value: "Germany", labelKey: "topics.country.germany" },
  { value: "France", labelKey: "topics.country.france" },
  { value: "Netherlands", labelKey: "topics.country.netherlands" },
  { value: "Australia", labelKey: "topics.country.australia" },
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { draft, saveDraft } = useTopicsFormStore();

  const [context, setContext] = useState(draft?.context ?? "");
  const [quantity, setQuantity] = useState(draft?.quantity ?? 5);
  const [selectedCountry, setSelectedCountry] = useState(draft?.country ?? "Brazil");
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
        message: t("topics.toast.success", { count: data.topics.length }),
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
        message: t("topics.toast.error"),
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!context.trim()) {
      addToast({
        type: "warning",
        message: t("topics.toast.contextRequired"),
      });
      return;
    }

    saveDraft({ context, quantity, country: selectedCountry });

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
          title={t("topics.loading.title")}
          subtitle={t("topics.loading.subtitle")}
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
            {t("topics.page.title")}
          </h1>

          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t("topics.page.subtitle")}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                {t("topics.context.title")}
              </h2>

              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t("topics.context.description")}
              </p>
            </div>

            <Textarea
              value={context}
              onChange={setContext}
              placeholder={t("topics.context.placeholder")}
              rows={4}
              disabled={isLoading}
            />
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                {t("topics.config.title")}
              </h2>

              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t("topics.config.description")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label={t("topics.quantity.label")}
                value={String(quantity)}
                onChange={(value) => setQuantity(Number(value))}
                options={QUANTITY_OPTIONS}
                disabled={isLoading}
              />
              <Select
                label={t("topics.country.label")}
                value={selectedCountry}
                onChange={setSelectedCountry}
                options={COUNTRY_OPTIONS.map((country) => ({
                  value: country.value,
                  label: t(country.labelKey),
                }))}
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
              {isLoading ? t("topics.submitting") : t("topics.submit")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TopicsPage;