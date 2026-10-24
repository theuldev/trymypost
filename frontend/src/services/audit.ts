import { api } from './api'
import type { AuditLogListResponse, AuditLogFilters, AuditSummary } from '../types/audit'

export const auditApi = {
  listLogs: (params?: AuditLogFilters) => api.get<AuditLogListResponse>('/audit/logs', params),
  getLog: (id: string) => api.get<AuditLogListResponse['items'][number]>(`/audit/logs/${id}`),
  getSummary: () => api.get<AuditSummary>('/audit/summary'),
}
