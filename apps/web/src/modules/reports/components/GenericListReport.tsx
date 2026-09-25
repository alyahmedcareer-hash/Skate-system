import { useEffect, useState } from 'react'
import { reportsApi } from '../reports.api'
import type { PaginatedResult } from '../reports.api'
import { Loader2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { formatCurrency } from '../../../utils/currency'
import { formatDateTime } from '../../../utils/date'

interface Props {
  type: string
  startDate: string
  endDate: string
}

export default function GenericListReport({ type, startDate, endDate }: Props) {
  const [data, setData] = useState<PaginatedResult<any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [type, startDate, endDate])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let res;
        const params = { startDate, endDate, page, limit: 10 }
        switch (type) {
          case 'revenue': res = await reportsApi.getRevenue(params); break;
          case 'rentals': res = await reportsApi.getRentals(params); break;
          case 'late': res = await reportsApi.getLate(params); break;
          case 'damage': res = await reportsApi.getDamage(params); break;
          case 'maintenance': res = await reportsApi.getMaintenance(params); break;
          case 'expenses': res = await reportsApi.getExpenses(params); break;
          case 'customers': res = await reportsApi.getCustomers(params); break;
          case 'cashiers': res = await reportsApi.getCashiers(params); break;
          case 'skates': res = await reportsApi.getSkates(params); break;
          default: throw new Error('تقرير غير معروف')
        }
        setData(res.data)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [type, startDate, endDate, page])

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500 gap-2">
        <AlertCircle className="w-8 h-8" />
        <p>{error}</p>
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2">
        <p>لا توجد بيانات لهذا التقرير في الفترة المحددة</p>
      </div>
    )
  }

  const columns = Object.keys(data.data[0]).filter(k => k !== 'id')

  const formatHeader = (key: string) => {
    const map: Record<string, string> = {
      amount: 'القيمة', totalAmount: 'القيمة الإجمالية', rentalAmount: 'قيمة الإيجارات',
      totalRevenue: 'إجمالي الإيرادات', totalSpent: 'إجمالي الإنفاق',
      startTime: 'وقت البدء', endTime: 'وقت الانتهاء', startedAt: 'وقت البدء',
      actualReturnTime: 'وقت الإرجاع الفعلي', reportedAt: 'وقت الإبلاغ',
      customerName: 'اسم العميل', skateCode: 'كود الزلاجة', cashierName: 'الكاشير',
      duration: 'المدة (دقيقة)', status: 'الحالة', type: 'النوع', category: 'الفئة',
      lateFee: 'غرامة التأخير', chargeAmount: 'قيمة التحصيل', repairCost: 'تكلفة الإصلاح',
      damageType: 'نوع الضرر', problemType: 'نوع المشكلة', description: 'الوصف',
      rentalsCount: 'عدد الإيجارات', damages: 'عدد الأضرار', maintenanceCount: 'مرات الصيانة',
      lateReturns: 'مرات التأخير', shiftsCount: 'عدد الورديات', totalDifference: 'العجز/الزيادة',
      completedAt: 'وقت الانتهاء', date: 'التاريخ'
    }
    return map[key] || key
  }

  const formatCell = (key: string, value: any) => {
    if (value === null || value === undefined) return '-'
    if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('spent') || key.toLowerCase().includes('fee') || key.toLowerCase().includes('revenue') || key === 'totalDifference') {
      return formatCurrency(Number(value))
    }
    if (key.toLowerCase().includes('time') || key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) {
      return formatDateTime(value)
    }
    return String(value)
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map(col => (
                <th key={col} className="px-4 py-3 font-semibold border-b border-slate-200">
                  {formatHeader(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.data.map((row, idx) => (
              <tr key={row.id || idx} className="hover:bg-slate-50/50 transition-colors">
                {columns.map(col => (
                  <td key={col} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {formatCell(col, row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-sm text-slate-500">
            صفحة {data.meta.page} من {data.meta.totalPages} (إجمالي {data.meta.total} سجل)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              disabled={page === data.meta.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
