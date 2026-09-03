import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  Copy,
  Heart,
  Trash2,
  Tag,
  Flag,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Palette,
  Loader2,
  RefreshCw,
  Share2,
  Edit3,
  Clock,
  Code2,
  Download,
  X as XIcon,
  Wand2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { postsApi } from '@/services/posts'
import { useUIStore, useGenerationStore } from '@/store'
import type { PostHistoryDetail, GeneratePostRequest } from '@/types'

const STATUS_LABELS: Record<
  string,
  {
    label: string
    variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  }
> = {
  completed: { label: 'Concluído', variant: 'success' },
  processing: { label: 'Processando', variant: 'warning' },
  pending: { label: 'Pendente', variant: 'neutral' },
  failed: { label: 'Erro', variant: 'danger' },
  cancelled: { label: 'Cancelado', variant: 'neutral' },
}

export function PostResult() {
  const { id } = useParams<{ id: string }>()

  if (id === 'new') return <GeneratingView />
  return <DetailView id={id!} />
}

function DetailView({ id }: { id: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()
  const [activeVariation, setActiveVariation] = useState(0)

  const {
    data: post,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['post-result', id],
    queryFn: () => postsApi.getDetail(Number(id)),
    enabled: !!id,
    staleTime: 30_000,
  })

  const favoriteMutation = useMutation({
    mutationFn: (favorito: boolean) =>
      postsApi.toggleFavorite(Number(id), { favorito }),
    onSuccess: (_, favorito) => {
      queryClient.setQueryData(['post-result', id], (old: PostHistoryDetail | undefined) =>
        old ? { ...old, favorito } : old,
      )
      addToast({
        type: 'success',
        message: favorito ? 'Adicionado aos favoritos' : 'Removido dos favoritos',
      })
    },
    onError: () =>
      addToast({ type: 'error', message: 'Erro ao atualizar favorito' }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => postsApi.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      addToast({ type: 'success', message: 'Post excluído' })
      navigate('/history')
    },
    onError: () => addToast({ type: 'error', message: 'Erro ao excluir' }),
  })

  const handleCopy = (text: string, message = 'Copiado!') => {
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', message })
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    addToast({ type: 'success', message: 'Link copiado para a área de transferência' })
  }

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este post?')) {
      deleteMutation.mutate()
    }
  }

  const handleDownload = (conteudo: string) => {
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${post?.tema?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'post'}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    addToast({ type: 'success', message: 'Post baixado' })
  }

  if (isLoading) return <PostResultSkeleton />

  if (error || !post) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
            Não foi possível carregar o post
        </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Verifique sua conexão ou tente novamente. Se o problema persistir, o post pode ter sido removido.
        </p>
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Voltar
          </Button>
            <Button onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Tentar novamente
          </Button>
        </div>
      </div>
    </div>
    )
  }

  return (
    <PostResultContent
      post={post}
      isFetching={isFetching}
      activeVariation={activeVariation}
      onVariationChange={setActiveVariation}
      onCopy={handleCopy}
      onShare={handleShare}
      onDelete={handleDelete}
      onDownload={handleDownload}
      onToggleFavorite={() => favoriteMutation.mutate(!post.favorito)}
      isTogglingFavorite={favoriteMutation.isPending}
      isDeleting={deleteMutation.isPending}
    />
  )
}

