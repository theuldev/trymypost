import { useState, useEffect, useRef, ReactNode } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Download,
  RotateCcw,
  Save,
  Check,
  Bold,
  Italic,
  Underline,
  Columns2,
  SquarePen,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui";
import { Badge } from "@/components/ui/Badge";
import { postsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import { useTranslation } from "@/i18n";
import { cn } from "@/utils/cn";

interface LocationState {
  initialContent?: string;
  initialTopic?: string;
  initialPostIndex?: number;
}

function ToolButton({
  onClick,
  title,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
          : "text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <span className="mx-1 h-4 w-px shrink-0 bg-surface-200 dark:bg-surface-700" />
  );
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const FONT_FAMILY_OPTIONS = [
    { value: "font-sans", label: t("editor.fontSans") },
    { value: "font-serif", label: t("editor.fontSerif") },
    { value: "font-mono", label: t("editor.fontMono") },
  ];

  const FONT_SIZE_OPTIONS = [
    { value: "text-xs", label: t("editor.fontSizeXs") },
    { value: "text-sm", label: t("editor.fontSizeSm") },
    { value: "text-base", label: t("editor.fontSizeBase") },
    { value: "text-lg", label: t("editor.fontSizeLg") },
  ];

  const locationState = location.state as LocationState | null;

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: () => postsApi.getDetail(id!),
    enabled: Boolean(id),
  });

  const postIndex = locationState?.initialPostIndex ?? 0;

  const originalText =
    post?.posts_data?.[postIndex]?.content ??
    locationState?.initialContent ??
    "Exemplo de texto do post original gerado pela IA...";

  const topicTitle = post?.topic ?? locationState?.initialTopic ?? t("editor.defaultTopic");

  const [editedText, setEditedText] = useState<string>(originalText);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"split" | "edit_only">("split");

  const [fontFamily, setFontFamily] = useState<string>("font-sans");
  const [fontSize, setFontSize] = useState<string>("text-xs");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (originalText && editedText === "Exemplo de texto do post original gerado pela IA...") {
      setEditedText(originalText);
    }
  }, [originalText]);

  const isModified = editedText !== originalText;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      addToast({ type: "success", message: t("editor.toastCopied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ type: "error", message: t("editor.toastCopyError") });
    }
  };

  const handleRestore = () => {
    setEditedText(originalText);
    addToast({ type: "info", message: t("editor.toastRestored") });
  };

  const handleSave = async () => {
    if (id) {
      try {
        await postsApi.saveEdit(id, {
          post_index: postIndex,
          content: editedText,
          original_content: originalText,
        });
        queryClient.invalidateQueries({ queryKey: ["post-edits", id] });
        addToast({ type: "success", message: t("editor.toastSavedDb") });
      } catch (e) {
        addToast({ type: "error", message: t("editor.toastSaveError") });
        localStorage.setItem(`edited_post_${id}`, editedText);
      }
    } else {
      localStorage.setItem(`edited_post_draft`, editedText);
      addToast({ type: "success", message: t("editor.toastDraftSaved") });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([editedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${topicTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-editado.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applyFormat = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editedText.substring(start, end) || "texto";
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newText = editedText.substring(0, start) + replacement + editedText.substring(end);

    setEditedText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  const charCount = editedText.length;
  const wordCount = editedText.trim() ? editedText.trim().split(/\s+/).length : 0;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-surface-100 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
      </div>

      {/* Toolbar flutuante, estilo Google Docs */}
      <div className="sticky top-3 z-10 mx-auto mt-3 flex w-fit max-w-[calc(100%-1rem)] flex-wrap items-center justify-center gap-0.5 rounded-md border border-surface-200 bg-white px-1.5 py-1 shadow-card dark:border-surface-800 dark:bg-surface-900">
        <div className="w-36">
          <Select
            value={fontFamily}
            onChange={setFontFamily}
            options={FONT_FAMILY_OPTIONS}
          />
        </div>

        <div className="w-28">
          <Select
            value={fontSize}
            onChange={setFontSize}
            options={FONT_SIZE_OPTIONS}
          />
        </div>

        <ToolbarDivider />

        <ToolButton onClick={() => applyFormat("**", "**")} title={t("editor.bold")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => applyFormat("_", "_")} title={t("editor.italic")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => applyFormat("<u>", "</u>")} title={t("editor.underline")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolButton>

        <ToolbarDivider />

        <ToolButton
          onClick={() => setViewMode("split")}
          title={t("editor.splitView")}
          active={viewMode === "split"}
        >
          <Columns2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          onClick={() => setViewMode("edit_only")}
          title={t("editor.editOnly")}
          active={viewMode === "edit_only"}
        >
          <SquarePen className="h-3.5 w-3.5" />
        </ToolButton>

        <ToolbarDivider />

        <ToolButton onClick={handleCopy} title={t("editor.copyText")}>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </ToolButton>
        <ToolButton onClick={handleDownload} title={t("editor.downloadTxt")}>
          <Download className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          onClick={handleRestore}
          title={t("editor.restoreOriginal")}
          disabled={!isModified}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </ToolButton>

        <ToolbarDivider />


        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          leftIcon={<Save className="h-3.5 w-3.5" />}
        >
          {t("editor.save")}
        </Button>
      </div>

      {/* Folhas de documento */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div
          className={cn(
            "grid gap-6",
            viewMode === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
          )}
        >
          {viewMode === "split" && (
            <section className="overflow-hidden rounded-lg border border-surface-200 bg-white shadow-card dark:border-surface-800 dark:bg-surface-900">
              <div className="flex items-center justify-between border-b border-surface-200 px-6 py-2 dark:border-surface-800">
                <span className="text-[11px] font-medium text-surface-400">
                  {t("editor.originalVersion")}
                </span>
                <Badge variant="neutral" size="sm" className="text-[10px]">
                  {t("editor.reading")}
                </Badge>
              </div>
              <div className="max-h-[70vh] min-h-[400px] overflow-y-auto px-8 py-6">
                <p
                  className={cn(
                    "whitespace-pre-wrap leading-relaxed text-surface-600 dark:text-surface-400",
                    fontFamily,
                    fontSize
                  )}
                >
                  {isLoading ? t("editor.loadingOriginal") : originalText}
                </p>
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-lg border border-surface-200 bg-white shadow-card dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center justify-between border-b border-surface-200 px-6 py-2 dark:border-surface-800">
              <span className="text-[11px] font-medium text-surface-400">
                {t("editor.editing")}
              </span>
              <Badge
                variant={isModified ? "warning" : "primary"}
                size="sm"
                className="text-[10px]"
              >
                {isModified ? t("editor.edited") : t("editor.original")}
              </Badge>
            </div>
            <textarea
              ref={textareaRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder={t("editor.placeholder")}
              className={cn(
                "max-h-[70vh] min-h-[400px] w-full resize-none border-0 bg-transparent px-8 py-6 leading-relaxed text-surface-800 placeholder:text-surface-400 focus:outline-none dark:text-surface-200 dark:placeholder:text-surface-500",
                fontFamily,
                fontSize
              )}
            />
          </section>
        </div>
      </main>

      {/* Barra de status */}
      <footer className="flex items-center justify-between border-t border-surface-200 bg-white px-4 py-1.5 text-[11px] text-surface-400 dark:border-surface-800 dark:bg-surface-900">
        <span>
          {t("editor.statusCounts", {
            words: `${wordCount} ${
              wordCount === 1 ? t("editor.wordSingular") : t("editor.wordPlural")
            }`,
            chars: charCount,
          })}
        </span>
        <span>
          {isModified
            ? t("editor.unsavedChanges")
            : t("editor.synced")}
        </span>
      </footer>
    </div>
  );
}

export default EditorPage;
