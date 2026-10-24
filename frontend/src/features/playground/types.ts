export interface PlaygroundGenerationResult {
  hashtags?: Array<{
    tag: string
    relevance: string
    estimated_volume?: string
  }>
  hooks?: Array<{
    type: string
    text: string
    why_it_works: string
  }>
  review?: {
    score?: number
    strengths?: string[]
    improvements?: string[]
    suggestions?: string[]
  }
  visual_suggestion?: any
  researched_topics?: string[]
  posts_data?: import('@/types').PostVariation[]
}

export type ResultTab = 'posts' | 'code' | 'hashtags' | 'hooks' | 'review' | 'visual'
