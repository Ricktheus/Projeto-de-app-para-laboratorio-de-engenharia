import {
  buildCpPlan,
  formatIsoDateBr,
  MOLDING_SHORTCUTS,
  type CpPlanEntry,
  type MoldingConfigItem,
} from '@concreto/shared';
import { Pressable, Text, View } from 'react-native';

import { NumericInput } from '../../components/ui';

export interface MoldagemConfigProps {
  items: MoldingConfigItem[];
  onChange: (items: MoldingConfigItem[]) => void;
  /** Molding date (ISO); used to preview each specimen's planned rupture date. */
  dataMoldagem: string;
}

function totalCps(items: MoldingConfigItem[]): number {
  return items.reduce(
    (sum, item) => sum + (Number.isFinite(item.quantidade) ? item.quantidade : 0),
    0,
  );
}

/** Safely builds the CP plan preview; an invalid config (age/qty ≤ 0) yields []. */
function safePlan(dataMoldagem: string, items: MoldingConfigItem[]): CpPlanEntry[] {
  try {
    return buildCpPlan(dataMoldagem, items);
  } catch {
    return [];
  }
}

/** Groups a plan by planned rupture date, in chronological order, for the preview. */
function planByDate(plan: CpPlanEntry[]): { data: string; idade: number; quantidade: number }[] {
  const byDate = new Map<string, { data: string; idade: number; quantidade: number }>();
  for (const entry of plan) {
    const existing = byDate.get(entry.dataRupturaPlanejada);
    if (existing) {
      existing.quantidade += 1;
    } else {
      byDate.set(entry.dataRupturaPlanejada, {
        data: entry.dataRupturaPlanejada,
        idade: entry.idadeAlvoDias,
        quantidade: 1,
      });
    }
  }
  return [...byDate.values()].sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Free molding configuration (US02-CA2): the partner sets the quantity and
 * target age of each specimen — no fixed count. Optional shortcuts pre-fill
 * common setups. The 2 highest ages become the mandatory 28-day specimens
 * (applied by the RPC on save).
 */
export function MoldagemConfig({ items, onChange, dataMoldagem }: MoldagemConfigProps) {
  const plan = safePlan(dataMoldagem, items);
  const grupos = planByDate(plan);
  const maiorIdade = plan.reduce((max, entry) => Math.max(max, entry.idadeAlvoDias), 0);

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
        Total: {totalCps(items)} corpo(s) de prova. Os 2 de maior idade ({maiorIdade || '—'}d) serão
        preservados como obrigatórios de ruptura.
      </Text>

      {grupos.length > 0 ? (
        <View
          className="gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-3"
          accessibilityLabel="Agenda de rompimentos planejada"
        >
          <Text className="font-semibold text-gray-800">Rompimentos planejados</Text>
          {grupos.map((grupo) => (
            <View key={grupo.data} className="flex-row justify-between">
              <Text className="text-gray-700">
                {grupo.quantidade}× {grupo.idade}d
              </Text>
              <Text className="text-gray-500">{formatIsoDateBr(grupo.data)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
