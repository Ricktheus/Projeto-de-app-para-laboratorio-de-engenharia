import { MOLDING_SHORTCUTS, type MoldingConfigItem } from '@concreto/shared';
import { Pressable, Text, View } from 'react-native';

import { NumericInput } from '../../components/ui';

export interface MoldagemConfigProps {
  items: MoldingConfigItem[];
  onChange: (items: MoldingConfigItem[]) => void;
}

function totalCps(items: MoldingConfigItem[]): number {
  return items.reduce(
    (sum, item) => sum + (Number.isFinite(item.quantidade) ? item.quantidade : 0),
    0,
  );
}

/**
 * Free molding configuration (US02-CA2): the partner sets the quantity and
 * target age of each specimen — no fixed count. Optional shortcuts pre-fill
 * common setups. The 2 highest ages become the mandatory 28-day specimens
 * (applied by the RPC on save).
 */
export function MoldagemConfig({ items, onChange }: MoldagemConfigProps) {
  function updateItem(index: number, patch: Partial<MoldingConfigItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function addItem() {
    onChange([...items, { idadeAlvoDias: 28, quantidade: 1 }]);
  }
  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <View className="gap-3">
      <Text style={{ fontSize: 18 }} className="font-semibold text-gray-900">
        Moldagem (corpos de prova)
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {MOLDING_SHORTCUTS.map((shortcut) => (
          <Pressable
            key={shortcut.id}
            accessibilityRole="button"
            onPress={() => onChange(shortcut.items.map((i) => ({ ...i })))}
            style={{ minHeight: 44 }}
            className="justify-center rounded-full border border-brand px-4"
          >
            <Text className="font-medium text-brand">{shortcut.label}</Text>
          </Pressable>
        ))}
      </View>

      {items.map((item, index) => (
        <View key={index} className="flex-row items-end gap-2">
          <View className="flex-1">
            <NumericInput
              label="Idade"
              suffix="dias"
              value={String(item.idadeAlvoDias)}
              onChangeText={(text) => updateItem(index, { idadeAlvoDias: Number(text) || 0 })}
            />
          </View>
          <View className="flex-1">
            <NumericInput
              label="Quantidade"
              value={String(item.quantidade)}
              onChangeText={(text) => updateItem(index, { quantidade: Number(text) || 0 })}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remover idade ${index + 1}`}
            onPress={() => removeItem(index)}
            style={{ minHeight: 56, minWidth: 56 }}
            className="items-center justify-center rounded-2xl border border-gray-300"
          >
            <Text style={{ fontSize: 20 }}>🗑️</Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={addItem}
        style={{ minHeight: 56 }}
        className="items-center justify-center rounded-2xl border border-dashed border-gray-400"
      >
        <Text style={{ fontSize: 18 }} className="font-medium text-gray-700">
          + Adicionar idade
        </Text>
      </Pressable>

      <Text className="text-gray-600" accessibilityLabel="Total de corpos de prova">
        Total: {totalCps(items)} corpo(s) de prova. Os 2 de maior idade serão marcados como 28d
        obrigatório.
      </Text>
    </View>
  );
}
