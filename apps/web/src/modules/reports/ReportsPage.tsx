import { useState } from 'react'
import {
  Calendar,
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

import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/FormFields'
import OverviewReport from './components/OverviewReport'
import FinancialReport from './components/FinancialReport'
import GenericListReport from './components/GenericListReport'
import { exportToCSV, exportToExcel, exportToPDF, fetchAllReportData } from './exportUtils'

// Tabs definition
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
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (activeTab === 'overview' || activeTab === 'financial') {
      alert('لا يمكن تصدير نظرة عامة أو النتيجة التشغيلية بصيغة جدول، برجاء اختيار تقرير مفصل.')
      return
    }
    
    setIsExporting(true)
    setShowExportMenu(false)
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
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">التقارير التحليلية</h1>
          <p className="text-slate-500 mt-2">عرض وتحليل الأداء والنتائج التشغيلية</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/60 shadow-sm">
            <Calendar className="w-5 h-5 text-slate-400" />
            <Input 
              id="start-date"
              label=""
              type="date" 
              value={startDate} 
              onChange={(e: any) => setStartDate(e.target.value)}
              className="border-none h-8 w-36 shadow-none focus:ring-0 text-sm"
            />
            <span className="text-slate-300">-</span>
            <Input 
              id="end-date"
              label=""
              type="date" 
              value={endDate} 
              onChange={(e: any) => setEndDate(e.target.value)}
              className="border-none h-8 w-36 shadow-none focus:ring-0 text-sm"
            />
          </div>
          <div className="relative">
            <Button onClick={() => setShowExportMenu(!showExportMenu)} variant="secondary" className="gap-2" disabled={isExporting}>
              <FileDown className="w-4 h-4" />
              {isExporting ? 'جاري التصدير...' : 'تصدير'}
            </Button>
            
            {showExportMenu && (
              <div className="absolute top-full mt-2 left-0 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={() => handleExport('excel')} className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm font-medium text-slate-700">تصدير Excel</button>
                <button onClick={() => handleExport('csv')} className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm font-medium text-slate-700">تصدير CSV</button>
                <button onClick={() => handleExport('pdf')} className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm font-medium text-slate-700">تصدير PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Tabs */}
        <div className="col-span-12 md:col-span-3 lg:col-span-2">
          <Card className="p-2 space-y-1 bg-white/50 backdrop-blur-md border-slate-200/50">
            {REPORT_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            ))}
          </Card>
        </div>

        {/* Report Content */}
        <div className="col-span-12 md:col-span-9 lg:col-span-10">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 min-h-[500px] animate-in fade-in zoom-in-95 duration-200">
            {activeTab === 'overview' && <OverviewReport startDate={startDate} endDate={endDate} />}
            {activeTab === 'financial' && <FinancialReport startDate={startDate} endDate={endDate} />}
            {activeTab !== 'overview' && activeTab !== 'financial' && (
              <GenericListReport type={activeTab} startDate={startDate} endDate={endDate} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
