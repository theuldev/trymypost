type Translator = (key: string, vars?: Record<string, string | number>) => string;

export const LANGUAGES = [
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

export const THEMES = [
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

export const FONT_FAMILIES = [
  { value: "'Cascadia Code', 'Fira Code', 'Consolas', monospace", label: "Cascadia Code" },
  { value: "'Consolas', 'Courier New', monospace", label: "Consolas" },
  { value: "'Fira Code', 'Courier New', monospace", label: "Fira Code" },
  { value: "'JetBrains Mono', 'Courier New', monospace", label: "JetBrains Mono" },
];

export const FONT_SIZES = [
  { value: "12px", label: "Pequeno (12px)" },
  { value: "14px", label: "Médio (14px)" },
  { value: "16px", label: "Grande (16px)" },
];

export const PADDINGS = [
  { value: "20px", label: "Pequeno (20px)" },
  { value: "36px", label: "Médio (36px)" },
  { value: "52px", label: "Grande (52px)" },
];

export const WINDOW_STYLES = [
  { value: "mac", label: "macOS" },
  { value: "simple", label: "Simples" },
  { value: "none", label: "Sem barra" },
];

/** Opções com labels traduzidas. As constantes acima permanecem para compatibilidade. */
export function getLanguageOptions(t: Translator) {
  return LANGUAGES.map((option) => ({
    ...option,
    label: option.value === "plaintext" ? t("codeimg.langPlainText") : option.label,
  }));
}

export function getThemeOptions(t: Translator) {
  return THEMES.map((option) => ({
    ...option,
    label:
      option.value === "dark"
        ? t("codeimg.themeDarkGray")
        : option.value === "transparent"
          ? t("codeimg.themeTransparent")
          : option.label,
  }));
}

export function getFontFamilyOptions(_t: Translator) {
  return FONT_FAMILIES;
}

export function getFontSizeOptions(t: Translator) {
  return FONT_SIZES.map((option) => ({
    ...option,
    label:
      option.value === "12px"
        ? t("codeimg.fontSizeSmall")
        : option.value === "14px"
          ? t("codeimg.fontSizeMedium")
          : t("codeimg.fontSizeLarge"),
  }));
}

export function getPaddingOptions(t: Translator) {
  return PADDINGS.map((option) => ({
    ...option,
    label:
      option.value === "20px"
        ? t("codeimg.paddingSmall")
        : option.value === "36px"
          ? t("codeimg.paddingMedium")
          : t("codeimg.paddingLarge"),
  }));
}

export function getWindowStyleOptions(t: Translator) {
  return WINDOW_STYLES.map((option) => ({
    ...option,
    label:
      option.value === "mac"
        ? t("codeimg.windowMac")
        : option.value === "simple"
          ? t("codeimg.windowSimple")
          : t("codeimg.windowNone"),
  }));
}

/** Grupos de tokens do Prism suportados pelos temas de sintaxe. */
const TOKEN_GROUPS = [
  "comment",
  "keyword",
  "keyword-control",
  "string",
  "char",
  "number",
  "boolean",
  "function",
  "class-name",
  "builtin",
  "operator",
  "punctuation",
  "property",
  "tag",
  "attr-name",
  "attr-value",
  "selector",
  "regex",
  "constant",
  "variable",
  "important",
] as const;

/**
 * Palavras-chave de controle de fluxo. O VS Code (Dark+) pinta essas palavras
 * de roxo (#C586C0), enquanto o Visual Studio as mantém azuis — a `enhanceHighlight`
 * adiciona a classe `keyword-control` para que cada tema decida a cor.
 */
const CONTROL_KEYWORDS = [
  "if",
  "else",
  "for",
  "while",
  "do",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "return",
  "yield",
  "throw",
  "try",
  "catch",
  "finally",
  "goto",
  "await",
  "typeof",
  "instanceof",
  "delete",
  "new",
  "in",
  "of",
];

const CONTROL_KEYWORD_PATTERN = new RegExp(
  `(<span class="token keyword)(">(${CONTROL_KEYWORDS.join("|")})</span>)`,
  "g"
);

/**
 * Pós-processa o HTML gerado pelo Prism, promovendo keywords de controle
 * de fluxo para a classe `keyword keyword-control`.
 */
export function enhanceHighlight(html: string): string {
  return html.replace(CONTROL_KEYWORD_PATTERN, "$1 keyword-control$2");
}

export interface SyntaxTheme {
  value: string;
  label: string;
  background: string;
  foreground: string;
  lineNumberColor: string;
  isLight: boolean;
  /** Estilo do comentário: "italic" (padrão) ou "normal" (ex.: Visual Studio). */
  commentStyle?: "italic" | "normal";
  tokens: Record<string, string>;
}

const defineSyntaxTheme = (theme: SyntaxTheme): SyntaxTheme => theme;

export const SYNTAX_THEMES: SyntaxTheme[] = [
  defineSyntaxTheme({
    value: "vscode-dark",
    label: "Dark (VS Code)",
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    lineNumberColor: "#858585",
    isLight: false,
    commentStyle: "normal",
    tokens: {
      comment: "#6a9955",
      keyword: "#569cd6",
      "keyword-control": "#c586c0",
      string: "#ce9178",
      char: "#ce9178",
      number: "#b5cea8",
      boolean: "#b5cea8",
      function: "#dcdcaa",
      "class-name": "#4ec9b0",
      builtin: "#4ec9b0",
      operator: "#d4d4d4",
      punctuation: "#d4d4d4",
      property: "#9cdcfe",
      tag: "#569cd6",
      "attr-name": "#9cdcfe",
      "attr-value": "#ce9178",
      selector: "#d7ba7d",
      regex: "#d16969",
      constant: "#4fc1ff",
      variable: "#9cdcfe",
      important: "#d16969",
    },
  }),
  defineSyntaxTheme({
    value: "vscode-light",
    label: "Light (VS Code)",
    background: "#ffffff",
    foreground: "#000000",
    lineNumberColor: "#237893",
    isLight: true,
    commentStyle: "normal",
    tokens: {
      comment: "#008000",
      keyword: "#0000ff",
      "keyword-control": "#af00db",
      string: "#a31515",
      char: "#a31515",
      number: "#098658",
      boolean: "#0000ff",
      function: "#795e26",
      "class-name": "#267f99",
      builtin: "#267f99",
      operator: "#000000",
      punctuation: "#000000",
      property: "#001080",
      tag: "#800000",
      "attr-name": "#e50000",
      "attr-value": "#0000ff",
      selector: "#800000",
      regex: "#811f3f",
      constant: "#0070c1",
      variable: "#001080",
      important: "#cd3131",
    },
  }),
  defineSyntaxTheme({
    value: "vs-dark",
    label: "Dark (Visual Studio)",
    background: "#1e1e1e",
    foreground: "#dcdcdc",
    lineNumberColor: "#2b91af",
    isLight: false,
    commentStyle: "normal",
    tokens: {
      comment: "#57a64a",
      keyword: "#569cd6",
      string: "#d69d85",
      char: "#d69d85",
      number: "#b5cea8",
      boolean: "#b5cea8",
      function: "#dcdcaa",
      "class-name": "#4ec9b0",
      builtin: "#4ec9b0",
      operator: "#b4b4b4",
      punctuation: "#dcdcdc",
      property: "#dcdcdc",
      tag: "#569cd6",
      "attr-name": "#92caf4",
      "attr-value": "#c8c8c8",
      selector: "#d7ba7d",
      regex: "#d16969",
      constant: "#b8d7a3",
      variable: "#9cdcfe",
      important: "#d16969",
    },
  }),
  defineSyntaxTheme({
    value: "vs-light",
    label: "Light (Visual Studio)",
    background: "#ffffff",
    foreground: "#1e1e1e",
    lineNumberColor: "#2b91af",
    isLight: true,
    commentStyle: "normal",
    tokens: {
      comment: "#008000",
      keyword: "#0000ff",
      string: "#a31515",
      char: "#a31515",
      number: "#000000",
      boolean: "#0000ff",
      function: "#74531f",
      "class-name": "#2b91af",
      builtin: "#2b91af",
      operator: "#000000",
      punctuation: "#000000",
      property: "#1e1e1e",
      tag: "#800000",
      "attr-name": "#ff0000",
      "attr-value": "#0000ff",
      selector: "#800000",
      regex: "#811f3f",
      constant: "#000000",
      variable: "#1e1e1e",
      important: "#cd3131",
    },
  }),
  defineSyntaxTheme({
    value: "dracula",
    label: "Dracula",
    background: "#282a36",
    foreground: "#f8f8f2",
    lineNumberColor: "#6272a4",
    isLight: false,
    tokens: {
      comment: "#6272a4",
      keyword: "#ff79c6",
      string: "#f1fa8c",
      char: "#f1fa8c",
      number: "#bd93f9",
      boolean: "#bd93f9",
      function: "#50fa7b",
      "class-name": "#8be9fd",
      builtin: "#8be9fd",
      operator: "#ff79c6",
      punctuation: "#f8f8f2",
      property: "#50fa7b",
      tag: "#ff79c6",
      "attr-name": "#50fa7b",
      "attr-value": "#f1fa8c",
      selector: "#50fa7b",
      regex: "#f1fa8c",
      constant: "#bd93f9",
      variable: "#f8f8f2",
      important: "#ff5555",
    },
  }),
  defineSyntaxTheme({
    value: "vesper",
    label: "Vesper",
    background: "#101010",
    foreground: "#ffffff",
    lineNumberColor: "#505050",
    isLight: false,
    tokens: {
      comment: "#696969",
      keyword: "#a0a0a0",
      string: "#99ffe4",
      char: "#99ffe4",
      number: "#ffc799",
      boolean: "#ffc799",
      function: "#ffc799",
      "class-name": "#ffc799",
      builtin: "#a0a0a0",
      operator: "#a0a0a0",
      punctuation: "#a0a0a0",
      property: "#ffffff",
      tag: "#ffc799",
      "attr-name": "#ffc799",
      "attr-value": "#99ffe4",
      selector: "#ffc799",
      regex: "#99ffe4",
      constant: "#a0a0a0",
      variable: "#ffffff",
      important: "#ffc799",
    },
  }),
  defineSyntaxTheme({
    value: "monokai",
    label: "Monokai",
    background: "#272822",
    foreground: "#f8f8f2",
    lineNumberColor: "#8f908a",
    isLight: false,
    tokens: {
      comment: "#75715e",
      keyword: "#f92672",
      string: "#e6db74",
      char: "#e6db74",
      number: "#ae81ff",
      boolean: "#ae81ff",
      function: "#a6e22e",
      "class-name": "#a6e22e",
      builtin: "#66d9ef",
      operator: "#f92672",
      punctuation: "#f8f8f2",
      property: "#a6e22e",
      tag: "#f92672",
      "attr-name": "#a6e22e",
      "attr-value": "#e6db74",
      selector: "#a6e22e",
      regex: "#e6db74",
      constant: "#ae81ff",
      variable: "#f8f8f2",
      important: "#f92672",
    },
  }),
  defineSyntaxTheme({
    value: "atom-one-dark",
    label: "Atom One Dark",
    background: "#282c34",
    foreground: "#abb2bf",
    lineNumberColor: "#636d83",
    isLight: false,
    tokens: {
      comment: "#5c6370",
      keyword: "#c678dd",
      string: "#98c379",
      char: "#98c379",
      number: "#d19a66",
      boolean: "#d19a66",
      function: "#61afef",
      "class-name": "#e5c07b",
      builtin: "#e5c07b",
      operator: "#56b6c2",
      punctuation: "#abb2bf",
      property: "#61afef",
      tag: "#e06c75",
      "attr-name": "#d19a66",
      "attr-value": "#98c379",
      selector: "#e06c75",
      regex: "#98c379",
      constant: "#d19a66",
      variable: "#e06c75",
      important: "#e06c75",
    },
  }),
  defineSyntaxTheme({
    value: "one-dark-pro",
    label: "One Dark Pro",
    background: "#282c34",
    foreground: "#abb2bf",
    lineNumberColor: "#7f848e",
    isLight: false,
    tokens: {
      comment: "#7f848e",
      keyword: "#c678dd",
      string: "#98c379",
      char: "#98c379",
      number: "#d19a66",
      boolean: "#d19a66",
      function: "#61afef",
      "class-name": "#e5c07b",
      builtin: "#e5c07b",
      operator: "#89ddff",
      punctuation: "#abb2bf",
      property: "#e06c75",
      tag: "#e06c75",
      "attr-name": "#e5c07b",
      "attr-value": "#98c379",
      selector: "#e06c75",
      regex: "#89ddff",
      constant: "#d19a66",
      variable: "#be5046",
      important: "#e06c75",
    },
  }),
];

export const DEFAULT_SYNTAX_THEME = "vscode-dark";

export function getSyntaxTheme(value: string): SyntaxTheme {
  return SYNTAX_THEMES.find((t) => t.value === value) ?? SYNTAX_THEMES[0];
}

export function getSyntaxThemeOptions(_t: Translator) {
  return SYNTAX_THEMES.map((t) => ({ value: t.value, label: t.label }));
}

/**
 * Gera o CSS escopado do tema de sintaxe (`.code-theme-<value> .token.<tipo>`),
 * com especificidade maior que o tema global do Prism, permitindo alternar
 * o tema apenas dentro do preview da imagem de código.
 */
export function getSyntaxThemeCss(theme: SyntaxTheme): string {
  const scope = `.code-theme-${theme.value}`;
  const rules = Object.entries(theme.tokens)
    .filter(([token]) => (TOKEN_GROUPS as readonly string[]).includes(token))
    .map(([token, color]) => `${scope} .token.${token} { color: ${color}; }`);
  rules.push(
    `${scope} .token.comment { font-style: ${theme.commentStyle ?? "italic"}; }`
  );
  return rules.join("\n");
}