function GeneratingView() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()
  const {
    currentTaskId,
    currentStep,
    progress,
    isGenerating,
    updateProgress,
    clearGeneration,
  } = useGenerationStore()
  const [activeVariation, setActiveVariation] = useState(0)
  const [result, setResult] = useState<PostHistoryDetail | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const formData = (location.state as { formData?: GeneratePostRequest } | null)?.formData

  const { data: taskStatus, refetch: refetchTask } = useQuery({
    queryKey: ['task-status', currentTaskId],
    queryFn: () => postsApi.getStatus(currentTaskId!),
    enabled: !!currentTaskId && !result && !errorMsg,
    refetchInterval: (query) => {
      const state = query.state.data
      if (!state) return 1500
      return state.status === 'processing' || state.status === 'pending' ? 1500 : false
    },
    retry: false,
  })

  useEffect(() => {
    if (!taskStatus) return

    if (taskStatus.status === 'processing' || taskStatus.status === 'pending') {
      updateProgress(taskStatus.current_step || 'Processando...', taskStatus.progress)
    } else if (taskStatus.status === 'completed') {
      const resultData = taskStatus.result as
        | (Record<string, any> & { posts_data?: PostHistoryDetail['posts_data'] })
        | undefined

      if (resultData?.posts_data && Array.isArray(resultData.posts_data) && resultData.posts_data.length > 0) {
        const detail: PostHistoryDetail = {
          id: Number(currentTaskId) || 0,
          tema: formData?.tema || '',
          estilo: formData?.estilo || 'Técnico',
          publico: formData?.publico || 'Geral / Todos',
          experiencia: formData?.experiencia || 'Avançado (5-10 anos)',
          objetivo: formData?.objetivo || 'Autoridade / Personal Branding',
          formato: formData?.formato || 'Listicle (5 dicas, 3 erros...)',
          incluir_codigo: formData?.incluir_codigo || false,
          incluir_visual: formData?.incluir_visual || true,
          status: 'completed',
          favorito: false,
          tags: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          posts_data: resultData.posts_data,
          hashtags: resultData.hashtags,
          hooks: resultData.hooks,
          review: resultData.review,
          visual_sugestao: resultData.visual_sugestao,
          topicos_pesquisados: resultData.topicos_pesquisados,
        }
        setResult(detail)
        clearGeneration()
        queryClient.invalidateQueries({ queryKey: ['history'] })
        addToast({ type: 'success', message: 'Posts gerados com sucesso!' })
      } else {
        setErrorMsg('A geração foi concluída, mas nenhum post foi retornado. Tente novamente.')
        clearGeneration()
      }
    } else if (taskStatus.status === 'failed') {
      setErrorMsg(taskStatus.error || 'Erro na geração')
      clearGeneration()
    } else if (taskStatus.status === 'cancelled') {
      setErrorMsg('Geração cancelada')
      clearGeneration()
    }
  }, [
    taskStatus,
    formData,
    currentTaskId,
    updateProgress,
    clearGeneration,
    addToast,
    queryClient,
  ])

  const handleCancel = async () => {
    if (currentTaskId) {
      try {
        await postsApi.cancel(currentTaskId)
      } catch {
        // ignore
      }
    }
    clearGeneration()
    addToast({ type: 'info', message: 'Geração cancelada' })
    navigate('/playground', { replace: true })
  }

  const handleBackToPlayground = () => {
    clearGeneration()
    navigate('/playground', { replace: true })
  }

  const handleRetry = () => {
    setErrorMsg(null)
    refetchTask()
  }

  // If we have a result, render the full post view
  if (result) {
    return (
      <PostResultContent
        post={result}
        isFetching={false}
        activeVariation={activeVariation}
        onVariationChange={setActiveVariation}
        onCopy={(text, message = 'Copiado!') => {
          navigator.clipboard.writeText(text)
          addToast({ type: 'success', message })
        }}
        onShare={() => {
          navigator.clipboard.writeText(window.location.href)
          addToast({ type: 'success', message: 'Link copiado' })
        }}
        onDelete={undefined}
        onDownload={(conteudo) => {
          const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${result.tema?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'post'}.txt`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          addToast({ type: 'success', message: 'Post baixado' })
        }}
        onToggleFavorite={undefined}
        isTogglingFavorite={false}
        isDeleting={false}
      />
    )
  }

  // Error state — must come BEFORE the "no task" check, because
  // clearGeneration() runs whenever the task reaches a terminal state
  // and zeros currentTaskId/isGenerating, which would otherwise mask the error.
  if (errorMsg) {
    return (
      <div className="min-h-full bg-white dark:bg-slate-950">
        <header className="border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
            <Link
              to="/playground"
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar ao Playground</span>
          </Link>
        </div>
      </header>
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
              Não foi possível gerar o post
          </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {errorMsg}
          </p>
            <div className="flex justify-center gap-2">
              <Button
                variant="secondary"
                onClick={handleBackToPlayground}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Voltar
            </Button>
              {formData && (
                <Button
                  onClick={() => {
                    navigate('/playground', { state: { retryFormData: formData } })
                  }}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Tentar novamente
              </Button>
              )}
          </div>
        </div>
      </div>
    </div>
    )
  }

  // No task in progress — fallback (only when there's no error to show)
  if (!currentTaskId && !isGenerating) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Wand2 className="h-7 w-7 text-slate-500" />
      </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
            Nenhuma geração em andamento
      </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Inicie uma nova geração no Playground e acompanhe o progresso aqui.
      </p>
          <Button onClick={() => navigate('/playground')} leftIcon={<Wand2 className="h-4 w-4" />}>
            Ir para o Playground
      </Button>
    </div>
  </div>
    )
  }

  return (
    <GeneratingLoadingView
      currentStep={currentStep}
      progress={progress}
      formTema={formData?.tema}
      onCancel={handleCancel}
    />
  )
}

interface PostResultContentProps {
  post: PostHistoryDetail
  isFetching: boolean
  activeVariation: number
  onVariationChange: (i: number) => void
  onCopy: (text: string, message?: string) => void
  onShare: () => void
  onDelete: (() => void) | undefined
  onDownload: (conteudo: string) => void
  onToggleFavorite: (() => void) | undefined
  isTogglingFavorite: boolean
  isDeleting: boolean
}

function PostResultContent({
  post,
  isFetching,
  activeVariation,
  onVariationChange,
  onCopy,
  onShare,
  onDelete,
  onDownload,
  onToggleFavorite,
  isTogglingFavorite,
  isDeleting,
}: PostResultContentProps) {
  const navigate = useNavigate()
  const statusInfo = STATUS_LABELS[post.status] || { label: post.status, variant: 'neutral' as const }
  const variations = post.posts_data || []
  const currentVariation = variations[activeVariation] || variations[0]

  return (
    <article className="min-h-full bg-white dark:bg-slate-950">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
        </button>

          <div className="flex items-center gap-1">
            {isFetching && (
              <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin mr-1" />
            )}
            {onToggleFavorite && (
              <IconAction
                icon={<Heart className={cn('h-4 w-4', post.favorito && 'fill-current')} />}
                label={post.favorito ? 'Favoritado' : 'Favoritar'}
                active={post.favorito}
                onClick={onToggleFavorite}
                disabled={isTogglingFavorite}
              />
            )}
            <IconAction
              icon={<Share2 className="h-4 w-4" />}
              label="Compartilhar"
              onClick={onShare}
            />
            {onDelete && (
              <IconAction
                icon={<Trash2 className="h-4 w-4" />}
                label="Excluir"
                onClick={onDelete}
                danger
                disabled={isDeleting}
              />
            )}
        </div>
      </div>
    </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            {post.estilo}
        </span>
          <Sep />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {post.publico}
        </span>
          <Sep />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {post.formato}
        </span>
      </div>

        <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] tracking-tight text-slate-900 dark:text-slate-50 mb-6">
          {post.tema}
      </h1>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400 mb-10">
          {post.completed_at && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Gerado em {new Date(post.completed_at).toLocaleString('pt-BR')}
          </span>
          )}
          {post.incluir_codigo && (
            <span className="inline-flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" />
              Com código
          </span>
          )}
          {post.incluir_visual && (
            <span className="inline-flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Com visual sugerido
          </span>
          )}
      </div>

        {variations.length > 0 && (
          <section className="mb-8">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Variação {activeVariation + 1} de {variations.length}
            </h2>
              <div className="flex gap-1">
                {variations.map((v, i) => (
                  <button
                    key={v.variacao}
                    onClick={() => onVariationChange(i)}
                    aria-label={`Selecionar variação ${i + 1}`}
                    aria-pressed={activeVariation === i}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-200',
                      activeVariation === i
                        ? 'w-10 bg-blue-600 dark:bg-blue-400'
                        : 'w-4 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600',
                    )}
                  />
                ))}
            </div>
          </div>

            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700" />

              <div className="pl-6 sm:pl-8">
                <div className="relative bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 sm:px-10 py-8 sm:py-10">
                  {isFetching && (
                    <div className="absolute top-3 right-3">
                      <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                  </div>
                  )}

                  {currentVariation ? (
                    <div className="font-serif text-[1.0625rem] sm:text-[1.125rem] leading-[1.75] text-slate-800 dark:text-slate-200 whitespace-pre-wrap selection:bg-blue-100 dark:selection:bg-blue-900/40">
                      {currentVariation.conteudo}
                  </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 italic">
                      Nenhuma variação disponível para este post.
                  </p>
                  )}
              </div>

                {currentVariation && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        onCopy(
                          currentVariation.conteudo,
                          'Post copiado para a área de transferência',
                        )
                      }
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                    >
                      Copiar texto
                  </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onDownload(currentVariation.conteudo)}
                      leftIcon={<Download className="h-3.5 w-3.5" />}
                    >
                      Baixar .txt
                  </Button>
<Link
                      to={`/code-image?code=${encodeURIComponent(currentVariation.conteudo)}&lang=javascript`}
                      className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      Criar imagem de código
                    </Link>
                </div>
                )}
            </div>
          </div>
        </section>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <Section
            icon={<Tag className="h-4 w-4" />}
            title="Hashtags"
            count={post.hashtags.length}
          >
            <div className="flex flex-wrap gap-2">
              {post.hashtags.map((h) => (
                <button
                  key={h.tag}
                  onClick={() => onCopy(`#${h.tag}`, `Hashtag #${h.tag} copiada`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                >
                  <span className="font-medium">#{h.tag}</span>
                  <Copy className="h-3 w-3 opacity-50" />
              </button>
              ))}
          </div>
        </Section>
        )}

        {post.hooks && post.hooks.length > 0 && (
          <Section
            icon={<Flag className="h-4 w-4" />}
            title="Hooks"
            count={post.hooks.length}
            subtitle="Ganchos de abertura para você testar"
          >
            <ol className="space-y-3">
              {post.hooks.map((hook, i) => (
                <li
                  key={i}
                  className="group flex gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40 transition-colors"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold font-mono">
                    {String(i + 1).padStart(2, '0')}
                </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="primary" size="sm">
                        {hook.tipo}
                    </Badge>
                  </div>
                    <p className="font-serif text-base text-slate-900 dark:text-slate-100 leading-relaxed mb-1">
                      {hook.texto}
                  </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      {hook.por_que_funciona}
                  </p>
                </div>
                  <button
                    onClick={() => onCopy(hook.texto, 'Hook copiado')}
                    aria-label="Copiar hook"
                    className="opacity-0 group-hover:opacity-100 transition-opacity self-start p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                </button>
              </li>
              ))}
          </ol>
        </Section>
        )}

        {post.review && (
          <Section
            icon={<CheckCircle className="h-4 w-4" />}
            title="Revisão de qualidade"
            accent
          >
            <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1">
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="text-2xl font-bold text-white tabular-nums">
                    {post.review.score || 0}
                </span>
                  <span className="absolute -bottom-1 right-2 text-[10px] font-bold text-blue-200 bg-blue-900/80 px-1.5 py-0.5 rounded-full">
                    /10
                </span>
              </div>
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  Score
              </p>
            </div>

              <div className="space-y-5">
                <ReviewColumn
                  icon={<CheckCircle className="h-3.5 w-3.5" />}
                  title="Pontos fortes"
                  tone="success"
                  items={post.review.pontos_fortes}
                />
                <ReviewColumn
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  title="Pontos de melhoria"
                  tone="warning"
                  items={post.review.pontos_melhoria}
                />
                {post.review.sugestoes && post.review.sugestoes.length > 0 && (
                  <ReviewColumn
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    title="Sugestões de otimização"
                    tone="info"
                    items={post.review.sugestoes}
                  />
                )}
            </div>
          </div>
        </Section>
        )}

        {post.visual_sugestao && (
          <Section
            icon={<Palette className="h-4 w-4" />}
            title="Identidade visual sugerida"
          >
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  Formato
              </span>
                <Badge variant="primary">{post.visual_sugestao.tipo_conteudo}</Badge>
            </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Descrição visual
              </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {post.visual_sugestao.descricao_visual}
              </p>
            </div>

              {post.visual_sugestao.codigo_exemplo && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500 dark:text-slate-400">
                      Exemplo de código
                  </p>
                    {post.visual_sugestao.codigo_linguagem && (
                      <Badge variant="neutral" size="sm">
                        {post.visual_sugestao.codigo_linguagem}
                    </Badge>
                    )}
                </div>
                  <pre className="bg-slate-900 dark:bg-black text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-72 overflow-y-auto leading-relaxed border border-slate-800">
                    {post.visual_sugestao.codigo_exemplo}
                </pre>
              </div>
              )}

              {post.visual_sugestao.ferramentas_sugeridas &&
                post.visual_sugestao.ferramentas_sugeridas.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      Ferramentas sugeridas
                  </p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.visual_sugestao.ferramentas_sugeridas.map((tool, i) => (
                        <Badge key={i} variant="outline">
                          {tool}
                      </Badge>
                      ))}
                  </div>
                </div>
                )}

              {post.visual_sugestao.dicas_composicao &&
                post.visual_sugestao.dicas_composicao.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      Dicas de composição
                  </p>
                    <ul className="space-y-2">
                      {post.visual_sugestao.dicas_composicao.map((tip, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <span className="flex-shrink-0 mt-1.5 w-1 h-1 rounded-full bg-blue-500" />
                          <span className="leading-relaxed">{tip}</span>
                      </li>
                      ))}
                  </ul>
                </div>
                )}
          </div>
        </Section>
        )}

        <footer className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/playground"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Criar nova variação
        </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/history')}
          >
            Ver histórico completo
        </Button>
      </footer>
    </div>
  </article>
  )
}

