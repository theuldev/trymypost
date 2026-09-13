import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  Moon,
  Key,
  Database,
  Info,
  Shield,
  Code2,
  CheckCircle,
  ExternalLink,
  BookOpen,
  Palette,
  Eye,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  Cpu,
  Globe,
  Save,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Switch, Label, FileInput } from "@/components/ui";
import { settingsApi } from "@/services/posts";
import { useUIStore } from "@/store";

const PROVIDER_OPTIONS = [
  { value: "GOOGLE", label: "Google AI (Gemini)" },
  { value: "OPENAI", label: "OpenAI (GPT)" },
  { value: "ANTHROPIC", label: "Anthropic (Claude)" },
];

const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  GOOGLE: [
    { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (Super Rápido)" },
    { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash (Rápido & Eficiente)" },
    { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro (Avançado / Raciocínio)" },
    { value: "gemini-3.0-flash", label: "Gemini 3.0 Flash (Alta Performance)" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Raciocínio & Código)" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Equilibrado)" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite (Super Rápido)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Baixa Latência)" },
  ],
  OPENAI: [
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini (Rápido)" },
    { value: "gpt-4.1", label: "GPT-4.1 (Geral / Avançado)" },
    { value: "o3-mini", label: "o3-mini (Raciocínio Rápido)" },
    { value: "o3", label: "o3 (Raciocínio Avançado)" },
  ],
  ANTHROPIC: [
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (Rápido)" },
    { value: "claude-sonnet-5", label: "Claude Sonnet 5 (Equilibrado / Padrão)" },
    { value: "claude-opus-5", label: "Claude Opus 5 (Raciocínio Profundo)" },
  ],
};

const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
];

