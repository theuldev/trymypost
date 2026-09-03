import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Filter, Star, Tag, Trash2, Edit2, Eye, Download, Copy, ChevronLeft, ChevronRight, MoreVertical, Heart, Clock, Calendar, ArrowUpDown, RefreshCw, Type, LayoutDashboard, Plus, Flag, CheckCircle, AlertTriangle, Palette, X, Plus as PlusIcon, History as HistoryIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button, IconButton } from '@/components/ui'
import { Input, Select } from '@/components/ui'
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/Pagination'
import { postsApi } from '@/services/posts'
import { useUIStore, useHistoryStore } from '@/store'
import type { PostHistoryBase, PostHistoryDetail } from '@/types'

const STATUS_LABELS: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }> = {
  completed: { label: 'Concluído', variant: 'success' },
  processing: { label: 'Processando', variant: 'warning' },
  pending: { label: 'Pendente', variant: 'neutral' },
  failed: { label: 'Erro', variant: 'danger' },
  cancelled: { label: 'Cancelado', variant: 'neutral' },
}

export function History() {
  const { addToast } = useUIStore()
  const { setSelectedPost, viewMode, setViewMode } = useHistoryStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [favoriteFilter, setFavoriteFilter] = useState<boolean | undefined>(undefined)
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedPost, setSelectedPostLocal] = useState<PostHistoryDetail | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [editingTags, setEditingTags] = useState<{ id: number; tags: string[] } | null>(null)

  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['history', page, pageSize, search, statusFilter, favoriteFilter, sortBy, sortOrder],
    queryFn: () => postsApi.list({ page, page_size: pageSize, search, status: statusFilter, favorito: favoriteFilter }),
  })

  const deleteMutation = useMutation({
    mutationFn: postsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      addToast({ type: 'success', message: 'Item excluído' })
    },
    onError: () => addToast({ type: 'error', message: 'Erro ao excluir' }),
  })

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, favorito }: { id: number; favorito: boolean }) => postsApi.toggleFavorite(id, { favorito }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  })

  const updateTagsMutation = useMutation({
    mutationFn: ({ id, tags }: { id: number; tags: string[] }) => postsApi.updateTags(id, { tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
      setEditingTags(null)
      addToast({ type: 'success', message: 'Tags atualizadas' })
    },
    onError: () => addToast({ type: 'error', message: 'Erro ao atualizar tags' }),
  })

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleViewDetail = (post: PostHistoryBase) => {
    setSelectedPost({
      ...post,
      posts_data: [],
      hashtags: [],
      hooks: [],
      tags: post.tags || [],
      completed_at: post.completed_at || '',
    } as unknown as PostHistoryDetail)
    navigate(`/post/${post.id}`)
  }

  const handleDelete = (id: number) => {
    setShowDeleteConfirm(id)
  }

  const confirmDelete = (id: number) => {
    deleteMutation.mutate(id)
    setShowDeleteConfirm(null)
  }

  const handleTagEdit = (post: PostHistoryBase) => {
    setEditingTags({ id: post.id, tags: [...post.tags] })
  }

  const handleTagSave = () => {
    if (editingTags) {
      updateTagsMutation.mutate({ id: editingTags.id, tags: editingTags.tags })
    }
  }

  const handleTagAdd = (tag: string) => {
    if (editingTags && tag.trim() && !editingTags.tags.includes(tag.trim())) {
      setEditingTags({ ...editingTags, tags: [...editingTags.tags, tag.trim()] })
    }
  }

  const handleTagRemove = (tag: string) => {
    if (editingTags) {
      setEditingTags({ ...editingTags, tags: editingTags.tags.filter(t => t !== tag) })
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <HistoryIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Histórico de Gerações</h1>
              <p className="text-xs text-surface-500 dark:text-surface-400">Gerencie seus posts gerados</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Buscar por tema..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'Todos os status' },
                { value: 'completed', label: 'Concluído' },
                { value: 'processing', label: 'Processando' },
                { value: 'pending', label: 'Pendente' },
                { value: 'failed', label: 'Erro' },
                { value: 'cancelled', label: 'Cancelado' },
              ]}
              className="w-40"
            />

            <Select
              value={favoriteFilter?.toString() || ''}
              onChange={(v) => setFavoriteFilter(v === '' ? undefined : v === 'true')}
              options={[
                { value: '', label: 'Favoritos' },
                { value: 'true', label: 'Sim' },
                { value: 'false', label: 'Não' },
              ]}
              className="w-36"
            />

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => { setSortBy('created_at'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }} leftIcon={sortBy === 'created_at' ? (sortOrder === 'asc' ? <ArrowUpDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />) : <Clock className="h-3.5 w-3.5" />}>
                <Clock className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSortBy('updated_at'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }} leftIcon={sortBy === 'updated_at' ? (sortOrder === 'asc' ? <ArrowUpDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5" />) : <RefreshCw className="h-3.5 w-3.5" />}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} leftIcon={viewMode === 'grid' ? <Type className="h-3.5 w-3.5" /> : <LayoutDashboard className="h-3.5 w-3.5" />} aria-label={viewMode === 'grid' ? 'Visualização em lista' : 'Visualização em grid'}>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-surface-200 dark:bg-surface-700 rounded-xl" />
              ))}
            </div>
          </div>
        ) : historyData?.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <HistoryIcon className="h-16 w-16 text-surface-300 dark:text-surface-600 mb-4" />
            <h3 className="text-lg font-medium text-surface-900 dark:text-surface-50 mb-2">Nenhuma geração encontrada</h3>
            <p className="text-surface-500 dark:text-surface-400 max-w-xs mb-6">
              {search || statusFilter || favoriteFilter !== undefined
                ? 'Tente ajustar os filtros de busca.'
                : 'Suas gerações aparecerão aqui após criar seus primeiros posts.'}
            </p>
            {!search && !statusFilter && favoriteFilter === undefined && (
              <Button onClick={() => window.location.href = '/playground'} leftIcon={<Plus className="h-4 w-4" />}>
                Criar Primeiro Post
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Results Info */}
            <div className="mb-4 flex items-center justify-between text-sm text-surface-500 dark:text-surface-400">
              <span>Mostrando {historyData!.items.length} de {historyData!.total} resultados</span>
              <Select
                value={pageSize.toString()}
                onChange={(v) => { setPageSize(parseInt(v)); setPage(1) }}
                options={[
                  { value: '5', label: '5 por página' },
                  { value: '10', label: '10 por página' },
                  { value: '20', label: '20 por página' },
                  { value: '50', label: '50 por página' },
                ]}
                className="w-auto"
              />
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {historyData!.items.map((post) => (
                  <HistoryCard
                    key={post.id}
                    post={post}
                    onView={() => handleViewDetail(post)}
                    onFavorite={() => toggleFavoriteMutation.mutate({ id: post.id, favorito: !post.favorito })}
                    onEditTags={() => handleTagEdit(post)}
                    onDelete={() => handleDelete(post.id)}
                    isFavorite={post.favorito}
                    status={post.status}
                  />
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {historyData!.items.map((post) => (
                  <HistoryRow
                    key={post.id}
                    post={post}
                    onView={() => handleViewDetail(post)}
                    onFavorite={() => toggleFavoriteMutation.mutate({ id: post.id, favorito: !post.favorito })}
                    onEditTags={() => handleTagEdit(post)}
                    onDelete={() => handleDelete(post.id)}
                    isFavorite={post.favorito}
                    status={post.status}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(historyData!.total / pageSize)}
              onPageChange={setPage}
            />
          </>
        )}

        {/* Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedPostLocal(null); }}
          title="Detalhes da Geração"
          size="xl"
        >
          {selectedPost && (
            <HistoryDetailView post={selectedPost} onClose={() => setShowDetailModal(false)} />
          )}
        </Modal>

        {/* Delete Confirm Modal */}
        <Modal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          title="Confirmar Exclusão"
          description="Esta ação não pode ser desfeita."
        >
          <p className="text-surface-600 dark:text-surface-400 mb-6">
            Tem certeza que deseja excluir esta geração permanentemente?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { if (showDeleteConfirm) confirmDelete(showDeleteConfirm) }}>Excluir</Button>
          </div>
        </Modal>

        {/* Edit Tags Modal */}
        <Modal
          isOpen={!!editingTags}
          onClose={() => setEditingTags(null)}
          title="Editar Tags"
          size="md"
        >
          {editingTags && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {editingTags.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    <IconButton variant="ghost" size="sm" ariaLabel={`Remover ${tag}`} onClick={() => handleTagRemove(tag)}>
                      <X className="h-3 w-3" />
                    </IconButton>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova tag"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTagAdd(e.currentTarget.value); e.currentTarget.value = '' } }}
                />
                <Button variant="secondary" size="sm" onClick={() => { handleTagAdd(editingTags.tags[editingTags.tags.length - 1] || '') }}>Adicionar</Button>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-700">
                <Button variant="secondary" onClick={() => setEditingTags(null)}>Cancelar</Button>
                <Button variant="primary" onClick={handleTagSave}>Salvar</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}

function HistoryCard({ post, onView, onFavorite, onEditTags, onDelete, isFavorite, status }: {
  post: PostHistoryBase
  onView: () => void
  onFavorite: () => void
  onEditTags: () => void
  onDelete: () => void
  isFavorite: boolean
  status: string
}) {
  const statusInfo = STATUS_LABELS[status] || { label: status, variant: 'neutral' as const }

  return (
    <Card variant="bordered" className="h-full flex flex-col" onClick={onView}>
      <CardHeader className="pb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {isFavorite && <Heart className="h-4 w-4 text-red-500" />}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onFavorite() }} className={isFavorite ? 'text-red-500' : ''} aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
            <Heart className={cn('h-4 w-4', isFavorite ? 'fill-current text-red-500' : '')} />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEditTags() }} aria-label="Editar tags"><Tag className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete() }} aria-label="Excluir"><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      </CardHeader>
      <CardBody className="flex-1 flex flex-col">
        <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-2 line-clamp-2">{post.tema}</h3>
        <div className="flex flex-wrap gap-1.5 mb-3 flex-1">
          <Badge variant="primary" size="sm">{post.estilo}</Badge>
          <Badge variant="outline" size="sm">{post.publico}</Badge>
          <Badge variant="outline" size="sm">{post.formato}</Badge>
        </div>
        <div className="flex flex-wrap gap-1">
          {post.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="neutral" size="sm">#{tag}</Badge>
          ))}
          {post.tags.length > 3 && <Badge variant="neutral" size="sm">+{post.tags.length - 3}</Badge>}
        </div>
      </CardBody>
      <CardFooter className="flex items-center justify-between text-xs text-surface-500 dark:text-surface-400">
        <span>{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
        <span>{post.estilo} • {post.formato}</span>
      </CardFooter>
    </Card>
  )
}

