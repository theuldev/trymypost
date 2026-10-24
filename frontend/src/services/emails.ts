import { api } from './api'
import type {
  UserProfile,
  GenerateEmailRequest,
  GenerateEmailResponse,
  TaskStatusResponse,
  EmailGenerationResult,
  EmailGenerationHistoryItem,
  EmailGenerationHistoryResponse,
} from '../types'

export const emailApi = {
  getProfile: () => api.get<UserProfile>('/profile'),
  updateProfile: (data: Partial<UserProfile>) => api.put<UserProfile>('/profile', data),
  generate: (data: GenerateEmailRequest) => api.post<GenerateEmailResponse>('/emails/generate', data),
  getStatus: (taskId: string) => api.get<TaskStatusResponse>(`/emails/generate/${taskId}`),
  cancel: (taskId: string) => api.post(`/emails/generate/${taskId}/cancel`),
  listHistory: (params?: { page?: number; page_size?: number; search?: string }) =>
    api.get<EmailGenerationHistoryResponse>('/emails/history', params),
  getDetail: (id: string) => api.get<EmailGenerationResult>(`/emails/history/${id}`),
  updateBody: (id: string, body: string) => api.patch<EmailGenerationResult>(`/emails/history/${id}`, { body }),
  delete: (id: string) => api.delete(`/emails/history/${id}`),
}