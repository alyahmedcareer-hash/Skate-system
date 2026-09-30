import { api, type ApiResponse } from '../../services/api'

export interface Shift {
  id: number
  cashierId: number
  openedAt: string
  closedAt: string | null
  openingBalance: number
  expectedBalance: number | null
  actualBalance: number | null
  difference: number | null
  status: 'active' | 'closed'
}

export interface Expense {
  id: number
  amount: number
  description: string
  categoryId?: number
  cashierId: number
  shiftId: number
  createdAt: string
}

export const treasuryApi = {
  getCurrentShift: () => api.get<Shift | null>('/api/v1/shifts/current'),
  openShift: (data: { openingBalance: number }) => api.post<ApiResponse<Shift>>('/api/v1/shifts/open', data),
  closeShift: (id: number, data: { actualBalance: number; closedAt?: string }) => api.post<ApiResponse<Shift>>(`/api/v1/shifts/${id}/close`, data),
  
  getExpenses: () => api.get<ApiResponse<Expense[]>>('/api/v1/expenses'),
  recordExpense: (data: { amount: number; description: string; categoryId?: number }) => api.post<ApiResponse<Expense>>('/api/v1/expenses', data),
  getPaymentMethods: () => api.get<ApiResponse<any[]>>('/api/v1/payments/methods'),
}
