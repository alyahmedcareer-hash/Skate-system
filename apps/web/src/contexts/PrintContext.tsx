import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { InvoicePrintTemplate } from '../components/printer/InvoicePrintTemplate'
import type { InvoiceData } from '../components/printer/InvoicePrintTemplate'
import { api } from '../services/api'

interface PrintContextType {
  printInvoice: (data: InvoiceData) => void
}

const PrintContext = createContext<PrintContextType | undefined>(undefined)

export const usePrint = () => {
  const ctx = useContext(PrintContext)
  if (!ctx) throw new Error('usePrint must be used within a PrintProvider')
  return ctx
}

export const PrintProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [printData, setPrintData] = useState<InvoiceData | null>(null)
  const [printEnabled, setPrintEnabled] = useState(true)

  useEffect(() => {
    // Fetch settings on mount
    api.get<{ data: any }>('/api/v1/settings')
      .then((res) => {
        if (res.data?.print_invoices_enabled !== undefined) {
          setPrintEnabled(res.data.print_invoices_enabled)
        }
      })
      .catch(() => {})
  }, [])

  const printInvoice = useCallback((data: InvoiceData) => {
    if (!printEnabled) return // Do not print if disabled

    setPrintData(data)
    // Small delay to allow React to render the print template into the DOM
    setTimeout(() => {
      window.print()
      // Optional: clear data after print dialog closes
      // setPrintData(null)
    }, 100)
  }, [printEnabled])

  return (
    <PrintContext.Provider value={{ printInvoice }}>
      {children}
      {/* Hidden print root */}
      <div id="print-root">
        <InvoicePrintTemplate data={printData} />
      </div>
    </PrintContext.Provider>
  )
}
