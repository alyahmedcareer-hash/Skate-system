import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import {
  Badge,
  Alert,
  EmptyState,
  PageLoader,
  IconButton
} from '../../components/ui'
import { formatCurrency } from '../../utils/currency'
import { damageService, type DamageReportDTO } from './damage.service'
import { DamageReportModal } from './DamageReportModal'

export default function DamagesPage() {
  const [reports, setReports] = useState<DamageReportDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedReport, setSelectedReport] = useState<DamageReportDTO | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await damageService.list()
      setReports(res.data)
    } catch (err: unknown) {
      setError('تعذر تحميل تقارير الضرر')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRowClick = (report: DamageReportDTO) => {
    setSelectedReport(report)
    setModalOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge status="reserved">معلق</Badge>
      case 'partially_paid': return <Badge status="rented">مدفوع جزئياً</Badge>
      case 'paid': return <Badge status="completed">مسدد</Badge>
      case 'waived': return <Badge status="cancelled">معفى</Badge>
      default: return <Badge status="inactive">{status}</Badge>
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">تقارير الضرر</h1>
          <p className="page-subtitle">إدارة أضرار الزلاجات والرسوم المحصلة</p>
        </div>
        <IconButton
          icon={RefreshCw}
          label="تحديث"
          onClick={() => load()}
        />
      </div>

      {error && <Alert variant="danger" style={{ marginBottom: 24 }}>{error}</Alert>}

      {reports.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="لا توجد تقارير ضرر"
          description="لم يتم تسجيل أي تقارير ضرر للزلاجات حتى الآن."
        />
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم التقرير</th>
                <th>الزلاجة</th>
                <th>العميل</th>
                <th>رقم الإيجار</th>
                <th>الغرامة المقررة</th>
                <th>الرصيد المتبقي</th>
                <th>الحالة</th>
                <th>تاريخ التقرير</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => {
                const remaining = r.customerCharge - (r.chargeCollected + r.chargeWaived)
                return (
                  <tr key={r.id} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer' }}>
                    <td>#{r.id}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{r.skateCode || `ID: ${r.skateId}`}</td>
                    <td>{r.customerName || `ID: ${r.customerId}`}</td>
                    <td>#{r.rentalId}</td>
                    <td>{formatCurrency(r.customerCharge)}</td>
                    <td>
                      <span style={{ fontWeight: remaining > 0 ? 'var(--font-weight-bold)' : 'normal', color: remaining > 0 ? 'var(--color-danger-text)' : 'inherit' }}>
                        {formatCurrency(Math.max(0, remaining))}
                      </span>
                    </td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>
                      {new Date(r.createdAt).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedReport && (
        <DamageReportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          report={selectedReport}
          onSuccess={() => load()}
        />
      )}
    </div>
  )
}
