import { useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Copy, Download, Plus } from "lucide-react";

import { PlaygroundResults, type ResultTab } from "@/features/playground/components/PlaygroundResults";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useGenerationStore, useUIStore } from "@/store";

import type { PostVariation } from "@/types";

export function PlaygroundResultsPage() {
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const { result, style, formData } = useGenerationStore();

  const variations = (result?.posts_data ?? []) as PostVariation[];

  const [selectedVariation, setSelectedVariation] =
    useState<PostVariation | null>(variations[0] ?? null);
  const [activeTab, setActiveTab] =
    useState<ResultTab>("posts");
  const [showPreviewModal, setShowPreviewModal] =
    useState(false);

  const topic = formData?.topic ?? "";
  const format = formData?.format ?? "";
  const audience = formData?.audience ?? "";

  const handleCopy = useCallback(
    async (text: string, message = "Copied to clipboard!") => {
      try {
        await navigator.clipboard.writeText(text);
        addToast({ type: "success", message });
      } catch {
        addToast({ type: "error", message: "Failed to copy to clipboard." });
      }
    },
    [addToast],
  );

  const handleOpenPreview = useCallback((post: PostVariation) => {
    setSelectedVariation(post);
    setShowPreviewModal(true);
  }, []);

  const handleGenerateCodeImage = useCallback(
    (code: string, language: string) => {
      navigate("/code-image", {
        state: {
          initialCode: code,
          initialLanguage: language,
          initialTitle: undefined,
        },
      });
    },
    [navigate],
  );

  const handleDownload = () => {
    const content = variations
      .map(
        (variation, index) =>
          `Variation ${index + 1}\n\n${variation.content}`,
      )
      .join("\n\n------------------------------\n\n");

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${topic?.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "post"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (variations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="w-full max-w-md text-center">
          <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Nenhum resultado encontrado
          </p>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            Gere um post para visualizar os resultados.
          </p>
          <Button
            onClick={() => navigate("/playground")}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            className="mt-5"
            size="sm"
          >
            Novo Post
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-surface-200 pb-5 dark:border-surface-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                to="/playground"
                className="mb-3 inline-flex items-center text-xs text-surface-400 transition-colors hover:text-surface-700 dark:hover:text-surface-200"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Novo Post
              </Link>

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="success" size="sm" className="text-[10px]">
                  Concluído
                </Badge>

                <span className="text-[11px] text-surface-400">
                  {format}
                </span>

                <span className="text-surface-300 dark:text-surface-700">•</span>

                <span className="text-[11px] text-surface-400">
                  {style}
                </span>

                <span className="text-surface-300 dark:text-surface-700">•</span>

                <span className="text-[11px] text-surface-400">
                  {audience}
                </span>
              </div>

              <h1 className="text-base font-semibold leading-snug text-surface-900 dark:text-surface-50">
                {topic}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                title="Baixar TXT"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>

        <PlaygroundResults
          generatedPosts={variations}
          selectedVariation={selectedVariation}
          activeTab={activeTab}
          setSelectedVariation={setSelectedVariation}
          setActiveTab={setActiveTab}
          handleCopy={handleCopy}
          handleOpenPreview={handleOpenPreview}
          handleGenerateCodeImage={handleGenerateCodeImage}
          style={style}
          showHeading={false}
        />
      </div>

      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Post Preview"
        size="xl"
      >
        {selectedVariation && (
          <div className="space-y-6">
            <div className="rounded-lg border border-surface-200 p-6 dark:border-surface-800">
              <p className="whitespace-pre-wrap text-sm leading-7 text-surface-700 dark:text-surface-300">
                {selectedVariation.content}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => handleCopy(selectedVariation.content)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Text
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PlaygroundResultsPage;