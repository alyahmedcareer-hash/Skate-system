import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Ticket, Pencil, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Alert,
  PageLoader,
  EmptyState,
  Select,
  useToast,
  type BadgeStatus,
} from '../../components/ui'
import {
  reservationsService,
  type Reservation,
  type ReservationStatus,
} from './reservations.service'
import { PermissionGate } from '../../components/PermissionGate'
import ReservationModal from './ReservationModal'

function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const statusToBadge: Record<ReservationStatus, BadgeStatus> = {
    pending:   'system',
    confirmed: 'reserved',
    fulfilled: 'completed',
    cancelled: 'cancelled',
  }
  const statusLabels: Record<ReservationStatus, string> = {
    pending:   'معلق',
    confirmed: 'مؤكد',
    fulfilled: 'منفذ',
    cancelled: 'ملغي',
  }
  return <Badge status={statusToBadge[status]}>{statusLabels[status]}</Badge>
}

export function ReservationsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [statusFilter, setStatusFilter] = useState<string>('active')
  
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queryStatus = statusFilter === 'all' ? undefined : (statusFilter as 'active' | ReservationStatus)
      const res = await reservationsService.getReservations({
        status: queryStatus,
        perPage: 50,
      })
      setReservations(res.data)
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل الحجوزات')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const handleCancel = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من إلغاء الحجز؟')) return
    try {
      await reservationsService.cancelReservation(id)
      showToast({ type: 'success', title: 'تم إلغاء الحجز بنجاح' })
      load()
    } catch (err: any) {
      showToast({ type: 'error', title: err.message || 'حدث خطأ' })
    }
  }

  const handleOpenCreate = () => {
    setEditingReservation(undefined)
    setModalOpen(true)
  }

  const handleOpenEdit = (res: Reservation) => {
    setEditingReservation(res)
    setModalOpen(true)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Calendar size={24} />
          <div>
            <h1 className="page-title">الحجوزات</h1>
            <p className="page-subtitle">إدارة الحجوزات (المرحلة 10)</p>
          </div>
        </div>
        
        <PermissionGate permission="reservations.create">
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus size={16} /> حجز جديد
          </Button>
        </PermissionGate>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 200 }}>
          <Select
            id="statusFilter"
            label=""
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: 'active', label: 'نشط (معلق / مؤكد)' },
              { value: 'pending', label: 'معلق' },
              { value: 'confirmed', label: 'مؤكد' },
              { value: 'fulfilled', label: 'منفذ' },
              { value: 'cancelled', label: 'ملغي' },
              { value: 'all', label: 'الكل' },
            ]}
          />
        </div>
      </div>

      {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="لا توجد حجوزات"
          description="لم يتم العثور على أي حجوزات تطابق البحث."
        />
      ) : (
        <div className="table-responsive">
          <table className="koshk-table">
            <thead>
              <tr>
                <th>رقم</th>
                <th>الزلاجة</th>
                <th>العميل</th>
                <th>من</th>
                <th>إلى</th>
                <th>الحالة</th>
                <th style={{ width: 140 }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(res => {
                const isActive = res.status === 'pending' || res.status === 'confirmed'
                const fromDate = new Date(res.reservedFrom).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
                const untilDate = new Date(res.reservedUntil).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
                
                return (
                  <tr key={res.id}>
                    <td>#{res.id}</td>
                    <td>{res.skate.skateCode} (مقاس {res.skate.size})</td>
                    <td>{res.customer.name} - {res.customer.phone}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{fromDate}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{untilDate}</td>
                    <td><ReservationStatusBadge status={res.status} /></td>
                    <td>
                      {isActive && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <PermissionGate permission="rentals.create">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => navigate(`/rentals/new?reservationId=${res.id}`)}
                              title="تنفيذ الإيجار"
                            >
                              <Ticket size={14} /> تنفيذ
                            </Button>
                          </PermissionGate>
                          
                          <PermissionGate permission="reservations.edit">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenEdit(res)}
                              title="تعديل"
                            >
                              <Pencil size={14} />
                            </Button>
                          </PermissionGate>
                          
                          <PermissionGate permission="reservations.cancel">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleCancel(res.id)}
                              title="إلغاء"
                            >
                              <XCircle size={14} />
                            </Button>
                          </PermissionGate>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ReservationModal
          onClose={() => setModalOpen(false)}
          onSaved={load}
          existingReservation={editingReservation}
        />
      )}
    </div>
  )
}
