import { api, type ApiResponse } from '../../services/api'

export interface Notification {
  rentalId: number
  customer: { id: number; name: string }
  skate: { id: number; skateCode: string }
  expectedEndTime: string
  remainingTime: number
  type: 'ENDING_SOON' | 'EXPIRED'
  textAr: string
}

export const notificationsApi = {
  getNotifications: () => api.get<ApiResponse<Notification[]>>('/api/v1/notifications')
}
