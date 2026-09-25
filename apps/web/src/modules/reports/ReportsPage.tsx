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

  const activeTabInfo = REPORT_TABS.find(t => t.id === activeTab)

  return (
    <div className="page-container flex flex-col h-full">
      <div className="page-header shrink-0">
        <div className="page-header-text">
          <h1 className="page-header-title">التقارير التحليلية</h1>
          <p className="page-header-subtitle">عرض وتحليل الأداء والنتائج التشغيلية</p>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-56 shrink-0 flex flex-col overflow-y-auto">
          <div className="flex md:flex-col overflow-x-auto md:overflow-visible gap-1 pb-2 md:pb-0 scrollbar-hide">
          {REPORT_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium whitespace-nowrap
                  ${isActive 
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                <tab.icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full">
        
        {/* Header Controls */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-5 border-b border-slate-100 gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              {activeTabInfo && <activeTabInfo.icon size={20} />}
            </div>
            <h2 className="text-lg font-semibold text-slate-800">{activeTabInfo?.label}</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
              <div className="w-36">
                <Input 
                  id="start-date"
                  type="date" 
                  label=""
                  value={startDate} 
                  onChange={(e: any) => setStartDate(e.target.value)}
                  className="h-9 text-sm border-none shadow-none focus:ring-0"
                />
              </div>
              <span className="text-slate-300">|</span>
              <div className="w-36">
                <Input 
                  id="end-date"
                  type="date" 
                  label=""
                  value={endDate} 
                  onChange={(e: any) => setEndDate(e.target.value)}
                  className="h-9 text-sm border-none shadow-none focus:ring-0"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleExport('excel')} disabled={isExporting} className="h-10 px-3 bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                <FileDown size={16} className="ml-2 text-green-600" />
                Excel
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleExport('csv')} disabled={isExporting} className="h-10 px-3 bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                <FileDown size={16} className="ml-2 text-blue-600" />
                CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting} className="h-10 px-3 bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                <FileDown size={16} className="ml-2 text-red-600" />
                PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Report Canvas */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50/20">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && <OverviewReport startDate={startDate} endDate={endDate} />}
            {activeTab === 'financial' && <FinancialReport startDate={startDate} endDate={endDate} />}
            {activeTab !== 'overview' && activeTab !== 'financial' && (
              <GenericListReport type={activeTab} startDate={startDate} endDate={endDate} />
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
