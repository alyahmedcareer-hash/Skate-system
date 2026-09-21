/**
 * KOSHK SKATE ERP — Rentals List Page
 * Phase 05 — Rental POS Core
 *
 * Paginated list of all rentals (active, returned, cancelled).
 * Entry point for the /rentals route.
 * Links to:
 *   - Rental POS (/rentals/new)
 *   - Active Rentals (/rentals/active)
 *   - Rental Detail (/rentals/:id)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket, Plus, Eye, Clock } from 'lucide-react'
import {
  Badge,
  Alert,
  EmptyState,
  PageLoader,
  Button,
  IconButton,
  Pagination,
} from '../../components/ui'
import { PermissionGate } from '../../components/PermissionGate'
import {
  rentalsService,
  type RentalDTO,
  getRentalStatusLabel,
  lifetimeStatusToBadge,
} from './rentals.service'
import { formatCurrency } from '../../utils/currency'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('ar-EG', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function RentalsPage() {
  const navigate = useNavigate()

  const [rentals, setRentals]     = useState<RentalDTO[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]         = useState(0)
  const [statusFilter, setStatus] = useState<string>('')

  const perPage = 20

  const load = useCallback(async (p: number, status: string) => {
    setLoading(true); setError(null)
    try {
      const params: Record<string, any> = { page: p, perPage }
      if (status) params.status = status
      const res = await rentalsService.list(params)
      setRentals(res.data ?? [])
      setTotal(res.pagination.total)
      setTotalPages(res.pagination.totalPages)
    } catch {
      setError('تعذر تحميل الإيجارات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page, statusFilter) }, [load, page, statusFilter])

  const handleStatusChange = (s: string) => { setStatus(s); setPage(1) }

  if (loading && rentals.length === 0) return <PageLoader />

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Ticket size={24} style={{ display: 'inline', marginInlineEnd: 8 }} />
            الإيجارات
          </h1>
          <p className="page-subtitle">{total} إيجار إجمالاً</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            id="go-active-rentals"
            variant="ghost"
            onClick={() => navigate('/rentals/active')}
          >
            <Clock size={16} /> النشطة
          </Button>
          <PermissionGate permission="rentals.create">
            <Button id="new-rental-btn" variant="primary" onClick={() => navigate('/rentals/new')}>
              <Plus size={16} /> إيجار جديد
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Status filter */}
      <div style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { value: '', label: 'الكل' },
          { value: 'active', label: 'نشط' },
          { value: 'returned', label: 'مُعاد' },
          { value: 'cancelled', label: 'ملغي' },
        ].map(opt => (
          <button
            key={opt.value}
            id={`filter-status-${opt.value || 'all'}`}
            type="button"
            onClick={() => handleStatusChange(opt.value)}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${statusFilter === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: statusFilter === opt.value ? 'var(--color-primary)' : 'var(--color-surface)',
              color: statusFilter === opt.value ? 'white' : 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <Alert variant="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

      {!loading && rentals.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="لا توجد إيجارات"
          description={statusFilter ? 'لا توجد إيجارات بهذه الحالة' : 'لم يتم تسجيل أي إيجار بعد'}
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/rentals/new')}>
              إيجار جديد
            </Button>
          }
        />
      ) : (
        <>
          {/* Rentals Table */}
          <div className="rentals-table-wrap">
            <table className="rentals-table" role="table" aria-label="قائمة الإيجارات">
              <thead>
                <tr>
                  <th>كود الإيجار</th>
                  <th>العميل</th>
                  <th>الزلاجة</th>
                  <th>المدة</th>
                  <th>المبلغ</th>
                  <th>البداية</th>
                  <th>الحالة</th>
                  <th aria-label="إجراءات" />
                </tr>
              </thead>
              <tbody>
                {rentals.map(r => (
                  <tr key={r.id} id={`rental-row-${r.id}`}>
                    <td style={{ fontWeight: 'var(--font-weight-bold)' }}>{r.rentalCode}</td>
                    <td>{r.customer.name}</td>
                    <td>{r.skate.skateCode} / {r.skate.size}</td>
                    <td>{r.durationMinutes} د</td>
                    <td>{formatCurrency(r.rentalAmount)}</td>
                    <td dir="ltr">{formatDateTime(r.startedAt)}</td>
                    <td>
                      <Badge status={lifetimeStatusToBadge(r.status)}>
                        {getRentalStatusLabel(r.status)}
                      </Badge>
                    </td>
                    <td>
                      <IconButton
                        icon={Eye}
                        label="عرض التفاصيل"
                        onClick={() => navigate(`/rentals/${r.id}`)}
                        size="sm"
                        variant="ghost"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      <style>{`
        .rentals-table-wrap {
          overflow-x: auto;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
        }
        .rentals-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--font-size-sm);
        }
        .rentals-table th {
          padding: 12px 16px;
          background: var(--color-surface-raised);
          color: var(--color-text-secondary);
          font-weight: var(--font-weight-bold);
          text-align: right;
          border-bottom: 1px solid var(--color-border);
          white-space: nowrap;
        }
        .rentals-table td {
          padding: 12px 16px;
          color: var(--color-text-primary);
          border-bottom: 1px solid var(--color-border-subtle);
          vertical-align: middle;
        }
        .rentals-table tr:last-child td { border-bottom: none; }
        .rentals-table tr:hover td { background: var(--color-surface-raised); }
      `}</style>
    </div>
  )
}
