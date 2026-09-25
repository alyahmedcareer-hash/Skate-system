import { useState, useEffect } from 'react'
import { Landmark, ArrowDownToLine, LockOpen, Lock, Loader2, Plus } from 'lucide-react'
import { treasuryApi, type Shift, type Expense } from './treasury.api'
import { Button, Input, useToast, Card } from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'

export default function TreasuryPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('shifts.manage')
  const { showToast } = useToast()

  const [shift, setShift] = useState<Shift | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const [openingBalance, setOpeningBalance] = useState('')
  const [actualBalance, setActualBalance] = useState('')

  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseData, setExpenseData] = useState({ amount: '', description: '' })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const sRes = await treasuryApi.getCurrentShift()
      setShift(sRes.data)
      
      if (sRes.data && sRes.data.status === 'active') {
        const eRes = await treasuryApi.getExpenses()
        setExpenses(eRes.data)
      }
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.data?.error?.code === 'NOT_FOUND') {
        setShift(null)
      } else {
        showToast({ type: 'error', title: 'حدث خطأ أثناء تحميل الخزينة' })
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenShift(e: React.FormEvent) {
    e.preventDefault()
    if (!openingBalance) return
    try {
      await treasuryApi.openShift({ openingBalance: parseFloat(openingBalance) })
      showToast({ type: 'success', title: 'تم فتح الوردية بنجاح' })
      setOpeningBalance('')
      fetchData()
    } catch (err: any) {
      showToast({ type: 'error', title: err.response?.data?.error?.message || err.response?.data?.message || 'خطأ في فتح الوردية' })
    }
  }

  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault()
    if (!shift || !actualBalance) return
    try {
      await treasuryApi.closeShift(shift.id, { actualBalance: parseFloat(actualBalance) })
      showToast({ type: 'success', title: 'تم إغلاق الوردية بنجاح' })
      setActualBalance('')
      fetchData()
    } catch (err: any) {
      showToast({ type: 'error', title: err.response?.data?.error?.message || err.response?.data?.message || 'خطأ في إغلاق الوردية' })
    }
  }

  async function handleRecordExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!expenseData.amount || !expenseData.description) return
    try {
      await treasuryApi.recordExpense({
        amount: parseFloat(expenseData.amount),
        description: expenseData.description
      })
      showToast({ type: 'success', title: 'تم تسجيل المصروف بنجاح' })
      setShowExpenseForm(false)
      setExpenseData({ amount: '', description: '' })
      fetchData()
    } catch (err: any) {
      showToast({ type: 'error', title: err.response?.data?.error?.message || err.response?.data?.message || 'خطأ في تسجيل المصروف' })
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Landmark className="inline-block me-2" /> إدارة الخزينة</h1>
          <p className="page-subtitle">إدارة الورديات والمصروفات النثرية</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shift Management */}
        <Card>
          <div className="flex items-center gap-2 mb-4 text-xl font-bold">
            {shift?.status === 'active' ? <LockOpen className="text-green-500" /> : <Lock className="text-gray-400" />}
            <h2>حالة الوردية</h2>
          </div>
          
          {shift?.status === 'active' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">وقت الفتح</p>
                  <p className="font-semibold">{new Date(shift.openedAt).toLocaleString('ar-EG')}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">رصيد الافتتاح</p>
                  <p className="font-semibold text-lg">{shift.openingBalance} ج.م</p>
                </div>
              </div>

              {canManage && (
                <form onSubmit={handleCloseShift} className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <h3 className="font-bold text-red-700 mb-2">إغلاق الوردية</h3>
                  <div className="flex gap-2">
                    <Input
                      id="actualBalance"
                      label="الرصيد الفعلي"
                      type="number"
                      step="0.01"
                      required
                      placeholder="الرصيد الفعلي بالخزينة"
                      value={actualBalance}
                      onChange={(e) => setActualBalance(e.target.value)}
                    />
                    <Button type="submit" variant="danger" className="mt-6">إغلاق وتصفية</Button>
                  </div>
                  <p className="text-xs text-red-600 mt-2">
                    تنبيه: إغلاق الوردية سيقوم بحساب العجز/الزيادة بناءً على الرصيد الفعلي المدخل.
                  </p>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 text-center bg-gray-50 rounded-lg text-gray-500">
                لا توجد وردية نشطة حالياً. يجب فتح وردية لبدء استقبال الإيجارات والمبيعات.
              </div>
              
              {canManage && (
                <form onSubmit={handleOpenShift} className="flex gap-2">
                  <Input
                    id="openingBalance"
                    label="رصيد الافتتاح"
                    type="number"
                    step="0.01"
                    required
                    placeholder="رصيد الافتتاح (الكاش المتوفر)"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                  />
                  <Button type="submit" variant="primary" className="mt-6">فتح الوردية</Button>
                </form>
              )}
            </div>
          )}
        </Card>

        {/* Expenses */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xl font-bold">
              <ArrowDownToLine className="text-orange-500" />
              <h2>المصروفات النثرية</h2>
            </div>
            {shift?.status === 'active' && canManage && (
              <Button onClick={() => setShowExpenseForm(!showExpenseForm)} variant="secondary" size="sm">
                <Plus size={16} className="me-1" /> إضافة مصروف
              </Button>
            )}
          </div>

          {showExpenseForm && (
            <form onSubmit={handleRecordExpense} className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="space-y-3">
                <Input
                  id="expenseAmount"
                  label="المبلغ"
                  type="number"
                  step="0.01"
                  required
                  placeholder="المبلغ"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({...expenseData, amount: e.target.value})}
                />
                <Input
                  id="expenseDesc"
                  label="بيان المصروف"
                  type="text"
                  required
                  placeholder="بيان المصروف"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({...expenseData, description: e.target.value})}
                />
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" className="w-full">تسجيل</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowExpenseForm(false)}>إلغاء</Button>
                </div>
              </div>
            </form>
          )}

          {!shift || shift.status !== 'active' ? (
            <p className="text-gray-500 text-center py-4">يجب فتح وردية لتسجيل وعرض المصروفات.</p>
          ) : expenses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">لا توجد مصروفات مسجلة في هذه الوردية.</p>
          ) : (
            <div className="space-y-2">
              {expenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{exp.description}</p>
                    <p className="text-xs text-gray-500">{new Date(exp.createdAt).toLocaleTimeString('ar-EG')}</p>
                  </div>
                  <div className="font-bold text-red-600">
                    - {exp.amount} ج.م
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
