import api from '../../services/api'
import type { ApiResponse } from '../../services/api'

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface PaginatedParams extends DateRange {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface OverviewData {
  totalRevenue: number
  totalExpenses: number
  totalRentals: number
  activeRentals: number
  lateRentals: number
}

export interface FinancialData {
  revenue: number
  expenses: number
  operatingResult: number
  revenueByCategory: any[]
  expensesByCategory: any[]
}

function qs(params: any) {
  const q = new URLSearchParams()
  for (const k in params) {
    if (params[k] !== undefined && params[k] !== null) {
      q.append(k, String(params[k]))
    }
  }
  return `?${q.toString()}`
}

export const reportsApi = {
  getOverview: (params: DateRange) => 
    api.get<ApiResponse<OverviewData>>(`/api/v1/reports/overview${qs(params)}`),
    
  getOperatingFinancial: (params: DateRange) => 
    api.get<ApiResponse<FinancialData>>(`/api/v1/reports/operating-financial${qs(params)}`),
    
  getRevenue: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/revenue${qs(params)}`),
    
  getRentals: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/rentals${qs(params)}`),
    
  getLate: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/late${qs(params)}`),
    
  getDamage: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/damage${qs(params)}`),
    
  getMaintenance: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/maintenance${qs(params)}`),
    
  getExpenses: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/expenses${qs(params)}`),
    
  getCustomers: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/customers${qs(params)}`),
    
  getCashiers: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/cashiers${qs(params)}`),
    
  getSkates: (params: PaginatedParams) => 
    api.get<ApiResponse<PaginatedResult<any>>>(`/api/v1/reports/skates${qs(params)}`),
}
