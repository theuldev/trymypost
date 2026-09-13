import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  Download,
  Copy,
  X,
  Save,
  Loader2,
  Image as ImageIcon,
  Code2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button, IconButton } from "@/components/ui";
import { Input, Textarea, Select, Switch, Label } from "@/components/ui";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { codeApi, codePresetsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import html2canvas from "html2canvas";
import Prism from "prismjs";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-python";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-java";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "csharp", label: "C#" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Shell/Bash" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "json", label: "JSON" },
  { value: "plaintext", label: "Texto Plano" },
];

const THEMES = [
  { value: "vs2022-blue", label: "VS 2022 Blue", gradient: "linear-gradient(135deg, #1b3a5c, #1e3a5f)" },
  { value: "vscode-dark", label: "VS Code Dark", gradient: "linear-gradient(135deg, #1a1a2e, #1e1e2e)" },
  { value: "midnight", label: "Midnight", gradient: "linear-gradient(135deg, #0f2027, #2c5364)" },
  { value: "emerald", label: "Emerald", gradient: "linear-gradient(135deg, #11998e, #38ef7d)" },
  { value: "github-dark", label: "GitHub Dark", gradient: "linear-gradient(135deg, #0d1117, #21262d)" },
  { value: "dracula", label: "Dracula", gradient: "linear-gradient(135deg, #282a36, #6272a4)" },
  { value: "one-dark", label: "One Dark", gradient: "linear-gradient(135deg, #282c34, #21252b)" },
  { value: "nord", label: "Nord", gradient: "linear-gradient(135deg, #2e3440, #434c5e)" },
  { value: "dark", label: "Cinza Escuro", gradient: "linear-gradient(135deg, #27272a, #09090b)" },
  { value: "transparent", label: "Transparente", gradient: "transparent" },
];

const FONT_FAMILIES = [
  { value: "'Cascadia Code', 'Fira Code', 'Consolas', monospace", label: "Cascadia Code" },
  { value: "'Consolas', 'Courier New', monospace", label: "Consolas" },
  { value: "'Fira Code', 'Courier New', monospace", label: "Fira Code" },
  { value: "'JetBrains Mono', 'Courier New', monospace", label: "JetBrains Mono" },
];

const FONT_SIZES = [
  { value: "12px", label: "Pequeno (12px)" },
  { value: "14px", label: "Médio (14px)" },
  { value: "16px", label: "Grande (16px)" },
];

const PADDINGS = [
  { value: "20px", label: "Pequeno (20px)" },
  { value: "36px", label: "Médio (36px)" },
  { value: "52px", label: "Grande (52px)" },
];

const WINDOW_STYLES = [
  { value: "mac", label: "macOS" },
  { value: "simple", label: "Simples" },
  { value: "none", label: "Sem barra" },
];

const VS_CSHARP_CSS = `
  .vs-csharp { color: #DCDCDC; }
  .vs-csharp .token.comment, .vs-csharp .token.doctag, .vs-csharp .token.prolog { color: #57A64A; }
  .vs-csharp .token.string, .vs-csharp .token.char { color: #D69D85; }
  .vs-csharp .token.keyword { color: #569CD6; }
  .vs-csharp .token.class-name, .vs-csharp .token.namespace, .vs-csharp .token.type { color: #4EC9B0; }
  .vs-csharp .token.function, .vs-csharp .token.method, .vs-csharp .token.property { color: #DCDCAA; }
  .vs-csharp .token.variable { color: #9CDCFE; }
  .vs-csharp .token.number, .vs-csharp .token.boolean { color: #B5CEA8; }
  .vs-csharp .token.control-flow { color: #D8A0DF; }
  .vs-csharp .token.operator, .vs-csharp .token.punctuation { color: #DCDCDC; }
`;

interface Preset {
  name: string;
  theme: string;
  language: string;
  fontFamily: string;
  fontSize: string;
  padding: string;
  windowStyle: string;
  showLineNumbers: boolean;
}

