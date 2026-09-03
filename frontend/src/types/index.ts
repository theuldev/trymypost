export type EstiloEnum =
  | 'Técnico'
  | 'Storytelling'
  | 'Opinião/Controverso'
  | 'Educacional'
  | 'Carreira/Soft Skills'
  | 'Humor/Tecnologia'
  | 'Minimalista'
  | 'Case Study'
  | 'Trends/Novidades'
  | 'Pessoal/Autobiográfico'

export type PublicoEnum =
  | 'Desenvolvedores Júnior'
  | 'Desenvolvedores Pleno'
  | 'Desenvolvedores Sênior'
  | 'Tech Leads / Arquitetos'
  | 'Gestores / CTOs'
  | 'Full Stack'
  | 'Backend'
  | 'Frontend'
  | 'DevOps / SRE'
  | 'Data / IA'
  | 'Mobile'
  | 'Geral / Todos'

export type ExperienciaEnum =
  | 'Iniciante (0-2 anos)'
  | 'Intermediário (2-5 anos)'
  | 'Avançado (5-10 anos)'
  | 'Expert (10+ anos)'

export type ObjetivoEnum =
  | 'Engajamento / Comentários'
  | 'Autoridade / Personal Branding'
  | 'Geração de Leads / Vendas'
  | 'Networking / Conexões'
  | 'Educar / Compartilhar Conhecimento'
  | 'Atrair Oportunidades / Contratação'

export type FormatoEnum =
  | 'Listicle (5 dicas, 3 erros...)'
  | 'Storytelling (História pessoal)'
  | 'Antes/Depois (Transformação)'
  | 'Pergunta Aberta (Engajamento)'
  | 'Opinião Forte (Controversa)'
  | 'Mini Tutorial (Passo a passo)'

export interface GeneratePostRequest {
  tema: string
  estilo: EstiloEnum
  publico: PublicoEnum
  experiencia: ExperienciaEnum
  objetivo: ObjetivoEnum
  formato: FormatoEnum
  incluir_codigo: boolean
  incluir_visual: boolean
  guidelines?: string
  quantidade: number
}

export interface GeneratePostResponse {
  task_id: string
  status: string
}

export interface TaskStatusResponse {
  task_id: string
  status: string
  current_step?: string
  progress: number
  result?: Record<string, any>
  error?: string
}

export interface PostHistoryBase {
  id: number
  tema: string
  estilo: string
  publico: string
  experiencia: string
  objetivo: string
  formato: string
  incluir_codigo: boolean
  incluir_visual: boolean
  status: string
  favorito: boolean
  tags: string[]
  created_at: string
  updated_at: string
  completed_at?: string
  error_message?: string
}

export interface PostHistoryDetail extends PostHistoryBase {
  posts_data?: PostVariation[]
  topicos_pesquisados?: string[]
  hashtags?: HashtagItem[]
  hooks?: HookItem[]
  review?: ReviewResult
  visual_sugestao?: VisualSuggestion
}

export interface PostVariation {
  variacao: number
  conteudo: string
}

export interface HashtagItem {
  tag: string
  relevancia: string
  volume_estimado: string
}

export interface HookItem {
  tipo: string
  texto: string
  por_que_funciona: string
}

export interface ReviewResult {
  score: number
  pontos_fortes: string[]
  pontos_melhoria: string[]
  sugestoes: string[]
}

export interface VisualSuggestion {
  tipo_conteudo: string
  descricao_visual: string
  codigo_exemplo?: string
  codigo_linguagem?: string
  ferramentas_sugeridas: string[]
  dicas_composicao: string[]
}

export interface PostHistoryListResponse {
  items: PostHistoryBase[]
  total: number
  page: number
  page_size: number
}

export interface ToggleFavoriteRequest {
  favorito: boolean
}

export interface UpdateTagsRequest {
  tags: string[]
}

export interface CodeFromPostRequest {
  post: string
}

export interface CodeFromPostResponse {
  code: string
  language: string
  title: string
}

export interface SuggestTopicsRequest {
  contexto?: string
  quantidade: number
}

export interface SuggestTopicsResponse {
  topics: TopicSuggestion[]
}

export interface TopicSuggestion {
  titulo: string
  descricao: string
  formato_sugerido: string
  angulo: string
  hashtags_sugeridas: string[]
}

export interface HealthResponse {
  status: string
  version: string
}

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'