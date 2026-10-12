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

export interface ResistenciaChartProps {
  /** Resistance curve points (age → FCM), ascending. */
  curva: LaudoCurvaPonto[];
  /** Reference fck of the project, drawn as a horizontal line. */
  fckProjeto: number | null;
}

const CURVE_COLOR = '#2F54EB'; // cobalto-600 — the measured curve
// Plan §6.2: the fck line is ALWAYS neutral (graphite, dashed, labelled) — red
// would suggest a rejection the laboratory does not issue.
const FCK_COLOR = '#17181A';
const GRID_COLOR = '#E7E7E2'; // concreto-100
const AXIS_COLOR = '#6E6E67'; // concreto-500

/**
 * Resistance growth curve for a report (F-S007-3 / US13-CA2): FCM per age plus a
 * reference line at the project fck (US14-CA2 preview). Consumes the shared
 * `consolidarLaudo` curve so the office panel and the S008 PDF plot the same
 * data. Renders a placeholder when no valid result exists yet.
 */
export function ResistenciaChart({ curva, fckProjeto }: ResistenciaChartProps) {
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
              border: '1px solid #E7E7E2',
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
            dot={{ r: 4, fill: '#FFFFFF', stroke: CURVE_COLOR, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
