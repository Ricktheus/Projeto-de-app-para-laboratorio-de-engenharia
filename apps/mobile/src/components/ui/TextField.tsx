import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { COLORS, FONTS } from '../../theme/tokens';

export interface TextFieldProps extends TextInputProps {
  label: string;
  /** Field error message; when set the input renders in the error (red) state. */
  error?: string;
  /**
   * Highlights the field in AI violet for "needs review" (OCR low-confidence,
   * US01-CA2). Independent from `error`.
   */
  highlight?: boolean;
}

/**
 * Large text field (F-S003-3): 56dp height / 18sp text for gloved hands. The
 * amber `highlight` renders the yellow "revise este campo" state the OCR flow
 * needs (US01-CA2); a manual edit clears it in the parent.
 */
export function TextField({ label, error, highlight, ...rest }: TextFieldProps) {
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
        {label}
      </Text>
      <TextInput
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
