import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { COLORS, FONTS } from '../../theme/tokens';

export interface NumericInputProps extends Omit<TextInputProps, 'keyboardType'> {
  label: string;
  /** Field error message; when set the input renders in the error state. */
  error?: string;
  /** Unit suffix shown next to the label (e.g. "kgf", "mm"). */
  suffix?: string;
  /**
   * Highlights the field in AI violet for "needs review" (OCR low-confidence,
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
  // Field theme "Sol" (plan §6.3): 2px borders for contrast under sunlight;
  // violet = value suggested by OCR, still to be confirmed (plan §6.1).
  const borderClass = error
    ? 'border-danger bg-white'
    : highlight
      ? 'border-ia-600 bg-ia-50'
      : 'border-concreto-200 bg-white';
  return (
    <View className="w-full gap-1">
      <Text style={{ fontSize: 16, fontFamily: FONTS.sansMedium }} className="text-concreto-600">
        {suffix ? `${label} (${suffix})` : label}
      </Text>
      <TextInput
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        style={{ minHeight: 56, fontSize: 18, fontFamily: FONTS.sans, color: COLORS.grafite }}
        placeholderTextColor={COLORS.concreto400}
        className={`w-full rounded-xl border-2 px-4 ${borderClass}`}
        {...rest}
      />
      {error ? (
        <Text
          style={{ fontSize: 15, fontFamily: FONTS.sansMedium }}
          className="text-danger"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
