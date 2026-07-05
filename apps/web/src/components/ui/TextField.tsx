import { forwardRef, type InputHTMLAttributes } from 'react';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Field error message; when set the input renders in the error state. */
  error?: string;
  /**
   * Highlights the field in amber for "needs review" (OCR low-confidence,
   * US01-CA2). Independent from `error` (which is red).
   */
  highlight?: boolean;
}

/**
 * Large, high-contrast text input matching the ergonomic baseline of SPEC §1.3
 * (>= 56dp, >= 18sp). Reused by every write form (clientes, usuários, obras).
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, highlight, id, className = '', ...rest },
  ref,
) {
  const inputId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const errorId = `${inputId}-error`;
  const borderClass = error
    ? 'border-danger'
    : highlight
      ? 'border-warning bg-yellow-50'
      : 'border-gray-300';
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-field font-medium text-gray-800">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[
          'min-h-touch w-full rounded-xl border bg-white px-4 text-field',
          'focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-brand',
          'disabled:bg-gray-100',
          borderClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
