import { formatMpaBr, formatNumberBr, type LaudoCurvaPonto } from '@concreto/shared';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { isDarkActive, useThemeStore } from '../../stores/theme-store';

export interface ResistenciaChartProps {
  /** Resistance curve points (age → FCM), ascending. */
  curva: LaudoCurvaPonto[];
  /** Reference fck of the project, drawn as a horizontal line. */
  fckProjeto: number | null;
}

/**
 * Chart palette per theme. Plan §6.2: the fck line is ALWAYS neutral (ink,
 * dashed, labelled) — red would suggest a rejection the lab does not issue.
 */
const PALETTE = {
  light: { curve: '#2F54EB', fck: '#17181A', grid: '#E7E7E2', axis: '#6E6E67', surface: '#FFFFFF' },
  dark: { curve: '#7C9BFF', fck: '#F3F3F0', grid: '#2A2A27', axis: '#A3A39B', surface: '#1B1B19' },
} as const;

/**
 * Resistance growth curve for a report (F-S007-3 / US13-CA2): FCM per age plus a
 * reference line at the project fck (US14-CA2 preview). Consumes the shared
 * `consolidarLaudo` curve so the office panel and the S008 PDF plot the same
 * data. Renders a placeholder when no valid result exists yet.
 */
export function ResistenciaChart({ curva, fckProjeto }: ResistenciaChartProps) {
  const preference = useThemeStore((s) => s.preference);
  const c = PALETTE[isDarkActive(preference) ? 'dark' : 'light'];
  const CURVE_COLOR = c.curve;
  const FCK_COLOR = c.fck;
  const GRID_COLOR = c.grid;
  const AXIS_COLOR = c.axis;
  if (curva.length === 0) {
    return (
      <p className="rounded-lg bg-concreto-25 px-4 py-8 text-center text-concreto-500">
        Sem resultados para o gráfico ainda.
      </p>
    );
  }

  return (
    <div className="h-64 w-full" aria-label="Gráfico de resistência por idade">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={curva} margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="fcmFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CURVE_COLOR} stopOpacity={0.16} />
              <stop offset="100%" stopColor={CURVE_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="idadeAlvoDias"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={curva.map((p) => p.idadeAlvoDias)}
            padding={{ left: 12, right: 12 }}
            tickFormatter={(value: number) => `${value}d`}
            stroke={AXIS_COLOR}
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
          />
          <YAxis
            stroke={AXIS_COLOR}
            fontSize={12}
            tickFormatter={(value: number) => `${value}`}
            width={40}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${GRID_COLOR}`,
              background: c.surface,
              boxShadow: '0 4px 16px -4px rgba(23,24,26,0.12)',
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontSize: 13,
            }}
            formatter={(value: number) => [`${formatMpaBr(value)} MPa`, 'FCM']}
            labelFormatter={(label: number) => `${label} dias`}
          />
          {fckProjeto !== null ? (
            <ReferenceLine
              y={fckProjeto}
              stroke={FCK_COLOR}
              strokeDasharray="6 4"
              strokeWidth={1.25}
              label={{
                value: `fck ${formatNumberBr(fckProjeto)} MPa`,
                position: 'insideTopRight',
                fill: FCK_COLOR,
                fontSize: 12,
                fontWeight: 600,
              }}
            />
          ) : null}
          <Area
            type="monotone"
            dataKey="fcm"
            name="Resistência (FCM)"
            stroke={CURVE_COLOR}
            strokeWidth={2.5}
            fill="url(#fcmFill)"
            dot={{ r: 4, fill: c.surface, stroke: CURVE_COLOR, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
