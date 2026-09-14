/**
 * KOSHK SKATE ERP — Card Component
 * Phase 03.5 — Design System
 *
 * Standard white surface container.
 *
 * AN-011 (Motion Audit 2026-09-14): Separated card--hover (shadow/transform only)
 *   from card--clickable (cursor:pointer). Non-clickable hovered cards no longer
 *   show cursor:pointer — false affordance removed.
 */

import type { ReactNode } from 'react'

type CardPadding = 'compact' | 'standard'

interface CardProps {
  children: ReactNode
  padding?: CardPadding
  hover?: boolean
  onClick?: () => void
  className?: string
  as?: 'div' | 'article' | 'section'
}

export function Card({
  children,
  padding = 'standard',
  hover = false,
  onClick,
  className = '',
  as: Tag = 'div',
}: CardProps) {
  const paddingValue = padding === 'compact' ? 'var(--space-5)' : 'var(--space-6)'
  const isClickable = Boolean(onClick)

  return (
    <>
      <Tag
        className={[
          'card',
          hover || isClickable ? 'card--hover' : '',
          // AN-011: cursor:pointer only when the card is truly interactive
          isClickable ? 'card--clickable' : '',
          className,
        ].filter(Boolean).join(' ')}
        style={{ padding: paddingValue }}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() }
        } : undefined}
      >
        {children}
      </Tag>
      <style>{`
        .card {
          background-color: var(--color-white);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          border: 1px solid var(--color-border);
          transition: box-shadow var(--transition-fast), transform var(--transition-fast);
        }
        /* AN-011: hover elevation applies to both hover-only AND clickable cards */
        .card--hover:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }
        /* AN-011: cursor:pointer only for cards that have an onClick handler */
        .card--clickable { cursor: pointer; }
        .card:focus-visible {
          outline: 2px solid var(--color-border-focus);
          outline-offset: 2px;
        }
      `}</style>
    </>
  )
}
