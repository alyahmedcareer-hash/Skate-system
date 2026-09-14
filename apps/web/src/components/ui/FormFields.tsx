/**
 * KOSHK SKATE ERP — Input, Select, Textarea, CheckboxField Components
 * Phase 03.5 — Design System
 *
 * Shared form controls with integrated label, error message, RTL support.
 * UI-002: All form fields must use these components.
 *
 * D-012 (2026-09-14): Added CheckboxField — completes the form-control set.
 */

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

/* =============================================================================
   Shared field styles (injected once via a style block)
   ============================================================================= */

const FIELD_STYLES = `
  .field-wrapper { display: flex; flex-direction: column; gap: var(--space-2); }

  .field-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    line-height: var(--line-height-normal);
  }

  .field-required { color: var(--color-danger-500); margin-right: var(--space-1); }

  .field-control {
    width: 100%;
    height: 40px;
    padding: 0 var(--space-4);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-base);
    font-size: var(--font-size-base);
    font-family: var(--font-family-base);
    color: var(--color-text-primary);
    background-color: var(--color-white);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    box-sizing: border-box;
    text-align: right;
  }

  .field-textarea {
    height: auto;
    min-height: 80px;
    padding: var(--space-3) var(--space-4);
    resize: vertical;
  }

  .field-control:focus {
    outline: none;
    border-color: var(--color-border-focus);
    box-shadow: 0 0 0 3px rgba(77, 106, 153, 0.15);
  }

  .field-control.field-error {
    border-color: var(--color-danger-500);
  }

  .field-control.field-error:focus {
    box-shadow: 0 0 0 3px rgba(237, 69, 71, 0.12);
  }

  .field-control:disabled {
    background-color: var(--color-neutral-bg);
    cursor: not-allowed;
    opacity: 0.7;
  }

  .field-message {
    font-size: var(--font-size-xs);
    line-height: var(--line-height-normal);
  }

  .field-message--error { color: var(--color-danger-text); }
  .field-message--helper { color: var(--color-text-muted); }

  /* Select arrow — RTL: appears on left side */
  select.field-control {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237D8798' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: left 12px center;
    padding-left: 2.5rem;
    cursor: pointer;
  }

  /* ── CheckboxField ── D-012 ────────────────────────────────────────────── */

  /*
   * .checkbox-field: row container — min 44px touch target per WCAG 2.5.5.
   * RTL: checkbox visually on the RIGHT, label text on the LEFT (natural Arabic
   * reading order). We use flex-direction: row-reverse + gap so the box appears
   * at the leading (right) edge and the label follows to the left.
   * If the host page sets dir="rtl" (which KOSHK does globally), the row-reverse
   * already matches visual expectations.
   */
  .checkbox-field {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-3);
    min-height: 44px;
    cursor: pointer;
    user-select: none;
    position: relative;
  }

  .checkbox-field--disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Hide the native checkbox — keep it accessible, size it to the visual box */
  .checkbox-native {
    position: absolute;
    opacity: 0;
    width: 18px;
    height: 18px;
    margin: 0;
    cursor: inherit;
    /* RTL: sit at the logical end (right) of the row */
    inset-inline-end: 0;
  }

  /* Custom checkbox box */
  .checkbox-box {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-sm, 4px);
    background-color: var(--color-white);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);
    /* Prevent the visual box from shrinking in RTL flex rows */
    order: 1;
  }

  .checkbox-box__check {
    display: none;
    width: 10px;
    height: 10px;
  }

  /* Checked state */
  .checkbox-field--checked .checkbox-box {
    background-color: var(--color-navy-800);
    border-color: var(--color-navy-800);
  }
  .checkbox-field--checked .checkbox-box__check {
    display: block;
  }

  /* Error state */
  .checkbox-field--error .checkbox-box {
    border-color: var(--color-danger-500);
  }

  /* Focus-visible ring — driven by the native hidden input */
  .checkbox-native:focus-visible ~ .checkbox-box {
    outline: 2px solid var(--color-border-focus);
    outline-offset: 2px;
    box-shadow: 0 0 0 3px rgba(77, 106, 153, 0.15);
  }

  /* Hover — only when not disabled */
  .checkbox-field:not(.checkbox-field--disabled):hover .checkbox-box {
    border-color: var(--color-navy-600, var(--color-navy-800));
  }

  /* Label text */
  .checkbox-label-text {
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
    line-height: var(--line-height-normal);
    order: 0;
    flex: 1;
  }

  .checkbox-field--error .checkbox-label-text {
    color: var(--color-danger-text);
  }

  /* Error/helper message below the checkbox row */
  .checkbox-message {
    font-size: var(--font-size-xs);
    line-height: var(--line-height-normal);
    margin-top: calc(-1 * var(--space-1));
  }
  .checkbox-message--error  { color: var(--color-danger-text); }
  .checkbox-message--helper { color: var(--color-text-muted);  }
`

let fieldStylesInjected = false

function injectFieldStyles() {
  if (fieldStylesInjected) return
  fieldStylesInjected = true
  const el = document.createElement('style')
  el.textContent = FIELD_STYLES
  document.head.appendChild(el)
}

/* =============================================================================
   Input
   ============================================================================= */

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

