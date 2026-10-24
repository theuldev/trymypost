import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, Palette, Check } from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";
import { codePresetsApi } from "@/services/posts";
import { useUIStore } from "@/store";
import { CodeImagePreview } from "@/features/code-image/components/CodeImagePreview";
import { THEMES, FONT_FAMILIES, DEFAULT_SYNTAX_THEME } from "@/features/code-image/constants";
import { useTranslation } from "@/i18n";

interface ExportCodeImageModalProps {
  code: string;
  language: string;
  title: string;
}

const DEFAULT_STYLE = {
  theme: "vs2022-blue",
  syntaxTheme: DEFAULT_SYNTAX_THEME,
  fontFamily: FONT_FAMILIES[0].value,
  fontSize: "14px",
  padding: "36px",
  windowStyle: "mac",
  showLineNumbers: true,
};

interface StyleOption {
  id: string;
  name: string;
  theme: string;
  syntaxTheme: string;
  fontFamily: string;
  fontSize: string;
  padding: string;
  windowStyle: string;
  showLineNumbers: boolean;
}

/**
 * Modal para exportar o código como imagem diretamente do histórico,
 * permitindo escolher um preset salvo, ver o preview e baixar o PNG.
 */
export function ExportCodeImageModal({
  code,
  language,
  title,
}: ExportCodeImageModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const previewRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string>("default");
  const [isRendering, setIsRendering] = useState<boolean>(false);

  const { data: presets = [] } = useQuery({
    queryKey: ["code-presets"],
    queryFn: () => codePresetsApi.list(),
  });

  const styleOptions: StyleOption[] = [
    { id: "default", name: t("hist.export.defaultStyle"), ...DEFAULT_STYLE },
    ...presets.map((p, i) => ({
      id: String(p.id ?? i),
      name: p.name,
      theme: p.theme,
      syntaxTheme: p.syntax_theme ?? DEFAULT_SYNTAX_THEME,
      fontFamily: p.font_family,
      fontSize: p.font_size,
      padding: p.padding,
      windowStyle: p.window_style,
      showLineNumbers: p.show_line_numbers,
    })),
  ];

  const selectedStyle =
    styleOptions.find((s) => s.id === selectedStyleId) ?? styleOptions[0];

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
      addToast({ type: "success", message: t("hist.toast.downloadStarted") });
      setIsOpen(false);
    } catch {
      addToast({ type: "error", message: t("hist.toast.downloadError") });
    } finally {
      setIsRendering(false);
    }
  };

  const handleCustomize = () => {
    setIsOpen(false);
    navigate("/tools/code-image", {
      state: {
        initialCode: code,
        initialLanguage: language,
        initialTitle: title,
      },
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        leftIcon={<Download className="h-3.5 w-3.5" />}
      >
        {t("hist.export.button")}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("hist.export.title")}
        description={t("hist.export.description")}
      >
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-[11px] font-medium text-surface-500 dark:text-surface-400">
              {t("hist.export.styleLabel")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {styleOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedStyleId(option.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 text-[10px] rounded border transition-colors",
                    selectedStyleId === option.id
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                      : "border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 hover:border-primary-500"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background:
                        THEMES.find((t) => t.value === option.theme)
                          ?.gradient || "#666",
                    }}
                  />
                  <span className="font-medium truncate max-w-[120px]">
                    {option.name}
                  </span>
                  {selectedStyleId === option.id && (
                    <Check className="h-2.5 w-2.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-surface-200 dark:border-surface-800 bg-surface-100 dark:bg-surface-950 p-3 overflow-auto max-h-[320px]">
            <CodeImagePreview
              ref={previewRef}
              code={code}
              language={language}
              title={title}
              theme={selectedStyle.theme}
              syntaxTheme={selectedStyle.syntaxTheme}
              fontFamily={selectedStyle.fontFamily}
              fontSize={selectedStyle.fontSize}
              padding={selectedStyle.padding}
              windowStyle={selectedStyle.windowStyle}
              showLineNumbers={selectedStyle.showLineNumbers}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={handleCustomize}
              leftIcon={<Palette className="h-3.5 w-3.5" />}
            >
              {t("hist.export.customize")}
            </Button>
            <Button
              variant="primary"
              onClick={handleDownload}
              disabled={isRendering}
              leftIcon={
                isRendering ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )
              }
            >
              {isRendering ? t("hist.export.generating") : t("hist.export.downloadPng")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default ExportCodeImageModal;
