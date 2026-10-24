export type StyleEnum =
  | 'Technical'
  | 'Humor/Technology'
  | 'Minimalist'
  | 'Trends/News';

export type AudienceEnum =
  | 'Junior Developers'
  | 'Mid Developers'
  | 'Senior Developers'
  | 'Tech Leads / Architects'
  | 'Managers / CTOs'
  | 'Full Stack'
  | 'Backend'
  | 'Frontend'
  | 'DevOps / SRE'
  | 'Data / AI'
  | 'Mobile'
  | 'General / All';

export type ExperienceEnum =
  | 'Beginner (0-2 years)'
  | 'Intermediate (2-5 years)'
  | 'Advanced (5-10 years)'
  | 'Expert (10+ years)';

export type ObjectiveEnum =
  | 'Engagement / Comments'
  | 'Authority / Personal Branding'
  | 'Lead Generation / Sales'
  | 'Networking / Connections'
  | 'Educate / Share Knowledge'
  | 'Attract Opportunities / Hiring';

export type FormatEnum =
  | 'Listicle (5 tips, 3 mistakes...)'
  | 'Storytelling (Personal story)'
  | 'Before/After (Transformation)'
  | 'Open Question (Engagement)'
  | 'Strong Opinion (Controversial)'
  | 'Mini Tutorial (Step by step)';

export type InputMode = 'structured' | 'description'

export interface GeneratePostRequest {
  topic: string
  style: StyleEnum
  audience: AudienceEnum
  experience: ExperienceEnum
  objective: ObjectiveEnum
  format: FormatEnum
  include_code: boolean
  include_visual: boolean
  include_hashtags: boolean
  include_hooks: boolean
  include_review: boolean
  guidelines?: string
  quantity: number
  language: string
  max_length?: number
  input_mode?: InputMode
  description?: string
  visual_brief?: string
  use_rag?: boolean
}

/** Payload da geração: campos estruturados são opcionais no modo description. */
export type GeneratePostPayload = Partial<GeneratePostRequest>

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

export type EditorialStatus = 'draft' | 'approved' | 'scheduled' | 'published'

export interface PostHistoryBase {
  id: string
  topic: string
  style: string
  audience: string
  experience: string
  objective: string
  format: string
  include_code: boolean
  include_visual: boolean
  status: string
  editorial_status: EditorialStatus
  scheduled_at?: string
  published_at?: string
  generated_image_url?: string
  is_favorite: boolean
  is_edited?: boolean
  tags: string[]
  created_at: string
  updated_at: string
  completed_at?: string
  error_message?: string
  total_cost_usd?: number
  total_tokens?: number
}

export interface UpdateEditorialStatusRequest {
  editorial_status: EditorialStatus
  scheduled_at?: string
  published_at?: string
}

export interface CalendarItem {
  id: string
  topic: string
  style: string
  format: string
  editorial_status: EditorialStatus
  scheduled_at?: string
  published_at?: string
  created_at: string
  is_favorite: boolean
}
export type CodeExample = {
  language: string;
  code: string;
};
export interface PostHistoryDetail extends PostHistoryBase {
  posts_data?: PostVariation[]
  researched_topics?: string[]
  hashtags?: HashtagItem[]
  hooks?: HookItem[]
  review?: ReviewResult
  visual_suggestion?: VisualSuggestion
  code_examples?: CodeExample[]
}

export interface PostVariation {
  variation: number
  content: string
  is_edited?: boolean
  review?: ReviewResult | null
  visual_suggestion?: VisualSuggestion | null
  hashtags?: HashtagItem[] | null
  hooks?: HookItem[] | null
  code_examples?: CodeExample[] | null
}

export interface HashtagItem {
  tag: string
  relevance: string
  estimated_volume: string
}

export interface HookItem {
  type: string
  text: string
  why_it_works: string
}

export interface ReviewResult {
  score: number
  strengths: string[]
  improvements: string[]
  suggestions: string[]
}

export interface VisualSuggestion {
  content_type: string
  visual_description: string
  code_example?: string
  code_language?: string
  suggested_tools: string[]
  composition_tips: string[]
}

export interface PostHistoryListResponse {
  items: PostHistoryBase[]
  total: number
  page: number
  page_size: number
}

export interface ToggleFavoriteRequest {
  is_favorite: boolean
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
  context?: string
  country?: string
  quantity: number
}

export interface SuggestTopicsResponse {
  topics: TopicSuggestion[]
}

export interface TopicSuggestion {
  title: string
  description: string
  suggested_format: string
  angle: string
  suggested_hashtags: string[]
}

export interface HealthResponse {
  status: string
  version: string
}

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface PostEdit {
  id: string
  post_id: string
  post_index: number
  content: string
  original_content?: string
  created_at: string
}

export interface CodePreset {
  id?: string
  name: string
  theme: string
  language: string
  syntax_theme?: string
  font_family: string
  font_size: string
  padding: string
  window_style: string
  show_line_numbers: boolean
  created_at?: string
}

export interface AppSettings {
  id?: string
  provider: string
  model_name: string
  api_key?: string
  tavily_api_key?: string
  temperature: number
  language: string
  image_provider?: string
  image_model?: string
  image_api_key?: string
  guidelines?: string
  rag_chunk_size?: number
  rag_chunk_overlap?: number
  rag_top_k?: number
  rag_min_score?: number
  rag_rerank?: boolean
  updated_at?: string
}

export interface PostUsageRecord {
  id: string
  post_id?: string
  task_id?: string
  step: string
  provider: string
  model_name: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  cost_usd: number
  created_at: string
}

export interface PostUsageSummary {
  records: PostUsageRecord[]
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_cost_usd: number
}

export interface GlobalUsageSummary {
  total_cost_usd: number
  total_tokens: number
  posts_with_usage: number
  avg_cost_per_post: number
  by_model: { provider: string; model_name: string; total_tokens: number; cost_usd: number }[]
  by_step: { step: string; cost_usd: number }[]
}

export interface GenerateImageResponse {
  image_url: string
  cost_usd: number
}

export interface RagStatus {
  available: boolean
  error?: string
  database_url: string
  embedding_model: string
  vector_dim: number
}

export interface RagDocument {
  id: string
  title: string
  chunk_count: number
  embedding_model: string
  created_at: string
  preview?: string
}

export interface RagDocumentCreated {
  id: string
  title: string
  chunk_count: number
}

export * from './email';