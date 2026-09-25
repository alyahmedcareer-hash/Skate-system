export interface OpenShiftInput {
  openingBalance: number
}

export interface CloseShiftInput {
  actualBalance: number
}

export interface ShiftDTO {
  id: number
  cashierId: number
  cashierName?: string
  openedAt: string
  closedAt: string | null
  openingBalance: number
  expectedBalance: number | null
  actualBalance: number | null
  difference: number | null
  status: 'active' | 'closed'
}
