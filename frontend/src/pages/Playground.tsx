import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Loader2,
  Sparkles,
  Zap,
  Code2,
  Image,
  Palette,
  MessageSquare,
  Target,
  Users,
  GraduationCap,
  TrendingUp,
  BookOpen,
  Heart,
  BarChart2,
  List,
  Type,
  RotateCcw,
  Minus,
  Plus,
  Copy,
  Download,
  Eye,
  Edit2,
  Trash2,
  Star,
  Tag,
  Share2,
  Flag,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  FileText,
  Clipboard,
  ChevronRight,
  History,
  Keyboard,
  Layers,
  Wand2,
  Plus as PlusIcon,
  X,
  Check,
  ChevronDown,
  Settings,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import {
  Input,
  Textarea,
  Select,
  Switch,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/Pagination";
import { postsApi, codeApi } from "@/services/posts";
import { useUIStore, useGenerationStore, useHistoryStore } from "@/store";
import type {
  GeneratePostRequest,
  PostVariation,
  PostHistoryDetail,
  FormatoEnum,
} from "@/types";

const ESTILOS = [
  "Técnico",
  "Storytelling",
  "Opinião/Controverso",
  "Educacional",
  "Carreira/Soft Skills",
  "Humor/Tecnologia",
  "Minimalista",
  "Case Study",
  "Trends/Novidades",
  "Pessoal/Autobiográfico",
];

const PUBLICOS = [
  "Desenvolvedores Júnior",
  "Desenvolvedores Pleno",
  "Desenvolvedores Sênior",
  "Tech Leads / Arquitetos",
  "Gestores / CTOs",
  "Full Stack",
  "Backend",
  "Frontend",
  "DevOps / SRE",
  "Data / IA",
  "Mobile",
  "Geral / Todos",
];

const EXPERIENCIAS = [
  "Iniciante (0-2 anos)",
  "Intermediário (2-5 anos)",
  "Avançado (5-10 anos)",
  "Expert (10+ anos)",
];

const OBJETIVOS = [
  "Engajamento / Comentários",
  "Autoridade / Personal Branding",
  "Geração de Leads / Vendas",
  "Networking / Conexões",
  "Educar / Compartilhar Conhecimento",
  "Atrair Oportunidades / Contratação",
];

const FORMATOS: FormatoEnum[] = [
  "Listicle (5 dicas, 3 erros...)",
  "Storytelling (História pessoal)",
  "Antes/Depois (Transformação)",
  "Pergunta Aberta (Engajamento)",
  "Opinião Forte (Controversa)",
  "Mini Tutorial (Passo a passo)",
];

const QUANTIDADES = [1, 2, 3, 4, 5];

const STATUS_LABELS: Record<
  string,
  {
    label: string;
    variant: "primary" | "success" | "warning" | "danger" | "neutral";
  }
> = {
  completed: { label: "Concluído", variant: "success" },
  processing: { label: "Processando", variant: "warning" },
  pending: { label: "Pendente", variant: "neutral" },
  failed: { label: "Erro", variant: "danger" },
  cancelled: { label: "Cancelado", variant: "neutral" },
};

type StatusLabelsType = typeof STATUS_LABELS;

const ESTILO_ICONS: Record<string, any> = {
  Técnico: Code2,
  Storytelling: BookOpen,
  "Opinião/Controverso": MessageSquare,
  Educacional: GraduationCap,
  "Carreira/Soft Skills": Users,
  "Humor/Tecnologia": Zap,
  Minimalista: Minus,
  "Case Study": BarChart2,
  "Trends/Novidades": TrendingUp,
  "Pessoal/Autobiográfico": Heart,
};

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

const DEFAULT_FILENAMES: Record<string, string> = {
  javascript: "index.js",
  typescript: "index.ts",
  csharp: "Program.cs",
  python: "script.py",
  html: "index.html",
  css: "styles.css",
  sql: "query.sql",
  bash: "script.sh",
  java: "Main.java",
  go: "main.go",
  rust: "main.rs",
  json: "data.json",
  plaintext: "arquivo.txt",
};

export function Playground(): JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addToast } = useUIStore();
  const {
    setGeneration,
    clearGeneration,
    updateProgress,
    currentTaskId,
    isGenerating,
    currentStep,
    progress,
  } = useGenerationStore();
  const { setSelectedPost } = useHistoryStore();

  const [formData, setFormData] = useState<GeneratePostRequest>({
    tema: "",
    estilo: "Técnico",
    publico: "Desenvolvedores Sênior",
    experiencia: "Avançado (5-10 anos)",
    objetivo: "Autoridade / Personal Branding",
    formato: "Listicle (5 dicas, 3 erros...)",
    incluir_codigo: false,
    incluir_visual: true,
    guidelines: "",
    quantidade: 3,
  });

  const [generatedPosts, setGeneratedPosts] = useState<PostVariation[]>([]);
  const [selectedVariation, setSelectedVariation] =
    useState<PostVariation | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "posts" | "hashtags" | "hooks" | "review" | "visual" | "editor" | "generate"
  >("posts");
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const codeEditorRef = useRef<HTMLTextAreaElement>(null);

  // Code editor state
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [title, setTitle] = useState(DEFAULT_FILENAMES.javascript);
  const [postText, setPostText] = useState("");

  const generateCodeMutation = useMutation({
    mutationFn: codeApi.fromPost,
    onSuccess: (data) => {
      setCode(data.code);
      setLanguage(data.language);
      setTitle(data.title);
      setActiveTab("editor");
      addToast({ type: "success", message: "Código gerado a partir do post!" });
    },
    onError: () => addToast({ type: "error", message: "Erro ao gerar código" }),
  });

  const { data: taskStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["generation", currentTaskId],
    queryFn: () => postsApi.getStatus(currentTaskId!),
    enabled: !!currentTaskId,
    refetchInterval: (query) => {
      const state = query.state.data;
      return state?.status === "processing" || state?.status === "pending"
        ? 2000
        : false;
    },
  });

  // Handle task status changes
  useEffect(() => {
    if (taskStatus?.status === "completed" && taskStatus.result?.posts_data) {
      setGeneratedPosts(taskStatus.result.posts_data);
      setSelectedVariation(taskStatus.result.posts_data[0] || null);
      setActiveTab("posts");
      setShowResults(true);
      clearGeneration();
      addToast({ type: "success", message: "Posts gerados com sucesso!" });
    } else if (taskStatus?.status === "failed") {
      clearGeneration();
      addToast({
        type: "error",
        message: taskStatus.error || "Erro na geração",
      });
    } else if (taskStatus?.status === "processing") {
      updateProgress(
        taskStatus.current_step || "Processando...",
        taskStatus.progress,
      );
    }
  }, [
    taskStatus,
    setGeneratedPosts,
    setSelectedVariation,
    setActiveTab,
    clearGeneration,
    addToast,
    updateProgress,
  ]);

  // Validate form
  useEffect(() => {
    setIsFormValid(formData.tema.trim().length > 0);
  }, [formData.tema]);

  // If user navigates back while a generation is in progress, redirect to /post/new
  useEffect(() => {
    if (isGenerating && currentTaskId) {
      navigate("/post/new", { state: { formData }, replace: true });
    }
  }, [isGenerating, currentTaskId, navigate, formData]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid || isSubmitting) return;

      setIsSubmitting(true);
      try {
        const response = await postsApi.generate(formData);
        setGeneration(response.task_id);
        addToast({ type: "info", message: "Iniciando geração de posts..." });
        navigate("/post/new", { state: { formData } });
      } catch {
        setIsSubmitting(false);
        addToast({ type: "error", message: "Erro ao iniciar geração" });
      }
    },
    [isFormValid, isSubmitting, addToast, setGeneration, formData, navigate],
  );

  const handleCopy = (
    text: string,
    message = "Copiado para a área de transferência!",
  ) => {
    navigator.clipboard.writeText(text);
    addToast({ type: "success", message });
  };

  const handleSaveAsDraft = () => {
    localStorage.setItem("playground_draft", JSON.stringify(formData));
    addToast({ type: "success", message: "Rascunho salvo!" });
  };

  const loadDraft = () => {
    const draft = localStorage.getItem("playground_draft");
    if (draft) {
      setFormData(JSON.parse(draft));
      addToast({ type: "info", message: "Rascunho carregado!" });
    }
  };

  const FORMATO_DESCRIPTIONS: Record<FormatoEnum, string> = {
    "Listicle (5 dicas, 3 erros...)": "Lista numerada com dicas práticas",
    "Storytelling (História pessoal)": "Narrativa pessoal envolvente",
    "Antes/Depois (Transformação)": "Comparação antes e depois",
    "Pergunta Aberta (Engajamento)": "Pergunta para gerar comentários",
    "Opinião Forte (Controversa)": "Opinião polêmica para debate",
    "Mini Tutorial (Passo a passo)": "Tutorial passo a passo",
  };

  // Format option cards (radio cards like original)
  const formatOptions = FORMATOS.map((fmt) => (
    <label
      key={fmt}
      className={cn(
        "format-card relative cursor-pointer",
        formData.formato === fmt &&
          "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20",
      )}
    >
      <input
        type="radio"
        name="formato"
        value={fmt}
        checked={formData.formato === fmt}
        onChange={() => setFormData({ ...formData, formato: fmt })}
        className="sr-only"
      />
      <div className="format-card-content p-4">
        <strong className="block text-slate-900 dark:text-slate-100">
          {fmt}
        </strong>
        <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 block">
          {FORMATO_DESCRIPTIONS[fmt] || ""}
       </span>
     </div>
   </label>
  ));

  const quantidadeOptions = QUANTIDADES.map((q) => (
    <label
      key={q}
      className={cn(
        "quantidade-card relative cursor-pointer w-12 h-12 flex items-center justify-center rounded-xl border-2 text-lg font-semibold transition-all",
        formData.quantidade === q
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-600",
      )}
    >
      <input
        type="radio"
        name="quantidade"
        value={q}
        checked={formData.quantidade === q}
        onChange={() => setFormData({ ...formData, quantidade: q })}
        className="sr-only"
      />
      <span>{q}</span>
   </label>
  ));

  const renderFormFields = () => (
    <>
      <div className="lg:col-span-2">
        <Input
          label="Tema do Post"
          value={formData.tema}
          onChange={(value) => setFormData({ ...formData, tema: value })}
          placeholder="Ex: Microserviços com Go, React Server Components, Carreira Dev..."
          required
          error={
            !formData.tema && generateCodeMutation.isPending
              ? "Tema é obrigatório"
              : undefined
          }
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Estilo de Escrita"
          value={formData.estilo}
          onChange={(v) => setFormData({ ...formData, estilo: v as any })}
          options={ESTILOS.map((e) => ({ value: e, label: e }))}
        />
        <Select
          label="Público-Alvo"
          value={formData.publico}
          onChange={(v) => setFormData({ ...formData, publico: v as any })}
          options={PUBLICOS.map((p) => ({ value: p, label: p }))}
        />
        <Select
          label="Nível de Experiência"
          value={formData.experiencia}
          onChange={(v) => setFormData({ ...formData, experiencia: v as any })}
          options={EXPERIENCIAS.map((e) => ({ value: e, label: e }))}
        />
        <Select
          label="Objetivo Principal"
          value={formData.objetivo}
          onChange={(v) => setFormData({ ...formData, objetivo: v as any })}
          options={OBJETIVOS.map((o) => ({ value: o, label: o }))}
        />
      </div>

      <div className="lg:col-span-2">
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Formato do Post
        </label>
        <div className="format-options grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {formatOptions}
        </div>
      </div>

      <div className="lg:col-span-2">
        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Quantidade de Posts
        </label>
        <div className="flex gap-2 flex-wrap">{quantidadeOptions}</div>
      </div>

      <div className="lg:col-span-2 space-y-3 pt-1">
        <Switch
          checked={formData.incluir_codigo}
          onChange={(checked) =>
            setFormData({ ...formData, incluir_codigo: checked })
          }
          label="Incluir código"
          description="Adiciona exemplos de código relevantes"
        />
        <Switch
          checked={formData.incluir_visual}
          onChange={(checked) =>
            setFormData({ ...formData, incluir_visual: checked })
          }
          label="Sugerir visual"
          description="Gera sugestões de imagem ou carrossel"
        />
      </div>

      {showGuidelines && (
        <Textarea
          label="Diretrizes Extras"
          value={formData.guidelines || ""}
          onChange={(value) => setFormData({ ...formData, guidelines: value })}
          placeholder="Ex: Tom formal, evitar jargões, incluir estatísticas..."
          rows={5}
          hint="Instruções adicionais para a IA"
          className="lg:col-span-2"
        />
      )}

      <button
        type="button"
        onClick={() => setShowGuidelines(!showGuidelines)}
        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors lg:col-span-2"
      >
        <PlusIcon
          className={cn(
            "h-3 w-3 transition-transform",
            showGuidelines && "rotate-45",
          )}
        />
        {showGuidelines
          ? "Ocultar diretrizes"
          : "Adicionar diretrizes personalizadas"}
      </button>
    </>
  );

  const renderEditorTab = () => (
    <div className="space-y-4">
      <Textarea
        label="Código Fonte"
        value={code}
        onChange={setCode}
        placeholder="Cole seu código aqui para gerar imagem..."
        rows={12}
        className="font-mono text-sm"
        ref={codeEditorRef}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Linguagem"
          value={language}
          onChange={setLanguage}
          options={LANGUAGES}
        />
        <Input
          label="Título do Arquivo"
          value={title}
          onChange={setTitle}
          placeholder="index.js"
        />
      </div>
    </div>
  );

  const renderGenerateTab = () => (
    <div className="space-y-4">
      <Textarea
        label="Texto do Post"
        value={postText}
        onChange={setPostText}
        placeholder="Cole o texto do post aqui para gerar código automaticamente..."
        rows={6}
      />
      <Button
        fullWidth
        onClick={() => generateCodeMutation.mutate({ post: postText })}
        loading={generateCodeMutation.isPending}
        leftIcon={<Sparkles className="h-4 w-4" />}
        disabled={!postText.trim()}
      >
        {generateCodeMutation.isPending
          ? "Gerando..."
          : "Gerar Código a partir do Post"}
      </Button>
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Útil para transformar posts existentes em snippets de código
      </p>
    </div>
  );

  const renderPreviewModal = () =>
    selectedVariation && (
      <div className="space-y-4 max-h-[75vh] overflow-y-auto">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <pre className="whitespace-pre-wrap text-sm font-sans text-slate-900 dark:text-slate-100 leading-relaxed">
            {selectedVariation.conteudo}
          </pre>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={() => handleCopy(selectedVariation.conteudo)}
            leftIcon={<Copy className="h-4 w-4" />}
          >
            Copiar Texto
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const detail: PostHistoryDetail = {
                id: 0,
                tema: formData.tema,
                estilo: formData.estilo,
                publico: formData.publico,
                experiencia: formData.experiencia,
                objetivo: formData.objetivo,
                formato: formData.formato,
                incluir_codigo: formData.incluir_codigo,
                incluir_visual: formData.incluir_visual,
                status: "completed",
                favorito: false,
                tags: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                posts_data: generatedPosts,
                topicos_pesquisados: taskStatus?.result?.topicos_pesquisados,
                hashtags: taskStatus?.result?.hashtags,
                hooks: taskStatus?.result?.hooks,
                review: taskStatus?.result?.review,
                visual_sugestao: taskStatus?.result?.visual_sugestao,
              };
              setSelectedPost(detail);
              setShowPreviewModal(true);
            }}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            Ver no Histórico
          </Button>
        </div>
      </div>
    );

  const renderHistoryDetailModal = () =>
    useHistoryStore.getState().selectedPost && (
      <HistoryDetailView
        post={useHistoryStore.getState().selectedPost}
        onClose={() => setShowHistoryModal(false)}
        STATUS_LABELS={STATUS_LABELS}
        handleCopy={handleCopy}
      />
    );

  const renderEditorPanel = () => (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <form
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      >
        <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              Novo Post
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Configure os parâmetros e gere variações de conteúdo com IA
            </p>
          </div>

          {/* Form fields - two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderFormFields()}
          </div>

          {/* Actions at bottom */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-3 lg:flex lg:items-center lg:justify-between lg:gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSaveAsDraft}
              >
                Salvar Rascunho
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadDraft}
              >
                Carregar Rascunho
              </Button>
            </div>
            <Button
              type="submit"
              size="lg"
              loading={isGenerating || isSubmitting}
              leftIcon={<Send className="h-5 w-5" />}
              disabled={!isFormValid || isSubmitting}
              className="w-full lg:w-auto lg:ml-auto"
            >
              {isGenerating || isSubmitting ? "Gerando posts..." : "Gerar Posts"}
           </Button>
          </div>
        </div>
      </form>
    </div>
  );

  const renderResultsPanel = () => {
    const emptyState = (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-600 flex items-center justify-center">
          <Wand2 className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
          Nenhum post gerado ainda
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          Preencha o formulário ao lado, escolha o estilo e clique em{" "}
          <strong className="text-blue-600 dark:text-blue-400">
            "Gerar Posts"
          </strong>{" "}
          para criar suas variações personalizadas.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => codeEditorRef.current?.focus()}
            leftIcon={<Code2 className="h-4 w-4" />}
          >
            Testar com Código
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setActiveTab("editor")}
            leftIcon={<Sparkles className="h-4 w-4" />}
          >
            Gerar a partir de Texto
          </Button>
        </div>
      </div>
    );

    const resultsContent = (
      <>
        {/* Tab Navigation */}
        <div
          className="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Abas de resultados"
        >
          {[
            {
              key: "posts",
              label: "Posts",
              icon: FileText,
              count: generatedPosts.length,
              desc: "Variações do post",
            },
            {
              key: "hashtags",
              label: "Hashtags",
              icon: Tag,
              count: taskStatus?.result?.hashtags?.length || 0,
              desc: "Tags sugeridas",
            },
            {
              key: "hooks",
              label: "Hooks",
              icon: Flag,
              count: taskStatus?.result?.hooks?.length || 0,
              desc: "Ganchos de abertura",
            },
            {
              key: "review",
              label: "Revisão",
              icon: CheckCircle,
              count: taskStatus?.result?.review ? 1 : 0,
              desc: "Análise de qualidade",
            },
            {
              key: "visual",
              label: "Visual",
              icon: Palette,
              count: taskStatus?.result?.visual_sugestao ? 1 : 0,
              desc: "Identidade visual",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400",
              )}
              title={`${tab.label}: ${tab.desc}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 text-xs rounded-full",
                    activeTab === tab.key
                      ? "bg-white/20"
                      : "bg-slate-200 dark:bg-slate-700",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in" role="tabpanel">
          {activeTab === "posts" && (
            <div className="space-y-4" id="panel-posts">
              {generatedPosts.map((post, index) => (
                <PostVariationCard
                  key={index}
                  post={post}
                  index={index}
                  isSelected={selectedVariation === post}
                  onSelect={() => setSelectedVariation(post)}
                  onCopy={() => handleCopy(post.conteudo)}
                  onPreview={() => {
                    setSelectedVariation(post);
                    setShowPreviewModal(true);
                  }}
                  estilo={formData.estilo}
                />
              ))}
            </div>
          )}

          {activeTab === "hashtags" && (
            <div className="space-y-3" id="panel-hashtags">
              {taskStatus?.result?.hashtags?.map((tag: any, i: number) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-mono text-blue-600 dark:text-blue-400">
                      #{tag.tag}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                      {tag.relevancia}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tag.volume_estimado}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(tag.tag, `Hashtag #${tag.tag} copiada!`)
                    }
                    leftIcon={<Copy className="h-4 w-4" />}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "hooks" && (
            <div className="space-y-3" id="panel-hooks">
              {taskStatus?.result?.hooks?.map((hook: any, i: number) => (
                <Card
                  key={i}
                  variant="bordered"
                  className="hover:shadow-md transition-shadow"
                >
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="primary" size="sm">
                            {hook.tipo}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Hook #{i + 1}
                          </span>
                        </div>
                        <p className="text-slate-900 dark:text-slate-50 font-medium mb-1">
                          {hook.texto}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {hook.por_que_funciona}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(hook.texto, "Hook copiado!")}
                        leftIcon={<Copy className="h-4 w-4" />}
                        className="flex-shrink-0"
                      >
                        <span className="hidden sm:inline">Copiar</span>
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "review" && taskStatus?.result?.review && (
            <ReviewCard review={taskStatus.result.review} />
          )}

          {activeTab === "visual" && taskStatus?.result?.visual_sugestao && (
            <VisualCard visual={taskStatus.result.visual_sugestao} />
          )}
        </div>
      </>
    );

    return showResults ? resultsContent : emptyState;
  };

  return (
    <div className="flex h-full min-w-0 overflow-hidden relative overflow-x-hidden">
      {renderEditorPanel()}
      {renderResultsPanel()}

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-600 flex items-center justify-center animate-pulse">
              <Sparkles className="h-8 w-8 text-white" />
           </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
              Gerando seus posts...
           </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {currentStep || "Iniciando..."}
           </p>
            <div className="w-full max-w-xs mx-auto">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
             </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{progress}% concluído</span>
                <span>Etapa {Math.ceil(progress / 25)} de 4</span>
             </div>
           </div>
            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
              Isso pode levar alguns minutos. Não feche esta aba.
           </p>
         </div>
       </div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Prévia do Post"
        size="xl"
      >
        {renderPreviewModal()}
     </Modal>

      {/* History Detail Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Detalhes da Geração"
        size="xl"
      >
        {renderHistoryDetailModal()}
     </Modal>
   </div>
  );

  function PostVariationCard({
    post,
    index,
    isSelected,
    onSelect,
    onCopy,
    onPreview,
    estilo,
  }: {
    post: PostVariation;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    onCopy: () => void;
    onPreview: () => void;
    estilo: string;
  }) {
    const IconComponent = ESTILO_ICONS[estilo] || FileText;

    return (
      <Card
        variant="bordered"
        className={cn(
          "cursor-pointer transition-all duration-150 border rounded-2xl",
          isSelected
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
            : "border-slate-200 hover:border-slate-300",
        )}
        onClick={onSelect}
      >
        <CardBody className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                Variação {post.variacao}
              </span>
              <IconComponent className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            </div>
            <div
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              role="group"
              aria-label="Ações do post"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy();
                }}
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                aria-label="Copiar post"
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Copiar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
                leftIcon={<Eye className="h-3.5 w-3.5" />}
                aria-label="Ver prévia completa"
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Prévia</span>
              </Button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 line-clamp-10 font-sans leading-relaxed select-text">
            {post.conteudo}
          </pre>
        </CardBody>
      </Card>
    );
  }

  function ReviewCard({ review }: { review: any }) {
    return (
      <div className="space-y-4" id="panel-review">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Revisão de Qualidade
              </h3>
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {review.score || 0}/10
                </span>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Pontos Fortes
                </h4>
                <ul className="space-y-2 text-sm text-green-700 dark:text-green-400">
                  {review.pontos_fortes?.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">
                        •
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Pontos de Melhoria
                </h4>
                <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-400">
                  {review.pontos_melhoria?.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5 flex-shrink-0">
                        •
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Sugestões de Otimização
              </h4>
              <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                {review.sugestoes?.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">
                      →
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  function VisualCard({ visual }: { visual: any }) {
    return (
      <div className="space-y-4" id="panel-visual">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <Palette className="h-5 w-5 text-blue-500" />
              Sugestão de Identidade Visual
            </h3>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <label className="label mb-2">Tipo de Conteúdo</label>
              <Badge variant="primary" className="text-sm px-3 py-1">
                {visual.tipo_conteudo}
              </Badge>
            </div>

            <div>
              <label className="label mb-2">Descrição Visual</label>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {visual.descricao_visual}
              </p>
            </div>

            {visual.codigo_exemplo && (
              <div>
                <label className="label mb-2 flex items-center gap-2">
                  Exemplo de Código
                  <Badge variant="neutral" size="sm">
                    {visual.codigo_linguagem}
                  </Badge>
                </label>
                <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-50 p-4 rounded-xl text-sm font-mono overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
                  {visual.codigo_exemplo}
                </pre>
              </div>
            )}

            <div>
              <label className="label mb-2">Ferramentas Sugeridas</label>
              <div className="flex flex-wrap gap-2">
                {visual.ferramentas_sugeridas?.map(
                  (tool: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tool}
                    </Badge>
                  ),
                )}
              </div>
            </div>

            <div>
              <label className="label mb-2">Dicas de Composição</label>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {visual.dicas_composicao?.map((tip: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                  >
                    <span className="text-blue-500 mt-0.5 flex-shrink-0">
                      •
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  function HistoryDetailView({
    post,
    onClose,
    STATUS_LABELS,
    handleCopy,
  }: {
    post: PostHistoryDetail;
    onClose: () => void;
    STATUS_LABELS: StatusLabelsType;
    handleCopy: (text: string) => void;
  }) {
    return (
      <div className="space-y-5 max-h-[85vh] overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{post.estilo}</Badge>
          <Badge variant="outline">{post.publico}</Badge>
          <Badge variant="outline">{post.experiencia}</Badge>
          <Badge variant="outline">{post.objetivo}</Badge>
          <Badge variant="outline">{post.formato}</Badge>
          {post.favorito && (
            <Badge variant="danger">
              <Heart className="h-3 w-3 mr-1" /> Favorito
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <div>
            <span className="text-slate-500">Criado em:</span>{" "}
            <span className="text-slate-900 dark:text-slate-50 ml-2">
              {new Date(post.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Atualizado em:</span>{" "}
            <span className="text-slate-900 dark:text-slate-50 ml-2">
              {new Date(post.updated_at).toLocaleString("pt-BR")}
            </span>
          </div>
          {post.completed_at && (
            <div>
              <span className="text-slate-500">Concluído em:</span>{" "}
              <span className="text-slate-900 dark:text-slate-50 ml-2">
                {new Date(post.completed_at).toLocaleString("pt-BR")}
              </span>
            </div>
          )}
          <div>
            <span className="text-slate-500">Status:</span>{" "}
            <Badge
              variant={STATUS_LABELS[post.status]?.variant || "neutral"}
              className="ml-2"
            >
              {STATUS_LABELS[post.status]?.label || post.status}
            </Badge>
          </div>
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500">Tags:</span>
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="font-medium text-slate-900 dark:text-slate-50 mb-3">
            Posts Gerados
          </h4>
          <div className="space-y-3">
            {post.posts_data?.map((p, i) => (
              <Card key={i} variant="bordered">
                <CardBody>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Variação {p.variacao}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(p.conteudo)}
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                    >
                      Copiar
                    </Button>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 max-h-64 overflow-y-auto">
                    {p.conteudo}
                  </pre>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="font-medium text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" /> Hashtags
            </h4>
            <div className="flex flex-wrap gap-2">
              {post.hashtags.map((h: any) => (
                <Badge
                  key={h.tag}
                  variant="outline"
                  onClick={() => handleCopy(h.tag)}
                  className="cursor-pointer"
                >
                  #{h.tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {post.hooks && post.hooks.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="font-medium text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
              <Flag className="h-4 w-4" /> Hooks
            </h4>
            <div className="space-y-2">
              {post.hooks.map((h: any, i: number) => (
                <Card key={i} variant="bordered">
                  <CardBody className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Badge variant="primary" size="sm" className="mb-1">
                          {h.tipo}
                        </Badge>
                        <p className="text-sm text-slate-900 dark:text-slate-50 font-medium">
                          {h.texto}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {h.por_que_funciona}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(h.texto)}
                        leftIcon={<Copy className="h-3.5 w-3.5" />}
                      >
                        Copiar
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}

        {post.review && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="font-medium text-slate-900 dark:text-slate-50 mb-3">
              Revisão
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-slate-900 dark:text-slate-50 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Pontos
                  Fortes
                </h5>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  {post.review.pontos_fortes?.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-slate-900 dark:text-slate-50 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />{" "}
                  Melhorias
                </h5>
                <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  {post.review.pontos_melhoria?.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {post.visual_sugestao && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h4 className="font-medium text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
              <Palette className="h-4 w-4" /> Visual
            </h4>
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {post.visual_sugestao.descricao_visual}
              </p>
              {post.visual_sugestao.codigo_exemplo && (
                <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-50 p-3 rounded-lg text-sm font-mono overflow-x-auto max-h-48 overflow-y-auto">
                  {post.visual_sugestao.codigo_exemplo}
                </pre>
              )}
              <div className="flex flex-wrap gap-2">
                {post.visual_sugestao.ferramentas_sugeridas?.map(
                  (tool: string, i: number) => (
                    <Badge key={i} variant="neutral">
                      {tool}
                    </Badge>
                  ),
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {post.visual_sugestao.dicas_composicao?.map(
                  (tip: string, i: number) => (
                    <Badge key={i} variant="neutral" className="text-xs">
                      {tip}
                    </Badge>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>
            Fechar
         </Button>
       </div>
     </div>
    );
  }
}
export default Playground;
