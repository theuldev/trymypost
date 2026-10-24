import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  Database,
  FileText,
  Save,
  Sliders,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { FileInput, Input, Label, Switch, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { ragApi, settingsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import { useTranslation } from "@/i18n";
import type { RagDocument } from "@/types";

export function StoragePage() {
  const { t, language } = useTranslation();
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<RagDocument | null>(null);

  // Configurações de RAG (salvas nas Configurações do app)
  const [chunkSize, setChunkSize] = useState("1200");
  const [chunkOverlap, setChunkOverlap] = useState("200");
  const [topK, setTopK] = useState("4");
  const [minScore, setMinScore] = useState("0.5");
  const [rerank, setRerank] = useState(false);

  const { data: appSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });

  useEffect(() => {
    if (appSettings) {
      setChunkSize(String(appSettings.rag_chunk_size ?? 1200));
      setChunkOverlap(String(appSettings.rag_chunk_overlap ?? 200));
      setTopK(String(appSettings.rag_top_k ?? 4));
      setMinScore(String(appSettings.rag_min_score ?? 0.5));
      setRerank(Boolean(appSettings.rag_rerank));
    }
  }, [appSettings]);

  const saveRagSettingsMutation = useMutation({
    mutationFn: () =>
      settingsApi.update({
        rag_chunk_size: Math.max(200, parseInt(chunkSize) || 1200),
        rag_chunk_overlap: Math.max(0, parseInt(chunkOverlap) || 0),
        rag_top_k: Math.min(20, Math.max(1, parseInt(topK) || 4)),
        rag_min_score: Math.min(1, Math.max(0, parseFloat(minScore) || 0.5)),
        rag_rerank: rerank,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      addToast({ type: "success", message: t("storage.toast.settingsSaved") });
    },
    onError: () =>
      addToast({ type: "error", message: t("storage.toast.settingsError") }),
  });

  const { data: status } = useQuery({
    queryKey: ["rag-status"],
    queryFn: () => ragApi.status(),
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["rag-documents"],
    queryFn: () => ragApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => ragApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
      setTitle("");
      setContent("");
      setFile(null);
      addToast({ type: "success", message: t("storage.toast.added") });
    },
    onError: (error: any) =>
      addToast({
        type: "error",
        message: error?.response?.data?.detail || t("storage.toast.addError"),
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ragApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
      setDeleting(null);
      addToast({ type: "info", message: t("storage.toast.deleted") });
    },
    onError: () =>
      addToast({ type: "error", message: t("storage.toast.deleteError") }),
  });

  const handleSubmit = () => {
    const data = new FormData();
    data.append("title", title);
    if (file) {
      data.append("file", file);
    } else {
      data.append("content", content);
    }
    createMutation.mutate(data);
  };

  const canSubmit = !createMutation.isPending && (file !== null || content.trim().length >= 20);

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center mb-8">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/20">
            <Database className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>

          <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            {t("storage.title")}
          </h1>

          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t("storage.subtitle")}
          </p>

          <div className="mt-3 flex flex-col items-center gap-1.5">
            {status?.available ? (
              <>
                <Badge variant="success" size="sm" className="text-[10px] gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {t("storage.status.available")}
                </Badge>
                <span className="text-[10px] text-surface-400">
                  {t("storage.status.model", {
                    model: status.embedding_model,
                    dim: status.vector_dim,
                  })}
                </span>
              </>
            ) : (
              <div className="w-full max-w-lg rounded-md border border-amber-200 bg-amber-50/70 p-3 text-left dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-300">
                      {t("storage.status.unavailable")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-amber-800/80 dark:text-amber-400/80">
                      {t("storage.status.hint")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Adicionar documento */}
        <section className="rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
          <div className="border-b border-surface-200 px-4 py-2.5 dark:border-surface-800">
            <h2 className="text-xs font-semibold text-surface-900 dark:text-surface-50">
              {t("storage.add.title")}
            </h2>
            <p className="mt-0.5 text-[11px] text-surface-400">
              {t("storage.add.subtitle")}
            </p>
          </div>

          <div className="space-y-3 p-4">
            <div>
              <Label className="mb-1 text-[11px]">{t("storage.add.titleLabel")}</Label>
              <Input
                value={title}
                onChange={setTitle}
                placeholder={t("storage.add.titlePlaceholder")}
              />
            </div>

            {!file && (
              <div>
                <Label className="mb-1 text-[11px]">{t("storage.add.contentLabel")}</Label>
                <Textarea
                  value={content}
                  onChange={setContent}
                  placeholder={t("storage.add.contentPlaceholder")}
                  rows={8}
                />
              </div>
            )}

            <div>
              <Label className="mb-1 text-[11px]">{t("storage.add.fileLabel")}</Label>
              <FileInput
                label=""
                accept=".txt,.md,.markdown,.pdf,.docx"
                onChange={(f) => setFile(f)}
              />
              {file && (
                <p className="mt-1 text-[11px] text-surface-500">
                  {file.name}{" "}
                  <button
                    type="button"
                    className="text-red-500 underline"
                    onClick={() => setFile(null)}
                  >
                    ×
                  </button>
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={!canSubmit}
                loading={createMutation.isPending}
                leftIcon={<UploadCloud className="h-3.5 w-3.5" />}
              >
                {createMutation.isPending
                  ? t("storage.add.indexing")
                  : t("storage.add.submit")}
              </Button>
            </div>
          </div>
        </section>

        {/* Configurações de RAG */}
        <section className="mt-6 rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
          <div className="border-b border-surface-200 px-4 py-2.5 dark:border-surface-800">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-surface-900 dark:text-surface-50">
              <Sliders className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              {t("storage.settings.title")}
            </h2>
            <p className="mt-0.5 text-[11px] text-surface-400">
              {t("storage.settings.subtitle")}
            </p>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label className="mb-1 text-[11px]">{t("storage.settings.chunkSize")}</Label>
                <Input value={chunkSize} onChange={setChunkSize} type="number" />
              </div>
              <div>
                <Label className="mb-1 text-[11px]">{t("storage.settings.chunkOverlap")}</Label>
                <Input value={chunkOverlap} onChange={setChunkOverlap} type="number" />
              </div>
              <div>
                <Label className="mb-1 text-[11px]">{t("storage.settings.topK")}</Label>
                <Input value={topK} onChange={setTopK} type="number" />
              </div>
              <div>
                <Label className="mb-1 text-[11px]">{t("storage.settings.minScore")}</Label>
                <Input value={minScore} onChange={setMinScore} type="number" />
              </div>
            </div>

            <Switch
              checked={rerank}
              onChange={setRerank}
              label={t("storage.settings.rerank")}
              description={t("storage.settings.rerankDesc")}
            />

            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => saveRagSettingsMutation.mutate()}
                loading={saveRagSettingsMutation.isPending}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                {t("storage.settings.save")}
              </Button>
            </div>
          </div>
        </section>

        {/* Lista de documentos */}
        <section className="mt-6 rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
          <div className="border-b border-surface-200 px-4 py-2.5 dark:border-surface-800">
            <h2 className="text-xs font-semibold text-surface-900 dark:text-surface-50">
              {t("storage.list.title")}
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <p className="p-6 text-center text-[11px] text-surface-400">
              {t("storage.list.empty")}
            </p>
          ) : (
            <div className="divide-y divide-surface-200 dark:divide-surface-800">
              {documents.map((doc) => (
                <article key={doc.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-3.5 shrink-0 text-surface-400" />
                    <div className="min-w-0">
                      <h3 className="truncate text-xs font-medium text-surface-900 dark:text-surface-50">
                        {doc.title}
                      </h3>
                      {doc.preview && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-surface-500 dark:text-surface-400">
                          {doc.preview}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral" size="sm" className="text-[10px]">
                          {t("storage.list.chunks", { count: doc.chunk_count })}
                        </Badge>
                        <Badge variant="outline" size="sm" className="text-[10px]">
                          {doc.embedding_model}
                        </Badge>
                        <span className="text-[10px] text-surface-400">
                          {t("storage.list.addedAt", {
                            date: new Date(doc.created_at).toLocaleDateString(language),
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(doc)}
                    title={t("storage.delete.confirmButton")}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>

        <Modal
          isOpen={!!deleting}
          onClose={() => setDeleting(null)}
          title={t("storage.delete.title")}
          description={t("storage.delete.description")}
        >
          <p className="mb-6 text-xs text-surface-600 dark:text-surface-400">
            {t("storage.delete.confirm", { title: deleting?.title ?? "" })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {t("storage.delete.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              loading={deleteMutation.isPending}
            >
              {t("storage.delete.confirmButton")}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default StoragePage;
