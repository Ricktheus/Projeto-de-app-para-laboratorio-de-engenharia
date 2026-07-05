import { FRATURA_TIPOS, type TipoFratura } from '@concreto/shared';
import { Pressable, Text, View } from 'react-native';

/**
 * Didactic icon per fracture type (US09 — "classificar por ícones"). The exact
 * glyphs are a UI choice ([PREMISSA]: the SPEC prescribes the 6 labels/order,
 * not the icon set); the labels come from the shared `FRATURA_TIPOS` so the
 * wording never drifts.
 */
const FRATURA_ICONS: Readonly<Record<TipoFratura, string>> = {
  ruptura_cabeca: '🔺',
  ruptura_face: '🔻',
  ruptura_parcial: '🌗',
  ruptura_total: '💥',
  ruptura_cisalhamento: '↘️',
  ruptura_trinca: '⚡',
};

export interface FraturaPickerProps {
  value: TipoFratura | null;
  onChange: (value: TipoFratura) => void;
  /** Shown when the operator tries to save without picking a type (US09 sad path). */
  error?: string;
  disabled?: boolean;
}

/**
 * Fracture-type picker (F-S006-3, US09): the 6 laboratory types as large,
 * high-contrast icon cards. Selecting one stores the enum value in
 * `rupturas.tipo_fratura`. The exact labels/order come from `FRATURA_TIPOS`.
 */
export function FraturaPicker({ value, onChange, error, disabled = false }: FraturaPickerProps) {
  return (
    <View className="w-full gap-2">
      <Text style={{ fontSize: 18 }} className="font-medium text-gray-800">
        Tipo de fratura
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {FRATURA_TIPOS.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={option.label}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={{ minHeight: 56, width: '48%' }}
              className={`flex-row items-center gap-2 rounded-2xl border px-3 py-2 ${
                selected ? 'border-brand bg-blue-50' : 'border-gray-300 bg-white'
              }`}
            >
              <Text style={{ fontSize: 24 }}>{FRATURA_ICONS[option.value]}</Text>
              <Text
                style={{ fontSize: 15 }}
                className={`flex-1 font-medium ${selected ? 'text-brand-dark' : 'text-gray-800'}`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text className="font-medium text-danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
