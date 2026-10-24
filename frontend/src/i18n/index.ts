import { useCallback } from "react";
import { useUIStore } from "@/store";
import { layoutDict } from "./layout";
import { playgroundDict } from "@/features/playground/i18n";
import { historyDict } from "@/features/history/i18n";
import { editorDict } from "@/features/editor/i18n";
import { codeImageDict } from "@/features/code-image/i18n";
import { settingsDict } from "@/features/settings/i18n";
import { topicsDict } from "@/features/topics/i18n";
import { calendarDict } from "@/features/calendar/i18n";
import { storageDict } from "@/features/storage/i18n";
import { emailGenerationDict } from "@/features/email-generation/i18n";
import { auditDict } from "@/features/audit/i18n";

export type AppLanguage = "pt-BR" | "en-US";

export type TranslationDict = Record<AppLanguage, Record<string, string>>;

const translations: TranslationDict = {
  "pt-BR": {
    ...layoutDict["pt-BR"],
    ...playgroundDict["pt-BR"],
    ...historyDict["pt-BR"],
    ...editorDict["pt-BR"],
    ...codeImageDict["pt-BR"],
    ...settingsDict["pt-BR"],
    ...topicsDict["pt-BR"],
    ...calendarDict["pt-BR"],
    ...storageDict["pt-BR"],
    ...emailGenerationDict["pt-BR"],
    ...auditDict["pt-BR"],
  },
  "en-US": {
    ...layoutDict["en-US"],
    ...playgroundDict["en-US"],
    ...historyDict["en-US"],
    ...editorDict["en-US"],
    ...codeImageDict["en-US"],
    ...settingsDict["en-US"],
    ...topicsDict["en-US"],
    ...calendarDict["en-US"],
    ...storageDict["en-US"],
    ...emailGenerationDict["en-US"],
    ...auditDict["en-US"],
  },
};

/**
 * Hook de tradução baseado no idioma salvo em Configurações.
 * Uso: const { t } = useTranslation(); t("sidebar.playground")
 * Variáveis: t("history.showing", { count: 5, total: 20 })
 */
export function useTranslation() {
  const appLanguage = useUIStore((s) => s.appLanguage);
  const language: AppLanguage = appLanguage === "en-US" ? "en-US" : "pt-BR";

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let text =
        translations[language][key] ?? translations["pt-BR"][key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value));
        }
      }
      return text;
    },
    [language]
  );

  return { t, language };
}
