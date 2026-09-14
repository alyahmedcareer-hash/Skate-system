/**
 * KOSHK SKATE ERP — ErrorBoundary Component
 * Phase 03.5 — Foundation Fixes (SYS-003)
 *
 * Catches React render errors and prevents a full blank-screen failure.
 * Provides an Arabic-first, RTL, KOSHK-themed fallback with a retry action.
 *
 * Usage:
 *   Wrap at the application root (main.tsx) to catch all unhandled render errors.
 *   Can also wrap individual page routes for more granular recovery.
 *
 * Design decisions:
 *   - Class component required — React Error Boundaries must be class-based.
 *   - No stack trace exposed to end users.
 *   - Recovery: full page reload (safest option — clears any stale React state).
 *   - Styling: inline tokens only — cannot depend on CSS files that may have caused the error.
 *   - RTL: direction: rtl applied directly on the container.
 *   - Does not modify business logic or application routing.
 */

import { Component, type ReactNode } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  /** Children to render normally when no error. */
  children: ReactNode
  /**
   * Optional custom fallback element.
   * If provided, replaces the default KOSHK error screen.
   */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  /** Error captured for development logging — never shown to users. */
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console in development. In production, connect to an error
    // reporting service (e.g. Sentry) here — do not expose to end users.
    console.error('[KOSHK ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    // Full page reload is the safest recovery — clears any broken React state.
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // If caller supplied a custom fallback, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default KOSHK-themed fallback
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            direction: 'rtl',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            backgroundColor: '#F5F6F9', /* --color-page-bg */
            fontFamily: "'Cairo', 'Segoe UI', system-ui, sans-serif",
            textAlign: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #E3E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: '2.5rem 2rem',
              maxWidth: '480px',
              width: '100%',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 56, height: 56,
                borderRadius: '50%',
                backgroundColor: '#FCE0E1', /* --color-danger-bg */
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
              aria-hidden="true"
            >
              <AlertTriangle size={28} color="#D83C40" /* --color-danger-text */ />
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: '1.125rem', /* --font-size-lg */
                fontWeight: 700,
                color: '#1F293D', /* --color-text-primary */
                margin: '0 0 0.5rem',
                lineHeight: 1.4,
              }}
            >
              حدث خطأ غير متوقع
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: '0.875rem', /* --font-size-sm */
                color: '#4e5869', /* --color-text-secondary */
                margin: '0 0 1.5rem',
                lineHeight: 1.625,
              }}
            >
              عذراً، تعذّر تحميل هذا القسم. يرجى تحديث الصفحة للمحاولة مجدداً.
              <br />
              إذا استمرت المشكلة يرجى التواصل مع الدعم الفني.
            </p>

            {/* Retry button */}
            <button
              type="button"
              onClick={this.handleRetry}
              aria-label="تحديث الصفحة"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0 1.25rem',
                height: 44,
                minWidth: 44,
                backgroundColor: '#192744', /* --color-navy-800 */
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                fontFamily: "'Cairo', 'Segoe UI', system-ui, sans-serif",
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2D3E67')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#192744')}
            >
              <RefreshCw size={16} aria-hidden="true" />
              تحديث الصفحة
            </button>
          </div>

          {/* KOSHK branding footer */}
          <p
            style={{
              marginTop: '1.5rem',
              fontSize: '0.75rem',
              color: '#7D8798', /* --color-text-muted */
            }}
          >
            KOSHK SKATE ERP
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
