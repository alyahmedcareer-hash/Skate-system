import { api } from '../../services/api'
import type { DashboardDateRange, DashboardResponse } from './dashboard.types'

export const dashboardService = {
  getDashboardData: async (dateRange: DashboardDateRange): Promise<DashboardResponse> => {
    const qs = new URLSearchParams(dateRange as any).toString()
    return api.get<DashboardResponse>(`/api/v1/dashboard/kpis?${qs}`)
  },
}
