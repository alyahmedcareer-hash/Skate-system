export interface DateRangeInput {
  startDate: string
  endDate: string
  page: number
  limit: number
}

export interface OverviewReportDTO {
  totalRevenue: number
  totalRentals: number
  activeRentals: number
  lateRentals: number
  totalExpenses: number
  totalDamages: number
  activeMaintenance: number
}

export interface OperatingFinancialReportDTO {
  rentalRevenue: number
  lateFees: number
  damageCharges: number
  salesRevenue: number
  totalRevenue: number
  totalExpenses: number
  operatingResult: number
}

export interface ChartDataPoint {
  date: string
  value: number
}

export interface RevenueReportDTO {
  totalRevenue: number
  chartData: ChartDataPoint[]
}

export interface ExpenseReportDTO {
  totalExpenses: number
  chartData: ChartDataPoint[]
  byCategory: Array<{ category: string, total: number }>
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

// Simplified DTOs for the list endpoints
export interface ReportRentalDTO {
  id: number
  customerName: string | null
  skateCode: string | null
  duration: number
  amount: number
  startTime: string
  endTime: string
  status: string
  cashierName: string | null
}

export interface ReportSkatePerformanceDTO {
  id: number
  code: string
  type: string | null
  rentalsCount: number
  rentalRevenue: number
  maintenanceCount: number
  maintenanceCost: number
  damageCount: number
  status: string
}

export interface ReportLateDTO {
  id: number
  customerName: string | null
  skateCode: string | null
  startTime: string
  endTime: string
  actualReturnTime: string | null
  lateFee: number
}

export interface ReportDamageDTO {
  id: number
  skateCode: string | null
  customerName: string | null
  damageType: string
  chargeAmount: number
  repairCost: number
  reportedAt: string
}

export interface ReportMaintenanceDTO {
  id: number
  skateCode: string | null
  problemType: string
  status: string
  repairCost: number
  startedAt: string
  completedAt: string | null
}

export interface ReportCustomerDTO {
  id: number
  name: string
  rentalsCount: number
  totalSpent: number
  lateReturns: number
  damages: number
}

export interface ReportCashierDTO {
  id: number
  name: string
  rentalsCount: number
  revenue: number
  lateFees: number
  expenses: number
  shiftDifference: number
}

