export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-gray-100 text-gray-800 ring-gray-300',
  info: 'bg-blue-100 text-blue-900 ring-blue-300',
  success: 'bg-green-100 text-green-900 ring-green-300',
  warning: 'bg-yellow-100 text-yellow-900 ring-yellow-300',
  danger: 'bg-red-100 text-red-900 ring-red-300',
};

export interface StatusPillProps {
  label: string;
  tone?: StatusTone;
}

/**
 * Compact status badge (F-S003-3). Tones use dark text on a light tint so the
 * label stays AA-legible; reused to render CP / laudo statuses across the apps.
 */
export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset',
        TONE_CLASSES[tone],
      ].join(' ')}
    >
      {label}
    </span>
  );
}
