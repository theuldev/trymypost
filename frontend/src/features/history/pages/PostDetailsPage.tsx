import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Check,
  Code2,
  Copy,
  Download,
  Edit3,
  FileText,
  Heart,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Share2,
  Tag,
  Trash2,
  Wand2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { postsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import { cn } from "@/utils/cn";
import { CodeExample } from "@/types/common";

type DetailTab =
  | "posts"
  | "code"
  | "hashtags"
  | "hooks"
  | "review"
  | "visual";

export function PostDetailsPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <DetailView id={id} />;
}

function DetailView({ id }: { id: string }) {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<DetailTab>("posts");
  const [selectedVariationIndex, setSelectedVariationIndex] =
    useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["post", id],
    queryFn: () => postsApi.getDetail(id),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["history"],
      });

      addToast({
        type: "success",
        message: "Post excluído com sucesso",
      });

      navigate("/history");
    },

    onError: () => {
      addToast({
        type: "error",
        message: "Não foi possível excluir o post",
      });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: () =>
      postsApi.toggleFavorite(id, {
        is_favorite: !post?.is_favorite,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["post", id],
      });

      queryClient.invalidateQueries({
        queryKey: ["history"],
      });
    },

    onError: () => {
      addToast({
        type: "error",
        message: "Erro ao atualizar favorito",
      });
    },
  });

  const handleDelete = () => {
    if (!window.confirm("Tem certeza que deseja excluir esta geração?")) {
      return;
    }

    deleteMutation.mutate();
  };

  const handleFavorite = () => {
    favoriteMutation.mutate();
  };

  const handleCopy = async (
    text: string,
    message = "Copiado para a área de transferência!"
  ) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(true);

      addToast({
        type: "success",
        message,
      });

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      addToast({
        type: "error",
        message: "Erro ao copiar",
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);

      addToast({
        type: "success",
        message: "Link copiado!",
      });
    } catch {
      addToast({
        type: "error",
        message: "Erro ao copiar link",
      });
    }
  };

  const handleDownload = () => {
    if (!post) {
      return;
    }

    const variations = post.posts_data ?? [];

    const content = variations
      .map(
        (variation, index) =>
          `Variation ${index + 1}\n\n${variation.content}`
      )
      .join("\n\n------------------------------\n\n");

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      `${post.topic?.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "post"}.txt`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  const selectVariation = (index: number) => {
    setSelectedVariationIndex(index);
    setActiveTab("posts");
  };

  const tabsConfig = useMemo(() => {
    if (!post) {
      return [];
    }

    const variations = post.posts_data ?? [];
    const current = variations[selectedVariationIndex] ?? variations[0];

    const tabs = [
      { key: "posts", label: "Posts Gerados", icon: FileText, count: 1 },
      {
        key: "code",
        label: "Código",
        icon: Code2,
        count: current?.code_examples?.length ?? 0,
      },
      {
        key: "hashtags",
        label: "Hashtags",
        icon: Tag,
        count: current?.hashtags?.length ?? 0,
      },
      {
        key: "hooks",
        label: "Hooks",
        icon: Wand2,
        count: current?.hooks?.length ?? 0,
      },
      {
        key: "review",
        label: "Análise",
        icon: CheckCircle,
        count: current?.review ? 1 : 0,
      },
      {
        key: "visual",
        label: "Sugestão Visual",
        icon: Palette,
        count: current?.visual_suggestion ? 1 : 0,
      },
    ];

    return tabs.filter((tab) => tab.count > 0);
  }, [post, selectedVariationIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-4">
          <div className="h-6 bg-surface-200 dark:bg-surface-800 rounded w-1/4" />
          <div className="h-40 bg-surface-200 dark:bg-surface-800 rounded" />
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-900">
              <AlertTriangle className="h-4 w-4 text-surface-400" />
            </div>

            <h1 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              Não foi possível carregar o post
            </h1>

            <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
              Ocorreu um erro ao buscar os dados deste post.
            </p>

            <div className="mt-5 flex justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Tentar novamente
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/history")}
              >
                Voltar ao histórico
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const variations = post.posts_data ?? [];

  const currentVariation =
    variations[selectedVariationIndex] ?? variations[0];

  const variationReview = currentVariation?.review ?? null;
  const variationVisual = currentVariation?.visual_suggestion ?? null;
  const variationHashtags = currentVariation?.hashtags ?? [];
  const variationHooks = currentVariation?.hooks ?? [];
  const variationCodeExamples = currentVariation?.code_examples ?? [];

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-surface-200 pb-5 dark:border-surface-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                to="/history"
                className="mb-3 inline-flex items-center text-xs text-surface-400 transition-colors hover:text-surface-700 dark:hover:text-surface-200"
              >
                ← Voltar ao histórico
              </Link>

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    post.status === "completed"
                      ? "success"
                      : post.status === "failed"
                        ? "danger"
                        : "neutral"
                  }
                  size="sm"
                  className="text-[10px]"
                >
                  {post.status}
                </Badge>

                {(post.is_edited || currentVariation?.is_edited) && (
                  <Badge
                    variant="warning"
                    size="sm"
                    className="text-[10px]"
                  >
                    Editada
                  </Badge>
                )}

                <span className="text-[11px] text-surface-400">
                  {post.format}
                </span>

                <span className="text-surface-300 dark:text-surface-700">
                  •
                </span>

                <span className="text-[11px] text-surface-400">
                  {post.style}
                </span>

                <span className="text-surface-300 dark:text-surface-700">
                  •
                </span>

                <span className="text-[11px] text-surface-400">
                  {post.audience}
                </span>
              </div>

              <h1 className="text-base font-semibold leading-snug text-surface-900 dark:text-surface-50">
                {post.topic}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate(`/editor/${post.id}`, {
                    state: {
                      initialContent: currentVariation?.content,
                      initialTopic: post.topic,
                    },
                  })
                }
                title="Editar no Editor"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                title="Compartilhar"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                title="Baixar TXT"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavorite}
                title={
                  post.is_favorite
                    ? "Remover favorito"
                    : "Favoritar"
                }
              >
                <Heart
                  className={cn(
                    "h-3.5 w-3.5",
                    post.is_favorite
                      ? "fill-current text-red-500"
                      : ""
                  )}
                />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          </div>
        </header>

        <section className="mt-6">
          {variations.length > 1 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {variations.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectVariation(index)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    index === selectedVariationIndex
                      ? "bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-400"
                      : "text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                  )}
                >
                  Variação {index + 1}
                </button>
              ))}
            </div>
          )}

          <div className="mb-6 border-b border-surface-200 dark:border-surface-800">
            <div className="flex min-w-max gap-1">
              {tabsConfig.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      setActiveTab(tab.key as DetailTab)
                    }
                    className={cn(
                      "flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors",
                      activeTab === tab.key
                        ? "border-primary-600 text-primary-600"
                        : "border-transparent text-surface-500 hover:text-surface-900 dark:hover:text-surface-50"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />

                    <span>{tab.label}</span>

                    {tab.count > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px]",
                          activeTab === tab.key
                            ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                            : "bg-surface-100 text-surface-500 dark:bg-surface-800"
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* POSTS */}
          {activeTab === "posts" && (
            <div className="space-y-4">
              {currentVariation ? (
                <div className="space-y-4">
                  <div className="border-l-2 border-primary-500 py-1 pl-4">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-surface-800 dark:text-surface-200">
                      {currentVariation.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCopy(currentVariation.content)
                      }
                      leftIcon={
                        copied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {copied ? "Copiado" : "Copiar Texto"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate(`/editor/${post.id}`, {
                          state: {
                            initialContent:
                              currentVariation.content,
                            initialTopic: post.topic,
                          },
                        })
                      }
                      leftIcon={
                        <Edit3 className="h-3.5 w-3.5" />
                      }
                    >
                      Editar no Editor
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-xs text-surface-500">
                  Nenhum post gerado disponível.
                </p>
              )}
            </div>
          )}

          {/* CODE */}
          {activeTab === "code" && (
            <div className="space-y-5">
              {variationCodeExamples.length > 0 ? (
                <div className="space-y-4">
                  {variationCodeExamples.map(
                    (example: CodeExample, index: number) => {
                      const code =
                        example.code

                      const title =
                        `Exemplo de código ${index + 1}`;

                      const language =
                        example.language;

                      return (
                        <div
                          key={index}
                          className="overflow-hidden rounded-lg border border-surface-200 dark:border-surface-800"
                        >
                          <div className="flex items-center justify-between gap-3 border-b border-surface-200 px-3 py-2.5 dark:border-surface-800">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Code2 className="h-3.5 w-3.5 shrink-0 text-primary-600" />

                                <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-50">
                                  {title}
                                </span>
                              </div>

                              <span className="ml-5 text-[10px] text-surface-400">
                                {language}
                              </span>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/code-image`, {
                                  state: {
                                    initialCode: code,
                                    initialLanguage: language,
                                    initialTitle: title,
                                  },
                                })
                              }
                              leftIcon={
                                <ImageIcon className="h-3.5 w-3.5" />
                              }
                            >
                              Criar imagem de código
                            </Button>
                          </div>

                          {example.language && (
                            <div className="border-b border-surface-200 px-3 py-2 dark:border-surface-800">
                              <p className="text-[11px] leading-relaxed text-surface-500 dark:text-surface-400">
                                {example.language}
                              </p>
                            </div>
                          )}

                          <div className="bg-surface-900 px-4 py-3">
                            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-surface-100">
                              <code>{code}</code>
                            </pre>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-900">
                    <Code2 className="h-4 w-4 text-surface-400" />
                  </div>

                  <p className="text-xs font-medium text-surface-700 dark:text-surface-300">
                    Nenhum exemplo de código disponível
                  </p>

                  <p className="mt-1 text-[11px] text-surface-400">
                    Este post não possui exemplos de código.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* HASHTAGS */}
          {activeTab === "hashtags" && (
            <div className="space-y-3">
              {variationHashtags && variationHashtags.length > 0 ? (
                <div className="divide-y divide-surface-200 dark:divide-surface-800">
                  {variationHashtags.map((h, index) => (
                    <div
                      key={`${h.tag}-${index}`}
                      className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Tag className="h-3.5 w-3.5 shrink-0 text-primary-600" />

                        <span className="truncate text-xs font-medium text-surface-900 dark:text-surface-50">
                          #{h.tag.replace(/^#/, "")}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <Badge
                          variant="neutral"
                          size="sm"
                          className="text-[10px]"
                        >
                          {h.relevance}
                        </Badge>

                        {h.estimated_volume && (
                          <span className="text-[11px] text-surface-400">
                            {h.estimated_volume}
                          </span>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              h.tag,
                              `Hashtag #${h.tag} copiada!`
                            )
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-xs text-surface-500">
                  Nenhuma hashtag gerada.
                </p>
              )}
            </div>
          )}

          {/* HOOKS */}
          {activeTab === "hooks" && (
            <div className="space-y-4">
              {variationHooks && variationHooks.length > 0 ? (
                <div className="divide-y divide-surface-200 dark:divide-surface-800">
                  {variationHooks.map((hook, index) => (
                    <div
                      key={index}
                      className="group flex gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <span className="shrink-0 pt-0.5 text-[11px] text-surface-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge
                            variant="primary"
                            size="sm"
                            className="text-[10px]"
                          >
                            {hook.type}
                          </Badge>
                        </div>

                        <p className="text-xs font-medium leading-relaxed text-surface-900 dark:text-surface-50">
                          {hook.text}
                        </p>

                        {hook.why_it_works && (
                          <p className="mt-1.5 text-[11px] leading-relaxed text-surface-400">
                            <span className="font-medium text-surface-600 dark:text-surface-300">
                              Por que funciona:
                            </span>{" "}
                            {hook.why_it_works}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            hook.text,
                            "Hook copiado!"
                          )
                        }
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-xs text-surface-500">
                  Nenhum hook gerado.
                </p>
              )}
            </div>
          )}

          {/* REVIEW */}
          {activeTab === "review" && (
            <div className="space-y-4">
              {variationReview ? (
                <div className="space-y-4">
                  {variationReview.score !== undefined && (
                    <div className="flex items-center justify-between border-b border-surface-200 pb-3 dark:border-surface-800">
                      <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
                        Nota de Análise
                      </span>

                      <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                        {variationReview.score} / 10
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {variationReview.strengths &&
                      variationReview.strengths.length > 0 && (
                        <div>
                          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-surface-900 dark:text-surface-50">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            Pontos Fortes
                          </h4>

                          <ul className="space-y-1 text-xs text-surface-600 dark:text-surface-400">
                            {variationReview.strengths.map(
                              (item: string, i: number) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-1.5"
                                >
                                  <span className="mt-0.5 text-emerald-500">
                                    •
                                  </span>

                                  {item}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {variationReview.improvements &&
                      variationReview.improvements.length > 0 && (
                        <div>
                          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-surface-900 dark:text-surface-50">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            Sugestões de Melhoria
                          </h4>

                          <ul className="space-y-1 text-xs text-surface-600 dark:text-surface-400">
                            {variationReview.improvements.map(
                              (item: string, i: number) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-1.5"
                                >
                                  <span className="mt-0.5 text-amber-500">
                                    •
                                  </span>

                                  {item}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <p className="py-4 text-xs text-surface-500">
                  Nenhuma análise disponível.
                </p>
              )}
            </div>
          )}

          {/* VISUAL */}
          {activeTab === "visual" && (
            <div className="space-y-3">
              {variationVisual ? (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-surface-700 dark:text-surface-300">
                    {variationVisual.visual_description}
                  </p>

                  {variationVisual.code_example && (
                    <pre className="max-h-48 overflow-y-auto rounded-md bg-surface-900 p-3 font-mono text-xs text-surface-100">
                      {variationVisual.code_example}
                    </pre>
                  )}

                  {variationVisual.suggested_tools && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {variationVisual.suggested_tools.map(
                        (tool: string, i: number) => (
                          <Badge
                            key={i}
                            variant="neutral"
                            size="sm"
                            className="text-[10px]"
                          >
                            {tool}
                          </Badge>
                        )
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-4 text-xs text-surface-500">
                  Nenhuma sugestão visual disponível.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default PostDetailsPage;