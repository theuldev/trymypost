import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  Copy,
  Download,
  RotateCcw,
  Save,
  Check,
  Edit3,
  FileText,
  Type,
  Bold,
  Italic,
  Underline,
} from "lucide-react";

const FONT_FAMILY_OPTIONS = [
  { value: "font-sans", label: "Sans (Inter)" },
  { value: "font-serif", label: "Serif (Georgia)" },
  { value: "font-mono", label: "Monospace (Code)" },
];

const FONT_SIZE_OPTIONS = [
  { value: "text-xs", label: "Pequeno (xs)" },
  { value: "text-sm", label: "Médio (sm)" },
  { value: "text-base", label: "Normal (base)" },
  { value: "text-lg", label: "Grande (lg)" },
];
import { Button } from "@/components/ui/Button";
import { Textarea, Select } from "@/components/ui";
import { Badge } from "@/components/ui/Badge";
import { postsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import { cn } from "@/utils/cn";

interface LocationState {
  initialContent?: string;
  initialTopic?: string;
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useUIStore();

  const locationState = location.state as LocationState | null;

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: () => postsApi.getDetail(id!),
    enabled: Boolean(id),
  });

  const originalText =
    post?.posts_data?.[0]?.content ??
    locationState?.initialContent ??
    "Exemplo de texto do post original gerado pela IA...";

  const topicTitle = post?.topic ?? locationState?.initialTopic ?? "Edição de Post";

  const [editedText, setEditedText] = useState<string>(originalText);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"split" | "edit_only">("split");

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
      addToast({ type: "success", message: "Versão editada copiada!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ type: "error", message: "Erro ao copiar" });
    }
  };

  const handleRestore = () => {
    setEditedText(originalText);
    addToast({ type: "info", message: "Restaurado para a versão original" });
  };

  const handleSave = async () => {
    if (id) {
      try {
        await postsApi.saveEdit(id, {
          post_index: 0,
          content: editedText,
          original_content: originalText,
        });
        addToast({ type: "success", message: "Edição salva no banco de dados com sucesso!" });
      } catch (e) {
        addToast({ type: "error", message: "Erro ao salvar no banco. Edição salva localmente." });
        localStorage.setItem(`edited_post_${id}`, editedText);
      }
    } else {
      localStorage.setItem(`edited_post_draft`, editedText);
      addToast({ type: "success", message: "Rascunho salvo localmente com sucesso!" });
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
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <header className="border-b border-surface-200 pb-4 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
                  Editor de Conteúdo
                </h1>
                {isModified ? (
                  <Badge variant="warning" size="sm" className="text-[10px]">
                    Modificado
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm" className="text-[10px]">
                    Sem alterações
                  </Badge>
                )}
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 truncate max-w-md">
                {topicTitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestore}
              disabled={!isModified}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Restaurar Original
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            >
              {copied ? "Copiado" : "Copiar"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Baixar TXT
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              leftIcon={<Save className="h-3.5 w-3.5" />}
            >
              Salvar Edição
            </Button>
          </div>
        </header>

        <div className="flex items-center justify-between text-xs text-surface-500 border-b border-surface-200 dark:border-surface-800 pb-3">
          <div className="flex items-center gap-3">
            <span>{charCount} caracteres</span>
            <span>•</span>
            <span>{wordCount} palavras</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("split")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                activeTab === "split"
                  ? "bg-surface-200 dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                  : "text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
              )}
            >
              Lado a Lado
            </button>
            <button
              onClick={() => setActiveTab("edit_only")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                activeTab === "edit_only"
                  ? "bg-surface-200 dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                  : "text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
              )}
            >
              Apenas Editor
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-md border border-surface-200 dark:border-surface-800 bg-surface-100/50 dark:bg-surface-900/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5 text-surface-400 shrink-0" />
              <div className="w-36">
                <Select
                  value={fontFamily}
                  onChange={setFontFamily}
                  options={FONT_FAMILY_OPTIONS}
                />
              </div>
            </div>

            <div className="w-28">
              <Select
                value={fontSize}
                onChange={setFontSize}
                options={FONT_SIZE_OPTIONS}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 border-l border-surface-200 dark:border-surface-800 pl-3">
            <button
              type="button"
              onClick={() => applyFormat("**", "**")}
              title="Negrito (**texto**)"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 transition-colors"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat("_", "_")}
              title="Itálico (_texto_)"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 transition-colors"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat("<u>", "</u>")}
              title="Sublinhado (<u>texto</u>)"
              className="p-1.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 transition-colors"
            >
              <Underline className="h-4 w-4" />
            </button>
          </div>
        </div>

        <main
          className={cn(
            "grid gap-6",
            activeTab === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
          )}
        >
          {activeTab === "split" && (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-surface-500 dark:text-surface-400 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Versão Original (Leitura)
                </span>
                <Badge variant="neutral" size="sm" className="text-[10px]">
                  Original
                </Badge>
              </div>

              <div className="border border-surface-200 dark:border-surface-800 rounded-md bg-white dark:bg-surface-900 p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
                <p className={cn("whitespace-pre-wrap leading-relaxed text-surface-600 dark:text-surface-400", fontFamily, fontSize)}>
                  {isLoading ? "Carregando texto original..." : originalText}
                </p>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5 text-primary-500" /> Versão Editada
              </span>
              <Badge variant={isModified ? "warning" : "primary"} size="sm" className="text-[10px]">
                {isModified ? "Editada" : "Sem alterações"}
              </Badge>
            </div>

            <Textarea
              ref={textareaRef}
              value={editedText}
              onChange={setEditedText}
              rows={20}
              placeholder="Digite ou edite o texto do seu post aqui..."
              className={cn("leading-relaxed min-h-[400px] max-h-[600px]", fontFamily, fontSize)}
            />
          </section>
        </main>
      </div>
    </div>
  );
}

export default EditorPage;
