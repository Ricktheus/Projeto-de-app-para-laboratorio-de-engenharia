import { type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { COLORS, FONTS } from '../theme/tokens';

export interface InfoHubProps {
  icon: ReactNode;
  title: string;
  text: string;
  /** Actions available to this role on mobile. */
  children?: ReactNode;
  /** Short notes (what lives on the web, what to do next). */
  notes?: readonly string[];
}

/**
 * Honest hub screen for areas whose full experience is on the web: explains
 * where to go instead of showing a misleading empty list (plan §6.11 —
 * "nenhuma tela mente").
 */
export function InfoHub({ icon, title, text, children, notes }: InfoHubProps) {
  return (
    <ScrollView contentContainerClassName="gap-4 pb-8">
      <View className="gap-3 rounded-2xl bg-grafite p-5">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-concreto-800">
          {icon}
        </View>
        <Text style={{ fontSize: 26, fontFamily: FONTS.displayBold }} className="text-white">
          {title}
        </Text>
        <Text style={{ fontSize: 16, fontFamily: FONTS.sans }} className="text-concreto-300">
          {text}
        </Text>
      </View>
      {children ? <View className="gap-3">{children}</View> : null}
      {notes && notes.length > 0 ? (
        <View className="gap-2 rounded-2xl border border-concreto-100 bg-white p-4">
          {notes.map((note) => (
            <View key={note} className="flex-row gap-2">
              <View
                style={{ backgroundColor: COLORS.sinal, marginTop: 8 }}
                className="h-2 w-2 rounded-full"
              />
              <Text
                style={{ fontSize: 16, fontFamily: FONTS.sans }}
                className="flex-1 text-concreto-600"
              >
                {note}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
