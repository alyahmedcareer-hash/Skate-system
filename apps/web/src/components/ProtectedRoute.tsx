/**
 * KOSHK SKATE ERP — Protected Route Component
 * Phase 02 — Authentication & Permissions
 *
 * Wraps routes that require authentication.
 * If not authenticated: redirects to /login.
 * While loading (checking session): shows a loading spinner.
 *
 * AN-001 (Motion Audit 2026-09-14): Replaced raw border-div spinner + local
 *   @keyframes spin with the shared <PageLoader> component. Token fix:
 *   --color-page-bg replaces non-existent --color-gray-50.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PageLoader } from './ui'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--color-page-bg)',
        }}
      >
        <PageLoader label="جارٍ التحقق من الجلسة..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
