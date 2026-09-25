import { useState, useEffect } from 'react'
import { Landmark, ArrowDownToLine, LockOpen, Lock, Plus } from 'lucide-react'
import { treasuryApi, type Shift, type Expense } from './treasury.api'
import { Button, Input, useToast, Card, PageLoader } from '../../components/ui'
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
    return <PageLoader label="جارٍ تحميل بيانات الخزينة" />
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Landmark size={24} aria-hidden="true" style={{ color: 'var(--color-text-muted)' }} />
            إدارة الخزينة
          </h1>
          <p className="page-header-subtitle">إدارة الورديات والمصروفات النثرية</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
        {/* Shift Management */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' as any }}>
            {shift?.status === 'active' ? <LockOpen style={{ color: 'var(--color-success-500)' }} /> : <Lock style={{ color: 'var(--color-text-muted)' }} />}
            <h2>حالة الوردية</h2>
          </div>
          
          {shift?.status === 'active' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-page-bg)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>وقت الفتح</p>
                  <p style={{ fontWeight: 'var(--font-weight-semibold)' as any, margin: 0 }}>{new Date(shift.openedAt).toLocaleString('ar-EG')}</p>
                </div>
                <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-page-bg)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>رصيد الافتتاح</p>
                  <p style={{ fontWeight: 'var(--font-weight-semibold)' as any, fontSize: 'var(--font-size-lg)', margin: 0 }}>{shift.openingBalance} ج.م</p>
                </div>
              </div>

              {canManage && (
                <form onSubmit={handleCloseShift} style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-danger-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-danger-200)' }}>
                  <h3 style={{ fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-danger-700)', marginBottom: 'var(--space-2)' }}>إغلاق الوردية</h3>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
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
                    </div>
                    <Button type="submit" variant="danger">إغلاق وتصفية</Button>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger-600)', marginTop: 'var(--space-2)' }}>
                    تنبيه: إغلاق الوردية سيقوم بحساب العجز/الزيادة بناءً على الرصيد الفعلي المدخل.
                  </p>
                </form>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', backgroundColor: 'var(--color-page-bg)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)' }}>
                لا توجد وردية نشطة حالياً. يجب فتح وردية لبدء استقبال الإيجارات والمبيعات.
              </div>
              
              {canManage && (
                <form onSubmit={handleOpenShift} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
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
                  </div>
                  <Button type="submit" variant="primary">فتح الوردية</Button>
                </form>
              )}
            </div>
          )}
        </Card>

        {/* Expenses */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' as any }}>
              <ArrowDownToLine style={{ color: 'var(--color-warning-500)' }} />
              <h2>المصروفات النثرية</h2>
            </div>
            {shift?.status === 'active' && canManage && (
              <Button onClick={() => setShowExpenseForm(!showExpenseForm)} variant="secondary" size="sm">
                <Plus size={16} style={{ marginInlineEnd: 'var(--space-1)' }} /> إضافة مصروف
              </Button>
            )}
          </div>

          {showExpenseForm && (
            <form onSubmit={handleRecordExpense} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', backgroundColor: 'var(--color-warning-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-warning-200)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
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
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button type="submit" variant="primary" fullWidth>تسجيل</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowExpenseForm(false)}>إلغاء</Button>
                </div>
              </div>
            </form>
          )}

          {!shift || shift.status !== 'active' ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-4) 0', margin: 0 }}>يجب فتح وردية لتسجيل وعرض المصروفات.</p>
          ) : expenses.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-4) 0', margin: 0 }}>لا توجد مصروفات مسجلة في هذه الوردية.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {expenses.map(exp => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', backgroundColor: 'var(--color-page-bg)', borderRadius: 'var(--radius-lg)' }}>
                  <div>
                    <p style={{ fontWeight: 'var(--font-weight-semibold)' as any, margin: 0 }}>{exp.description}</p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', margin: 0 }}>{new Date(exp.createdAt).toLocaleTimeString('ar-EG')}</p>
                  </div>
                  <div style={{ fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-danger-600)' }}>
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
