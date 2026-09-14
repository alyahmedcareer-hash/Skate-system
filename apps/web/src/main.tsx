/**
 * KOSHK SKATE ERP — Application Entry Point
 * Phase 03.5 — Design System (updated from Phase 02)
 *
 * Wraps with:
 *   - ErrorBoundary (SYS-003: catches render errors, prevents blank screen)
 *   - BrowserRouter (React Router)
 *   - AuthProvider (JWT auth context)
 *   - ToastProvider (Phase 03.5 — replaces alert() system-wide)
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider, ErrorBoundary } from './components/ui'
import './styles/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
