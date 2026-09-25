import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { reportsApi } from './reports.api'

// removed unused fontUrl

export const exportToCSV = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export const exportToPDF = (data: any[], filename: string, title: string) => {
  const doc = new jsPDF('p', 'pt')
  // We just use a simple approach for PDF for now. If Arabic is needed, it requires a custom font.
  doc.text(title, 40, 40)
  
  if (data.length > 0) {
    const headers = Object.keys(data[0]).filter(k => k !== 'id')
    const rows = data.map(item => headers.map(h => {
      const val = item[h]
      if (typeof val === 'number') return val.toString()
      return val ? String(val) : '-'
    }))
    
    // @ts-ignore
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 60,
      styles: { font: 'helvetica', halign: 'right' } // Fallback to standard
    })
  }

  doc.save(`${filename}.pdf`)
}

// Map the report type to a full fetch
export const fetchAllReportData = async (type: string, startDate: string, endDate: string) => {
  const params = { startDate, endDate, page: 1, limit: 10000 } // Fetch up to 10k for export
  switch (type) {
    case 'revenue': return (await reportsApi.getRevenue(params)).data.data
    case 'rentals': return (await reportsApi.getRentals(params)).data.data
    case 'late': return (await reportsApi.getLate(params)).data.data
    case 'damage': return (await reportsApi.getDamage(params)).data.data
    case 'maintenance': return (await reportsApi.getMaintenance(params)).data.data
    case 'expenses': return (await reportsApi.getExpenses(params)).data.data
    case 'customers': return (await reportsApi.getCustomers(params)).data.data
    case 'cashiers': return (await reportsApi.getCashiers(params)).data.data
    case 'skates': return (await reportsApi.getSkates(params)).data.data
    default: return []
  }
}
