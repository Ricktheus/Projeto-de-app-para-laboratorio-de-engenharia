import type { Config } from 'tailwindcss';

/**
 * "Concreto & Sinalização" design tokens (PLANO_NOVO_APP.md §6).
 *
 * - Warm concrete neutrals replace Tailwind's cool `gray`, so every existing
 *   `gray-*` utility inherits the new identity.
 * - Graphite is the structural/primary colour (`brand`); signal yellow
 *   (`sinal`) is reserved for "act now" — at most one yellow element per screen.
 * - Cobalt is only for links, selection and info; violet (`ia`) only for
 *   unconfirmed AI suggestions.
 * Contrast ratios (WCAG 2.x) are documented in the plan, §6.2.
 */
/** Colour backed by a CSS variable (RGB triplet) so light/dark swap at runtime. */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

// Neutral scale: inverted in dark mode (plan §6.3 — tokens, not `dark:` everywhere).
const concreto = Object.fromEntries(
  [0, 25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [
    step,
    v(`concreto-${step}`),
  ]),
);

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: concreto,
        concreto,
        // Semantic surfaces/text (swap in dark mode).
        surface: v('surface'),
        ink: { DEFAULT: v('ink'), fg: v('ink-fg') },
        // Brand graphite stays dark in both themes (sidebar, header bands).
        grafite: { DEFAULT: '#17181A', 700: '#2A2A27', 600: '#3A3B3E' },
        sinal: { 50: v('sinal-50'), 100: v('sinal-100'), 500: '#FFC21A', 600: '#E6A800' },
        cobalto: {
          50: v('cobalto-50'),
          100: v('cobalto-100'),
          600: v('cobalto-600'),
          700: v('cobalto-700'),
        },
        ia: { 50: v('ia-50'), 600: v('ia-600') },
        terra: '#9C6B3F',
        agua: '#1590A8',
        brand: { DEFAULT: v('ink'), dark: v('ink'), fg: v('ink-fg') },
        danger: { DEFAULT: v('danger'), fg: '#FFFFFF', soft: v('danger-soft') },
        success: { DEFAULT: v('success'), fg: '#FFFFFF', soft: v('success-soft') },
        warning: { DEFAULT: v('warning'), fg: '#FFFFFF', soft: v('warning-soft') },
        info: { DEFAULT: v('cobalto-600'), fg: '#FFFFFF', soft: v('cobalto-50') },
        neutral: { DEFAULT: v('concreto-700'), fg: v('surface') },
        red: { 50: v('danger-soft'), 200: v('danger-soft'), 700: v('danger') },
        green: { 50: v('success-soft'), 700: v('success') },
        amber: { 50: v('warning-soft'), 700: v('warning') },
        yellow: { 50: v('sinal-50'), 900: v('yellow-900') },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['"Barlow Semi Condensed"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      minHeight: {
        // Office density (plan §6.5: 32px min target, 36–40px controls). The
        // gloved-hand 56dp targets live in the mobile app (Campo / Bancada).
        touch: '40px',
      },
      fontSize: {
        field: ['0.9375rem', { lineHeight: '1.375rem' }],
        kpi: ['2.5rem', { lineHeight: '1', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        // Plan §6.5: radius 6 in the office UI — crisper than the old 12–16px.
        xl: '8px',
        '2xl': '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,24,26,0.04), 0 1px 1px rgba(23,24,26,0.03)',
        raised: '0 4px 16px -4px rgba(23,24,26,0.12), 0 2px 4px rgba(23,24,26,0.05)',
        drawer: '-16px 0 48px -12px rgba(23,24,26,0.25)',
      },
      transitionTimingFunction: {
        rastro: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in': {
          from: { transform: 'translateX(24px)', opacity: '0' },
          to: { transform: 'none', opacity: '1' },
        },
        pulse_dot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms cubic-bezier(0.2,0,0,1)',
        'slide-in': 'slide-in 240ms cubic-bezier(0.2,0,0,1)',
        'pulse-dot': 'pulse_dot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
