import { forwardRef, type InputHTMLAttributes } from 'react';

export interface NumericInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'inputMode'
> {
  label: string;
  /** Field error message; when set the input renders in the error state. */
  error?: string;
  /** Unit suffix shown at the right edge (e.g. "kgf", "mm"). */
  suffix?: string;
}

/**
 * Large numeric field (F-S003-3). Opens the numeric keypad on mobile browsers
 * (`inputMode="decimal"`) and matches the >= 56dp / >= 18sp ergonomic baseline
 * so the press operator can type wearing gloves.
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(function NumericInput(
  { label, error, suffix, id, className = '', ...rest },
  ref,
) {
  const inputId = id ?? `num-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-field font-medium text-gray-800">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="decimal"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            'min-h-touch w-full rounded-xl border bg-white px-4 text-field tabular-nums',
            'focus:outline focus:outline-2 focus:outline-offset-0 focus:outline-brand',
            error ? 'border-danger' : 'border-gray-300',
            suffix ? 'pr-14' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />
        {suffix ? (
          <span className="absolute inset-y-0 right-4 flex items-center text-field text-gray-500">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