export function SettingsPage() {
  const { addToast, darkMode, toggleDarkMode, appLanguage, setAppLanguage } = useUIStore();

  const [provider, setProvider] = useState<string>("GOOGLE");
  const [modelName, setModelName] = useState<string>("gemini-1.5-flash");
  const [apiKey, setApiKey] = useState<string>("");
  const [tavilyApiKey, setTavilyApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showTavilyKey, setShowTavilyKey] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [language, setLanguage] = useState<string>(appLanguage || "pt-BR");
  const [notifications, setNotifications] = useState<boolean>(true);

  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });

  useEffect(() => {
    if (serverSettings) {
      if (serverSettings.provider) setProvider(serverSettings.provider);
      if (serverSettings.model_name) setModelName(serverSettings.model_name);
      if (serverSettings.api_key) setApiKey(serverSettings.api_key);
      if (serverSettings.tavily_api_key) setTavilyApiKey(serverSettings.tavily_api_key);
      if (serverSettings.temperature !== undefined) setTemperature(serverSettings.temperature);
      if (serverSettings.language) {
        setLanguage(serverSettings.language);
        setAppLanguage(serverSettings.language);
      }
    }
  }, [serverSettings, setAppLanguage]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => settingsApi.update(data),
    onSuccess: (res: any) => {
      addToast({ type: "success", message: "Configurações salvas no servidor!" });
      if (res?.language) setAppLanguage(res.language);
    },
    onError: () => addToast({ type: "error", message: "Erro ao salvar configurações" }),
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      provider,
      model_name: modelName,
      api_key: apiKey,
      tavily_api_key: tavilyApiKey,
      temperature,
      language,
    });
  };

  const handleExportData = () => {
    try {
      const data = {
        presets: localStorage.getItem("code_image_presets"),
        history_view: localStorage.getItem("history-store"),
        ui: localStorage.getItem("ui-store"),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trymypost-data.json";
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: "success", message: "Dados exportados com sucesso!" });
    } catch {
      addToast({ type: "error", message: "Erro ao exportar dados" });
    }
  };

  const handleImportData = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.presets) localStorage.setItem("code_image_presets", data.presets);
        if (data.history_view) localStorage.setItem("history-store", data.history_view);
        if (data.ui) localStorage.setItem("ui-store", data.ui);
        addToast({ type: "success", message: "Dados importados com sucesso! Recarregue a página." });
      } catch {
        addToast({ type: "error", message: "Arquivo JSON inválido" });
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (
      window.confirm(
        "Tem certeza que deseja limpar todos os dados locais? Esta ação não pode ser desfeita."
      )
    ) {
      localStorage.clear();
      addToast({ type: "success", message: "Dados locais limpos com sucesso!" });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const currentModels = MODEL_OPTIONS[provider] || MODEL_OPTIONS.GOOGLE;

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <header className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
            <SettingsIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>

          <h1 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            Configurações
          </h1>

          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            Gerencie provedores de IA, chaves de API, idioma e preferências do aplicativo.
          </p>
        </header>

        <div className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary-500" />
                Provedor & Modelo IA
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                Selecione o provedor e modelo de inteligência artificial para geração de posts.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <Label className="mb-1 text-xs">Provedor IA</Label>
                <Select
                  value={provider}
                  onChange={(val) => {
                    setProvider(val);
                    const models = MODEL_OPTIONS[val] || MODEL_OPTIONS.GOOGLE;
                    if (models.length > 0) setModelName(models[0].value);
                  }}
                  options={PROVIDER_OPTIONS}
                />
              </div>

              <div>
                <Label className="mb-1 text-xs">Modelo</Label>
                <Select
                  value={modelName}
                  onChange={setModelName}
                  options={currentModels}
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <Label className="mb-0 text-xs flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-surface-400" />
                  Temperatura: <span className="font-semibold text-primary-600">{temperature}</span>
                </Label>
                <span className="text-[10px] text-surface-400">0.0 (Determinístico) - 1.0 (Criativo)</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface-200 dark:bg-surface-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Key className="h-4 w-4 text-primary-500" />
                Chaves de API
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                Credenciais customizadas do provedor de IA e serviços de busca.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-1 text-xs">Chave API do Provedor ({provider})</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={setApiKey}
                    placeholder={`Insira sua chave de API para ${provider}`}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <XCircle className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-1 text-xs">Tavily API Key (Pesquisa Web)</Label>
                <div className="flex gap-2">
                  <Input
                    type={showTavilyKey ? "text" : "password"}
                    value={tavilyApiKey}
                    onChange={setTavilyApiKey}
                    placeholder="Chave Tavily Search API"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setShowTavilyKey(!showTavilyKey)}>
                    {showTavilyKey ? <XCircle className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-md">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-900 dark:text-amber-300">
                    <p className="font-medium">Prioridade de Configuração</p>
                    <p className="mt-0.5 text-[11px] opacity-90">
                      Caso as chaves acima fiquem em branco, o sistema utilizará as variáveis de ambiente predefinidas do servidor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary-500" />
                Idioma & Aparência
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                Idioma da interface e modo de exibição.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 text-xs">Idioma da Aplicação</Label>
                  <Select
                    value={language}
                    onChange={(val) => {
                      setLanguage(val);
                      setAppLanguage(val);
                    }}
                    options={LANGUAGE_OPTIONS}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-surface-200 dark:border-surface-800">
                <div>
                  <label className="text-xs font-medium text-surface-900 dark:text-surface-50 block">
                    Modo Escuro
                  </label>
                  <p className="text-[11px] text-surface-500 dark:text-surface-400">
                    Alternar entre tema claro e escuro
                  </p>
                </div>
                <Switch checked={darkMode} onChange={toggleDarkMode} />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-surface-200 dark:border-surface-800">
                <div>
                  <label className="text-xs font-medium text-surface-900 dark:text-surface-50 block">
                    Notificações do Sistema
                  </label>
                  <p className="text-[11px] text-surface-500 dark:text-surface-400">
                    Exibir confirmações e mensagens Toast
                  </p>
                </div>
                <Switch checked={notifications} onChange={setNotifications} />
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveSettings}
              loading={updateSettingsMutation.isPending}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Salvar Alterações
            </Button>
          </div>

          <section className="space-y-4 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Database className="h-4 w-4 text-primary-500" />
                Dados Locais
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                Exporte ou limpe dados armazenados localmente no navegador.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="h-3.5 w-3.5" />}
                  onClick={handleExportData}
                >
                  Exportar Dados (.json)
                </Button>
                <FileInput
                  label=""
                  accept=".json"
                  onChange={handleImportData}
                  hint="Importar backup local"
                />
              </div>

              <div className="p-3 bg-red-50/70 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 rounded-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-red-900 dark:text-red-300">
                        Redefinir Cache Local
                      </p>
                      <p className="text-[11px] text-red-700 dark:text-red-400 truncate">
                        Limpa preferências locais do navegador.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleClearAllData}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Limpar Tudo
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary-500" />
                Sobre a Aplicação
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-3 bg-surface-100/60 dark:bg-surface-900/60 rounded-md border border-surface-200/60 dark:border-surface-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-surface-900 dark:text-surface-50">
                      Versão
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400">1.0.0 Pro</p>
                </div>

                <div className="p-3 bg-surface-100/60 dark:bg-surface-900/60 rounded-md border border-surface-200/60 dark:border-surface-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-medium text-surface-900 dark:text-surface-50">
                      Frontend
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    React 18 + TypeScript + Vite
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