function GeneratingLoadingView({
  currentStep,
  progress,
  formTema,
  onCancel,
}: {
  currentStep: string
  progress: number
  formTema?: string
  onCancel: () => void
}) {
  const stepNumber = Math.max(1, Math.min(4, Math.ceil((progress || 0) / 25) || 1))
  const steps = [
    'Pesquisando tópicos',
    'Gerando conteúdo',
    'Criando variações',
    'Revisando qualidade',
  ]

  return (
    <div className="min-h-full bg-gradient-to-b from-white via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link
            to="/playground"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Playground</span>
         </Link>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <XIcon className="h-3.5 w-3.5" />
            Cancelar
         </button>
       </div>
     </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {formTema && (
          <p className="text-center text-xs uppercase tracking-[0.14em] font-semibold text-slate-500 dark:text-slate-400 mb-3">
            Gerando post sobre
         </p>
        )}
        {formTema && (
          <h1 className="text-center font-serif text-2xl sm:text-3xl text-slate-900 dark:text-slate-50 mb-12 max-w-2xl mx-auto leading-tight">
            {formTema}
         </h1>
        )}

        {/* Animated icon */}
        <div className="flex justify-center mb-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <Sparkles className="h-9 w-9 sm:h-11 sm:w-11 text-white animate-pulse" />
           </div>
         </div>
       </div>

        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
            Criando seu post
         </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {currentStep || 'Iniciando...'}
         </p>
       </div>

        {/* Progress bar */}
        <div className="max-w-md mx-auto mb-10">
          <div className="relative h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress || 5}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
         </div>
          <div className="flex justify-between mt-3 text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {progress}%
           </span>
            <span className="text-slate-500 dark:text-slate-400">
              Etapa {stepNumber} de {steps.length}
           </span>
         </div>
       </div>

        {/* Steps timeline */}
        <ol className="max-w-md mx-auto space-y-2 mb-12">
          {steps.map((step, i) => {
            const isDone = i + 1 < stepNumber
            const isCurrent = i + 1 === stepNumber
            return (
              <li
                key={step}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300',
                  isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50'
                    : isDone
                      ? 'opacity-60'
                      : 'opacity-40',
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 transition-colors',
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500',
                  )}
                >
                  {isDone ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="text-[10px] font-bold tabular-nums">
                      {i + 1}
                   </span>
                  )}
               </span>
                <span
                  className={cn(
                    'text-sm',
                    isCurrent
                      ? 'font-medium text-blue-900 dark:text-blue-100'
                      : 'text-slate-700 dark:text-slate-300',
                  )}
                >
                  {step}
               </span>
             </li>
            )
          })}
       </ol>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
          Isso pode levar alguns minutos. Você pode navegar para outras telas — a geração continua em segundo plano.
       </p>
     </div>
   </div>
  )
}

