import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  Moon,
  Key,
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
  Cpu,
  Globe,
  Save,
  Sliders,
  User,
  Linkedin,
  Github,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Switch, Label, Textarea } from "@/components/ui";
import { settingsApi, emailApi } from "@/services/posts";
import { useUIStore } from "@/store";
import { useTranslation } from "@/i18n";

const PROVIDER_OPTIONS = [
  { value: "GOOGLE", label: "Google AI (Gemini)" },
  { value: "OPENAI", label: "OpenAI (GPT)" },
  { value: "ANTHROPIC", label: "Anthropic (Claude)" },
  { value: "OPENROUTER", label: "OpenRouter" },
  { value: "HUGGINGFACE", label: "HuggingFace" },
];

const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  GOOGLE: [
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Avançado / Raciocínio)" },
    { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (Super Rápido)" },
    { value: "gemini-3.7-flash", label: "Gemini 3.7 Flash (Rápido & Eficiente)" },
    { value: "gemini-3.8-flash", label: "Gemini 3.8 Flash (Alta Velocidade & Eficiente)" },
    { value: "gemini-3.8-live-extended-thinking", label: "Gemini 3.8 Live Extended Thinking" },

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
  OPENROUTER: [
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
    { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
    { value: "deepseek/deepseek-chat", label: "DeepSeek V3" },
  ],
  HUGGINGFACE: [
    { value: "meta-llama/Llama-3.3-70B-Instruct", label: "Llama 3.3 70B Instruct" },
    { value: "Qwen/Qwen3-32B", label: "Qwen3 32B" },
    { value: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B Instruct" },
    { value: "deepseek-ai/DeepSeek-R1", label: "DeepSeek R1 (Raciocínio)" },
  ],
};

const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
];

const FREE_TEXT_PROVIDERS = ["OPENROUTER", "HUGGINGFACE"];

const IMAGE_MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  GOOGLE: [
    { value: "imagen-4.0-generate-001", label: "Imagen 4.0" },
    { value: "imagen-4.0-fast-generate-001", label: "Imagen 4.0 Fast (econômico)" },
    { value: "imagen-3.0-generate-002", label: "Imagen 3.0" },
    { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" },
  ],
  OPENAI: [
    { value: "dall-e-3", label: "DALL-E 3" },
    { value: "gpt-image-1", label: "GPT Image 1" },
    { value: "gpt-image-1-mini", label: "GPT Image 1 Mini (econômico)" },
  ],
  OPENROUTER: [
    { value: "google/gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" },
  ],
  HUGGINGFACE: [
    { value: "black-forest-labs/FLUX.1-schnell", label: "FLUX.1 Schnell (econômico)" },
    { value: "black-forest-labs/FLUX.1-dev", label: "FLUX.1 Dev (qualidade)" },
    { value: "stabilityai/stable-diffusion-xl-base-1.0", label: "Stable Diffusion XL" },
  ],
};

export function SettingsPage() {
  const { addToast, darkMode, setDarkMode, appLanguage, setAppLanguage } = useUIStore();
  const { t } = useTranslation();

  const [provider, setProvider] = useState<string>("GOOGLE");
  const [modelName, setModelName] = useState<string>("gemini-1.5-flash");
  const [apiKey, setApiKey] = useState<string>("");
  const [tavilyApiKey, setTavilyApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [showTavilyKey, setShowTavilyKey] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [imageProvider, setImageProvider] = useState<string>("NONE");
  const [imageModel, setImageModel] = useState<string>("");
  const [imageApiKey, setImageApiKey] = useState<string>("");
  const [showImageKey, setShowImageKey] = useState<boolean>(false);
  const [guidelines, setGuidelines] = useState<string>("");
  const [language, setLanguage] = useState<string>(appLanguage || "pt-BR");
  const [pendingDarkMode, setPendingDarkMode] = useState<boolean>(darkMode);
  const [notifications, setNotifications] = useState<boolean>(true);

  // Profile state
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [linkedinUrl, setLinkedinUrl] = useState<string>("");
  const [githubUrl, setGithubUrl] = useState<string>("");
  const [experienceSummary, setExperienceSummary] = useState<string>("");
  const [salaryExpectation, setSalaryExpectation] = useState<string>("");

  // Mantém o switch sincronizado caso o tema mude em outro lugar (sidebar/header)
  useEffect(() => {
    setPendingDarkMode(darkMode);
  }, [darkMode]);

  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });

  // Fetch user profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => emailApi.getProfile(),
  });

  useEffect(() => {
    if (profileData) {
      if (profileData.full_name) setFullName(profileData.full_name);
      if (profileData.phone) setPhone(profileData.phone);
      if (profileData.whatsapp) setWhatsapp(profileData.whatsapp);
      if (profileData.linkedin_url) setLinkedinUrl(profileData.linkedin_url);
      if (profileData.github_url) setGithubUrl(profileData.github_url);
      if (profileData.experience_summary) setExperienceSummary(profileData.experience_summary);
      if (profileData.salary_expectation) setSalaryExpectation(profileData.salary_expectation);
    }
  }, [profileData]);

  useEffect(() => {
    if (serverSettings) {
      if (serverSettings.provider) setProvider(serverSettings.provider);
      if (serverSettings.model_name) setModelName(serverSettings.model_name);
      if (serverSettings.api_key) setApiKey(serverSettings.api_key);
      if (serverSettings.tavily_api_key) setTavilyApiKey(serverSettings.tavily_api_key);
      if (serverSettings.temperature !== undefined) setTemperature(serverSettings.temperature);
      if (serverSettings.image_provider) setImageProvider(serverSettings.image_provider);
      if (serverSettings.image_model) setImageModel(serverSettings.image_model);
      if (serverSettings.image_api_key) setImageApiKey(serverSettings.image_api_key);
      if (serverSettings.guidelines) setGuidelines(serverSettings.guidelines);
      if (serverSettings.language) {
        setLanguage(serverSettings.language);
      }
    }
  }, [serverSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => settingsApi.update(data),
    onSuccess: () => {
      addToast({ type: "success", message: t("settings.toast.saveSuccess") });
      setAppLanguage(language);
      setDarkMode(pendingDarkMode);
    },
    onError: () =>
      addToast({ type: "error", message: t("settings.toast.saveError") }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => emailApi.updateProfile(data),
    onSuccess: () => {
      addToast({ type: "success", message: t("settings.profile.toastSaveSuccess") });
    },
    onError: () =>
      addToast({ type: "error", message: t("settings.profile.toastSaveError") }),
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      provider,
      model_name: modelName,
      api_key: apiKey,
      tavily_api_key: tavilyApiKey,
      temperature,
      language,
      image_provider: imageProvider,
      image_model: imageModel,
      image_api_key: imageApiKey,
      guidelines,
    });
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      full_name: fullName,
      phone: phone,
      whatsapp: whatsapp,
      linkedin_url: linkedinUrl,
      github_url: githubUrl,
      experience_summary: experienceSummary || null,
      salary_expectation: salaryExpectation || null,
    });
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
            {t("settings.title")}
          </h1>

          <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
            {t("settings.subtitle")}
          </p>
        </header>

        <div className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary-500" />
                {t("settings.providerModel.title")}
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t("settings.providerModel.description")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <Label className="mb-1 text-xs">{t("settings.provider.label")}</Label>
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
                <Label className="mb-1 text-xs">{t("settings.model.label")}</Label>
                {FREE_TEXT_PROVIDERS.includes(provider) ? (
                  <Input
                    value={modelName}
                    onChange={setModelName}
                    placeholder="ex.: inclusionai/ling-3.0-flash-vl:free"
                  />
                ) : (
                  <Select
                    value={modelName}
                    onChange={setModelName}
                    options={currentModels}
                  />
                )}
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <Label className="mb-0 text-xs flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-surface-400" />
                  {t("settings.temperature.label")} <span className="font-semibold text-primary-600">{temperature}</span>
                </Label>
                <span className="text-[10px] text-surface-400">{t("settings.temperature.hint")}</span>
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
                {t("settings.apiKeys.title")}
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t("settings.apiKeys.description")}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-1 text-xs">{t("settings.apiKeys.providerKeyLabel", { provider })}</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={setApiKey}
                    placeholder={t("settings.apiKeys.providerKeyPlaceholder", { provider })}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <XCircle className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-1 text-xs">{t("settings.apiKeys.tavilyLabel")}</Label>
                <div className="flex gap-2">
                  <Input
                    type={showTavilyKey ? "text" : "password"}
                    value={tavilyApiKey}
                    onChange={setTavilyApiKey}
                    placeholder={t("settings.apiKeys.tavilyPlaceholder")}
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
                    <p className="font-medium">{t("settings.apiKeys.priorityTitle")}</p>
                    <p className="mt-0.5 text-[11px] opacity-90">
                      {t("settings.apiKeys.priorityDescription")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary-500" />
                {t("settings.imageGen.title")}
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t("settings.imageGen.description")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <Label className="mb-1 text-xs">{t("settings.imageGen.providerLabel")}</Label>
                <Select
                  value={imageProvider}
                  onChange={(val) => {
                    setImageProvider(val);
                    const models = IMAGE_MODEL_OPTIONS[val];
                    if (models?.length) setImageModel(models[0].value);
                  }}
                  options={[
                    { value: "NONE", label: t("settings.imageGen.none") },
                    { value: "GOOGLE", label: "Google (Imagen / Gemini Image)" },
                    { value: "OPENAI", label: "OpenAI (DALL-E / GPT Image)" },
                    { value: "OPENROUTER", label: "OpenRouter" },
                    { value: "HUGGINGFACE", label: "HuggingFace (FLUX / SDXL)" },
                  ]}
                />
              </div>

              <div>
                <Label className="mb-1 text-xs">{t("settings.imageGen.modelLabel")}</Label>
                {FREE_TEXT_PROVIDERS.includes(imageProvider) ? (
                  <Input
                    value={imageModel}
                    onChange={setImageModel}
                    placeholder="ex.: black-forest-labs/FLUX.1-schnell"
                  />
                ) : (
                  <Select
                    value={imageModel}
                    onChange={setImageModel}
                    options={IMAGE_MODEL_OPTIONS[imageProvider] || [
                      { value: "", label: "—" },
                    ]}
                  />
                )}
              </div>
            </div>

            {imageProvider !== "NONE" && (
              <div className="space-y-3">
                <div>
                  <Label className="mb-1 text-xs">{t("settings.imageGen.keyLabel")}</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showImageKey ? "text" : "password"}
                      value={imageApiKey}
                      onChange={setImageApiKey}
                      placeholder={t("settings.apiKeys.providerKeyPlaceholder", { provider: imageProvider })}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="sm" onClick={() => setShowImageKey(!showImageKey)}>
                      {showImageKey ? <XCircle className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-surface-500 dark:text-surface-400">
                  {t("settings.imageGen.hint")}
                </p>
              </div>
            )}
          </section>

          <section className="space-y-4 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <User className="h-4 w-4 text-primary-500" />
                {t("settings.profile.title")}
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t("settings.profile.description")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div>
                <Label className="mb-1 text-xs">{t("settings.profile.fullName")}</Label>
                <Input
                  value={fullName}
                  onChange={setFullName}
                  placeholder={t("settings.profile.fullNamePlaceholder")}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="mb-1 text-xs">{t("settings.profile.phone")}</Label>
                <Input
                  value={phone}
                  onChange={setPhone}
                  placeholder={t("settings.profile.phonePlaceholder")}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="mb-1 text-xs">{t("settings.profile.whatsapp")}</Label>
                <Input
                  value={whatsapp}
                  onChange={setWhatsapp}
                  placeholder={t("settings.profile.whatsappPlaceholder")}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="mb-1 text-xs">{t("settings.profile.linkedin")}</Label>
                <div className="relative flex-1">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <Input
                    value={linkedinUrl}
                    onChange={setLinkedinUrl}
                    placeholder={t("settings.profile.linkedinPlaceholder")}
                    className="pl-10 w-full"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1 text-xs">{t("settings.profile.github")}</Label>
                <div className="relative flex-1">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                  <Input
                    value={githubUrl}
                    onChange={setGithubUrl}
                    placeholder={t("settings.profile.githubPlaceholder")}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-1 text-xs">{t("settings.profile.salaryExpectation")}</Label>
              <Input
                value={salaryExpectation}
                onChange={setSalaryExpectation}
                placeholder={t("settings.profile.salaryExpectationPlaceholder")}
                className="w-full"
              />
              <p className="mt-1 text-[11px] text-surface-500 dark:text-surface-400">
                {t("settings.profile.salaryExpectationHint")}
              </p>
            </div>

            <div>
              <Label className="mb-1 text-xs">{t("settings.profile.experienceSummary")}</Label>
              <Textarea
                value={experienceSummary}
                onChange={setExperienceSummary}
                placeholder={t("settings.profile.experienceSummaryPlaceholder")}
                rows={6}
                className="w-full text-sm"
              />
              <p className="mt-1 text-[11px] text-surface-500 dark:text-surface-400">
                {t("settings.profile.experienceSummaryHint")}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveProfile}
                loading={updateProfileMutation.isPending}
                leftIcon={<Save className="h-4 w-4" />}
              >
                {t("settings.saveButton")}
              </Button>
            </div>
          </section>

          <section className="space-y-4 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary-500" />
                {t("settings.languageAppearance.title")}
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t("settings.languageAppearance.description")}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 text-xs">{t("settings.language.label")}</Label>
                  <Select
                    value={language}
                    onChange={setLanguage}
                    options={LANGUAGE_OPTIONS}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-surface-200 dark:border-surface-800">
                <div>
                  <label className="text-xs font-medium text-surface-900 dark:text-surface-50 block">
                    {t("settings.darkMode.label")}
                  </label>
                  <p className="text-[11px] text-surface-500 dark:text-surface-400">
                    {t("settings.darkMode.description")}
                  </p>
                </div>
                <Switch checked={pendingDarkMode} onChange={setPendingDarkMode} />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-surface-200 dark:border-surface-800">
                <div>
                  <label className="text-xs font-medium text-surface-900 dark:text-surface-50 block">
                    {t("settings.notifications.label")}
                  </label>
                  <p className="text-[11px] text-surface-500 dark:text-surface-400">
                    {t("settings.notifications.description")}
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
              {t("settings.saveButton")}
            </Button>
          </div>

          <section className="space-y-4 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary-500" />
                {t("settings.guidelines.title")}
              </h2>
              <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
                {t("settings.guidelines.description")}
              </p>
            </div>

            <Textarea
              value={guidelines}
              onChange={setGuidelines}
              placeholder={t("settings.guidelines.placeholder")}
              rows={5}
            />
          </section>

          <section className="space-y-4 border-t border-surface-200 pt-6 dark:border-surface-800">
            <div>
              <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary-500" />
                {t("settings.about.title")}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-3 bg-surface-100/60 dark:bg-surface-900/60 rounded-md border border-surface-200/60 dark:border-surface-800">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-surface-900 dark:text-surface-50">
                      {t("settings.about.version")}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400">1.0.0 Pro</p>
                </div>

                <div className="p-3 bg-surface-100/60 dark:bg-surface-900/60 rounded-md border border-surface-200/60 dark:border-surface-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-medium text-surface-900 dark:text-surface-50">
                      {t("settings.about.frontend")}
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
