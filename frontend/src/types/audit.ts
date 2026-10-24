export interface AuditLogItem {
  id: string
  event_type: string
  event_category: string
  action: string
  status: 'success' | 'pending' | 'failure' | (string & {})
  resource_type?: string | null
  resource_id?: string | null
  user_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  message?: string | null
  request_data?: Record<string, unknown> | null
  response_data?: Record<string, unknown> | null
  error_details?: Record<string, unknown> | null
  duration_ms?: string | null
  correlation_id?: string | null
  parent_event_id?: string | null
  created_at: string
}

export interface AuditLogListResponse {
  items: AuditLogItem[]
  total: number
  page: number
  page_size: number
}

export interface AuditLogFilters {
  page?: number
  page_size?: number
  event_type?: string
  event_category?: string
  resource_type?: string
  resource_id?: string
  status?: string
  start_date?: string
  end_date?: string
  correlation_id?: string
}

export interface AuditSummary {
  total_events: number
  by_category: Record<string, number>
  by_status: Record<string, number>
  by_event_type: Record<string, number>
}
