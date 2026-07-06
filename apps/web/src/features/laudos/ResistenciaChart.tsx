import { type LaudoCurvaPonto } from '@concreto/shared';
import {
  CartesianGrid,
  Line,
  LineChart,
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

const CURVE_COLOR = '#1d4ed8'; // blue-700 — high contrast on the light panel
const FCK_COLOR = '#dc2626'; // red-600 — the fck reference line
const GRID_COLOR = '#e5e7eb'; // gray-200
const AXIS_COLOR = '#374151'; // gray-700

/**
 * Resistance growth curve for a report (F-S007-3 / US13-CA2): FCM per age plus a
 * reference line at the project fck (US14-CA2 preview). Consumes the shared
 * `consolidarLaudo` curve so the office panel and the S008 PDF plot the same
 * data. Renders a placeholder when no valid result exists yet.
 */
export function ResistenciaChart({ curva, fckProjeto }: ResistenciaChartProps) {
  if (curva.length === 0) {
    return (
      <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
        Sem resultados para o gráfico ainda.
      </p>
    );
  }

  return (
    <div className="h-64 w-full" aria-label="Gráfico de resistência por idade">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={curva} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
          <XAxis
            dataKey="idadeAlvoDias"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value: number) => `${value}d`}
            stroke={AXIS_COLOR}
            fontSize={12}
          />
          <YAxis
            stroke={AXIS_COLOR}
            fontSize={12}
            tickFormatter={(value: number) => `${value}`}
            width={44}
          />
          <Tooltip
            formatter={(value: number) => [`${value} MPa`, 'FCM']}
            labelFormatter={(label: number) => `${label} dias`}
          />
          {fckProjeto !== null ? (
            <ReferenceLine
              y={fckProjeto}
              stroke={FCK_COLOR}
              strokeDasharray="6 4"
              label={{ value: `fck ${fckProjeto} MPa`, position: 'insideTopRight', fill: FCK_COLOR, fontSize: 12 }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="fcm"
            name="Resistência (FCM)"
            stroke={CURVE_COLOR}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