function PostResultSkeleton() {
  return (
    <div className="min-h-full bg-white dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex gap-2 mb-5">
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
      </div>
        <div className="h-12 sm:h-16 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-6" />
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-10" />
        <div className="space-y-3 mb-12">
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>
    </div>
  </div>
  )
}

function Sep() {
  return (
    <span className="text-slate-300 dark:text-slate-700 text-xs" aria-hidden>
      /
  </span>
  )
}

function IconAction({
  icon,
  label,
  onClick,
  active,
  danger,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn(
        'p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        danger
          ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
          : active
            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800',
      )}
    >
      {icon}
  </button>
  )
}

function Section({
  icon,
  title,
  count,
  subtitle,
  accent,
  children,
}: {
  icon: React.ReactNode
  title: string
  count?: number
  subtitle?: string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="mt-12">
      <header className="flex items-start gap-3 mb-5">
        <span
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0',
            accent
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
          )}
        >
          {icon}
      </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {title}
          </h3>
            {count !== undefined && (
              <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                {count}
            </span>
            )}
        </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
          </p>
          )}
      </div>
    </header>
      {children}
  </section>
  )
}

function ReviewColumn({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode
  title: string
  items: string[] | undefined
  tone: 'success' | 'warning' | 'info'
}) {
  const toneClasses = {
    success:
      'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50',
    warning:
      'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50',
    info: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50',
  }[tone]

  return (
    <div className={cn('rounded-xl border p-4', toneClasses)}>
      <div className="flex items-center gap-1.5 mb-2.5">
        {icon}
        <h4 className="text-xs font-semibold uppercase tracking-wider">{title}</h4>
    </div>
      {items && items.length > 0 ? (
        <ul className="space-y-1.5 text-sm leading-relaxed">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-current flex-shrink-0 opacity-60" />
              <span>{item}</span>
          </li>
          ))}
      </ul>
      ) : (
        <p className="text-sm italic opacity-70">Nenhum item</p>
      )}
  </div>
  )
}

export default PostResult
