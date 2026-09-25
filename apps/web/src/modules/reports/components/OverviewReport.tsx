import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { formatCurrency } from '../../../utils/currency'
import { reportsApi } from '../reports.api'
import type { OverviewData } from '../reports.api'
import { Loader2, TrendingUp, TrendingDown, Clock, Package, AlertCircle } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

interface Props {
  startDate: string
  endDate: string
}

export default function OverviewReport({ startDate, endDate }: Props) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await reportsApi.getOverview({ startDate, endDate })
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

  const statCards = [
    { title: 'إجمالي الإيرادات', value: formatCurrency(data.totalRevenue), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'إجمالي المصروفات', value: formatCurrency(data.totalExpenses), icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
    { title: 'إجمالي الإيجارات', value: data.totalRentals.toString(), icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: 'الإيجارات النشطة', value: data.activeRentals.toString(), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  ]

  const pieData = [
    { name: 'إيجارات نشطة', value: data.activeRentals },
    { name: 'إيجارات متأخرة', value: data.lateRentals },
    { name: 'إيجارات مكتملة', value: data.totalRentals - data.activeRentals - data.lateRentals }
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="p-5 rounded-2xl border border-slate-100 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-20 transition-transform group-hover:scale-150 duration-500 ${stat.bg}`}></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
              </div>
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">حالة الإيجارات</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#334155', fontWeight: 500 }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-100 shadow-sm bg-white">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">الإيرادات مقابل المصروفات</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'المقارنة المالية', الايرادات: data.totalRevenue, المصروفات: data.totalExpenses }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val} ج`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="الايرادات" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="المصروفات" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
