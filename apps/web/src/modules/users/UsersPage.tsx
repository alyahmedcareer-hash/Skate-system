/**
 * KOSHK SKATE ERP — Users Management Page
 * Phase 03.5 — Design System (updated from Phase 02)
 *
 * Changes from Phase 02:
 *   - confirm() replaced with ConfirmDialog (OD-004 / UI-005)
 *   - alert() replaced with useToast() (OD-004 / UI-005)
 *   - Native table replaced with DataTable component (UI-002)
 *   - Page-level error uses Alert component (UI-002)
 *   - Loading state uses PageLoader (UI-002)
 *   - Action buttons use Button component (UI-002)
 *   - Status badges use Badge component with correct semantic tokens (DEC-034)
 *   - Create User modal uses Modal component (UI-002)
 *   - Hardcoded status color tokens corrected (--color-success vs --color-success-bg etc.)
 *   - textTransform: uppercase removed from Arabic table headers (UI-007)
 *
 * Business logic (users.service calls, form validation, role selection) UNCHANGED.
 */

import { useState, useEffect } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { usersService, rolesService, type UserDTO, type RoleDTO } from './users.service'
import { PermissionGate } from '../../components/PermissionGate'
import {
  Button,
  Badge,
  Alert,
  Modal,
  ConfirmDialog,
  EmptyState,
  CheckboxField,
  DataTable,
  Input,
  PageLoader,
  useToast,
  type TableColumn,
} from '../../components/ui'


// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const { showToast } = useToast()

  const [users, setUsers] = useState<UserDTO[]>([])
  const [roles, setRoles] = useState<RoleDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create modal
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', roleIds: [] as number[] })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Confirm deactivate dialog
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; name: string } | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [usersData, rolesData] = await Promise.all([usersService.list(), rolesService.list()])
      setUsers(usersData)
      setRoles(rolesData)
    } catch {
      setError('تعذر تحميل قائمة المستخدمين')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    setFormError(null)
    if (!formData.name.trim()) { setFormError('الاسم مطلوب'); return }
    if (!formData.email.trim()) { setFormError('البريد الإلكتروني مطلوب'); return }
    if (!formData.password) { setFormError('كلمة المرور مطلوبة'); return }
    setSaving(true)
    try {
      await usersService.create(formData)
      setShowModal(false)
      setFormData({ name: '', email: '', password: '', roleIds: [] })
      showToast({ type: 'success', title: 'تم إنشاء المستخدم بنجاح' })
      await load()
    } catch (e: unknown) {
      setFormError((e as { message?: string })?.message ?? 'حدث خطأ أثناء إنشاء المستخدم')
    } finally {
      setSaving(false)
    }
  }

  // Trigger ConfirmDialog instead of native confirm()
  function handleDeactivateClick(user: UserDTO) {
    setConfirmTarget({ id: user.id, name: user.name })
  }

  // Actual deactivate — called after user confirms
  async function handleDeactivateConfirm() {
    if (!confirmTarget) return
    setDeactivating(true)
    try {
      await usersService.deactivate(confirmTarget.id)
      showToast({ type: 'success', title: `تم تعطيل حساب "${confirmTarget.name}"` })
      setConfirmTarget(null)
      await load()
    } catch {
      showToast({ type: 'error', title: 'تعذر تعطيل الحساب', message: 'يرجى المحاولة مجدداً' })
      setConfirmTarget(null)
    } finally {
      setDeactivating(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Table columns — SYS-004: DataTable migration
  // TableColumn uses default generic (Record<string,unknown>); row is cast to
  // UserDTO inside each render fn so all field access remains type-safe.
  // ---------------------------------------------------------------------------

  const usersColumns: TableColumn[] = [
    {
      key: 'name',
      header: 'الاسم',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy-800)' }}>
            {u.name}
          </span>
        )
      },
    },
    {
      key: 'email',
      header: 'البريد الإلكتروني',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          <span style={{ direction: 'ltr', display: 'inline-block', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
            {u.email}
          </span>
        )
      },
    },
    {
      key: 'roles',
      header: 'الأدوار',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          /* D-002: role name pills using shared Badge */
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
            {u.roles.map(r => (
              <Badge key={r.id} status="role">{r.nameAr}</Badge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'isActive',
      header: 'الحالة',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          <Badge status={u.isActive ? 'active' : 'inactive'}>
            {u.isActive ? 'نشط' : 'معطّل'}
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      header: 'إجراءات',
      align: 'center',
      render: (_v, row) => {
        const u = row as unknown as UserDTO
        return (
          <PermissionGate permission="users.delete">
            {u.isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeactivateClick(u)}
                style={{ color: 'var(--color-danger-text)' }}
              >
                تعطيل
              </Button>
            )}
          </PermissionGate>
        )
      },
    },
  ]

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="page-container">

      {/* Page header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">إدارة المستخدمين</h1>
          <p className="page-header-subtitle">حسابات موظفي النظام</p>
        </div>
        <PermissionGate permission="users.create">
          <Button
            id="add-user-btn"
            variant="primary"
            onClick={() => { setShowModal(true); setFormError(null) }}
          >
            <UserPlus size={16} aria-hidden="true" />
            إضافة مستخدم
          </Button>
        </PermissionGate>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="danger" style={{ marginBottom: 'var(--space-6)' } as React.CSSProperties}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && <PageLoader label="جارٍ تحميل المستخدمين" />}

      {/* Users table — desktop/tablet (>= 640px) */}
      {!loading && !error && (
        <>
          {/* Desktop/tablet: DataTable — SYS-004: migrated from raw <table className="ds-table"> */}
          <div className="users-desktop-table">
            <DataTable
              columns={usersColumns}
              data={users as unknown as Record<string, unknown>[]}
              emptyMessage="لا يوجد مستخدمون"
              emptyIcon={Users}
            />
          </div>

          {/* Mobile: card-list view (< 640px) — OD-MOBILE-001 Option B */}
          <div className="users-mobile-cards">
            {users.length === 0 ? (
              <div style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
              }}>
                {/* D-008: EmptyState component instead of raw div with text */}
                <EmptyState
                  icon={Users}
                  title="لا يوجد مستخدمون"
                  description="لم يتم إضافة أي مستخدمين بعد"
                />
              </div>
            ) : (
              users.map(user => (
                <div key={user.id} style={{
                  backgroundColor: 'var(--color-white)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-xs)',
                  padding: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}>
                  {/* User identity row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, flexShrink: 0,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-navy-100)',
                      color: 'var(--color-navy-800)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'var(--font-weight-bold)',
                      fontSize: 'var(--font-size-sm)',
                    }} aria-hidden="true">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-navy-800)', fontSize: 'var(--font-size-sm)' }}>
                        {user.name}
                      </p>
                      <p style={{ margin: '2px 0 0', direction: 'ltr', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </p>
                    </div>
                    <Badge status={user.isActive ? 'active' : 'inactive'}>
                      {user.isActive ? 'نشط' : 'معطّل'}
                    </Badge>
                  </div>

                  {/* Roles */}
                  {/* D-002: replaced raw <span> (inline navy-50/navy-700) with shared <Badge status="role"> */}
                  {user.roles.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                      {user.roles.map(r => (
                        <Badge key={r.id} status="role">{r.nameAr}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <PermissionGate permission="users.delete">
                    {user.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        onClick={() => handleDeactivateClick(user)}
                        style={{ color: 'var(--color-danger-text)', borderColor: 'var(--color-danger-bg)', backgroundColor: 'var(--color-danger-bg)' }}
                      >
                        تعطيل الحساب
                      </Button>
                    )}
                  </PermissionGate>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <style>{`
        /* Desktop/tablet table — show above 640px */
        .users-desktop-table { display: block; }
        .users-mobile-cards  { display: none; }

        @media (max-width: 639px) {
          .users-desktop-table { display: none; }
          .users-mobile-cards  {
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }
        }
      `}</style>

      {/* Create User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => !saving && setShowModal(false)}
        title="إضافة مستخدم جديد"
        size="base"
        footer={
          <>
            <Button
              id="create-user-save-btn"
              variant="primary"
              onClick={handleCreate}
              loading={saving}
            >
              إنشاء المستخدم
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowModal(false)}
              disabled={saving}
            >
              إلغاء
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            id="user-name"
            label="الاسم"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            placeholder="اسم الموظف"
            required
          />
          <Input
            id="user-email"
            label="البريد الإلكتروني"
            type="email"
            dir="ltr"
            value={formData.email}
            onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
            placeholder="email@example.com"
            required
          />
          <Input
            id="user-password"
            label="كلمة المرور"
            type="password"
            dir="ltr"
            value={formData.password}
            onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
            placeholder="••••••••"
            required
          />

          {/* Role checkboxes — D-012: replaced raw <input type="checkbox"> + inline styles */}
          {/* fieldset/legend provides semantic grouping for screen readers */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
                padding: 0,
              }}
            >
              الأدوار
            </legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {roles.map(role => (
                <CheckboxField
                  key={role.id}
                  id={`user-role-${role.id}`}
                  label={role.nameAr}
                  checked={formData.roleIds.includes(role.id)}
                  onChange={checked =>
                    setFormData(p => ({
                      ...p,
                      roleIds: checked
                        ? [...p.roleIds, role.id]
                        : p.roleIds.filter(id => id !== role.id),
                    }))
                  }
                />
              ))}
            </div>
          </fieldset>

          {formError && (
            <Alert variant="danger">{formError}</Alert>
          )}
        </div>
      </Modal>

      {/* Confirm Deactivate Dialog — replaces native confirm() */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setConfirmTarget(null)}
        title="تعطيل الحساب"
        description={`هل تريد تعطيل حساب "${confirmTarget?.name ?? ''}"؟ يمكن إعادة تفعيله لاحقاً.`}
        confirmLabel="تعطيل"
        variant="danger"
        loading={deactivating}
      />
    </div>
  )
}
