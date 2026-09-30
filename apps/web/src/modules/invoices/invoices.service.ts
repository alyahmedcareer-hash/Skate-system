import api from '../../services/api'
import type { InvoiceData } from '../../components/printer/InvoicePrintTemplate'

export const invoicesService = {
  getRentalInvoice: async (id: number) => {
    const res = await api.get<{ success: boolean; data: InvoiceData }>(`/api/v1/invoices/rental/${id}`)
    return res.data
  },
  getSaleInvoice: async (id: number) => {
    const res = await api.get<{ success: boolean; data: InvoiceData }>(`/api/v1/invoices/sale/${id}`)
    return res.data
  }
}
