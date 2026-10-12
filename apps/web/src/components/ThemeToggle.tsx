import { useThemeStore, type ThemePreference } from '../stores/theme-store';

const OPTIONS: { value: ThemePreference; label: string; glyph: string }[] = [
  {
    value: 'light',
    label: 'Tema claro',
    glyph:
      'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  },
  { value: 'system', label: 'Seguir o sistema', glyph: 'M4 5h16v11H4zM8 20h8m-4-4v4' },
  { value: 'dark', label: 'Tema escuro', glyph: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z' },
];

/**
 * Three-way theme switch (claro / sistema / escuro). `tone="dark"` renders it
 * for the graphite sidebar; `tone="surface"` for light headers.
 */
export function ThemeToggle({ tone = 'dark' }: { tone?: 'dark' | 'surface' }) {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={[
        'inline-flex gap-0.5 rounded-lg p-0.5',
        tone === 'dark' ? 'bg-white/[0.06]' : 'border border-concreto-200 bg-concreto-25',
      ].join(' ')}
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setPreference(opt.value)}
            className={[
              'flex h-7 w-8 items-center justify-center rounded-md transition-colors',
              tone === 'dark'
                ? active
                  ? 'bg-white/15 text-white'
                  : 'text-concreto-400 hover:text-white'
                : active
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-concreto-500 hover:text-ink',
            ].join(' ')}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d={opt.glyph} />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
