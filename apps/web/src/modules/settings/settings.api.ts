import { api, type ApiResponse } from '../../services/api'

export interface AppSettings {
  print_invoices_enabled?: boolean
  notification_sound_enabled?: boolean
  rental_hourly_rate?: number
  rental_duration_options?: number[]
  late_fee_per_minute?: number
}

export const settingsApi = {
  getSettings: () => api.get<ApiResponse<AppSettings>>('/api/v1/settings'),
  updateSettings: (data: Partial<AppSettings>) => api.patch<ApiResponse<AppSettings>>('/api/v1/settings', data)
}
