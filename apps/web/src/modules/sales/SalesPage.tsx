import { useState, useEffect } from 'react'
import { ListOrdered, Loader2, Ban, Eye, X } from 'lucide-react'
import { salesApi, type Sale } from './sales.api'
import { Button, SearchBar, useToast } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'

function formatDate(isoString: string) {
  const d = new Date(isoString)
  return new Intl.DateTimeFormat('ar-EG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d)
}

export default function SalesPage() {
  const { hasPermission } = useAuth()
  const canCancel = hasPermission('sales.cancel')
  const { showToast } = useToast()

  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [selectedSaleData, setSelectedSaleData] = useState<Sale | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    fetchSales()
  }, [])

  async function fetchSales() {
    try {
      setLoading(true)
      const res = await salesApi.getSales()
      setSales(res.data)
    } catch {
      showToast({ type: 'error', title: 'حدث خطأ أثناء تحميل سجل المبيعات' })
    } finally {
      setLoading(false)
    }
  }

  async function handleViewDetails(id: number) {
    setSelectedSaleId(id)
    setSelectedSaleData(null)
    setLoadingDetails(true)
    try {
      const res = await salesApi.getSale(id)
      setSelectedSaleData(res.data)
    } catch {
      showToast({ type: 'error', title: 'تعذر تحميل تفاصيل الفاتورة' })
      setSelectedSaleId(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  async function handleCancelSale(id: number) {
    if (!confirm('هل أنت متأكد من إلغاء هذه الفاتورة واسترجاع المخزون؟')) return
    try {
      await salesApi.cancelSale(id)
      showToast({ type: 'success', title: 'تم إلغاء الفاتورة بنجاح' })
      fetchSales()
      if (selectedSaleId === id) handleViewDetails(id)
    } catch (err: any) {
      showToast({ type: 'error', title: err.response?.data?.error?.message || 'خطأ في الإلغاء' })
    }
  }

  const filteredSales = sales.filter(s => s.saleCode.toLowerCase().includes(search.toLowerCase()))

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header"><div className="page-header-text"><h1 className="page-header-title">سجل المبيعات</h1></div></div>
        <div className="flex items-center justify-center p-8 text-neutral-400">
          <Loader2 className="animate-spin" size={24} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header"><div className="page-header-text"><h1 className="page-header-title">سجل المبيعات</h1></div></div>

      <div className="card p-4 mb-4 bg-neutral-50 flex items-center gap-4">
        <div className="flex-1 max-w-md relative">
          <SearchBar
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="البحث برقم الفاتورة..."
          />
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ والوقت</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th className="text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-neutral-400">لا توجد مبيعات</td>
                </tr>
              ) : filteredSales.map(sale => (
                <tr key={sale.id} className={sale.status === 'cancelled' ? 'opacity-70 bg-neutral-50' : ''}>
                  <td className="font-semibold text-navy-800">{sale.saleCode}</td>
                  <td>{formatDate(sale.createdAt)}</td>
                  <td className="font-bold">{sale.totalAmount} ج.م</td>
                  <td>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${sale.status === 'completed' ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'}`}>
                      {sale.status === 'completed' ? 'مكتمل' : 'ملغى'}
                    </span>
                  </td>
                  <td className="text-left flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(sale.id)} title="التفاصيل">
                      <Eye size={16} />
                    </Button>
                    {canCancel && sale.status === 'completed' && (
                      <Button variant="ghost" size="sm" className="text-danger-500 hover:text-danger-700 hover:bg-danger-50" onClick={() => handleCancelSale(sale.id)} title="إلغاء الفاتورة">
                        <Ban size={16} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedSaleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-navy-800 text-white rounded-t-lg">
              <h3 className="font-semibold flex items-center gap-2"><ListOrdered size={18}/> تفاصيل الفاتورة</h3>
              <button onClick={() => setSelectedSaleId(null)} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {loadingDetails ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-navy-500" size={32} /></div>
              ) : selectedSaleData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500">رقم الفاتورة</p>
                      <p className="font-semibold">{selectedSaleData.saleCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">التاريخ</p>
                      <p className="font-semibold">{formatDate(selectedSaleData.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">الحالة</p>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${selectedSaleData.status === 'completed' ? 'bg-success-100 text-success-800' : 'bg-danger-100 text-danger-800'}`}>
                        {selectedSaleData.status === 'completed' ? 'مكتمل' : 'ملغى'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">الإجمالي</p>
                      <p className="font-bold text-gold-600 text-lg">{selectedSaleData.totalAmount} ج.م</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 border-b border-border pb-1">عناصر الفاتورة</h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-neutral-500 text-right">
                          <th className="py-2">رقم المنتج</th>
                          <th className="py-2">السعر</th>
                          <th className="py-2 text-center">الكمية</th>
                          <th className="py-2 text-left">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSaleData.items?.map(item => (
                          <tr key={item.id} className="border-t border-neutral-100">
                            <td className="py-2">ID: {item.productId}</td>
                            <td className="py-2">{item.unitPrice} ج.م</td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-left font-semibold">{item.totalPrice} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 border-b border-border pb-1">المدفوعات</h4>
                    <div className="flex gap-2 flex-wrap">
                      {selectedSaleData.payments?.map(p => (
                        <span key={p.id} className="bg-neutral-100 border border-neutral-200 px-3 py-1 rounded text-sm font-semibold text-navy-800">
                          {p.amount} ج.م
                        </span>
                      ))}
                    </div>
                  </div>

                  {canCancel && selectedSaleData.status === 'completed' && (
                    <div className="pt-4 border-t border-border flex justify-end">
                      <Button variant="danger" onClick={() => handleCancelSale(selectedSaleData.id)}>
                        <Ban size={16} className="mr-2" />
                        إلغاء الفاتورة واسترجاع المخزون
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-neutral-500">لا توجد بيانات</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
