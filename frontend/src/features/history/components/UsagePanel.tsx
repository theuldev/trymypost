import { useQuery } from "@tanstack/react-query";
import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { postsApi } from "@/services/posts";
import { useTranslation } from "@/i18n";

const STEP_LABEL_KEYS: Record<string, string> = {
  research: "hist.usage.steps.research",
  post_generation: "hist.usage.steps.postGeneration",
  hooks: "hist.usage.steps.hooks",
  review: "hist.usage.steps.review",
  visual_suggestion: "hist.usage.steps.visualSuggestion",
  hashtags: "hist.usage.steps.hashtags",
  code_generation: "hist.usage.steps.codeGeneration",
  image_generation: "hist.usage.steps.imageGeneration",
};

function formatCost(value: number) {
  return value < 0.01 ? `$${value.toFixed(5)}` : `$${value.toFixed(4)}`;
}

export function UsagePanel({ postId }: { postId: string }) {
  const { t } = useTranslation();

  const { data: usage, isLoading } = useQuery({
    queryKey: ["post-usage", postId],
    queryFn: () => postsApi.getUsage(postId),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        ))}
      </div>
    );
  }

  if (!usage || usage.records.length === 0) {
    return (
      <p className="py-4 text-xs text-surface-500">{t("hist.usage.empty")}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
          <p className="text-[10px] uppercase text-surface-400">{t("hist.usage.totalCost")}</p>
          <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCost(usage.total_cost_usd)}
          </p>
        </div>
        <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
          <p className="text-[10px] uppercase text-surface-400">{t("hist.usage.totalTokens")}</p>
          <p className="mt-1 text-sm font-semibold text-surface-900 dark:text-surface-50">
            {usage.total_tokens.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
          <p className="text-[10px] uppercase text-surface-400">{t("hist.usage.inputTokens")}</p>
          <p className="mt-1 text-sm font-semibold text-surface-900 dark:text-surface-50">
            {usage.total_input_tokens.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
          <p className="text-[10px] uppercase text-surface-400">{t("hist.usage.outputTokens")}</p>
          <p className="mt-1 text-sm font-semibold text-surface-900 dark:text-surface-50">
            {usage.total_output_tokens.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="divide-y divide-surface-200 rounded-lg border border-surface-200 dark:divide-surface-800 dark:border-surface-800">
        {usage.records.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between gap-3 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-50">
                {STEP_LABEL_KEYS[record.step] ? t(STEP_LABEL_KEYS[record.step]) : record.step}
              </span>
              <Badge variant="neutral" size="sm" className="text-[10px]">
                {record.model_name}
              </Badge>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[11px] text-surface-400">
                {record.total_tokens > 0
                  ? `${record.total_tokens.toLocaleString()} tk`
                  : "—"}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCost(record.cost_usd)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