export function Input({
  id,
  label,
  error,
  helperText,
  required,
  className = '',
  ...rest
}: InputProps) {
  injectFieldStyles()
  const messageId = `${id}-message`

  return (
    <div className="field-wrapper">
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helperText ? messageId : undefined}
        className={['field-control', error ? 'field-error' : '', className].filter(Boolean).join(' ')}
        {...rest}
      />
      {error && (
        <span id={messageId} className="field-message field-message--error" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={messageId} className="field-message field-message--helper">
          {helperText}
        </span>
      )}
    </div>
  )
}

/* =============================================================================
   Select
   ============================================================================= */

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string
  label: string
  options: SelectOption[]
  placeholder?: string
  error?: string
  required?: boolean
}

export function Select({
  id,
  label,
  options,
  placeholder,
  error,
  required,
  className = '',
  ...rest
}: SelectProps) {
  injectFieldStyles()
  const messageId = `${id}-message`

  return (
    <div className="field-wrapper">
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        className={['field-control', error ? 'field-error' : '', className].filter(Boolean).join(' ')}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <span id={messageId} className="field-message field-message--error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

/* =============================================================================
   Textarea
   ============================================================================= */

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

export function Textarea({
  id,
  label,
  error,
  helperText,
  required,
  className = '',
  ...rest
}: TextareaProps) {
  injectFieldStyles()
  const messageId = `${id}-message`

  return (
    <div className="field-wrapper">
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helperText ? messageId : undefined}
        className={['field-control', 'field-textarea', error ? 'field-error' : '', className].filter(Boolean).join(' ')}
        {...rest}
      />
      {error && (
        <span id={messageId} className="field-message field-message--error" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={messageId} className="field-message field-message--helper">
          {helperText}
        </span>
      )}
    </div>
  )
}

/* =============================================================================
   CheckboxField — D-012
   ============================================================================= */

/**
 * Design decisions (D-012 / 2026-09-14):
 *
 * 1. Custom checkbox box (18×18px) over a hidden native <input type="checkbox">:
 *    - native input stays in DOM for keyboard, focus, form, and assistive-tech support.
 *    - visual box driven purely by CSS classes — no SVG icons, no JS state syncing.
 *
 * 2. Touch target: .checkbox-field has min-height: 44px (WCAG 2.5.5). The hidden
 *    native input is overlaid on the box region so click/tap triggers correctly.
 *
 * 3. RTL: label text is at order:0 (rendered first in the visual row, leftmost in RTL),
 *    checkbox box is at order:1 (rendered second, rightmost in RTL). This means in RTL
 *    the box appears on the RIGHT and label on the LEFT — standard Arabic UX convention.
 *
 * 4. Focus ring: CSS sibling selector `.checkbox-native:focus-visible ~ .checkbox-box`
 *    shows the ring on the custom box, not the hidden input. No JS required.
 *
 * 5. Checked checkmark: pure SVG polyline in a 10×10 viewport, white stroke on navy-800 bg.
 *
 * 6. Error state: red border on box, red label text (consistent with field-control.field-error).
 *
 * 7. Group label ("الأدوار"): caller renders a heading/span above the CheckboxField list —
 *    CheckboxField does not own a group label. Use <fieldset>/<legend> in the caller for
 *    full semantic grouping when multiple checkboxes represent one choice set.
 */

interface CheckboxFieldProps {
  /** Unique HTML id — used for the native input and focus ring. */
  id: string
  /** Visible label text displayed next to the checkbox. */
  label: string
  /** Controlled checked state. */
  checked: boolean
  /** Change handler — receives the new boolean value. */
  onChange: (checked: boolean) => void
  /** Disables interaction and applies muted appearance. */
  disabled?: boolean
  /** Inline error message below the checkbox row. */
  error?: string
  /** Helper text below the checkbox row (shown only when no error). */
  helperText?: string
  /** Additional class on the wrapper (e.g. for layout spacing). */
  className?: string
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  error,
  helperText,
  className = '',
}: CheckboxFieldProps) {
  injectFieldStyles()
  const messageId = `${id}-message`
  const hasMessage = Boolean(error || helperText)

  const wrapperClasses = [
    'checkbox-field',
    checked   ? 'checkbox-field--checked'  : '',
    disabled  ? 'checkbox-field--disabled' : '',
    error     ? 'checkbox-field--error'    : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div>
      <label className={wrapperClasses}>
        {/* Hidden native checkbox — keyboard, focus, assistive tech */}
        <input
          type="checkbox"
          id={id}
          className="checkbox-native"
          checked={checked}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          onChange={e => onChange(e.target.checked)}
        />

        {/* Label text — order:0 → leftmost in RTL row */}
        <span className="checkbox-label-text">{label}</span>

        {/* Custom visual box — order:1 → rightmost in RTL row */}
        <span className="checkbox-box" aria-hidden="true">
          {/* Checkmark — SVG polyline, white on navy */}
          <svg
            className="checkbox-box__check"
            viewBox="0 0 10 10"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="1.5,5 4,7.5 8.5,2.5" />
          </svg>
        </span>
      </label>

      {/* Validation / helper message */}
      {error && (
        <span id={messageId} className="checkbox-message checkbox-message--error" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={messageId} className="checkbox-message checkbox-message--helper">
          {helperText}
        </span>
      )}
    </div>
  )
}