function HistoryRow({ post, onView, onFavorite, onEditTags, onDelete, isFavorite, status }: {
  post: PostHistoryBase
  onView: () => void
  onFavorite: () => void
  onEditTags: () => void
  onDelete: () => void
  isFavorite: boolean
  status: string
}) {
  const statusInfo = STATUS_LABELS[status] || { label: status, variant: 'neutral' as const }

  return (
    <div className="flex items-center gap-4 p-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer" onClick={onView}>
      <div className="flex items-center gap-2">
        <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
        {isFavorite && <Heart className="h-4 w-4 text-red-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-surface-900 dark:text-surface-50 truncate">{post.tema}</h4>
        <div className="flex flex-wrap gap-1.5 mt-1 text-xs text-surface-500 dark:text-surface-400">
          <span>{post.estilo}</span>
          <span>•</span>
          <span>{post.formato}</span>
          <span>•</span>
          <span>{post.publico}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {post.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="neutral" size="sm">#{tag}</Badge>
        ))}
        {post.tags.length > 3 && <Badge variant="neutral" size="sm">+{post.tags.length - 3}</Badge>}
      </div>
      <div className="text-right text-xs text-surface-400 whitespace-nowrap">
        {new Date(post.created_at).toLocaleDateString('pt-BR')}
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onFavorite() }} className={isFavorite ? 'text-red-500' : ''} aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
          <Heart className={cn('h-4 w-4', isFavorite ? 'fill-current text-red-500' : '')} />
        </Button>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEditTags() }} aria-label="Editar tags"><Tag className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete() }} aria-label="Excluir"><Trash2 className="h-4 w-4 text-red-500" /></Button>
      </div>
    </div>
  )
}

