import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import {
  Download,
  Copy,
  X,
  Save,
  Loader2,
  Code2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button, IconButton } from "@/components/ui";
import { Input, Textarea, Select, Switch, Label } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { codeApi, codePresetsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import { useTranslation } from "@/i18n";
import html2canvas from "html2canvas";
import { CodeImagePreview } from "../components/CodeImagePreview";
import {
  THEMES,
  FONT_FAMILIES,
  DEFAULT_SYNTAX_THEME,
  getLanguageOptions,
  getThemeOptions,
  getSyntaxThemeOptions,
  getFontFamilyOptions,
  getFontSizeOptions,
  getPaddingOptions,
  getWindowStyleOptions,
} from "../constants";

interface Preset {
  name: string;
  theme: string;
  language: string;
  syntaxTheme?: string;
  fontFamily: string;
  fontSize: string;
  padding: string;
  windowStyle: string;
  showLineNumbers: boolean;
}

export function CodeImagePage() {
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const location = useLocation();
  const navState = location.state as {
    initialCode?: string;
    initialLanguage?: string;
    initialTitle?: string;
  } | null;
  const previewRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"code" | "post">("code");
  const [code, setCode] = useState<string>(
    navState?.initialCode ??
      'function calculateTotal(items) {\n  return items.reduce((sum, item) => sum + item.price, 0);\n}'
  );
  const [postText, setPostText] = useState<string>("");
  const [title, setTitle] = useState<string>(navState?.initialTitle ?? "index.ts");
  const [language, setLanguage] = useState<string>(navState?.initialLanguage ?? "typescript");
  const [theme, setTheme] = useState<string>("vs2022-blue");
  const [syntaxTheme, setSyntaxTheme] = useState<string>(DEFAULT_SYNTAX_THEME);
  const [fontFamily, setFontFamily] = useState<string>(FONT_FAMILIES[0].value);
  const [fontSize, setFontSize] = useState<string>("14px");
  const [padding, setPadding] = useState<string>("36px");
  const [windowStyle, setWindowStyle] = useState<string>("mac");
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [showSavePreset, setShowSavePreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [presetToDelete, setPresetToDelete] = useState<any | null>(null);
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
      addToast({ type: "success", message: t("codeimg.toastCodeExtracted") });
      setMode("code");
    },
    onError: () => addToast({ type: "error", message: t("codeimg.toastExtractError") }),
  });

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
          addToast({ type: "success", message: t("codeimg.toastImageCopied") });
        }
      });
    } catch {
      addToast({ type: "error", message: t("codeimg.toastCopyError") });
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
      addToast({ type: "success", message: t("codeimg.toastDownloadStarted") });
    } catch {
      addToast({ type: "error", message: t("codeimg.toastDownloadError") });
    } finally {
      setIsRendering(false);
    }
  };

  const { data: serverPresetsData, refetch: refetchPresets } = useQuery({
    queryKey: ["code-presets"],
    queryFn: () => codePresetsApi.list(),
  });
  const serverPresets: any[] = Array.isArray(serverPresetsData) ? serverPresetsData : [];

  const savePresetMutation = useMutation({
    mutationFn: (presetData: any) => codePresetsApi.create(presetData),
    onSuccess: () => {
      refetchPresets();
      setShowSavePreset(false);
      setNewPresetName("");
      addToast({ type: "success", message: t("codeimg.toastPresetSaved") });
    },
    onError: () => addToast({ type: "error", message: t("codeimg.toastPresetSaveError") }),
  });

  const deletePresetMutation = useMutation({
    mutationFn: (id: string) => codePresetsApi.delete(id),
    onSuccess: () => {
      refetchPresets();
      setPresetToDelete(null);
      addToast({ type: "info", message: t("codeimg.toastPresetDeleted") });
    },
    onError: () => addToast({ type: "error", message: t("codeimg.toastPresetDeleteError") }),
  });

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    savePresetMutation.mutate({
      name: newPresetName.trim(),
      theme,
      language,
      syntax_theme: syntaxTheme,
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
    setSyntaxTheme(p.syntax_theme || p.syntaxTheme || DEFAULT_SYNTAX_THEME);
    if (p.font_family || p.fontFamily) setFontFamily(p.font_family || p.fontFamily);
    if (p.font_size || p.fontSize) setFontSize(p.font_size || p.fontSize);
    if (p.padding) setPadding(p.padding);
    if (p.window_style || p.windowStyle) setWindowStyle(p.window_style || p.windowStyle);
    if (p.show_line_numbers !== undefined) setShowLineNumbers(p.show_line_numbers);
    else if (p.showLineNumbers !== undefined) setShowLineNumbers(p.showLineNumbers);
    addToast({ type: "info", message: t("codeimg.toastPresetApplied", { name: p.name }) });
  };

  const handleConfirmDeletePreset = () => {
    if (presetToDelete?.id) {
      deletePresetMutation.mutate(presetToDelete.id);
    } else {
      setPresetToDelete(null);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-2xl text-center mb-8">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <Code2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            {t("codeimg.title")}
          </h1>
          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t("codeimg.description")}
          </p>
        </header>

        <div className="space-y-6">
          {/* Conteúdo */}
          <section className="rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
            <div className="border-b border-surface-200 px-4 py-2.5 dark:border-surface-800">
              <div className="flex items-center gap-1 rounded-md bg-surface-100 p-1 dark:bg-surface-800 w-fit">
                <button
                  type="button"
                  onClick={() => setMode("code")}
                  className={cn(
                    "rounded px-3 py-1 text-[11px] font-medium transition-colors",
                    mode === "code"
                      ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-surface-50"
                      : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                  )}
                >
                  {t("codeimg.tabCode")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("post")}
                  className={cn(
                    "rounded px-3 py-1 text-[11px] font-medium transition-colors",
                    mode === "post"
                      ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-surface-50"
                      : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                  )}
                >
                  {t("codeimg.tabFromPost")}
                </button>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {mode === "code" ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1 text-[11px]">{t("codeimg.labelTitleFile")}</Label>
                      <Input value={title} onChange={setTitle} placeholder="index.ts" />
                    </div>
                    <div>
                      <Label className="mb-1 text-[11px]">{t("codeimg.labelLanguage")}</Label>
                      <Select value={language} onChange={setLanguage} options={getLanguageOptions(t)} />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1 text-[11px]">{t("codeimg.labelCode")}</Label>
                    <Textarea
                      value={code}
                      onChange={setCode}
                      placeholder={t("codeimg.placeholderCode")}
                      rows={7}
                      className="font-mono text-xs"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="mb-1 text-[11px]">{t("codeimg.labelPostText")}</Label>
                    <Textarea
                      value={postText}
                      onChange={setPostText}
                      placeholder={t("codeimg.placeholderPostText")}
                      rows={5}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => generateCodeMutation.mutate({ post: postText })}
                      loading={generateCodeMutation.isPending}
                    >
                      {generateCodeMutation.isPending ? t("codeimg.generating") : t("codeimg.generateCode")}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Aparência */}
          <section className="rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
            <div className="border-b border-surface-200 px-4 py-2.5 dark:border-surface-800">
              <h2 className="text-xs font-semibold text-surface-900 dark:text-surface-50">
                {t("codeimg.sectionAppearance")}
              </h2>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 text-[11px]">{t("codeimg.labelSyntaxTheme")}</Label>
                  <Select value={syntaxTheme} onChange={setSyntaxTheme} options={getSyntaxThemeOptions(t)} />
                </div>
                <div>
                  <Label className="mb-1 text-[11px]">{t("codeimg.labelFont")}</Label>
                  <Select value={fontFamily} onChange={setFontFamily} options={getFontFamilyOptions(t)} />
                </div>
                <div>
                  <Label className="mb-1 text-[11px]">{t("codeimg.labelFontSize")}</Label>
                  <Select value={fontSize} onChange={setFontSize} options={getFontSizeOptions(t)} />
                </div>
                <div>
                  <Label className="mb-1 text-[11px]">{t("codeimg.labelPadding")}</Label>
                  <Select value={padding} onChange={setPadding} options={getPaddingOptions(t)} />
                </div>
                <div>
                  <Label className="mb-1 text-[11px]">{t("codeimg.labelWindow")}</Label>
                  <Select value={windowStyle} onChange={setWindowStyle} options={getWindowStyleOptions(t)} />
                </div>
                <div className="flex items-end justify-between gap-2 pb-0.5">
                  <Label className="mb-0 text-[11px]">{t("codeimg.labelLineNumbers")}</Label>
                  <Switch checked={showLineNumbers} onChange={setShowLineNumbers} />
                </div>
              </div>

              <div>
                <Label className="mb-1 text-[11px]">{t("codeimg.labelBackgroundTheme")}</Label>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {getThemeOptions(t).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "h-7 rounded-md border transition-all",
                        theme === opt.value
                          ? "border-primary-500 ring-2 ring-primary-500/20"
                          : "border-surface-200 dark:border-surface-700 hover:border-surface-400"
                      )}
                      style={{ background: opt.gradient }}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Pré-visualização */}
          <section className="overflow-hidden rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
            <div className="border-b border-surface-200 px-4 py-2.5 dark:border-surface-800">
              <h2 className="text-xs font-semibold text-surface-900 dark:text-surface-50">
                {t("codeimg.previewLabel")}
              </h2>
            </div>
            <div className="flex overflow-auto bg-surface-100 p-6 dark:bg-surface-950">
              <CodeImagePreview
                ref={previewRef}
                code={code}
                language={language}
                title={title}
                theme={theme}
                syntaxTheme={syntaxTheme}
                fontFamily={fontFamily}
                fontSize={fontSize}
                padding={padding}
                windowStyle={windowStyle}
                showLineNumbers={showLineNumbers}
                className="m-auto"
              />
            </div>
          </section>

          {/* Presets */}
          <section className="rounded-lg border border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center justify-between border-b border-surface-200 px-4 py-2.5 dark:border-surface-800">
              <h2 className="text-xs font-semibold text-surface-900 dark:text-surface-50">
                {t("codeimg.savedPresets")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSavePreset(true)}
                leftIcon={<Save className="h-3 w-3" />}
              >
                {t("codeimg.save")}
              </Button>
            </div>

            <div className="p-4">
              {serverPresets.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {serverPresets.map((p, i) => (
                    <div
                      key={p.id || i}
                      onClick={() => handleApplyPreset(p)}
                      className="flex items-center gap-1.5 px-2 py-1 text-[10px] rounded border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 hover:border-primary-500 cursor-pointer transition-colors"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: THEMES.find((opt) => opt.value === p.theme)?.gradient || "#666" }}
                      />
                      <span className="font-medium truncate max-w-[80px]">{p.name}</span>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        ariaLabel={t("codeimg.delete")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPresetToDelete(p);
                        }}
                      >
                        <X className="h-2.5 w-2.5" />
                      </IconButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-surface-400">
                  {t("codeimg.presetsEmpty")}
                </p>
              )}
            </div>
          </section>

          {/* Ações */}
          <div className="flex flex-col gap-3 border-t border-surface-200 pt-6 dark:border-surface-800 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              size="md"
              onClick={handleCopy}
              disabled={isRendering}
              leftIcon={isRendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            >
              {isRendering ? t("codeimg.processing") : t("codeimg.copyImage")}
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleDownload}
              disabled={isRendering}
              className="sm:min-w-[200px]"
              leftIcon={isRendering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            >
              {isRendering ? t("codeimg.processing") : t("codeimg.downloadPng")}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showSavePreset}
        onClose={() => {
          setShowSavePreset(false);
          setNewPresetName("");
        }}
        title={t("codeimg.savePresetTitle")}
        description={t("codeimg.savePresetDesc")}
      >
        <Input
          value={newPresetName}
          onChange={setNewPresetName}
          placeholder={t("codeimg.savePresetPlaceholder")}
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
            {t("codeimg.cancel")}
          </Button>
          <Button variant="primary" onClick={handleSavePreset} disabled={!newPresetName.trim()}>
            {t("codeimg.save")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={presetToDelete !== null}
        onClose={() => setPresetToDelete(null)}
        title={t("codeimg.deletePresetTitle")}
        description={t("codeimg.deletePresetDesc", { name: presetToDelete?.name ?? "" })}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setPresetToDelete(null)}>
            {t("codeimg.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDeletePreset}
            loading={deletePresetMutation.isPending}
          >
            {t("codeimg.delete")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default CodeImagePage;
