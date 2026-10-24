import { api } from './api'
import type {
  GeneratePostPayload,
  GeneratePostResponse,
  TaskStatusResponse,
  PostHistoryListResponse,
  PostHistoryDetail,
  PostHistoryBase,
  ToggleFavoriteRequest,
  UpdateTagsRequest,
  CodeFromPostRequest,
  CodeFromPostResponse,
  SuggestTopicsRequest,
  SuggestTopicsResponse,
  HealthResponse,
  PostEdit,
  CodePreset,
  AppSettings,
  UpdateEditorialStatusRequest,
  CalendarItem,
  PostUsageSummary,
  GlobalUsageSummary,
  GenerateImageResponse,
  RagStatus,
  RagDocument,
  RagDocumentCreated,
} from '../types'

export const postsApi = {
  generate: (data: GeneratePostPayload) =>
    api.post<GeneratePostResponse>('/posts/generate', data),

  getStatus: (taskId: string) =>
    api.get<TaskStatusResponse>(`/posts/generate/${taskId}`),

  cancel: (taskId: string) =>
    api.post(`/posts/generate/${taskId}/cancel`),

  list: (params?: {
    page?: number
    page_size?: number
    search?: string
    status?: string
    editorial_status?: string
    favorito?: boolean
    has_code?: boolean
    start_date?: string
    end_date?: string
    sort_by?: string
    sort_order?: string
  }) => api.get<PostHistoryListResponse>('/history', params),

  getDetail: (id: string) =>
    api.get<PostHistoryDetail>(`/history/${id}`),

  delete: (id: string) =>
    api.delete(`/history/${id}`),

  toggleFavorite: (id: string, data: ToggleFavoriteRequest) =>
    api.patch<PostHistoryBase>(`/history/${id}/favorite`, data),

  updateTags: (id: string, data: UpdateTagsRequest) =>
    api.patch<PostHistoryBase>(`/history/${id}/tags`, data),

  updateEditorialStatus: (id: string, data: UpdateEditorialStatusRequest) =>
    api.patch<PostHistoryBase>(`/history/${id}/editorial`, data),

  calendar: () => api.get<CalendarItem[]>('/calendar'),

  getUsage: (id: string) =>
    api.get<PostUsageSummary>(`/history/${id}/usage`),

  usageSummary: () =>
    api.get<GlobalUsageSummary>('/usage/summary'),

  generateImage: (id: string) =>
    api.post<GenerateImageResponse>(`/history/${id}/image`),

  saveEdit: (id: string, data: { post_index: number; content: string; original_content?: string }) =>
    api.post<PostEdit>(`/history/${id}/edits`, data),

  getEdits: (id: string) =>
    api.get<PostEdit[]>(`/history/${id}/edits`),
  
}

export const topicsApi = {
  suggest: (data: SuggestTopicsRequest) =>
    api.post<SuggestTopicsResponse>('/topics/suggest', data),
}

export const codeApi = {
  fromPost: (data: CodeFromPostRequest) =>
    api.post<CodeFromPostResponse>('/code/from-post', data),
}

export const codePresetsApi = {
  list: () => api.get<CodePreset[]>('/code-presets'),
  create: (data: Omit<CodePreset, 'id' | 'created_at'>) => api.post<CodePreset>('/code-presets', data),
  delete: (id: string) => api.delete(`/code-presets/${id}`),
}

export const settingsApi = {
  get: () => api.get<AppSettings>('/settings'),
  update: (data: Partial<AppSettings>) => api.put<AppSettings>('/settings', data),
}

export const healthApi = {
  check: () => api.get<HealthResponse>('/health'),
}

export const ragApi = {
  status: () => api.get<RagStatus>('/rag/status'),
  list: () => api.get<RagDocument[]>('/rag/documents'),
  create: (data: FormData) => api.post<RagDocumentCreated>('/rag/documents', data),
  delete: (id: string) => api.delete(`/rag/documents/${id}`),
}

export { emailApi } from './emails'