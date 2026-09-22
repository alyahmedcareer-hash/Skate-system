import api, { type ApiResponse } from '../../services/api'

export interface MaintenancePart {
  id: number
  maintenanceId: number
  partName: string
  quantity: number
  unitCost: string
  totalCost: string
}

export interface MaintenanceRecord {
  id: number
  skateId: number
  skateCode: string
  inspectionId: number | null
  damageReportId: number | null
  problemDescription: string | null
  repairDescription: string | null
  status: 'pending' | 'in_progress' | 'completed'
  laborCost: string
  partsCost: string
  totalCost: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  createdByName: string
  parts?: MaintenancePart[]
}

export interface ListMaintenanceRecordsQuery {
  status?: string
  skateId?: number
  page?: number
  limit?: number
}

export interface PaginatedMaintenanceRecords {
  records: MaintenanceRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

class MaintenanceService {
  async getMaintenanceRecords(params?: ListMaintenanceRecordsQuery): Promise<PaginatedMaintenanceRecords> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.skateId) searchParams.append('skateId', String(params.skateId))
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    
    const query = searchParams.toString()
    const path = `/api/v1/maintenance${query ? `?${query}` : ''}`
    
    const response = await api.get<PaginatedMaintenanceRecords>(path)
    return response as any // Some API routes might wrap in { data } depending on the backend, but backend sends { success: true, records, pagination } for list?
    // Wait, backend listRecords returns { records, pagination } directly wrapped in { success: true, ...result }
  }

  async getMaintenanceRecord(id: number): Promise<MaintenanceRecord> {
    const response = await api.get<ApiResponse<MaintenanceRecord>>(`/api/v1/maintenance/${id}`)
    return response.data
  }

  async createMaintenanceRecord(payload: { skateId: number; problemDescription?: string }): Promise<MaintenanceRecord> {
    const response = await api.post<ApiResponse<MaintenanceRecord>>('/api/v1/maintenance', payload)
    return response.data
  }

  async updateMaintenanceRecord(
    id: number,
    payload: { laborCost?: number; problemDescription?: string; repairDescription?: string; status?: 'pending' | 'in_progress' }
  ): Promise<MaintenanceRecord> {
    const response = await api.patch<ApiResponse<MaintenanceRecord>>(`/api/v1/maintenance/${id}`, payload)
    return response.data
  }

  async addMaintenancePart(
    id: number,
    payload: { partName: string; quantity: number; unitCost: number }
  ): Promise<MaintenanceRecord> {
    const response = await api.post<ApiResponse<MaintenanceRecord>>(`/api/v1/maintenance/${id}/parts`, payload)
    return response.data
  }

  async removeMaintenancePart(recordId: number, partId: number): Promise<MaintenanceRecord> {
    const response = await api.delete<ApiResponse<MaintenanceRecord>>(`/api/v1/maintenance/${recordId}/parts/${partId}`)
    return response.data
  }

  async completeMaintenanceRecord(
    id: number,
    payload: { repairDescription: string }
  ): Promise<MaintenanceRecord> {
    const response = await api.post<ApiResponse<MaintenanceRecord>>(`/api/v1/maintenance/${id}/complete`, payload)
    return response.data
  }
}

export const maintenanceService = new MaintenanceService()