function HistoryDetailView({ post, onClose }: { post: PostHistoryDetail; onClose: () => void }) {
  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="primary">{post.estilo}</Badge>
        <Badge variant="neutral">{post.publico}</Badge>
        <Badge variant="neutral">{post.experiencia}</Badge>
        <Badge variant="neutral">{post.objetivo}</Badge>
        <Badge variant="neutral">{post.formato}</Badge>
        {post.favorito && <Badge variant="danger"><Heart className="h-3 w-3 mr-1" /> Favorito</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-surface-500">Criado em:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{new Date(post.created_at).toLocaleString('pt-BR')}</span></div>
        <div><span className="text-surface-500">Atualizado em:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{new Date(post.updated_at).toLocaleString('pt-BR')}</span></div>
        {post.completed_at && <div><span className="text-surface-500">Concluído em:</span> <span className="text-surface-900 dark:text-surface-50 ml-2">{new Date(post.completed_at).toLocaleString('pt-BR')}</span></div>}
        <div><span className="text-surface-500">Status:</span> <Badge variant={STATUS_LABELS[post.status]?.variant || 'neutral'} className="ml-2">{STATUS_LABELS[post.status]?.label || post.status}</Badge></div>
      </div>

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-surface-200 dark:border-surface-700">
          <span className="text-xs text-surface-500">Tags:</span>
          {post.tags.map((tag) => (
            <Badge key={tag} variant="outline">#{tag}</Badge>
          ))}
        </div>
      )}

      <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
        <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3">Posts Gerados</h4>
        <div className="space-y-3">
          {post.posts_data?.map((p, i) => (
            <Card key={i} variant="bordered">
              <CardBody>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Variação {p.variacao}</span>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(p.conteudo)} leftIcon={<Copy className="h-3.5 w-3.5" />}>
                    Copiar
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300 max-h-64 overflow-y-auto">{p.conteudo}</pre>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {post.hashtags && post.hashtags.length > 0 && (
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4" /> Hashtags
          </h4>
          <div className="flex flex-wrap gap-2">
            {post.hashtags.map((h: any) => (
              <Badge key={h.tag} variant="outline" onClick={() => navigator.clipboard.writeText(h.tag)} className="cursor-pointer">#{h.tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {post.hooks && post.hooks.length > 0 && (
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
            <Flag className="h-4 w-4" /> Hooks
          </h4>
          <div className="space-y-2">
            {post.hooks.map((h: any, i: number) => (
              <Card key={i} variant="bordered">
                <CardBody className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Badge variant="primary" size="sm" className="mb-1">{h.tipo}</Badge>
                      <p className="text-sm text-surface-900 dark:text-surface-50 font-medium">{h.texto}</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{h.por_que_funciona}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(h.texto)} leftIcon={<Copy className="h-3.5 w-3.5" />}>
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
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3">Revisão</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Pontos Fortes
              </h5>
              <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
                {post.review.pontos_fortes?.map((p: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" /> Melhorias
              </h5>
              <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
                {post.review.pontos_melhoria?.map((p: string, i: number) => (
                  <li key={i} className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">•</span>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {post.visual_sugestao && (
        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <h4 className="font-medium text-surface-900 dark:text-surface-50 mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4" /> Visual
          </h4>
          <div className="space-y-3">
            <p className="text-sm text-surface-600 dark:text-surface-400">{post.visual_sugestao.descricao_visual}</p>
            {post.visual_sugestao.codigo_exemplo && (
              <pre className="bg-surface-900 dark:bg-surface-950 text-surface-100 dark:text-surface-50 p-3 rounded-lg text-sm font-mono overflow-x-auto max-h-48 overflow-y-auto">{post.visual_sugestao.codigo_exemplo}</pre>
            )}
            <div className="flex flex-wrap gap-2">
              {post.visual_sugestao.ferramentas_sugeridas?.map((tool: string, i: number) => (
                <Badge key={i} variant="neutral">{tool}</Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-surface-200 dark:border-surface-700">
        <Button variant="secondary" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}
export default History