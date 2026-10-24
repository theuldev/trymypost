import { forwardRef, useEffect, useMemo, useRef } from "react";
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
import { cn } from "@/utils/cn";
import { THEMES, DEFAULT_SYNTAX_THEME, getSyntaxTheme, getSyntaxThemeCss, enhanceHighlight } from "../constants";

export interface CodeImagePreviewProps {
  code: string;
  language: string;
  title: string;
  theme: string;
  syntaxTheme?: string;
  fontFamily: string;
  fontSize: string;
  padding: string;
  windowStyle: string;
  showLineNumbers: boolean;
  className?: string;
}

/**
 * Renderiza o preview da imagem de código (mesma marcação usada
 * para gerar o PNG via html2canvas). O ref aponta para o elemento
 * externo (com gradiente/padding) que deve ser capturado.
 */
export const CodeImagePreview = forwardRef<HTMLDivElement, CodeImagePreviewProps>(
  function CodeImagePreview(
    {
      code,
      language,
      title,
      theme,
      syntaxTheme = DEFAULT_SYNTAX_THEME,
      fontFamily,
      fontSize,
      padding,
      windowStyle,
      showLineNumbers,
      className,
    },
    ref
  ) {
    const codeRef = useRef<HTMLElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);

    const themeObj = THEMES.find((t) => t.value === theme);
    const syntaxThemeObj = getSyntaxTheme(syntaxTheme);
    const syntaxThemeCss = useMemo(() => getSyntaxThemeCss(syntaxThemeObj), [syntaxThemeObj]);

    useEffect(() => {
      if (codeRef.current) {
        codeRef.current.textContent = code;
        const grammar = Prism.languages[language] || Prism.languages.plaintext;
        if (grammar) {
          codeRef.current.innerHTML = enhanceHighlight(
            Prism.highlight(code, grammar, language)
          );
        }
      }
    }, [code, language]);

    useEffect(() => {
      if (lineNumbersRef.current && showLineNumbers) {
        const linesCount = code.split("\n").length;
        lineNumbersRef.current.textContent = Array.from(
          { length: linesCount },
          (_, i) => i + 1
        ).join("\n");
      }
    }, [code, showLineNumbers]);

    return (
      <div
        ref={ref}
        className={cn("w-fit transition-all", className)}
        style={{ background: themeObj?.gradient, padding }}
      >
        <div
          className={cn(
            "rounded-md overflow-hidden border shadow-lg",
            syntaxThemeObj.isLight ? "border-black/10" : "border-white/10"
          )}
          style={{ background: syntaxThemeObj.background }}
        >
          <style>{syntaxThemeCss}</style>
          {windowStyle !== "none" && (
            <div
              className={cn(
                "h-7 flex items-center px-3 border-b",
                syntaxThemeObj.isLight ? "border-black/10" : "border-white/10",
                windowStyle === "mac" && (syntaxThemeObj.isLight ? "bg-[#ececec]" : "bg-[#1a1a1a]"),
                windowStyle === "simple" && (syntaxThemeObj.isLight ? "bg-[#f3f3f3]" : "bg-[#252526]")
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
                  "flex-1 text-center text-[11px] font-mono -mt-0.5",
                  syntaxThemeObj.isLight ? "text-[#525252]" : "text-[#a1a1aa]",
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
                className={cn(
                  "select-none border-r py-3 px-2 text-right font-mono",
                  syntaxThemeObj.isLight ? "border-black/10" : "border-white/10"
                )}
                style={{ fontSize, whiteSpace: "pre", color: syntaxThemeObj.lineNumberColor }}
              />
            )}
            <pre className="flex-1 p-3.5 m-0" style={{ fontSize }}>
              <code
                ref={codeRef}
                className={`language-${language} code-theme-${syntaxThemeObj.value}`}
                style={{
                  fontFamily,
                  fontSize,
                  lineHeight: "1.6",
                  color: syntaxThemeObj.foreground,
                  textShadow: syntaxThemeObj.isLight ? "none" : undefined,
                }}
              >
                {code || " "}
              </code>
            </pre>
          </div>
        </div>
      </div>
    );
  }
);

export default CodeImagePreview;
