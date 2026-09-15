/**
 * KOSHK SKATE ERP — IconButton Component
 * Phase 04 — Customers Module (SYS-002)
 *
 * A reusable icon-only button for row actions (Edit, View, Deactivate, etc.).
 * Must be used for ALL icon-only row actions across all ERP modules.
 * Do NOT create page-specific icon button implementations (UI-010).
 *
 * Approved API: DEC-057
 * Specification: COMPONENT_LIBRARY.md §4.19
 */

import { type LucideIcon, Loader2 } from 'lucide-react'

export interface IconButtonProps {
  /** Lucide React icon component (required) */
  icon: LucideIcon
  /** Accessible label — applied as aria-label on the button (required) */
  label: string
  /** Visual variant. Default: 'ghost' */
  variant?: 'ghost' | 'danger'
  /** Size. Default: 'sm' for table rows */
  size?: 'sm' | 'base'
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function IconButton({
  icon: IconComponent,
  label,
  variant = 'ghost',
  size = 'sm',
  onClick,
  disabled = false,
  loading = false,
  className = '',
}: IconButtonProps) {
  const isDisabled = disabled || loading
  const iconSize = size === 'sm' ? 16 : 20

  return (
    <>
      <button
        type="button"
        className={`icon-btn icon-btn--${variant} icon-btn--${size} ${className}`.trim()}
        aria-label={label}
        aria-busy={loading ? 'true' : undefined}
        disabled={isDisabled}
        onClick={isDisabled ? undefined : onClick}
        title={label}
      >
        {loading ? (
          <Loader2
            size={iconSize}
            style={{ animation: 'spin 1s linear infinite' }}
            aria-hidden="true"
          />
        ) : (
          <IconComponent
            size={iconSize}
            aria-hidden="true"
          />
        )}
      </button>

      <style>{`
        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: var(--radius-base);
          cursor: pointer;
          transition: background-color var(--transition-fast),
                      color var(--transition-fast);
          flex-shrink: 0;
          position: relative;
        }

        /* Sizes — min-height 44px for WCAG 2.5.5 touch-target compliance */
        .icon-btn--sm {
          width: 32px;
          height: 32px;
          min-height: 44px;
          min-width: 44px;
        }

        .icon-btn--base {
          width: 40px;
          height: 40px;
          min-height: 44px;
          min-width: 44px;
        }

        /* Ghost variant — transparent bg, hover navy-50 */
        .icon-btn--ghost {
          background-color: transparent;
          color: var(--color-text-secondary);
        }

        .icon-btn--ghost:hover:not(:disabled) {
          background-color: var(--color-navy-50);
          color: var(--color-navy-800);
        }

        .icon-btn--ghost:active:not(:disabled) {
          background-color: var(--color-navy-100);
        }

        /* Danger variant — transparent bg, hover danger-bg */
        .icon-btn--danger {
          background-color: transparent;
          color: var(--color-danger-text);
        }

        .icon-btn--danger:hover:not(:disabled) {
          background-color: var(--color-danger-bg);
          color: var(--color-danger-500);
        }

        .icon-btn--danger:active:not(:disabled) {
          background-color: var(--color-danger-bg);
          opacity: 0.8;
        }

        /* Disabled state */
        .icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Focus */
        .icon-btn:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }
      `}</style>
    </>
  )
}
