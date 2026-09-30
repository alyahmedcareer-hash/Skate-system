import api from '../../services/api'

export interface AuditLogDTO {
  id: number
  userId: number
  userName: string
  action: string
  entityType: string
  entityId: string
  changes: Record<string, any>
  ipAddress: string
  userAgent: string
  createdAt: string
}

export interface AuditLogsResponse {
  data: AuditLogDTO[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export const auditApi = {
  getLogs: async (params?: Record<string, any>) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== '').reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
    ).toString() : ''
    return api.get<AuditLogsResponse>(`/api/v1/audit-logs${qs}`)
  },
}
