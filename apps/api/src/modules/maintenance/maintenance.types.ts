export interface CreateMaintenanceRecordPayload {
  skateId: number
  inspectionId?: number
  damageReportId?: number
  problemDescription?: string
}

export interface UpdateMaintenanceRecordPayload {
  problemDescription?: string
  repairDescription?: string
  status?: 'pending' | 'in_progress' | 'completed'
}

export interface CompleteMaintenanceRecordPayload {
  repairDescription?: string
}

export interface AddMaintenancePartPayload {
  partName: string
  quantity: number
  unitCost: number
}
