import { FRATURA_TIPOS, type TipoFratura } from '@concreto/shared';
import { Pressable, Text, View } from 'react-native';

import { COLORS, FONTS } from '../../theme/tokens';

import { FraturaGlyph } from './FraturaGlyph';

export interface FraturaPickerProps {
  value: TipoFratura | null;
  onChange: (value: TipoFratura) => void;
  /** Shown when the operator tries to save without picking a type (US09 sad path). */
  error?: string;
  disabled?: boolean;
}

/**
 * Fracture-type picker (F-S006-3, US09): the 6 laboratory types as large cards
 * with a technical drawing of the ruptured specimen (plan §6.6, 120dp-class
 * targets for gloved hands). Selecting one stores the enum value in
 * `rupturas.tipo_fratura`. The exact labels/order come from `FRATURA_TIPOS`.
 */
export function FraturaPicker({ value, onChange, error, disabled = false }: FraturaPickerProps) {
  return (
    <View className="w-full gap-3">
      <Text style={{ fontSize: 16, fontFamily: FONTS.sansMedium }} className="text-concreto-600">
        Tipo de fratura
      </Text>
      <View className="flex-row flex-wrap justify-between gap-y-3">
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
              style={{ minHeight: 132, width: '31.5%' }}
              className={`items-center justify-between rounded-xl border-2 px-1 py-2 ${
                selected ? 'border-grafite bg-sinal-500' : 'border-concreto-200 bg-concreto-25'
              }`}
            >
              <FraturaGlyph
                tipo={option.value}
                size={40}
                color={selected ? COLORS.grafite : COLORS.concreto500}
                lineColor={selected ? COLORS.grafite : COLORS.danger}
              />
              <Text
                style={{ fontSize: 13, lineHeight: 16, fontFamily: FONTS.sansSemibold }}
                className="text-center text-grafite"
              >
                {option.label.replace('Ruptura ', '').replace(/^de /, '')}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
