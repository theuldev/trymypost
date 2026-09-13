export type StyleEnum =
  | 'Technical'
  | 'Storytelling'
  | 'Opinion/Controversial'
  | 'Educational'
  | 'Career/Soft Skills'
  | 'Humor/Technology'
  | 'Minimalist'
  | 'Case Study'
  | 'Trends/News'
  | 'Personal/Autobiographical';

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
  topic: string
  style: string
  audience: string
  experience: string
  objective: string
  format: string
  include_code: boolean
  include_visual: boolean
  status: string
  is_favorite: boolean
  tags: string[]
  created_at: string
  updated_at: string
  completed_at?: string
  error_message?: string
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
