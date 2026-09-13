import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Copy, Lightbulb, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/store";
import type { TopicSuggestion } from "@/types";

export function TopicsResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useUIStore();

  const topics = (location.state?.topics ?? []) as TopicSuggestion[];

  const handleNavigateToPlayground = (topic: TopicSuggestion) => {
    navigate("/playground", {
      state: {
        initialTopic: topic.title,
        initialDescription: topic.description,
        initialFormat: topic.suggested_format,
      },
    });
  };

  const handleCopyTopic = (topic: TopicSuggestion) => {
    const text = `${topic.title}\n\n${topic.description}\n\nAngle: ${topic.angle}\nHashtags: ${topic.suggested_hashtags.join(" ")}`;

    navigator.clipboard.writeText(text);

    addToast({
      type: "success",
      message: "Topic copied!",
    });
  };

  if (topics.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="w-full max-w-md text-center">
          <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Nenhum tópico encontrado
          </p>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            Gere sugestões de tópicos para visualizar os resultados.
          </p>
          <Button
            onClick={() => navigate("/topics")}
            leftIcon={<Lightbulb className="h-3.5 w-3.5" />}
            className="mt-5"
            size="sm"
          >
            Sugerir Tópicos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/topics")}
          leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Nova busca
        </Button>

        <section className="mt-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                Suggestions
              </h2>

              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {topics.length} {topics.length === 1 ? "topic found" : "topics found"}
              </p>
            </div>

            <div className="hidden items-center gap-1.5 text-xs text-surface-400 sm:flex">
              <Sparkles className="h-3.5 w-3.5" />
              AI generated
            </div>
          </div>

          <div className="divide-y divide-surface-200 dark:divide-surface-800">
            {topics.map((topic, index) => (
              <article key={`${topic.title}-${index}`} className="group py-5 first:pt-0 last:pb-0">
                <div className="flex gap-4">
                  <div className="hidden shrink-0 pt-1 sm:block">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-100 text-xs font-medium text-surface-500 dark:bg-surface-900 dark:text-surface-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-snug text-surface-900 dark:text-surface-50">
                      {topic.title}
                    </h3>

                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-surface-600 dark:text-surface-400">
                      {topic.description}
                    </p>

                    {topic.suggested_hashtags && topic.suggested_hashtags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {topic.suggested_hashtags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="outline" size="sm" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNavigateToPlayground(topic)}
                        leftIcon={<ChevronRight className="h-3.5 w-3.5" />}
                      >
                        Use topic
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyTopic(topic)}
                        leftIcon={<Copy className="h-3.5 w-3.5" />}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default TopicsResultsPage;