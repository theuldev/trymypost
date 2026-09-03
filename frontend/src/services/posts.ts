import { api } from './api'
import type {
  GeneratePostRequest,
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
} from '../types'

export const postsApi = {
  generate: (data: GeneratePostRequest) =>
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
    favorito?: boolean
  }) => api.get<PostHistoryListResponse>('/history', params),

  getDetail: (id: number) =>
    api.get<PostHistoryDetail>(`/history/${id}`),

  delete: (id: number) =>
    api.delete(`/history/${id}`),

  toggleFavorite: (id: number, data: ToggleFavoriteRequest) =>
    api.patch<PostHistoryBase>(`/history/${id}/favorite`, data),

  updateTags: (id: number, data: UpdateTagsRequest) =>
    api.patch<PostHistoryBase>(`/history/${id}/tags`, data),
}

export const topicsApi = {
  suggest: (data: SuggestTopicsRequest) =>
    api.post<SuggestTopicsResponse>('/topics/suggest', data),
}

export const codeApi = {
  fromPost: (data: CodeFromPostRequest) =>
    api.post<CodeFromPostResponse>('/code/from-post', data),
}

export const healthApi = {
  check: () => api.get<HealthResponse>('/health'),
}