export function CodeImagePage() {
  const { addToast } = useUIStore();
  const location = useLocation();
  const navState = location.state as {
    initialCode?: string;
    initialLanguage?: string;
    initialTitle?: string;
  } | null;
  const previewRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"code" | "post">("code");
  const [code, setCode] = useState<string>(
    navState?.initialCode ??
      'function calculateTotal(items) {\n  return items.reduce((sum, item) => sum + item.price, 0);\n}'
  );
  const [postText, setPostText] = useState<string>("");
  const [title, setTitle] = useState<string>(navState?.initialTitle ?? "index.ts");
  const [language, setLanguage] = useState<string>(navState?.initialLanguage ?? "typescript");
  const [theme, setTheme] = useState<string>("vs2022-blue");
  const [fontFamily, setFontFamily] = useState<string>(FONT_FAMILIES[0].value);
  const [fontSize, setFontSize] = useState<string>("14px");
  const [padding, setPadding] = useState<string>("36px");
  const [windowStyle, setWindowStyle] = useState<string>("mac");
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [showSavePreset, setShowSavePreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem("code_image_presets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const generateCodeMutation = useMutation({
    mutationFn: (data: { post: string }) => codeApi.fromPost({ post: data.post }),
    onSuccess: (data) => {
      setCode(data.code);
      if (data.language) setLanguage(data.language.toLowerCase());
      if (data.title) setTitle(data.title);
      addToast({ type: "success", message: "Código extraído com sucesso" });
      setMode("code");
    },
    onError: () => addToast({ type: "error", message: "Erro ao extrair código" }),
  });

  const highlightCode = useCallback(() => {
    if (codeRef.current) {
      codeRef.current.textContent = code;
      const grammar = Prism.languages[language] || Prism.languages.plaintext;
      if (grammar) {
        codeRef.current.innerHTML = Prism.highlight(code, grammar, language);
      }
    }
  }, [code, language]);

  useEffect(() => {
    highlightCode();
  }, [highlightCode]);

  useEffect(() => {
    if (lineNumbersRef.current && showLineNumbers) {
      const linesCount = code.split("\n").length;
      const lineNums = Array.from({ length: linesCount }, (_, i) => i + 1).join("\n");
      lineNumbersRef.current.textContent = lineNums;
    }
  }, [code, showLineNumbers]);

  const handleCopy = async () => {
    if (!previewRef.current) return;
    setIsRendering(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          addToast({ type: "success", message: "Imagem copiada para a área de transferência!" });
        }
      });
    } catch {
      addToast({ type: "error", message: "Erro ao copiar imagem" });
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setIsRendering(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `code-${title || "snippet"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      addToast({ type: "success", message: "Download iniciado!" });
    } catch {
      addToast({ type: "error", message: "Erro ao baixar imagem" });
    } finally {
      setIsRendering(false);
    }
  };

  const { data: serverPresets = [], refetch: refetchPresets } = useQuery({
    queryKey: ["code-presets"],
    queryFn: () => codePresetsApi.list(),
  });

  const savePresetMutation = useMutation({
    mutationFn: (presetData: any) => codePresetsApi.create(presetData),
    onSuccess: () => {
      refetchPresets();
      setShowSavePreset(false);
      setNewPresetName("");
      addToast({ type: "success", message: "Preset salvo no banco com sucesso" });
    },
    onError: () => addToast({ type: "error", message: "Erro ao salvar preset no banco" }),
  });

  const deletePresetMutation = useMutation({
    mutationFn: (id: string) => codePresetsApi.delete(id),
    onSuccess: () => {
      refetchPresets();
      addToast({ type: "info", message: "Preset excluído do banco" });
    },
    onError: () => addToast({ type: "error", message: "Erro ao excluir preset" }),
  });

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    savePresetMutation.mutate({
      name: newPresetName.trim(),
      theme,
      language,
      font_family: fontFamily,
      font_size: fontSize,
      padding,
      window_style: windowStyle,
      show_line_numbers: showLineNumbers,
    });
  };

  const handleApplyPreset = (p: any) => {
    if (p.theme) setTheme(p.theme);
    if (p.language) setLanguage(p.language);
    if (p.font_family || p.fontFamily) setFontFamily(p.font_family || p.fontFamily);
    if (p.font_size || p.fontSize) setFontSize(p.font_size || p.fontSize);
    if (p.padding) setPadding(p.padding);
    if (p.window_style || p.windowStyle) setWindowStyle(p.window_style || p.windowStyle);
    if (p.show_line_numbers !== undefined) setShowLineNumbers(p.show_line_numbers);
    else if (p.showLineNumbers !== undefined) setShowLineNumbers(p.showLineNumbers);
    addToast({ type: "info", message: `Preset "${p.name}" aplicado` });
  };

  const handleDeletePreset = (id?: string, index?: number) => {
    if (id) {
      deletePresetMutation.mutate(id);
    }
  };

  const themeObj = THEMES.find((t) => t.value === theme);
  const isCSharp = language === "csharp";

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      <div className="w-full lg:w-80 border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-y-auto p-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-700 dark:text-surface-300">
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Imagem de Código</h1>
            <p className="text-[11px] text-surface-500 dark:text-surface-400">Exporte trechos de código em PNG</p>
          </div>
        </div>

        <div className="flex border-b border-surface-200 dark:border-surface-800 text-xs">
          <button
            onClick={() => setMode("code")}
            className={cn(
              "flex-1 pb-2 font-medium border-b-2 transition-colors",
              mode === "code"
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            )}
          >
            Código
          </button>
          <button
            onClick={() => setMode("post")}
            className={cn(
              "flex-1 pb-2 font-medium border-b-2 transition-colors",
              mode === "post"
                ? "border-primary-600 text-primary-600 dark:text-primary-400"
                : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
            )}
          >
            Gerar a partir do Post
          </button>
        </div>

        <div className="space-y-4 flex-1 text-xs">
          {mode === "code" ? (
            <>
              <div>
                <Label className="mb-1 text-[11px]">Título / Arquivo</Label>
                <Input value={title} onChange={setTitle} placeholder="index.ts" />
              </div>

              <div>
                <Label className="mb-1 text-[11px]">Linguagem</Label>
                <Select value={language} onChange={setLanguage} options={LANGUAGES} />
              </div>

              <div>
                <Label className="mb-1 text-[11px]">Código</Label>
                <Textarea
                  value={code}
                  onChange={setCode}
                  placeholder="Cole seu código..."
                  rows={7}
                  className="font-mono text-xs"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="mb-1 text-[11px]">Texto do Post</Label>
                <Textarea
                  value={postText}
                  onChange={setPostText}
                  placeholder="Cole o texto do post para gerar o código..."
                  rows={5}
                />
              </div>
              <Button
                fullWidth
                size="sm"
                onClick={() => generateCodeMutation.mutate({ post: postText })}
                loading={generateCodeMutation.isPending}
              >
                {generateCodeMutation.isPending ? "Gerando..." : "Gerar Código"}
              </Button>
            </>
          )}

          <div className="pt-3 space-y-3 border-t border-surface-200 dark:border-surface-800">
            <div>
              <Label className="mb-1 text-[11px]">Fonte</Label>
              <Select value={fontFamily} onChange={setFontFamily} options={FONT_FAMILIES} />
            </div>

            <div>
              <Label className="mb-1 text-[11px]">Tamanho da Fonte</Label>
              <Select value={fontSize} onChange={setFontSize} options={FONT_SIZES} />
            </div>

            <div>
              <Label className="mb-1 text-[11px]">Tema do Fundo</Label>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      "h-7 rounded border transition-all",
                      theme === t.value
                        ? "border-primary-500 ring-2 ring-primary-500/20"
                        : "border-surface-200 dark:border-surface-700 hover:border-surface-400"
                    )}
                    style={{ background: t.gradient }}
                    title={t.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-1 text-[11px]">Espaçamento Interno</Label>
              <Select value={padding} onChange={setPadding} options={PADDINGS} />
            </div>

            <div>
              <Label className="mb-1 text-[11px]">Janela</Label>
              <Select value={windowStyle} onChange={setWindowStyle} options={WINDOW_STYLES} />
            </div>

            <div className="flex items-center justify-between pt-1">
              <Label className="mb-0 text-[11px]">Números de Linha</Label>
              <Switch checked={showLineNumbers} onChange={setShowLineNumbers} />
            </div>
          </div>

          <div className="pt-3 border-t border-surface-200 dark:border-surface-800 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="mb-0 text-[11px]">Presets Salvos</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavePreset(true)}
                leftIcon={<Save className="h-3 w-3" />}
              >
                Salvar
              </Button>
            </div>

            {serverPresets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {serverPresets.map((p, i) => (
                  <div
                    key={p.id || i}
                    onClick={() => handleApplyPreset(p)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[10px] rounded border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 hover:border-primary-500 cursor-pointer transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: THEMES.find((t) => t.value === p.theme)?.gradient || "#666" }}
                    />
                    <span className="font-medium truncate max-w-[80px]">{p.name}</span>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      ariaLabel="Excluir"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(p.id, i);
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-surface-100 dark:bg-surface-950">
        <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex items-center justify-between">
          <span className="text-xs font-medium text-surface-700 dark:text-surface-300">
            Pré-visualização da Imagem
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              disabled={isRendering}
              leftIcon={isRendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            >
              {isRendering ? "Processando..." : "Copiar Imagem"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              disabled={isRendering}
              leftIcon={isRendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            >
              {isRendering ? "Processando..." : "Baixar PNG"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
          <div
            ref={previewRef}
            className="w-full max-w-3xl transition-all"
            style={{ background: themeObj?.gradient, padding }}
          >
            <div
              className="rounded-md overflow-hidden border border-white/10 shadow-lg bg-[#1e1e1e]"
            >
              {isCSharp && <style>{VS_CSHARP_CSS}</style>}
              {windowStyle !== "none" && (
                <div
                  className={cn(
                    "h-7 flex items-center px-3 border-b border-white/10",
                    windowStyle === "mac" && "bg-[#1a1a1a]",
                    windowStyle === "simple" && "bg-[#252526]"
                  )}
                >
                  {windowStyle === "mac" && (
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex-1 text-center text-[11px] font-mono text-[#a1a1aa]",
                      windowStyle === "simple" && "text-left ml-1"
                    )}
                  >
                    {title}
                  </div>
                  {windowStyle === "mac" && <div className="w-10" />}
                </div>
              )}

              <div className="flex">
                {showLineNumbers && (
                  <div
                    ref={lineNumbersRef}
                    className="select-none text-[#4b5563] border-r border-white/10 py-3 px-2 text-right font-mono"
                    style={{ fontSize, whiteSpace: "pre" }}
                  />
                )}
                <pre className="flex-1 min-w-0 overflow-auto p-3.5 m-0" style={{ fontSize }}>
                  <code
                    ref={codeRef}
                    className={`language-${language}${isCSharp ? " vs-csharp" : ""}`}
                    style={{ fontFamily, fontSize, lineHeight: "1.6", color: isCSharp ? "#DCDCDC" : undefined }}
                  >
                    {code || " "}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showSavePreset}
        onClose={() => {
          setShowSavePreset(false);
          setNewPresetName("");
        }}
        title="Salvar Preset"
        description="Nomeie esta configuração para reusar depois"
      >
        <Input
          value={newPresetName}
          onChange={setNewPresetName}
          placeholder="Ex: Tema VS Code Meu"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="secondary"
            onClick={() => {
              setShowSavePreset(false);
              setNewPresetName("");
            }}
          >
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSavePreset} disabled={!newPresetName.trim()}>
            Salvar
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default CodeImagePage;
