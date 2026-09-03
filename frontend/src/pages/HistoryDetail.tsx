import { useState } from 'react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Download, Copy, Eye, Star, Tag, Flag, Palette, 
  CheckCircle, AlertTriangle, XCircle, Loader2,
  Calendar, Clock, Heart, Trash2, Edit2, ChevronLeft, ChevronRight,
  FileText
} from 'lucide-react'
import { useUIStore, useHistoryStore } from '@/store'
import { postsApi } from '@/services/posts'
import type { PostHistoryDetail } from '@/types'

const STATUS_LABELS: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  completed: { label: 'Concluído', variant: 'success' },
  processing: { label: 'Processando', variant: 'warning' },
  pending: { label: 'Pendente', variant: 'neutral' },
  failed: { label: 'Erro', variant: 'danger' },
  cancelled: { label: 'Cancelado', variant: 'neutral' },
}

export function HistoryDetail() {
  const { addToast } = useUIStore()
  const { selectedPost, setSelectedPost } = useHistoryStore()
  const [post, setPost] = useState<PostHistoryDetail | null>(selectedPost)

  // Sync with store
  if (selectedPost && selectedPost !== post) {
    setPost(selectedPost)
  }

  if (!post) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-surface-200 dark:bg-surface-700 rounded-full flex items-center justify-center">
            <History className="h-8 w-8 text-surface-400" />
          </div>
          <h3 className="text-lg font-medium text-surface-900 dark:text-surface-50 mb-2">Nenhuma geração selecionada</h3>
          <p className="text-surface-500 dark:text-surface-400">Selecione uma geração no histórico para ver os detalhes</p>
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[post.status] || { label: post.status, variant: 'neutral' as const }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', message: 'Copiado!' })
  }

  const handleFavorite = async () => {
    try {
      await postsApi.toggleFavorite(post.id, { favorito: !post.favorito })
      setPost({ ...post, favorito: !post.favorito })
      addToast({ type: 'success', message: post.favorito ? 'Removido dos favoritos' : 'Adicionado aos favoritos' })
    } catch {
      addToast({ type: 'error', message: 'Erro ao atualizar favorito' })
    }
  }

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir esta geração?')) {
      try {
        await postsApi.delete(post.id)
        addToast({ type: 'success', message: 'Geração excluída' })
        window.location.href = '/history'
      } catch {
        addToast({ type: 'error', message: 'Erro ao excluir' })
      }
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => window.history.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Detalhes da Geração</h1>
            <p className="text-xs text-surface-500 dark:text-surface-400">ID: {post.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <Badge variant="primary">{post.estilo}</Badge>
          <Badge variant="neutral">{post.publico}</Badge>
          <Badge variant="neutral">{post.formato}</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-surface-900 dark:text-surface-50">{post.tema}</h2>
              {post.favorito && <Heart className="h-4 w-4 text-red-500" />}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleFavorite}>
                <Heart className={cn('h-4 w-4', post.favorito ? 'fill-current text-red-500' : '')} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { /* edit tags */ }}>
                <Tag className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-surface-500">Criado em:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{new Date(post.created_at).toLocaleString('pt-BR')}</span></div>
              <div><span className="text-surface-500">Atualizado em:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{new Date(post.updated_at).toLocaleString('pt-BR')}</span></div>
              {post.completed_at && <div><span className="text-surface-500">Concluído em:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{new Date(post.completed_at).toLocaleString('pt-BR')}</span></div>}
              <div><span className="text-surface-500">Experiência:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{post.experiencia}</span></div>
              <div><span className="text-surface-500">Objetivo:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{post.objetivo}</span></div>
              <div><span className="text-surface-500">Incluir Código:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{post.incluir_codigo ? 'Sim' : 'Não'}</span></div>
              <div><span className="text-surface-500">Incluir Visual:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{post.incluir_visual ? 'Sim' : 'Não'}</span></div>
            </div>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-surface-200 dark:border-surface-700">
                <span className="text-xs text-surface-500">Tags:</span>
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline">#{tag}</Badge>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {post.posts_data && post.posts_data.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />
                Posts Gerados ({post.posts_data.length})
              </h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {post.posts_data.map((p, i) => (
                <Card key={i} variant="bordered">
                  <CardBody>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Variação {p.variacao}</span>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(p.conteudo)} leftIcon={<Copy className="h-3.5 w-3.5" />}>
                        Copiar
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300 max-h-80 overflow-y-auto">{p.conteudo}</pre>
                  </CardBody>
                </Card>
              ))}
            </CardBody>
          </Card>
        )}

        {post.hashtags && post.hashtags.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary-500" />
                Hashtags ({post.hashtags.length})
              </h3>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((h: any) => (
                  <Badge key={h.tag} variant="outline" onClick={() => handleCopy(h.tag)} className="cursor-pointer">#{h.tag}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {post.hooks && post.hooks.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary-500" />
                Hooks ({post.hooks.length})
              </h3>
            </CardHeader>
            <CardBody className="space-y-2">
              {post.hooks.map((h: any, i: number) => (
                <Card key={i} variant="bordered">
                  <CardBody className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Badge variant="primary" size="sm" className="mb-1">{h.tipo}</Badge>
                        <p className="text-sm text-surface-900 dark:text-surface-50 font-medium">{h.texto}</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{h.por_que_funciona}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(h.texto)} leftIcon={<Copy className="h-3.5 w-3.5" />}>
                        Copiar
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </CardBody>
          </Card>
        )}

        {post.review && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Revisão de Qualidade
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-surface-900 dark:text-surface-50">Score Geral</span>
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">{post.review.score || 0}/10</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Pontos Fortes
                  </h4>
                  <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
                    {post.review.pontos_fortes?.map((p: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" /> Melhorias
                  </h4>
                  <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
                    {post.review.pontos_melhoria?.map((p: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">•</span>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-500" /> Sugestões
                </h4>
                <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
                  {post.review.sugestoes?.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">→</span>{s}</li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        )}

        {post.visual_sugestao && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary-500" />
                Identidade Visual
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="label">Tipo de Conteúdo</label>
                <Badge variant="primary">{post.visual_sugestao.tipo_conteudo}</Badge>
              </div>
              <div>
                <label className="label">Descrição Visual</label>
                <p className="text-sm text-surface-600 dark:text-surface-400">{post.visual_sugestao.descricao_visual}</p>
              </div>
              {post.visual_sugestao.codigo_exemplo && (
                <div>
                  <label className="label">Exemplo de Código ({post.visual_sugestao.codigo_linguagem})</label>
                  <pre className="bg-surface-900 dark:bg-surface-950 text-surface-100 dark:text-surface-50 p-3 rounded-lg text-sm font-mono overflow-x-auto max-h-48 overflow-y-auto">{post.visual_sugestao.codigo_exemplo}</pre>
                </div>
              )}
              <div>
                <label className="label">Ferramentas Sugeridas</label>
                <div className="flex flex-wrap gap-2">
                  {post.visual_sugestao.ferramentas_sugeridas?.map((tool: string, i: number) => (
                    <Badge key={i} variant="neutral">{tool}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Dicas de Composição</label>
                <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
                  {post.visual_sugestao.dicas_composicao?.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>{tip}</li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => window.history.back()}>
              <ChevronLeft className="h-4 w-4" />
              Voltar ao Histórico
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

import { History, Sparkles } from 'lucide-react'
export default HistoryDetail