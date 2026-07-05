import { Text, TextInput, View, type TextInputProps } from 'react-native';

export interface NumericInputProps extends Omit<TextInputProps, 'keyboardType'> {
  label: string;
  /** Field error message; when set the input renders in the error state. */
  error?: string;
  /** Unit suffix shown next to the label (e.g. "kgf", "mm"). */
  suffix?: string;
  /**
   * Highlights the field in amber for "needs review" (OCR low-confidence,
   * US01-CA2). Independent from `error`.
   */
  highlight?: boolean;
}

/**
 * Large numeric field (F-S003-3). Opens the numeric keypad
 * (`keyboardType="decimal-pad"`) and uses a 56dp height / 18sp text so the press
 * operator can type wearing gloves.
 */
export function NumericInput({ label, error, suffix, highlight, ...rest }: NumericInputProps) {
  const borderClass = error
    ? 'border-danger'
    : highlight
      ? 'border-warning bg-yellow-50'
      : 'border-gray-300';
  return (
    <View className="w-full gap-1">
      <Text style={{ fontSize: 18 }} className="font-medium text-gray-800">
        {suffix ? `${label} (${suffix})` : label}
      </Text>
      <TextInput
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        style={{ minHeight: 56, fontSize: 18 }}
        className={`w-full rounded-2xl border bg-white px-4 ${borderClass}`}
        {...rest}
      />
      {error ? (
        <Text className="font-medium text-danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
