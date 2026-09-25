import { useState } from 'react'
import {
  FileDown,
  PieChart,
  TrendingUp,
  CreditCard,
  User,
  Wrench,
  AlertTriangle,
  Clock,
  Package
} from 'lucide-react'
import { format, subDays } from 'date-fns'

import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/FormFields'
import OverviewReport from './components/OverviewReport'
import FinancialReport from './components/FinancialReport'
import GenericListReport from './components/GenericListReport'
import { exportToCSV, exportToExcel, exportToPDF, fetchAllReportData } from './exportUtils'

const REPORT_TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: PieChart },
  { id: 'financial', label: 'النتيجة التشغيلية', icon: TrendingUp },
  { id: 'revenue', label: 'الإيرادات', icon: CreditCard },
  { id: 'rentals', label: 'الإيجارات', icon: Clock },
  { id: 'late', label: 'المتأخرات', icon: AlertTriangle },
  { id: 'damage', label: 'الأضرار', icon: Wrench },
  { id: 'maintenance', label: 'الصيانة', icon: Wrench },
  { id: 'expenses', label: 'المصروفات', icon: CreditCard },
  { id: 'customers', label: 'العملاء', icon: User },
  { id: 'cashiers', label: 'الكاشير', icon: User },
  { id: 'skates', label: 'أداء الزلاجات', icon: Package },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (activeTab === 'overview' || activeTab === 'financial') {
      alert('لا يمكن تصدير نظرة عامة أو النتيجة التشغيلية بصيغة جدول، برجاء اختيار تقرير مفصل.')
      return
    }
    
    setIsExporting(true)
    try {
      const data = await fetchAllReportData(activeTab, startDate, endDate)
      if (data.length === 0) {
        alert('لا توجد بيانات للتصدير')
        return
      }
      
      const filename = `report_${activeTab}_${startDate}_${endDate}`
      if (format === 'csv') exportToCSV(data, filename)
      else if (format === 'excel') exportToExcel(data, filename)
      else if (format === 'pdf') exportToPDF(data, filename, REPORT_TABS.find(t => t.id === activeTab)?.label || 'تقرير')
      
    } catch (e: any) {
      alert('حدث خطأ أثناء التصدير: ' + e.message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="page-container flex flex-col h-full">
      <div className="page-header shrink-0">
        <div className="page-header-text">
          <h1 className="page-header-title">التقارير التحليلية</h1>
          <p className="text-sm text-neutral-500 mt-1">عرض وتحليل الأداء والنتائج التشغيلية</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-lg border border-border shadow-sm">
        {REPORT_TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="shrink-0"
          >
            <tab.icon size={16} className="ml-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 bg-white p-4 rounded-lg border border-border shadow-sm shrink-0">
        <div className="flex flex-wrap items-end gap-4 flex-1">
          <div className="w-40">
            <Input 
              id="start-date"
              label="من تاريخ"
              type="date" 
              value={startDate} 
              onChange={(e: any) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Input 
              id="end-date"
              label="إلى تاريخ"
              type="date" 
              value={endDate} 
              onChange={(e: any) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => handleExport('excel')} disabled={isExporting}>
            <FileDown size={16} className="ml-2" />
            Excel
          </Button>
          <Button variant="secondary" onClick={() => handleExport('csv')} disabled={isExporting}>
            <FileDown size={16} className="ml-2" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => handleExport('pdf')} disabled={isExporting}>
            <FileDown size={16} className="ml-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-lg border border-border p-4 shadow-sm overflow-auto">
        {activeTab === 'overview' && <OverviewReport startDate={startDate} endDate={endDate} />}
        {activeTab === 'financial' && <FinancialReport startDate={startDate} endDate={endDate} />}
        {activeTab !== 'overview' && activeTab !== 'financial' && (
          <GenericListReport type={activeTab} startDate={startDate} endDate={endDate} />
        )}
      </div>
    </div>
  )
}
