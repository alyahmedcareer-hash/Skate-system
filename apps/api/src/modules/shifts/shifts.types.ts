export interface OpenShiftInput {
  openingBalance: number
}

export interface CloseShiftInput {
  actualBalance: number
  closedAt?: string // Optional explicit end time
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
