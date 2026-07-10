import { brDateToIso, formatIsoDateBr, maskBrDate } from '@concreto/shared';
import { useState } from 'react';

import { TextField } from './TextField';

export interface DateFieldProps {
  label: string;
  /** Current value as an ISO date ('YYYY-MM-DD'), or null when unset. */
  valueIso: string | null;
  /** Emits the ISO date on every valid edit; `null` while the input is incomplete/invalid. */
  onChangeIso: (iso: string | null) => void;
  editable?: boolean;
}

/**
 * Brazilian date field (QW-06): the operator types/reads 'DD/MM/AAAA' with a
 * live mask while storage stays ISO — no hand-typed 'AAAA-MM-DD', the single
 * most error-prone input in the field flow. An impossible date (e.g. 31/02)
 * surfaces an inline hint and reports `null` upward. Seeds its display from the
 * incoming ISO value.
 */
export function DateField({ label, valueIso, onChangeIso, editable = true }: DateFieldProps) {
  const [text, setText] = useState<string>(valueIso ? formatIsoDateBr(valueIso) : '');

  function handleChange(next: string) {
    const masked = maskBrDate(next);
    setText(masked);
    onChangeIso(brDateToIso(masked));
  }

  const incompleto = text.length === 10 && brDateToIso(text) === null;

  return (
    <TextField
      label={label}
      value={text}
      onChangeText={handleChange}
      editable={editable}
      keyboardType="number-pad"
      placeholder="DD/MM/AAAA"
      error={incompleto ? 'Data inválida (use DD/MM/AAAA).' : undefined}
    />
  );
}
