import { Text, TextInput, View, type TextInputProps } from 'react-native';

export interface TextFieldProps extends TextInputProps {
  label: string;
  /** Field error message; when set the input renders in the error (red) state. */
  error?: string;
  /**
   * Highlights the field in amber for "needs review" (OCR low-confidence,
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
  const borderClass = error
    ? 'border-danger'
    : highlight
      ? 'border-warning bg-yellow-50'
      : 'border-gray-300';
  return (
    <View className="w-full gap-1">
      <Text style={{ fontSize: 18 }} className="font-medium text-gray-800">
        {label}
      </Text>
      <TextInput
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
