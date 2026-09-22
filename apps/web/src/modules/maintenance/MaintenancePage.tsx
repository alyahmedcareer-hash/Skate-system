import { useState, useEffect, useCallback } from 'react'
import { Wrench, Plus, RefreshCw } from 'lucide-react'
import { maintenanceService, type MaintenanceRecord } from './maintenance.service'
import MaintenanceRecordModal from './MaintenanceRecordModal'
import { useAuth } from '../../contexts/AuthContext'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { PageLoader } from '../../components/ui/Loading'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/FormFields'

export default function MaintenancePage() {
  const { hasPermission } = useAuth()
  
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<number | undefined>()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await maintenanceService.getMaintenanceRecords({ 
        status: statusFilter || undefined,
        limit: 100 // fetch up to 100 for now to simplify pagination handling like SkatesPage
      })
      setRecords(res.records || [])
    } catch (err: any) {
      console.error('Failed to load maintenance records:', err)
      setError(err?.response?.data?.error || 'حدث خطأ أثناء تحميل السجلات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openModal = (id?: number) => {
    setSelectedRecordId(id)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedRecordId(undefined)
  }

  const handleModalSave = () => {
    loadData()
    handleModalClose()
  }

  const renderStatus = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">معلق</Badge>
      case 'in_progress': return <Badge variant="info">قيد الصيانة</Badge>
      case 'completed': return <Badge variant="success">مكتمل</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">سجل الصيانة</h1>
        <div className="page-actions">
          <Button variant="secondary" onClick={loadData} aria-label="تحديث البيانات">
            <RefreshCw size={18} />
          </Button>
          {hasPermission('maintenance.create') && (
            <Button onClick={() => openModal()}>
              <Plus size={18} />
              <span className="hidden sm:inline">سجل جديد</span>
            </Button>
          )}
        </div>
      </div>

      <div className="filters-bar">
        <Select 
          id="statusFilter"
          label=""
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'كل الحالات' },
            { value: 'pending', label: 'معلق' },
            { value: 'in_progress', label: 'قيد الصيانة' },
            { value: 'completed', label: 'مكتمل' }
          ]}
        />
      </div>

      {error && (
        <Alert variant="danger" title="خطأ" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <PageLoader />
      ) : records.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="لا توجد سجلات صيانة"
          description={statusFilter ? "لم يتم العثور على سجلات تطابق الفلتر الحالي." : "لم يتم تسجيل أي عمليات صيانة بعد."}
        />
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>رقم السجل</th>
                <th>كود الزلاجة</th>
                <th>الحالة</th>
                <th>تاريخ الفتح</th>
                <th>الوصف</th>
                <th>إجمالي التكلفة</th>
                <th>المسؤول</th>
              </tr>
            </thead>
            <tbody>
              {records.map(record => (
                <tr 
                  key={record.id}
                  className="table-row-clickable"
                  onClick={() => openModal(record.id)}
                >
                  <td>#{record.id}</td>
                  <td className="font-medium text-gold-500">{record.skateCode}</td>
                  <td>{renderStatus(record.status)}</td>
                  <td>{new Date(record.createdAt).toLocaleDateString('ar-EG')}</td>
                  <td className="max-w-[200px] truncate">{record.problemDescription || '-'}</td>
                  <td>{record.totalCost} ج.م</td>
                  <td>{record.createdByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <MaintenanceRecordModal
          recordId={selectedRecordId}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  )
}
