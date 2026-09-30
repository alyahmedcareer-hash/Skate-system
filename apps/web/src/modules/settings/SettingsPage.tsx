import { useState, useEffect } from 'react'
import { settingsApi, type AppSettings } from './settings.api'
import { PageLoader, Alert, Button, useToast } from '../../components/ui'
import { Printer, Save, Bell } from 'lucide-react'

export default function SettingsPage() {
  const { showToast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<AppSettings>({})

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await settingsApi.getSettings()
      setForm(res.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'فشل تحميل الإعدادات')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await settingsApi.updateSettings(form)
      setForm(res.data)
      showToast({ type: 'success', title: 'تم حفظ الإعدادات بنجاح' })
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'فشل حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader label="جارٍ تحميل الإعدادات" />

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">الإعدادات</h1>
          <p className="page-header-subtitle">تكوين إعدادات النظام وتفضيلات الطباعة</p>
        </div>
        <div className="page-header-actions">
          <Button variant="primary" loading={saving} onClick={handleSave}>
            <Save size={16} /> حفظ التغييرات
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" style={{ marginBottom: 'var(--space-4)' }}>{error}</Alert>}

      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        
        {/* Printing Settings */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)'
        }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' as any, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Printer size={20} className="text-muted" /> طباعة الفواتير
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 'var(--space-2)' }}>
              <input 
                type="checkbox"
                checked={form.print_invoices_enabled ?? false}
                onChange={e => setForm({ ...form, print_invoices_enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)' as any }}>
                الطباعة التلقائية مفعلة
              </span>
            </label>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              (سيتم طباعة الفاتورة تلقائياً عند إتمام الإيجار أو البيع)
            </span>
          </div>
        </div>
        
        {/* Notifications Settings */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)'
        }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' as any, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Bell size={20} className="text-muted" /> التنبيهات
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 'var(--space-2)' }}>
              <input 
                type="checkbox"
                checked={form.notification_sound_enabled ?? false}
                onChange={e => setForm({ ...form, notification_sound_enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)' as any }}>
                تشغيل صوت التنبيهات
              </span>
            </label>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              (تنبيه صوتي عند اقتراب أو انتهاء وقت الإيجار)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
