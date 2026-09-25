import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { formatCurrency } from '../../../utils/currency'
import { reportsApi } from '../reports.api'
import type { FinancialData } from '../reports.api'
import { Loader2, DollarSign, ArrowDownRight, ArrowUpRight, AlertCircle } from 'lucide-react'

interface Props {
  startDate: string
  endDate: string
}

export default function FinancialReport({ startDate, endDate }: Props) {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await reportsApi.getOperatingFinancial({ startDate, endDate })
        setData(res.data)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [startDate, endDate])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500 gap-2">
        <AlertCircle className="w-8 h-8" />
        <p>{error}</p>
      </div>
    )
  }

  const isPositiveResult = data.operatingResult >= 0

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className={`p-8 rounded-2xl border bg-gradient-to-br shadow-sm relative overflow-hidden ${
        isPositiveResult ? 'from-emerald-500 to-teal-600 border-emerald-600' : 'from-red-500 to-rose-600 border-red-600'
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-white/80 font-medium mb-1">النتيجة التشغيلية (Operating Result)</p>
            <h2 className="text-4xl font-bold text-white flex items-center gap-2">
              {formatCurrency(Math.abs(data.operatingResult))}
              {isPositiveResult ? (
                <ArrowUpRight className="w-8 h-8 text-emerald-100" />
              ) : (
                <ArrowDownRight className="w-8 h-8 text-red-100" />
              )}
            </h2>
          </div>
          <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
            <DollarSign className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
            تحليل الإيرادات
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="type" type="category" width={100} tick={{ fill: '#475569', fontSize: 13 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} name="الإيرادات" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5 text-red-500" />
            تحليل المصروفات
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.expensesByCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="category" type="category" width={100} tick={{ fill: '#475569', fontSize: 13 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24} name="المصروفات" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
