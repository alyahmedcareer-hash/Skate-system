export interface DashboardDateRange {
  startDate: string
  endDate: string
}

export interface RecentSaleData {
  id: number
  customerName: string | null
  totalAmount: number
  status: string
  createdAt: string
  itemName: string | null
}

export interface FinancialKPIs {
  revenue: number
  expenses: number
  operatingResult: number
  collectedLateFees: number
  waivedLateFees: number
  damageCharges: number
  recentSales?: RecentSaleData[]
}

export interface OperationalKPIs {
  activeRentals: number
  lateRentals: number
  rentalsPeriod: number
  totalSkates: number
  skatesByStatus: Record<string, number>
  endingSoonRentals: Array<{
    id: number
    rentalCode: string
    customerName: string
    skateCode: string
    expectedEndAt: string
    startedAt: string
  }>
}

export interface ChartDataPoint {
  date: string
  total?: number
  count?: number
}

export interface SkateRentedDataPoint {
  skateCode: string
  count: number
}

export interface SkatePerformanceDataPoint {
  skateCode: string
  revenue: number
}

export interface DashboardResponse {
  success: boolean
  data: {
    kpis: FinancialKPIs & OperationalKPIs
    charts: {
      revenueOverTime?: ChartDataPoint[]
      expenses?: ChartDataPoint[]
      rentalVolume?: ChartDataPoint[]
      mostRentedSkates?: SkateRentedDataPoint[]
      skatePerformance?: SkatePerformanceDataPoint[]
    }
  }
}
