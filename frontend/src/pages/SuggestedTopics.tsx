import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lightbulb, Sparkles, Loader2, Copy, ChevronRight, Tag, Type, Hash, MessageSquare, ExternalLink, RefreshCw, Star, BookOpen, Zap, Users, Code2, TrendingUp, Heart, BarChart2, Minus, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { topicsApi } from '@/services/posts'
import { useUIStore } from '@/store'
import type { TopicSuggestion } from '@/types'

const FORMATOS = [
  'Listicle (5 dicas, 3 erros...)', 'Storytelling (História pessoal)', 'Antes/Depois (Transformação)',
  'Pergunta Aberta (Engajamento)', 'Opinião Forte (Controversa)', 'Mini Tutorial (Passo a passo)'
]

export function SuggestedTopics() {
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  
  const [context, setContext] = useState('')
  const [quantity, setQuantity] = useState(5)
  const [selectedFormat, setSelectedFormat] = useState('')
  const [topics, setTopics] = useState<TopicSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<TopicSuggestion | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const suggestMutation = useMutation({
    mutationFn: topicsApi.suggest,
    onSuccess: (data) => {
      setTopics(data.topics)
      setIsLoading(false)
      addToast({ type: 'success', message: `${data.topics.length} temas sugeridos!` })
    },
    onError: () => {
      setIsLoading(false)
      addToast({ type: 'error', message: 'Erro ao sugerir temas' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    suggestMutation.mutate({ contexto: context, quantidade: quantity })
  }

  const handleUseTopic = (topic: TopicSuggestion) => {
    setSelectedTopic(topic)
    setShowDetailModal(true)
  }

  const handleCopyTopic = (topic: TopicSuggestion) => {
    const text = `${topic.titulo}\n\n${topic.descricao}\n\nFormato: ${topic.formato_sugerido}\nÂngulo: ${topic.angulo}\nHashtags: ${topic.hashtags_sugeridas.join(' ')}`
    navigator.clipboard.writeText(text)
    addToast({ type: 'success', message: 'Tema copiado!' })
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-96 border-r border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Temas Sugeridos</h1>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">Descubra ideias para seus posts</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4 overflow-y-auto">
          <Textarea
            label="Contexto (opcional)"
            value={context}
            onChange={setContext}
            placeholder="Ex: React performance, TypeScript avançado, carreira dev..."
            rows={3}
            hint="Deixe em branco para temas gerais de desenvolvimento"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Quantidade"
              value={quantity.toString()}
              onChange={(v) => setQuantity(parseInt(v))}
              options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
            />
            <Select
              label="Formato Preferido"
              value={selectedFormat}
              onChange={(v) => setSelectedFormat(v)}
              options={[{ value: '', label: 'Qualquer' }, ...FORMATOS.map(f => ({ value: f, label: f }))]}
            />
          </div>

          <Button type="submit" fullWidth loading={isLoading} leftIcon={<Sparkles className="h-4 w-4" />}>
            {isLoading ? 'Gerando...' : 'Sugerir Temas'}
          </Button>

          {topics.length === 0 && !isLoading && (
            <div className="text-center py-8 text-surface-500 dark:text-surface-400">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 text-surface-300 dark:text-surface-600" />
              <p className="text-sm">Preencha o contexto e clique em sugerir</p>
            </div>
          )}
        </form>
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="font-semibold text-surface-900 dark:text-surface-50">Temas Encontrados</h2>
              <p className="text-xs text-surface-500 dark:text-surface-400">{topics.length} sugestões</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {topics.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <Lightbulb className="h-16 w-16 text-surface-300 dark:text-surface-600 mb-4" />
              <h3 className="text-lg font-medium text-surface-900 dark:text-surface-50 mb-2">Nenhum tema sugerido</h3>
              <p className="text-surface-500 dark:text-surface-400 max-w-xs">
                Configure o contexto ao lado e clique em "Sugerir Temas" para gerar ideias.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic, index) => (
                <Card key={index} variant="bordered" className="h-full flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="primary">{topic.formato_sugerido}</Badge>
                      <span className="text-xs text-surface-500">#{index + 1}</span>
                    </div>
                  </CardHeader>
                  <CardBody className="flex-1 flex flex-col">
                    <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-2 line-clamp-2">{topic.titulo}</h3>
                    <p className="text-sm text-surface-600 dark:text-surface-400 mb-3 flex-1 line-clamp-3">{topic.descricao}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {topic.hashtags_sugeridas.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="outline" size="sm">#{tag}</Badge>
                      ))}
                      {topic.hashtags_sugeridas.length > 4 && (
                        <Badge variant="neutral" size="sm">+{topic.hashtags_sugeridas.length - 4}</Badge>
                      )}
                    </div>

                    <div className="mt-auto pt-3 border-t border-surface-200 dark:border-surface-700 flex gap-2">
                      <Button variant="ghost" size="sm" fullWidth onClick={() => handleUseTopic(topic)} leftIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                        Usar este tema
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCopyTopic(topic)} leftIcon={<Copy className="h-3.5 w-3.5" />} aria-label="Copiar tema">
                        <span className="hidden sm:inline">Copiar</span>
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Detalhes do Tema"
        size="lg"
      >
        {selectedTopic && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">{selectedTopic.titulo}</h3>
            <p className="text-surface-600 dark:text-surface-400">{selectedTopic.descricao}</p>
            
            <div className="space-y-3 pt-3 border-t border-surface-200 dark:border-surface-700">
              <div>
                <label className="label">Formato Sugerido</label>
                <Badge variant="primary">{selectedTopic.formato_sugerido}</Badge>
              </div>
              <div>
                <label className="label">Ângulo</label>
                <p className="text-sm text-surface-600 dark:text-surface-400">{selectedTopic.angulo}</p>
              </div>
              <div>
                <label className="label">Hashtags Sugeridas</label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTopic.hashtags_sugeridas.map((tag) => (
                    <Badge key={tag} variant="outline">#{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-200 dark:border-surface-700">
              <Button variant="secondary" onClick={() => handleCopyTopic(selectedTopic)} leftIcon={<Copy className="h-4 w-4" />}>
                Copiar Tudo
              </Button>
              <Button variant="primary" onClick={() => { setShowDetailModal(false); addToast({ type: 'success', message: 'Tema selecionado! Vá ao Playground para gerar.' }) }} leftIcon={<ExternalLink className="h-4 w-4" />}>
                Usar no Playground
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
export default SuggestedTopics